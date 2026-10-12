/** Two controlled scenarios; keep the actual program tiny and retain failures. */
import { existsSync, readFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { install } from '../../builder-kit/src/installer/install.js';
import { record_step } from '../../builder-kit/src/io/journal.js';
import { run_command } from '../../builder-kit/src/io/command.js';
import { capture_task } from '../../builder-kit/src/reporting/evidence.js';
import { generate } from '../../builder-kit/src/entries/report.js';
import {
  put,
  read,
  yaml,
  save,
  json,
  KIT,
  ROOT,
  helper,
  Data,
  run,
} from '../typescript/support.js';
const SCOPE = { roots: ['src', 'scripts', 'test', 'package.json'], exclude: [] };
export const COMMANDS: Record<string, string[]> = {
  preflight: [process.execPath, '--check', 'src/calculator.js'],
  build: [process.execPath, 'scripts/build.mjs'],
  testing: [process.execPath, '--test', 'test/calculator.test.mjs'],
};
export function evidence(path: string, provenance = 'REVIEW', scope = 'HARNESS'): Data {
  return {
    reference: { kind: 'LOCAL', scope, path },
    provenance,
    summary: 'Retained demo review or actual command output.',
  };
}
export function setupDemo(repo: string): void {
  install(repo, { kit: KIT });
  const h = join(repo, '.harness');
  put(
    join(h, 'artifacts/installation/demo-review.md'),
    '# Controlled demo review\n\nRequested: verify the existing packaged calculator and demonstrate failure/repair. Source add returns a + b. Build checks syntax and copies the module to dist. Tests import dist and assert add(2,3)=5 and add(-2,3)=1. Local finite commands expose exit status and capturable output. Compatibility does not prove tool quality. Scripted examples; no independent LLM or human approval claimed.\n',
  );
  const p = join(h, 'framework/config/repo-profile.yaml'),
    profile = yaml(p);
  profile.reviews = { default: 'LLM', phases: {} };
  for (const [phase, command] of Object.entries(COMMANDS))
    profile.adapters[phase === 'testing' ? 'test' : phase] = {
      connection: command.join(' '),
      status: 'COMPATIBLE',
      reason: 'Local command, output and exit status reviewed.',
      evidence: ['artifacts/installation/installation-record.yaml'],
    };
  save(p, profile);
  const recordPath = join(h, 'artifacts/installation/installation-record.yaml'),
    record = yaml(recordPath);
  record.checks = Object.entries(COMMANDS).map(([phase, command]) => ({
    name: phase + '-interface',
    adapter: phase === 'testing' ? 'test' : phase,
    connection: command.join(' '),
    method: 'REVIEW',
    result: 'PASS',
    observations: 'Inspected local invocation, captured output and exit-status interpretation.',
    reason: 'Interface fits; tool quality is not established.',
    evidence: ['artifacts/installation/demo-review.md'],
  }));
  save(recordPath, record);
}
export function contextFromCli(repo: string, id: string): Data {
  let p = helper(repo, 'context', ['--task-id', id, '--format', 'json'], [0, 1]);
  const token = p.context_id,
    pieces = [p.excerpt];
  while (p.next_page) {
    p = helper(
      repo,
      'context',
      ['--task-id', id, '--format', 'json', '--page', String(p.next_page), '--context-id', token],
      [0, 1],
    );
    pieces.push(p.excerpt);
  }
  return JSON.parse(pieces.join(''));
}
export function scenario(repo: string, task: string, repair = false, useCli = false): Data {
  const h = join(repo, '.harness'),
    base = join(h, 'artifacts/development', task),
    docs = join(h, 'docs/development', task);
  put(
    join(docs, 'spec.md'),
    '# Calculator verification\n\n' +
      (repair
        ? 'Exercise a subtraction defect, retain failure, restore addition and recheck.'
        : 'Verify the existing calculator without changing source.') +
      '\n\n| Criterion | Required result | Evidence |\n|---|---|---|\n| sums | Packaged add(2,3)=5 and add(-2,3)=1 | Actual Node assertions after building |\n',
  );
  const review = evidence('artifacts/installation/demo-review.md'),
    spec = evidence(`docs/development/${task}/spec.md`),
    source = evidence('src/calculator.js', 'REVIEW', 'REPOSITORY'),
    tests = evidence('test/calculator.test.mjs', 'REVIEW', 'REPOSITORY');
  function write(step: Data): Data {
    const context =
      step.action === 'start'
        ? undefined
        : useCli
          ? contextFromCli(repo, task).context_id
          : capture_task(repo, h, task).context_id;
    if (useCli) {
      const path = join(base, 'step.yaml');
      save(path, step);
      return helper(repo, 'journal', [
        '--task-id',
        task,
        '--actor',
        'controlled-demo',
        '--step',
        path,
        ...(context ? ['--context-id', context] : []),
      ]);
    }
    return record_step(repo, h, task, step, { actor: 'controlled-demo', context_id: context });
  }
  function phase(
    name: string,
    summary: string,
    refs: Data[],
    status = 'PASS',
    extra: Data = {},
  ): Data {
    return write({ action: 'phase', phase: name, status, summary, evidence: refs, ...extra });
  }
  function attempt(n: number, expected: number): [Data, string] {
    let output: Data = {},
      operation = '';
    for (const [name, command] of Object.entries(COMMANDS)) {
      operation = name + '-' + n;
      const artifact = evidence(`artifacts/development/${task}/build-${n}.js`, 'EXECUTION');
      write({
        action: 'operation',
        operation_id: operation,
        phase: name,
        status: 'INTENT',
        connection: command.join(' '),
        command,
        evidence: [],
        ...(name === 'testing'
          ? { inputs: { target: 'dist/calculator.js', environment: 'local Node.js', artifact } }
          : {}),
      });
      const token = useCli
        ? contextFromCli(repo, task).context_id
        : capture_task(repo, h, task).context_id;
      const row = useCli
        ? helper(repo, 'command', [
            '--task-id',
            task,
            '--operation-id',
            operation,
            '--actor',
            'controlled-demo',
            '--context-id',
            token,
          ])
        : run_command(repo, h, task, operation, { actor: 'controlled-demo', context_id: token });
      output = row.payload.evidence[0];
      const result = json(join(h, output.reference.path)),
        refs = [output];
      if (name === 'preflight' && (result.stdout !== '' || result.stderr !== ''))
        throw new Error('Preflight should have raw empty output');
      if (name === 'build' && result.exit_code === 0) {
        copyFileSync(join(repo, 'dist/calculator.js'), join(base, `build-${n}.js`));
        refs.push(artifact);
        if (expected === 0) refs.push(evidence('dist/calculator.js', 'EXECUTION', 'REPOSITORY'));
      }
      phase(name, `Actual command exited ${result.exit_code}.`, refs, row.payload.outcome, {
        operation,
      });
      if ((result.exit_code === 0) !== ((name === 'testing' ? expected : 0) === 0))
        throw new Error('Unexpected command result: ' + operation);
    }
    return [output, operation];
  }
  write({ action: 'start', request: review, source_scope: SCOPE });
  phase('initialization', 'Demo request and inputs inspected.', [review]);
  phase('research', 'Build copies calculator; tests execute packaged output.', [review, tests]);
  phase('pattern_review', 'Existing ES modules and Node assertions fit.', [review, tests]);
  write({
    action: 'specification',
    document: spec,
    acceptance: { authority: review, review: 'Scope follows the explicit demo request.' },
    criteria: [
      {
        id: 'sums',
        description: 'Packaged positive and negative sums match assertions.',
        required: true,
        methods: ['EXECUTION'],
      },
    ],
    source_scope: SCOPE,
    reconcile_skips: [],
  });
  phase('verification_plan', 'Run syntax check, build and packaged-module assertions.', [tests]);
  phase(
    'implementation_plan',
    repair
      ? 'Exercise controlled defect then restore implementation.'
      : 'Existing implementation needs no changes.',
    [review],
  );
  const file = join(repo, 'src/calculator.js'),
    original = readFileSync(file);
  try {
    if (repair) {
      put(file, original.toString().replace('a + b', 'a - b'));
      copyFileSync(file, join(base, 'faulted-source.js'));
      phase('implementation', 'Deliberate defect prepared.', [
        evidence(`artifacts/development/${task}/faulted-source.js`),
      ]);
      attempt(1, 1);
      put(file, original);
    }
    phase('implementation', 'Existing addition meets both required sums.', [source]);
    const [output, operation] = attempt(repair ? 2 : 1, 0);
    phase(
      'specification_verification',
      'Both assertions passed against current package.',
      [tests, output],
      'PASS',
      {
        criteria: [
          {
            criterion_id: 'sums',
            result: 'PASS',
            method: 'EXECUTION',
            reason: 'Assertions cover both required sums.',
            evidence: [output],
            operation,
          },
        ],
      },
    );
    phase('final_review', 'Current source and evidence cover specification.', [source, spec]);
    if (useCli) helper(repo, 'report', ['--task-id', task, '--json']);
    else generate(repo, h, task);
    const report = json(join(base, 'report.json'));
    if (report.status !== 'COMPLETE') throw new Error(task + ': ' + report.status);
    return report;
  } finally {
    if (!readFileSync(file).equals(original)) {
      put(file, original);
      run(COMMANDS.build!, repo);
    }
  }
}
export function main(repo = join(ROOT, 'tests/demo')): void {
  const original = readFileSync(join(repo, 'src/calculator.js'));
  if (original.toString().split('a + b').length !== 2)
    throw new Error('Demo requires one original a + b expression');
  setupDemo(repo);
  for (const id of ['success', 'failure-repair']) {
    scenario(repo, id, id === 'failure-repair');
    console.log(id + ': COMPLETE');
  }
  for (const id of ['success', 'failure-repair'])
    if (generate(repo, join(repo, '.harness'), id)[0].status !== 'COMPLETE')
      throw new Error('Final evidence became stale');
  if (!readFileSync(join(repo, 'src/calculator.js')).equals(original))
    throw new Error('Source was not restored');
  console.log(
    'Review: bh status --task success; bh status --task failure-repair\nControlled scripted run; no human approval claimed.',
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main(process.argv[2] ? resolve(process.argv[2]) : undefined);
