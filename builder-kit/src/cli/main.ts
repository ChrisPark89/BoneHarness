/** Five public commands. The installed reducer retains phase decisions. */
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { install, KIT_VERSION } from '../installer/install.js';
import { parse, option } from './arguments.js';
import * as views from './views.js';
import { guard, plan_update } from './releases.js';
import { apply_update, recover_pending, save } from './update.js';
import { message, type View } from './types.js';
const HELP =
  'Usage: bh <command> [options]\n\nBoneHarness: initialize, inspect and maintain a repository harness.\n\nCommands: init, status, doctor, config, update\nCommon: --repo PATH --json\ninit/update: --kit PATH\nstatus: --task ID | --update ID; --export PATH (requires --task)\nupdate: --dry-run --yes --baseline PATH';
export async function main(
  argv: string[] = process.argv.slice(2),
  kit: string = path.resolve(__dirname, '..'),
): Promise<number> {
  const outputJson = argv.includes('--json');
  try {
    if (argv.length === 1 && argv[0] === '--version') {
      console.log('bh ' + KIT_VERSION);
      return 0;
    }
    if (argv.includes('--help') || argv.includes('-h')) {
      console.log(HELP);
      return 0;
    }
    const command = argv[0];
    if (!command || !['init', 'status', 'doctor', 'config', 'update'].includes(command))
      throw new Error('Choose a command: init, status, doctor, config, update');
    const valued = ['--repo'],
      flags = ['--json'];
    if (['init', 'update'].includes(command)) valued.push('--kit');
    if (command === 'status') valued.push('--task', '--update', '--export');
    if (command === 'update') {
      valued.push('--baseline');
      flags.push('--dry-run', '--yes');
    }
    const args = parse(argv.slice(1), valued, flags),
      repo = fs.realpathSync(path.resolve(option(args, '--repo') ?? process.cwd()));
    if (!fs.statSync(repo).isDirectory())
      throw new Error('Repository must be an existing directory');
    let code = 0,
      value: Exclude<
        View,
        {
          error: string;
        }
      >;
    if (command === 'init') {
      install(repo, { kit: path.resolve(option(args, '--kit') ?? kit) });
      value = views.inspect(repo, { fresh_checks: true });
      if (value.kind === 'setup' && !value.can_start) code = 1;
    } else if (command === 'config')
      value = { kind: 'config', ...views.profile(views.local(repo, '.harness')) };
    else if (command === 'status' || command === 'doctor') {
      if (args['--task'] && args['--update']) throw new Error('Choose --task or --update');
      value = views.inspect(repo, {
        task_id: option(args, '--task'),
        update_id: option(args, '--update'),
        fresh_checks: command === 'doctor',
      });
      if (command === 'doctor' && value.kind === 'setup' && !value.can_start) code = 1;
      const target = option(args, '--export');
      if (target) {
        if (!args['--task']) throw new Error('--export requires --task ID');
        const harness = path.join(repo, '.harness'),
          relative = path.isAbsolute(target)
            ? path.relative(harness, target).split(path.sep).join('/')
            : target,
          file = views.local(harness, relative, { missing: true });
        if (fs.existsSync(file)) throw new Error('Export already exists; choose another path');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(
          file,
          views.render(value, { export_root: path.dirname(file), repo }) + '\n',
          { flag: 'wx' },
        );
      }
    } else {
      if (!args['--dry-run']) {
        const recovered = recover_pending(repo);
        if (recovered) {
          console.log(outputJson ? JSON.stringify(recovered) : views.render(recovered));
          return recovered.status === 'RESTORED' ? 0 : 1;
        }
      }
      const plan = plan_update(repo, path.resolve(option(args, '--kit') ?? kit), {
        baseline: option(args, '--baseline'),
      });
      value = plan;
      if (plan.issues.length) code = 1;
      else if (!args['--dry-run'] && !plan.no_op) {
        if (!args['--yes']) {
          if (outputJson || !process.stdin.isTTY)
            throw new Error('Preview with --dry-run, then use --yes to apply this update');
          console.log(views.render(plan));
          const readline = createInterface({ input: process.stdin, output: process.stdout });
          let answer: string;
          try {
            answer = await readline.question('Apply this update? [y/N] ');
          } finally {
            readline.close();
          }
          if (answer.trim().toLowerCase() !== 'y') return 1;
        }
        value = apply_update(repo, plan);
        code = value.status === 'PUBLISHED' ? 0 : 1;
      }
    }
    if ((command === 'init' || command === 'doctor') && value.kind === 'setup') {
      const v = value;
      guard(
        path.join(repo, '.harness'),
        () =>
          save(
            views.local(path.join(repo, '.harness'), 'artifacts/installation/doctor.json', {
              missing: true,
            }),
            { checked_at: v.checked_at, status: v.status, issues: v.issues, gaps: v.gaps },
          ),
        { recovery: true },
      );
    }
    let output: unknown = value;
    if (outputJson && value.kind === 'update_plan') {
      const { inputs: _inputs, validation: _validation, base, candidate, ...rest } = value;
      output = {
        ...rest,
        ...(base
          ? {
              base: {
                version: base.version,
                formats: base.formats,
                runtime_api: base.runtime_api,
                identity: base.identity,
              },
            }
          : {}),
        ...(candidate
          ? {
              candidate: {
                version: candidate.version,
                formats: candidate.formats,
                runtime_api: candidate.runtime_api,
                identity: candidate.identity,
              },
            }
          : {}),
      };
    }
    console.log(outputJson ? JSON.stringify(output) : views.render(value));
    return code;
  } catch (error) {
    const value = { error: message(error) };
    console.log(outputJson ? JSON.stringify(value) : views.render(value));
    return 2;
  }
}
