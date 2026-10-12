import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Task, phaseRow, put, read, yaml, save, Data } from './support.js';
import { record_step } from '../../builder-kit/src/io/journal.js';
import { extract_context } from '../../builder-kit/src/context.js';
import { generate } from '../../builder-kit/src/entries/report.js';
function approve(t: Task, entry: Data, evidence?: Data): Data {
  const eid = entry.entry_id;
  if (!evidence) {
    put(join(t.docs, eid + '-approval.md'), `Presented result ${eid}. Human Ada: Approved.\n`);
    evidence = t.ev(eid + '-approval.md');
  }
  return t.write({
    action: 'review',
    record: eid,
    approval: {
      instruction: evidence,
      user: 'Ada',
      quote: 'Approved.',
      review: 'Human approved the presented phase result.',
    },
  });
}
function prepare(t: Task): void {
  for (const p of ['initialization', 'research', 'pattern_review']) {
    const row = t.phase(p);
    if (phaseRow(t, p).review?.status === 'PENDING') approve(t, row);
  }
}
function check(name: string, fn: (t: Task) => void, reviews: any = 'installed') {
  test('ReviewTests.' + name, () => {
    const t = new Task(reviews);
    try {
      fn(t);
    } finally {
      t.cleanup();
    }
  });
}
check('test_default_specification_waits_for_human', (t) => {
  prepare(t);
  const draft = t.accept();
  assert.equal(t.report().status, 'BLOCKED');
  assert.equal(phaseRow(t, 'specification').review.status, 'PENDING');
  assert.throws(() => t.phase('verification_plan'));
  approve(t, draft);
  t.phase('verification_plan');
  const row = phaseRow(t, 'specification');
  assert.equal(row.status, 'PASS');
  assert.equal(row.summary, 'Human approved the presented phase result.');
  assert.equal(
    row.evidence.at(-1).reference.path,
    t.ev(draft.entry_id + '-approval.md').reference.path,
  );
});
check('test_pending_review_is_visible_in_context_and_human_report', (t) => {
  prepare(t);
  const draft = t.accept(),
    context = extract_context(t.repo, t.harness, { task_id: 'task' });
  assert.match(context.next_action.toLowerCase(), /human/);
  assert.equal((context.next_phase as Data).review.record, draft.entry_id);
  const [, path] = generate(t.repo, t.harness, 'task', { markdown: true });
  assert.match(read(path).toLowerCase(), /awaiting human review/);
});
check(
  'test_llm_mode_completes_without_human_records',
  (t) => assert.equal(t.complete().status, 'COMPLETE'),
  { default: 'LLM', phases: {} },
);
check(
  'test_any_phase_can_require_review_including_final_verification',
  (t) => {
    for (const p of t.capture().workflow.phases) {
      const row =
        p.id === 'specification'
          ? t.accept()
          : p.id === 'specification_verification'
            ? t.verify()
            : p.proof === 'EXECUTION'
              ? t.phase(p.id, 'PASS', { operation: t.execute(p.id) })
              : t.phase(p.id);
      assert.equal(phaseRow(t, p.id).status, 'BLOCKED');
      approve(t, row);
      assert.equal(phaseRow(t, p.id).status, 'PASS');
    }
    assert.equal(t.report().status, 'COMPLETE');
  },
  { default: 'HUMAN', phases: {} },
);
check(
  'test_phase_override_can_allow_llm_review',
  (t) => {
    t.phase('initialization');
    t.phase('research');
    assert.equal(t.report().phases[0].status, 'PASS');
    assert.equal(t.report().phases[1].status, 'BLOCKED');
  },
  { default: 'HUMAN', phases: { initialization: 'LLM' } },
);
check('test_old_approval_does_not_approve_a_new_candidate', (t) => {
  prepare(t);
  const first = t.accept();
  approve(t, first);
  const second = t.accept();
  assert.throws(() => approve(t, second, t.ev(first.entry_id + '-approval.md')));
  approve(t, second);
});
check('test_superseded_candidate_cannot_be_approved', (t) => {
  prepare(t);
  const first = t.accept();
  t.accept();
  assert.throws(() => approve(t, first));
});
check('test_changed_draft_needs_new_submission', (t) => {
  prepare(t);
  const first = t.accept();
  put(join(t.docs, 'spec.md'), 'Changed requirement.\n');
  assert.throws(() => approve(t, first));
  const second = t.accept();
  approve(t, second);
  assert.equal(phaseRow(t, 'specification').status, 'PASS');
});
check(
  'test_approval_cannot_replace_verification_evidence',
  (t) =>
    assert.throws(() =>
      t.write({
        action: 'phase',
        phase: 'initialization',
        status: 'PASS',
        summary: 'No evidence',
        evidence: [],
      }),
    ),
  { default: 'HUMAN', phases: {} },
);
check(
  'test_skip_uses_existing_explicit_authorization',
  (t) => {
    t.skip('initialization');
    assert.equal(t.report().phases[0].status, 'USER_SKIPPED');
    for (const p of ['research', 'pattern_review']) t.skip(p);
    assert.throws(() => t.skip('specification'));
  },
  { default: 'HUMAN', phases: {} },
);
check('test_live_profile_edit_cannot_disable_captured_gate', (t) => {
  prepare(t);
  const path = join(t.harness, 'framework/config/repo-profile.yaml'),
    p = yaml(path);
  p.reviews = { default: 'LLM', phases: {} };
  save(path, p);
  t.accept();
  assert.equal(t.report().status, 'BLOCKED');
});
check('test_invalid_phase_in_review_settings_is_rejected', (t) => {
  const path = join(t.harness, 'framework/config/repo-profile.yaml'),
    p = yaml(path);
  p.reviews.phases = { specfication: 'HUMAN' };
  save(path, p);
  assert.throws(() =>
    record_step(
      t.repo,
      t.harness,
      'invalid',
      { action: 'start', request: t.ev('request.md') },
      { actor: 'reviewer' },
    ),
  );
});
check('test_research_can_be_revised_while_specification_waits', (t) => {
  prepare(t);
  t.accept();
  for (const p of ['research', 'pattern_review']) approve(t, t.phase(p));
  approve(t, t.accept());
  t.phase('verification_plan');
});
check(
  'test_changed_source_cannot_receive_old_phase_approval',
  (t) => {
    prepare(t);
    t.accept();
    t.phase('verification_plan');
    t.phase('implementation_plan');
    const draft = t.phase('implementation');
    put(join(t.repo, 'src/app.txt'), 'new source');
    const context = extract_context(t.repo, t.harness, { task_id: 'task' });
    assert.equal((context.next_phase as Data).status, 'UNVERIFIED');
    assert.doesNotMatch(context.next_action, /Awaiting human review/);
    assert.throws(() => approve(t, draft));
    approve(t, t.phase('implementation'));
  },
  { default: 'LLM', phases: { implementation: 'HUMAN' } },
);
