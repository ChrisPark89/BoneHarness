import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  Task,
  temp,
  clean,
  cli,
  run,
  put,
  read,
  yaml,
  save,
  json,
  inventory,
  KIT,
  candidate,
  Data,
} from './support.js';
import { release_info } from '../../builder-kit/src/installer/install.js';
import { record_step } from '../../builder-kit/src/io/journal.js';
import { generate } from '../../builder-kit/src/entries/report.js';
import type { View } from '../../builder-kit/src/cli/types.js';
import { render } from '../../builder-kit/src/cli/views.js';
function check(group: string, name: string, fn: (repo: string) => void) {
  test(group + '.' + name, () => {
    const repo = temp();
    try {
      fn(repo);
    } finally {
      clean(repo, repo + ' kit');
    }
  });
}
check('InitTests', 'test_help_and_version', () => {
  for (const arg of ['--help', '--version'])
    assert.match(
      run([process.execPath, join(KIT, 'dist/bh.cjs'), arg]),
      arg === '--help' ? /bh/ : /3\.0\.0/,
    );
});
check('InitTests', 'test_init_gaps_defaults_and_receipt', (r) => {
  const v = cli(r, ['init']);
  assert.equal(v.can_start, true);
  assert.deepEqual(readdirSync(r), ['.harness']);
  assert.ok(v.gaps.length);
  assert.deepEqual(cli(r, ['config']).reviews, {
    default: 'HUMAN',
    phases: { initialization: 'LLM' },
  });
  const receipt = json(join(r, '.harness/artifacts/installation/kit-receipt.json'));
  assert.equal(receipt.version, '3.0.0');
  assert.equal('framework/config/repo-profile.yaml' in receipt.managed, false);
  const before = inventory(r);
  cli(r, ['init'], 2);
  assert.deepEqual(inventory(r), before);
});
check('InitTests', 'test_no_automatic_human_status_pages', (r) => {
  cli(r, ['init']);
  assert.equal(existsSync(join(r, '.harness/docs/setup.md')), false);
  assert.ok(existsSync(join(r, '.harness/README.md')));
  assert.ok(existsSync(join(r, '.harness/framework/templates/development/task-spec.md')));
});
check('InitTests', 'test_release_identity_preserves_unicode_paths', () => {
  const receipt = release_info(KIT, { 'framework/ü.md': Buffer.from('example') });
  const canonical = (v: any): any =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])]),
          )
        : v;
  const { identity, ...payload } = receipt;
  assert.equal(
    identity,
    'sha256:' +
      createHash('sha256')
        .update(JSON.stringify(canonical(payload)))
        .digest('hex'),
  );
});
check('ViewTests', 'test_status_config_read_only_and_empty_task_list', (r) => {
  cli(r, ['init']);
  const before = inventory(r),
    v = cli(r, ['status']);
  assert.deepEqual(v.tasks, []);
  assert.equal(v.can_start, true);
  cli(r, ['config']);
  assert.deepEqual(inventory(r), before);
});
check('ViewTests', 'test_doctor_reports_optional_gaps_without_failure', (r) => {
  cli(r, ['init']);
  const v = cli(r, ['doctor']);
  assert.equal(v.can_start, true);
  assert.equal(v.status, 'WARN');
  assert.ok(v.gaps.some((row: Data) => row.phase === 'build'));
  assert.ok(v.checked_at);
});
check('ViewTests', 'test_doctor_reports_structural_failure', (r) => {
  cli(r, ['init']);
  unlinkSync(join(r, '.harness/framework/workflows/development/workflow.yaml'));
  const v = cli(r, ['doctor'], 1);
  assert.equal(v.can_start, false);
  assert.ok(v.issues.length);
});
check('ViewTests', 'test_invalid_task_and_path_are_clear_errors', (r) => {
  cli(r, ['init']);
  for (const id of ['absent', '../outside']) assert.ok(cli(r, ['status', '--task', id], 2).error);
});
check('ViewTests', 'test_bad_configuration_is_not_a_traceback', (r) => {
  cli(r, ['init']);
  put(join(r, '.harness/framework/config/repo-profile.yaml'), 'invalid: [');
  assert.ok(cli(r, ['config'], 2).error);
});
// Bundles remove site-package dependency failure. Equivalent executable-runtime check: missing required helper is diagnosed without a traceback.
check('ViewTests', 'test_missing_dependencies_still_return_doctor_diagnostics', (r) => {
  cli(r, ['init']);
  unlinkSync(join(r, '.harness/framework/tools/check.cjs'));
  const v = cli(r, ['doctor'], 1);
  assert.equal(v.status, 'FAIL');
  assert.ok(v.issues.some((i: Data) => i.code === 'ENVIRONMENT' && i.action));
});
check('ViewTests', 'test_missing_requirements_retains_structural_and_environment_findings', (r) => {
  cli(r, ['init']);
  unlinkSync(join(r, '.harness/framework/tools/check.cjs'));
  unlinkSync(join(r, '.harness/framework/workflows/development/workflow.yaml'));
  const v = cli(r, ['doctor'], 1);
  assert.equal(v.status, 'FAIL');
  assert.ok(v.issues.some((i: Data) => i.code === 'ENVIRONMENT'));
  assert.ok(v.issues.length > 1);
});
check('ViewTests', 'test_doctor_checks_new_helpers_after_configuration_changes', (r) => {
  cli(r, ['init']);
  const h = join(r, '.harness'),
    p = join(h, 'framework/config/repo-profile.yaml'),
    v = yaml(p);
  v.configuration_id = 'cfg-updated';
  save(p, v);
  for (const name of ['view.cjs', 'journal.cjs']) {
    const path = join(h, 'framework/tools', name),
      raw = readFileSync(path);
    unlinkSync(path);
    assert.equal(cli(r, ['doctor'], 1).can_start, false);
    put(path, raw);
  }
});
check('TaskViews', 'test_reviews_multiple_tasks_export_and_read_only_status', (r) => {
  cli(r, ['init']);
  const t = new Task('installed', r);
  t.phase('initialization');
  t.phase('research');
  record_step(
    r,
    t.harness,
    'another',
    { action: 'start', request: t.ev('request.md') },
    { actor: 'fixture' },
  );
  const before = inventory(r),
    index = cli(r, ['status']);
  assert.deepEqual(index.tasks.map((v: Data) => v.id).sort(), ['another', 'task']);
  assert.equal(cli(r, ['status', '--task', 'task']).report.status, 'BLOCKED');
  assert.deepEqual(inventory(r), before);
  cli(r, ['status', '--task', 'task', '--export', 'docs/development/task/export.md']);
  const content = read(join(t.docs, 'export.md'));
  assert.match(content, /HUMAN pending/);
  assert.match(content, /Next:/);
  assert.equal(existsSync(join(t.docs, 'report.md')), false);
  cli(r, ['status', '--task', 'task', '--export', '../escape.md'], 2);
});
check(
  'TaskViews',
  'test_completed_history_stays_closed_and_pending_reviews_survive_update',
  (r) => {
    cli(r, ['init']);
    const t = new Task(undefined, r);
    t.complete(true);
    generate(r, t.harness, 'task');
    const path = join(t.harness, 'artifacts/development/task/history.jsonl'),
      before = readFileSync(path);
    put(join(r, 'src/app.txt'), 'later repository work');
    assert.equal(cli(r, ['status', '--task', 'task']).report.status, 'COMPLETE');
    const kit = candidate(r);
    assert.equal(
      cli(r, ['update', '--kit', kit, '--dry-run']).tasks[0].compatibility,
      'COMPATIBLE',
    );
    cli(r, ['update', '--kit', kit, '--yes']);
    assert.deepEqual(readFileSync(path), before);
    assert.equal(cli(r, ['status', '--task', 'task']).report.status, 'COMPLETE');
  },
);
check('TaskViews', 'test_unfinished_review_survives_and_open_operation_blocks', (r) => {
  cli(r, ['init']);
  const t = new Task('installed', r);
  t.phase('initialization');
  t.phase('research');
  const kit = candidate(r),
    before = t.report().phases[1].review;
  cli(r, ['update', '--kit', kit, '--yes']);
  assert.deepEqual(cli(r, ['status', '--task', 'task']).report.phases[1].review, before);
});
check('TaskViews', 'test_open_operations_and_unknown_records_block_update', (r) => {
  cli(r, ['init']);
  const t = new Task(undefined, r);
  for (const p of ['initialization', 'research', 'pattern_review']) t.phase(p);
  t.accept();
  for (const p of ['verification_plan', 'implementation_plan', 'implementation']) t.phase(p);
  t.write({
    action: 'operation',
    operation_id: 'pending',
    phase: 'preflight',
    status: 'INTENT',
    connection: 'local:preflight',
    evidence: [],
  });
  const kit = candidate(r);
  assert.match(
    cli(r, ['update', '--kit', kit, '--dry-run'], 1).issues.join(' '),
    /Unresolved operations/,
  );
  put(join(t.harness, 'artifacts/development/task/history.jsonl'), 'unsupported\n');
  assert.ok(cli(r, ['update', '--kit', kit, '--dry-run'], 1).issues.length);
});
check('TaskViews', 'test_missing_completion_report_after_source_drift_is_unknown', (r) => {
  cli(r, ['init']);
  const t = new Task(undefined, r);
  t.complete(true);
  put(join(r, 'src/app.txt'), 'later unrelated work');
  assert.match(
    cli(r, ['update', '--kit', candidate(r), '--dry-run'], 1).issues.join(' '),
    /completion report/,
  );
});
check('TaskViews', 'test_failure_evidence_is_linked_after_repair', (r) => {
  cli(r, ['init']);
  const t = new Task(undefined, r);
  put(
    join(t.docs, 'failure.md'),
    'Controlled fixture: research attempt could not resolve the pattern.\n',
  );
  t.write({
    action: 'phase',
    phase: 'research',
    status: 'FAIL',
    summary: 'Fixture failure.',
    evidence: [t.ev('failure.md')],
  });
  t.complete(true);
  const text = render(cli(r, ['status', '--task', 'task']) as View);
  assert.match(text, /Earlier failure\/uncertainty:/);
  assert.match(text, /failure.md\)/);
});
