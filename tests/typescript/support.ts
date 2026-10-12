import assert from 'node:assert/strict';
import {
  mkdtempSync,
  realpathSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse, stringify } from 'yaml';
import { record_step, canonical_json, make_entry } from '../../builder-kit/src/io/journal.js';
import { capture_task } from '../../builder-kit/src/reporting/evidence.js';
import type { Capture, Payload, Report } from '../../builder-kit/src/reporting/types.js';
import { derive_report } from '../../builder-kit/src/reporting/summary.js';
function projectRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(current, 'builder-kit/package.json'))) {
    const parent = dirname(current);
    if (parent === current) throw new Error('Test checkout root not found');
    current = parent;
  }
  return current;
}
export const ROOT = resolve(process.env.BH_TEST_ROOT ?? projectRoot()),
  KIT = join(ROOT, 'builder-kit');
export const TOOLS = join(KIT, 'harness/framework/tools');
export type Data = Record<string, any>;
export function temp(prefix = 'bh test ü '): string {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}
export function put(path: string, value: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}
export function read(path: string): string {
  return readFileSync(path, 'utf8');
}
export function yaml(path: string): Data {
  return parse(read(path));
}
export function save(path: string, value: unknown): void {
  put(path, stringify(value, { defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN' }));
}
export function json(path: string): Data {
  return JSON.parse(read(path));
}
export function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(root, e.name)) : [join(root, e.name)],
  );
}
export function inventory(root: string): Data {
  return Object.fromEntries(
    files(root)
      .sort()
      .map((p) => [relative(root, p), createHash('sha256').update(readFileSync(p)).digest('hex')]),
  );
}
export function run(
  args: string[],
  cwd = ROOT,
  code: number | number[] = 0,
  env = process.env,
): string {
  const r = spawnSync(args[0]!, args.slice(1), { cwd, encoding: 'utf8', env });
  assert.ok(
    (Array.isArray(code) ? code : [code]).includes(r.status ?? -1),
    `Exit ${r.status}; expected ${code}: ${r.stdout}${r.stderr}${r.error ?? ''}`,
  );
  return r.stdout;
}
export function cli(repo: string, args: string[], code = 0): Data {
  return JSON.parse(
    run(
      [process.execPath, join(KIT, 'dist/bh.cjs'), ...args, '--repo', repo, '--json'],
      ROOT,
      code,
    ),
  );
}
export function helper(
  repo: string,
  name: string,
  args: string[],
  code: number | number[] = 0,
): Data {
  return JSON.parse(
    run(
      [
        process.execPath,
        join(repo, '.harness/framework/tools', name + '.cjs'),
        '--repo-root',
        repo,
        ...args,
      ],
      repo,
      code,
    ),
  );
}
export function candidate(repo: string): string {
  const dest = repo + ' kit';
  cpSync(KIT, dest, { recursive: true, filter: (p) => !p.includes('node_modules') });
  const release = json(join(dest, 'release.json'));
  release.version = '3.0.1';
  put(join(dest, 'release.json'), JSON.stringify(release));
  put(
    join(dest, 'harness/framework/workflows/shared/recovery.md'),
    '# Recovery\n\nCandidate instructions.\n',
  );
  return dest;
}
export function clean(...roots: string[]): void {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}
export class Task {
  repo: string;
  harness: string;
  docs: string;
  log: string;
  constructor(reviews: any = undefined, repo?: string) {
    this.repo = repo ?? temp();
    this.harness = join(this.repo, '.harness');
    if (!existsSync(this.harness)) cpSync(join(KIT, 'harness'), this.harness, { recursive: true });
    this.docs = join(this.harness, 'docs/development/task');
    this.log = join(this.harness, 'artifacts/development/task/output.log');
    put(join(this.repo, 'src/app.txt'), 'accepted implementation\n');
    put(
      join(this.docs, 'request.md'),
      'User Ada: implement the accepted requirement. Skip every optional phase. I accept the specification.\n',
    );
    put(join(this.docs, 'spec.md'), 'acceptance-1: implementation contains the accepted text.\n');
    put(join(this.docs, 'review.md'), 'Reviewed actual source: accepted text is present.\n');
    put(this.log, 'Actual local check: expected source text found; exit 0.\n');
    const path = join(this.harness, 'framework/config/repo-profile.yaml'),
      profile = yaml(path);
    if (reviews !== 'installed') profile.reviews = reviews ?? { default: 'LLM', phases: {} };
    const recordPath = join(this.harness, 'artifacts/installation/installation-record.yaml');
    const record = existsSync(recordPath) ? yaml(recordPath) : null;
    for (const [name, binding] of Object.entries(profile.adapters) as [string, Data][]) {
      Object.assign(binding, {
        connection: 'local:' + name,
        status: 'COMPATIBLE',
        reason: 'Checked local fixture interface.',
        evidence: record
          ? ['artifacts/installation/installation-record.yaml']
          : ['docs/development/task/review.md'],
      });
      if (record)
        record.checks.push({
          name,
          adapter: name,
          connection: 'local:' + name,
          method: 'REVIEW',
          observations: 'Test fixture has finite result/evidence.',
          result: 'PASS',
          reason: 'Interface fixture.',
          evidence: ['docs/development/task/review.md'],
        });
    }
    save(path, profile);
    if (record) save(recordPath, record);
    this.write({
      action: 'start',
      request: this.ev('request.md'),
      source_scope: { roots: ['src'], exclude: [] },
    });
  }
  cleanup(): void {
    clean(this.repo);
  }
  ev(file = 'review.md', provenance = 'REVIEW'): Data {
    return {
      reference: {
        kind: 'LOCAL',
        scope: 'HARNESS',
        path:
          file === 'output.log'
            ? 'artifacts/development/task/output.log'
            : 'docs/development/task/' + file,
      },
      provenance,
      summary: 'Actual captured evidence.',
    };
  }
  approval(quote = 'Skip every optional phase.'): Data {
    return {
      instruction: this.ev('request.md'),
      user: 'Ada',
      quote,
      review: 'Original explicit instruction applies to this phase, task and scope.',
    };
  }
  capture(): Capture {
    return capture_task(this.repo, this.harness, 'task');
  }
  report(): Report {
    return derive_report(this.capture());
  }
  write(step: Data): Data {
    const context = existsSync(join(this.harness, 'artifacts/development/task/history.jsonl'))
      ? this.capture().context_id
      : undefined;
    return record_step(this.repo, this.harness, 'task', step, {
      actor: 'reviewer',
      context_id: context,
    });
  }
  phase(name: string, status = 'PASS', extra: Data = {}): Data {
    return this.write({
      action: 'phase',
      phase: name,
      status,
      summary: 'Reviewed phase outcome.',
      evidence: [this.ev()],
      ...extra,
    });
  }
  skip(name: string): Data {
    return this.phase(name, 'USER_SKIPPED', { approval: this.approval() });
  }
  accept(extra: Data = {}): Data {
    return this.write({
      action: 'specification',
      document: this.ev('spec.md'),
      acceptance: {
        authority: this.ev('request.md'),
        review: 'Reviewed and accepted under the actual request authority.',
      },
      criteria: [
        {
          id: 'acceptance-1',
          description: 'Accepted text exists.',
          required: true,
          methods: ['REVIEW'],
        },
      ],
      source_scope: { roots: ['src'], exclude: [] },
      reconcile_skips: this.report()
        .phases.filter((p: Data) => p.status === 'USER_SKIPPED')
        .map((p: Data) => p.record),
      ...extra,
    });
  }
  execute(phase: string, op = phase + '-1', outcome = 'PASS'): string {
    const capability =
      ({ testing: 'test', pattern_review: 'pattern_search' } as Data)[phase] ?? phase;
    this.write({
      action: 'operation',
      operation_id: op,
      phase,
      status: 'INTENT',
      connection: 'local:' + capability,
      evidence: [],
    });
    this.write({
      action: 'operation',
      operation_id: op,
      status: 'COMPLETED',
      outcome,
      evidence: [this.ev('output.log', 'EXECUTION')],
    });
    return op;
  }
  verify(): Data {
    return this.phase('specification_verification', 'PASS', {
      criteria: [
        {
          criterion_id: 'acceptance-1',
          result: 'PASS',
          method: 'REVIEW',
          reason: 'Actual source reviewed.',
          evidence: [this.ev()],
        },
      ],
    });
  }
  complete(skipped = false): Data {
    for (const p of this.capture().workflow.phases) {
      if (p.id === 'specification') this.accept();
      else if (p.id === 'specification_verification') this.verify();
      else if (skipped) this.skip(p.id);
      else if (p.proof === 'EXECUTION') this.phase(p.id, 'PASS', { operation: this.execute(p.id) });
      else this.phase(p.id);
    }
    return this.report();
  }
  append(payload: Data): Data {
    const entries = this.capture().entries,
      row = make_entry(payload as Payload, 'external-author', entries.at(-1));
    const path = join(this.harness, 'artifacts/development/task/history.jsonl');
    writeFileSync(
      path,
      Buffer.concat([readFileSync(path), canonical_json(row), Buffer.from('\n')]),
    );
    return row;
  }
}
export function preparatory(t: Task): void {
  for (const p of ['initialization', 'research', 'pattern_review']) t.phase(p);
}
export function implementation(t: Task): void {
  preparatory(t);
  t.accept();
  for (const p of ['verification_plan', 'implementation_plan', 'implementation']) t.phase(p);
}
export function phaseRow(t: Task, name: string): Data {
  const phase = t.report().phases.find((p) => p.id === name);
  assert.ok(phase, 'Missing phase ' + name);
  return phase;
}
