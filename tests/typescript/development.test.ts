import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { Task, preparatory, implementation, phaseRow, put, read, yaml, save } from './support.js';
import {
  parse_history,
  canonical_json,
  make_entry,
  record_step,
  content_identity,
} from '../../builder-kit/src/io/journal.js';
import { capture_task } from '../../builder-kit/src/reporting/evidence.js';
import { generate } from '../../builder-kit/src/entries/report.js';
function check(name: string, fn: (t: Task) => void) {
  test('DevelopmentTests.' + name, () => {
    const t = new Task();
    try {
      fn(t);
    } finally {
      t.cleanup();
    }
  });
}
check('test_standard_route_completes', (t) => {
  const r = t.complete();
  assert.equal(r.status, 'COMPLETE');
  assert.ok(r.phases.every((p: any) => p.status === 'PASS'));
});
check('test_explicit_skips_complete_without_fabricating_success', (t) => {
  const r = t.complete(true);
  assert.equal(r.status, 'COMPLETE');
  assert.equal(r.phases.filter((p: any) => p.status === 'USER_SKIPPED').length, 10);
  assert.deepEqual(t.capture().operations, {});
});
check('test_required_phases_cannot_skip', (t) => {
  preparatory(t);
  assert.throws(() => t.skip('specification'));
  t.accept();
  for (const p of [
    'verification_plan',
    'implementation_plan',
    'implementation',
    'preflight',
    'build',
    'testing',
  ])
    t.skip(p);
  assert.throws(() => t.skip('specification_verification'));
});
check('test_pre_spec_skips_need_explicit_acceptance_reconciliation', (t) => {
  for (const p of ['initialization', 'research', 'pattern_review']) t.skip(p);
  assert.throws(() => t.accept({ reconcile_skips: [] }), /reconcile/);
  t.accept();
});
check('test_skip_does_not_waive_accepted_criterion', (t) => {
  for (const p of ['initialization', 'research', 'pattern_review']) t.skip(p);
  t.accept();
  for (const p of [
    'verification_plan',
    'implementation_plan',
    'implementation',
    'preflight',
    'build',
    'testing',
  ])
    t.skip(p);
  assert.throws(() => t.phase('specification_verification'), /criterion/);
});
check('test_fixtures_and_missing_approval_refused', (t) => {
  const approval = t.approval();
  approval.instruction.provenance = 'FIXTURE';
  assert.throws(() => t.phase('initialization', 'USER_SKIPPED', { approval }));
  assert.throws(() => t.phase('initialization', 'USER_SKIPPED'));
});
check('test_unknown_operation_blocks_skip_until_actual_reconciliation', (t) => {
  implementation(t);
  t.write({
    action: 'operation',
    operation_id: 'p1',
    phase: 'preflight',
    status: 'INTENT',
    connection: 'local:preflight',
    evidence: [],
  });
  t.write({ action: 'operation', operation_id: 'p1', status: 'UNKNOWN', evidence: [] });
  assert.throws(() => t.skip('preflight'), /Reconcile/);
  assert.throws(() =>
    t.write({ action: 'operation', operation_id: 'p1', status: 'CANCELLED', evidence: [] }),
  );
  t.write({
    action: 'operation',
    operation_id: 'p1',
    status: 'CANCELLED',
    evidence: [t.ev('output.log', 'EXECUTION')],
  });
  t.skip('preflight');
});
check('test_closed_operation_cannot_replace_failure', (t) => {
  implementation(t);
  t.execute('preflight', undefined, 'FAIL');
  assert.throws(
    () =>
      t.write({
        action: 'operation',
        operation_id: 'preflight-1',
        status: 'COMPLETED',
        outcome: 'PASS',
        evidence: [t.ev('output.log', 'EXECUTION')],
      }),
    /Closed/,
  );
});
check('test_operation_cannot_satisfy_another_phase', (t) => {
  implementation(t);
  const operation = t.execute('preflight');
  t.phase('preflight', 'PASS', { operation });
  assert.throws(() => t.phase('build', 'PASS', { operation }), /matching successful/);
});
check('test_wrong_adapter_cannot_dispatch', (t) => {
  implementation(t);
  assert.throws(
    () =>
      t.write({
        action: 'operation',
        operation_id: 'wrong',
        phase: 'preflight',
        status: 'INTENT',
        connection: 'local:build',
        evidence: [],
      }),
    /adapter/,
  );
});
check('test_source_change_invalidates_prerequisites_and_completion', (t) => {
  t.complete();
  put(join(t.repo, 'src/app.txt'), 'changed');
  assert.notEqual(t.report().status, 'COMPLETE');
  assert.throws(
    () =>
      t.write({
        action: 'operation',
        operation_id: 'new-build',
        phase: 'build',
        status: 'INTENT',
        connection: 'local:build',
        evidence: [],
      }),
    /stale/,
  );
});
check('test_stale_context_is_refused', (t) => {
  const context = t.capture().context_id;
  put(join(t.repo, 'src/new.txt'), 'new');
  assert.throws(
    () =>
      record_step(
        t.repo,
        t.harness,
        'task',
        { action: 'source' },
        { actor: 'reviewer', context_id: context },
      ),
    /STALE_CONTEXT/,
  );
});
check('test_spec_revision_reopens_work_without_reusing_old_success', (t) => {
  t.complete();
  put(
    join(t.docs, 'spec.md'),
    'Revised accepted specification: same source, new explicit acceptance.\n',
  );
  assert.notEqual(t.report().status, 'COMPLETE');
  assert.equal(t.report().open_operations.length, 0);
  t.accept();
  assert.equal(phaseRow(t, 'build').status, 'NOT_STARTED');
  for (const p of ['verification_plan', 'implementation_plan', 'implementation']) t.phase(p);
  assert.throws(
    () => t.phase('preflight', 'PASS', { operation: 'preflight-1' }),
    /matching successful/,
  );
  for (const p of ['preflight', 'build', 'testing'])
    t.phase(p, 'PASS', { operation: t.execute(p, p + '-2') });
  t.verify();
  t.phase('final_review');
  assert.equal(t.report().status, 'COMPLETE');
});
check('test_timestamp_requires_valid_string', (t) => {
  const entry = t.capture().entries[0];
  for (const timestamp of [123, {}, '2026-02-31T00:00:00Z']) {
    const row = make_entry(entry.payload, 'reviewer', undefined, { timestamp: timestamp as any });
    assert.throws(() =>
      parse_history(Buffer.concat([canonical_json(row), Buffer.from('\n')]), 'task'),
    );
  }
});
check('test_report_retains_failure_links_and_original_bytes', (t) => {
  t.phase('initialization', 'FAIL');
  t.skip('initialization');
  for (const p of ['research', 'pattern_review']) t.skip(p);
  t.accept();
  for (const p of [
    'verification_plan',
    'implementation_plan',
    'implementation',
    'preflight',
    'build',
    'testing',
  ])
    t.skip(p);
  t.verify();
  t.skip('final_review');
  const history = join(t.harness, 'artifacts/development/task/history.jsonl'),
    before = readFileSync(history);
  const [report, path] = generate(t.repo, t.harness, 'task', { markdown: true });
  const text = read(path);
  assert.equal(report.status, 'COMPLETE');
  assert.deepEqual(readFileSync(history), before);
  assert.match(text, /USER_SKIPPED \| \[approval\]\(request.md\)/);
  assert.match(text, /Prior failure\/uncertainty records: 1/);
  assert.ok(
    text
      .replace(/<!--[\s\S]*?-->|\([^)]*\)/g, '')
      .trim()
      .split(/\s+/).length <= 200,
  );
});
check('test_unknown_phase_refused_without_append', (t) => {
  const path = join(t.harness, 'artifacts/development/task/history.jsonl'),
    before = readFileSync(path);
  for (const status of ['PASS', 'FAIL', 'UNKNOWN'])
    assert.throws(() => t.phase('bogus', status), /Unknown phase/);
  assert.deepEqual(readFileSync(path), before);
});
check('test_format_one_explicitly_refused', () => {
  assert.throws(
    () => parse_history(Buffer.from('{"journal_version":"1.0.0"}\n'), 'task'),
    /UNSUPPORTED_FORMAT/,
  );
});
check('test_terminal_reconciliation_can_arrive_after_specification_changes', (t) => {
  implementation(t);
  t.write({
    action: 'operation',
    operation_id: 'late',
    phase: 'preflight',
    status: 'INTENT',
    connection: 'local:preflight',
    evidence: [],
  });
  put(join(t.docs, 'spec.md'), 'Changed specification requires fresh acceptance.\n');
  t.write({
    action: 'operation',
    operation_id: 'late',
    status: 'COMPLETED',
    outcome: 'PASS',
    evidence: [t.ev('output.log', 'EXECUTION')],
  });
  assert.equal(t.report().open_operations.length, 0);
  t.accept();
  assert.equal(phaseRow(t, 'preflight').status, 'NOT_STARTED');
});
check('test_configuration_is_pinned_per_task', (t) => {
  const before = t.capture().task.configuration,
    path = join(t.harness, 'framework/config/repo-profile.yaml'),
    value = yaml(path);
  value.configuration_id = 'cfg-next';
  save(path, value);
  assert.deepEqual(t.capture().task.configuration, before);
  record_step(
    t.repo,
    t.harness,
    'next',
    { action: 'start', request: t.ev('request.md') },
    { actor: 'reviewer' },
  );
  const after = capture_task(t.repo, t.harness, 'next').task.configuration;
  assert.equal(after.id, 'cfg-next');
  assert.notEqual(after.bundle, before.bundle);
});
check('test_storage_symlinks_refused_before_external_directory_creation', (t) => {
  for (const directory of ['development', 'configurations']) {
    const original = join(t.harness, 'artifacts', directory),
      retained = original + '-retained',
      escaped = join(t.repo, 'escaped-' + directory);
    renameSync(original, retained);
    mkdirSync(escaped);
    symlinkSync(escaped, original, 'dir');
    try {
      assert.throws(() =>
        record_step(
          t.repo,
          t.harness,
          'fresh-' + directory,
          { action: 'start', request: t.ev('request.md') },
          { actor: 'reviewer' },
        ),
      );
      assert.deepEqual(readdirSync(escaped), []);
    } finally {
      unlinkSync(original);
      renameSync(retained, original);
    }
  }
});
check('test_initial_source_is_captured', (t) =>
  assert.equal(t.capture().entries[1].payload.record_type, 'SourceInventory'),
);
check('test_all_optional_specification_refused', (t) => {
  preparatory(t);
  assert.throws(
    () =>
      t.accept({
        criteria: [
          { id: 'optional', description: 'Optional.', required: false, methods: ['REVIEW'] },
        ],
      }),
    /required/,
  );
});
check('test_unsupported_intent_cannot_be_laundered_by_terminal_record', (t) => {
  implementation(t);
  const c = t.capture(),
    payload = {
      schema_version: '2.0.0',
      record_type: 'Operation',
      operation_id: 'bad',
      phase: 'preflight',
      status: 'INTENT',
      source: c.current_source,
      specification: c.specification!.entry_id,
      connection: 'local:build',
      evidence: [],
    };
  t.append(payload);
  const evidence = t.ev('output.log', 'EXECUTION');
  evidence.identity = content_identity(readFileSync(t.log));
  t.append({ ...payload, status: 'COMPLETED', outcome: 'PASS', evidence: [evidence] });
  const r = t.report();
  assert.ok(r.issues.some((i: any) => i.message.includes('origin')));
  assert.notEqual(r.status, 'COMPLETE');
});
