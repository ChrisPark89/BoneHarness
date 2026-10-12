import fs from 'node:fs';
import { adapter_status } from '../adapters.js';
import path from 'node:path';
import { parse, option } from '../cli/arguments.js';
import { message } from '../cli/types.js';
import { check_installation, new_report } from './checks.js';
export function main(argv: string[] = process.argv.slice(2)): number {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      'Read-only setup checker: --repo-root PATH [--harness-root .harness] [--format json|text] [--update RECORD_PATH]',
    );
    return 0;
  }
  let format = argv[argv.indexOf('--format') + 1] === 'json' ? 'json' : 'text',
    report = new_report();
  try {
    const args = parse(argv, ['--repo-root', '--harness-root', '--format', '--update'], []);
    format = option(args, '--format') ?? 'text';
    if (!['text', 'json'].includes(format)) throw new Error('Use --format json or text');
    const repo = option(args, '--repo-root');
    if (!repo || !path.isAbsolute(repo) || !fs.statSync(repo).isDirectory())
      throw new Error('--repo-root must be an existing absolute directory');
    report = check_installation(fs.realpathSync(repo), {
      update: option(args, '--update'),
      harness_root: option(args, '--harness-root'),
    });
  } catch (error) {
    report.exit_code = 2;
    report.diagnostics.push({ code: 'PREREQUISITE', path: 'checker', message: message(error) });
  }
  if (format === 'json') console.log(JSON.stringify(report, null, 2));
  else {
    console.log('Configuration:', report.configuration_id ?? 'UNAVAILABLE');
    console.log('Structure:', report.structure, '| Recorded activation:', report.activation);
    for (const [capability, adapter] of Object.entries(report.adapters))
      console.log(
        capability + ':',
        adapter.connection ?? 'not connected',
        '|',
        adapter_status(adapter),
        '|',
        adapter.reason,
      );
    for (const d of report.diagnostics) console.log(d.code, d.path, d.message);
    for (const l of report.limitations) console.log('Scope:', l);
  }
  return report.exit_code;
}
