import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, relative } from 'node:path';
import {
  existsSync,
  readFileSync,
  unlinkSync,
  symlinkSync,
  appendFileSync,
  copyFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import {
  temp,
  put,
  clean,
  read,
  yaml,
  save,
  json,
  inventory,
  helper,
  KIT,
  ROOT,
  Data,
} from './support.js';
import { install } from '../../builder-kit/src/installer/install.js';
class Setup {
  repo = temp();
  harness = join(this.repo, '.harness');
  profilePath = join(this.harness, 'framework/config/repo-profile.yaml');
  constructor() {
    put(join(this.repo, 'AGENTS.md'), 'Keep my instructions.\n');
    install(this.repo, { kit: KIT });
  }
  profile(): Data {
    return yaml(this.profilePath);
  }
  save(value: Data) {
    save(this.profilePath, value);
  }
  check(args: string[] = [], code = 0): Data {
    return helper(this.repo, 'check', ['--format', 'json', ...args], code);
  }
  context(args: string[] = [], code = 0): Data {
    return helper(this.repo, 'context', ['--format', 'json', ...args], code);
  }
  assess(method = 'REVIEW', maintenance = false): [string, Data] {
    const path = join(
      this.harness,
      maintenance
        ? 'artifacts/maintenance/adapter/update.yaml'
        : 'artifacts/installation/installation-record.yaml',
    );
    const v = maintenance
      ? {
          schema_version: '2.0.0',
          record_type: 'Update',
          id: 'adapter',
          request: 'Review adapter interface',
          base_configuration: 'old',
          candidate_configuration: 'cfg-1',
          status: 'PUBLISHED',
          changes: [],
          checks: [],
        }
      : yaml(path);
    const c: Data = {
      name: 'test-interface',
      adapter: 'test',
      connection: 'do-not-execute-this',
      method,
      observations: 'Inspected invocation and interpretable output; fixture review.',
      result: 'PASS',
      reason: 'Interface fits; no tool-quality claim.',
    };
    if (method === 'EXECUTION')
      c.execution = {
        command: 'do-not-execute-this',
        exit_code: 1,
        output: 'Fixture failure output',
      };
    v.checks = [c];
    save(path, v);
    const p = this.profile();
    p.adapters.test = {
      connection: 'do-not-execute-this',
      status: 'COMPATIBLE',
      reason: 'Interface reviewed.',
      evidence: [relative(this.harness, path).split('\\').join('/')],
    };
    this.save(p);
    return [path, v];
  }
  update(changes: Data[], status = 'STAGED', evidence?: string): string {
    const path = 'artifacts/maintenance/change/update.yaml',
      v: Data = {
        schema_version: '2.0.0',
        record_type: 'Update',
        id: 'change',
        request: 'Update test adapter',
        base_configuration: 'cfg-1',
        candidate_configuration: 'cfg-2',
        status,
        changes,
        checks: [],
      };
    if (evidence) {
      v.evidence = [evidence];
      v.checks = [
        { name: 'changed-files', result: 'PASS', reason: 'Reviewed change', evidence: [evidence] },
      ];
    }
    save(join(this.harness, path), v);
    return path;
  }
}
function check(name: string, fn: (s: Setup) => void) {
  test('InstallationTests.' + name, () => {
    const s = new Setup();
    try {
      fn(s);
    } finally {
      clean(s.repo);
    }
  });
}
check('test_fresh_install_is_compact_and_has_no_readiness_claim', (s) => {
  const p = s.profile();
  assert.equal(p.schema_version, '2.0.0');
  assert.deepEqual(
    Object.keys(p).sort(),
    ['schema_version', 'repository', 'configuration_id', 'adapters', 'reviews'].sort(),
  );
  assert.ok(read(s.profilePath).trim().split(/\s+/).length <= 200);
  assert.equal(Object.keys(p.adapters).length, 11);
  assert.ok(Object.values(p.adapters).every((r: any) => r.status === 'ACTION_NEEDED'));
  const r = s.check();
  assert.equal(r.structure, 'PASS');
  assert.equal(r.activation, 'PENDING');
  assert.equal(read(join(s.repo, 'AGENTS.md')), 'Keep my instructions.\n');
});
check('test_existing_harness_is_never_overwritten', (s) => {
  const before = readFileSync(s.profilePath);
  assert.throws(() => install(s.repo, { kit: KIT }));
  assert.deepEqual(readFileSync(s.profilePath), before);
});
check('test_checker_is_read_only', (s) => {
  const before = inventory(s.repo);
  s.check();
  assert.deepEqual(inventory(s.repo), before);
});
check('test_format_one_profile_is_rejected', (s) => {
  const p = s.profile();
  p.schema_version = '1.0.0';
  s.save(p);
  assert.ok(s.check([], 1).diagnostics.some((d: Data) => d.code === 'FORMAT_UNSUPPORTED'));
});
check('test_compatible_requires_connection_and_evidence', (s) => {
  const p = s.profile();
  p.adapters.test.status = 'COMPATIBLE';
  s.save(p);
  s.check([], 1);
});
check('test_compatible_evidence_is_checked_without_executing_adapter', (s) => {
  s.assess();
  const r = s.check();
  assert.equal(r.adapters.test.status, 'COMPATIBLE');
  assert.equal(r.activation, 'PENDING');
});
check('test_compatible_profile_cannot_cite_itself', (s) => {
  const p = s.profile();
  p.adapters.test = {
    connection: 'test',
    status: 'COMPATIBLE',
    reason: 'Claim',
    evidence: ['framework/config/repo-profile.yaml'],
  };
  s.save(p);
  assert.ok(s.check([], 1).diagnostics.some((d: Data) => d.code === 'ADAPTER_ASSESSMENT'));
});
check('test_plain_note_is_not_a_structured_assessment', (s) => {
  const [path] = s.assess();
  put(path, 'A check supposedly happened.');
  s.check([], 1);
});
check('test_assessment_must_match_adapter_and_connection', (s) => {
  for (const [field, wrong] of [
    ['adapter', 'build'],
    ['connection', 'different-command'],
  ]) {
    const [path, v] = s.assess();
    v.checks[0][field!] = wrong;
    save(path, v);
    s.check([], 1);
  }
});
check('test_assessment_needs_observations_and_passing_conclusion', (s) => {
  for (const [field, wrong] of [
    ['observations', '  '],
    ['result', 'FAIL'],
  ]) {
    const [path, v] = s.assess();
    v.checks[0][field!] = wrong;
    save(path, v);
    s.check([], 1);
  }
});
check('test_execution_requires_command_exit_and_output', (s) => {
  for (const field of ['command', 'exit_code', 'output']) {
    const [path, v] = s.assess('EXECUTION');
    delete v.checks[0].execution[field];
    save(path, v);
    s.check([], 1);
  }
});
check('test_failed_command_can_have_compatible_interface', (s) => {
  s.assess('EXECUTION');
  s.check();
});
check('test_silent_command_output_is_recorded_explicitly', (s) => {
  const [path, v] = s.assess('EXECUTION');
  v.checks[0].execution.output = '';
  save(path, v);
  s.check();
});
check('test_review_cannot_include_execution_fields', (s) => {
  const [path, v] = s.assess();
  v.checks[0].execution = { command: 'test', exit_code: 0, output: '' };
  save(path, v);
  s.check([], 1);
});
check('test_published_maintenance_assessment_is_supported', (s) => {
  s.assess('REVIEW', true);
  s.check();
});
check('test_assessment_does_not_cite_itself_or_profile_as_support', (s) => {
  for (const target of [
    'framework/config/repo-profile.yaml',
    'artifacts/installation/installation-record.yaml',
  ]) {
    const [path, v] = s.assess();
    v.checks[0].evidence = [target];
    save(path, v);
    s.check([], 1);
  }
});
check('test_empty_or_duplicate_assessments_are_rejected', (s) => {
  for (const mode of ['empty', 'duplicate']) {
    const [path, v] = s.assess();
    v.checks = mode === 'empty' ? [] : [...v.checks, ...v.checks];
    save(path, v);
    s.check([], 1);
  }
});
check('test_unchecked_maintenance_cannot_support_compatible', (s) => {
  const [path, v] = s.assess('REVIEW', true);
  v.status = 'STAGED';
  save(path, v);
  s.check([], 1);
});
check('test_unassessed_connection_does_not_need_assessment', (s) => {
  const p = s.profile();
  p.adapters.test = { connection: 'test', status: 'NOT_ASSESSED', reason: 'Review pending.' };
  s.save(p);
  s.check();
});
check('test_captured_user_installation_fails_evidence_checks', (s) => {
  for (const name of [
    'framework/config/repo-profile.yaml',
    'artifacts/installation/installation-record.yaml',
  ])
    copyFileSync(
      join(ROOT, 'tests/typescript/fixtures/historical-installation', name),
      join(s.harness, name),
    );
  const p = s.profile();
  p.reviews = { default: 'LLM', phases: { specification: 'HUMAN' } };
  s.save(p);
  assert.ok(s.check([], 1).diagnostics.some((d: Data) => d.code === 'ADAPTER_ASSESSMENT'));
});
check('test_evidence_cannot_escape_harness', (s) => {
  const p = s.profile();
  p.adapters.test = {
    connection: 'test',
    status: 'COMPATIBLE',
    reason: 'Claim',
    evidence: ['../AGENTS.md'],
  };
  s.save(p);
  s.check([], 1);
});
check('test_evidence_symlink_cannot_escape_harness', (s) => {
  symlinkSync(join(s.repo, 'AGENTS.md'), join(s.harness, 'external'));
  const p = s.profile();
  p.adapters.test = {
    connection: 'test',
    status: 'COMPATIBLE',
    reason: 'Claim',
    evidence: ['external'],
  };
  s.save(p);
  s.check([], 1);
});
check('test_missing_runtime_file_fails_structure', (s) => {
  unlinkSync(join(s.harness, 'framework/workflows/development/HARNESS.md'));
  assert.equal(s.check([], 1).structure, 'FAIL');
});
check('test_duplicate_profile_keys_are_rejected', (s) => {
  appendFileSync(s.profilePath, 'repository: duplicate\n');
  s.check([], 1);
});
check('test_legacy_profile_fields_are_not_silently_accepted', (s) => {
  const p = s.profile();
  p.assessments = [];
  s.save(p);
  s.check([], 1);
});
check('test_runtime_modules_remain_required_after_configuration_change', (s) => {
  const p = s.profile();
  p.configuration_id = 'cfg-2';
  s.save(p);
  unlinkSync(join(s.harness, 'framework/tools/context.cjs'));
  s.check([], 1);
});
check('test_staged_addition_does_not_require_future_file', (s) =>
  s.check([
    '--update',
    s.update([{ path: 'framework/adapters/new.md', after: 'sha256:' + 'a'.repeat(64) }]),
  ]),
);
check('test_malformed_update_path_is_a_diagnostic', (s) => {
  const u = s.update([{ path: 'framework/bad\0file', after: 'sha256:' + 'a'.repeat(64) }]);
  assert.ok(s.check(['--update', u], 1).diagnostics.some((d: Data) => d.code === 'UPDATE_PATH'));
});
check('test_staged_update_checks_base_bytes', (s) => {
  const u = s.update([
    {
      path: 'framework/config/repo-profile.yaml',
      before: 'sha256:' + 'a'.repeat(64),
      after: 'sha256:' + 'b'.repeat(64),
    },
  ]);
  assert.ok(s.check(['--update', u], 1).diagnostics.some((d: Data) => d.code === 'UPDATE_BYTES'));
});
check('test_publication_checks_actual_after_bytes', (s) => {
  const hash = () =>
      'sha256:' + createHash('sha256').update(readFileSync(s.profilePath)).digest('hex'),
    before = hash(),
    p = s.profile();
  p.configuration_id = 'cfg-2';
  s.save(p);
  put(
    join(s.harness, 'artifacts/maintenance/proof.txt'),
    'Retained review and publication receipt',
  );
  const u = s.update(
    [{ path: 'framework/config/repo-profile.yaml', before, after: hash() }],
    'PUBLISHED',
    'artifacts/maintenance/proof.txt',
  );
  s.check(['--update', u]);
  appendFileSync(s.profilePath, '# concurrent change\n');
  assert.ok(s.check(['--update', u], 1).diagnostics.some((d: Data) => d.code === 'UPDATE_BYTES'));
});
check('test_update_cannot_mutate_pinned_task_configuration', (s) => {
  const u = s.update([
    { path: 'artifacts/configurations/cfg-1/profile.yaml', after: 'sha256:' + 'a'.repeat(64) },
  ]);
  assert.ok(s.check(['--update', u], 1).diagnostics.some((d: Data) => d.code === 'UPDATE_SCOPE'));
});
check('test_activation_requires_observation_evidence', (s) => {
  const p = join(s.harness, 'artifacts/installation/installation-record.yaml'),
    r = yaml(p);
  r.activation = 'CONFIRMED';
  save(p, r);
  s.check([], 1);
});
check('test_mandatory_phases_cannot_be_relabeled_optional', (s) => {
  const p = join(s.harness, 'framework/workflows/development/workflow.yaml'),
    w = yaml(p);
  for (const phase of w.phases) delete phase.mandatory;
  save(p, w);
  assert.ok(s.check([], 1).diagnostics.some((d: Data) => d.code === 'WORKFLOW_PHASES'));
});
check('test_setup_context_is_concise_read_only_and_format_two', (s) => {
  const before = inventory(s.repo),
    c = s.context(['--situation', 'setup']);
  assert.equal(c.context_version, '2.0.0');
  assert.match(c.excerpt, /configuration_id/);
  assert.ok(c.pages >= 1);
  const pieces = [c.excerpt];
  for (let n = 2; n <= c.pages; n++) {
    const page = s.context([
      '--situation',
      'setup',
      '--page',
      String(n),
      '--context-id',
      c.context_id,
    ]);
    assert.ok(page.excerpt.length <= 8000);
    pieces.push(page.excerpt);
  }
  const full = JSON.parse(pieces.join(''));
  assert.equal(Object.keys(full.adapters).length, 11);
  assert.equal(full.configuration_id, s.profile().configuration_id);
  assert.ok(c.excerpt.length <= 8000);
  assert.deepEqual(inventory(s.repo), before);
});
check('test_long_context_has_explicit_bounded_continuation', (s) => {
  const p = s.profile();
  p.adapters.test.reason = 'A long discovered reason. '.repeat(1000);
  s.save(p);
  const first = s.context(['--situation', 'setup']);
  assert.ok(first.pages > 1);
  const pieces = [first.excerpt];
  for (let n = 2; n <= first.pages; n++) {
    const page = s.context([
      '--situation',
      'setup',
      '--page',
      String(n),
      '--context-id',
      first.context_id,
    ]);
    assert.ok(page.excerpt.length <= 8000);
    pieces.push(page.excerpt);
  }
  assert.equal(JSON.parse(pieces.join('')).adapters.test.reason, p.adapters.test.reason);
  p.adapters.test.reason = 'Changed';
  s.save(p);
  assert.match(
    JSON.stringify(
      s.context(['--situation', 'setup', '--page', '2', '--context-id', first.context_id], 2),
    ),
    /STALE_CONTEXT/,
  );
});
check('test_started_task_context_selects_initialization', (s) => {
  put(
    join(s.harness, 'artifacts/installation/request.txt'),
    'Inspect this temporary protocol fixture.',
  );
  const step = join(s.repo, 'start.yaml');
  save(step, {
    action: 'start',
    request: {
      reference: { kind: 'LOCAL', scope: 'HARNESS', path: 'artifacts/installation/request.txt' },
      provenance: 'REVIEW',
      summary: 'Original test request',
    },
    source_scope: { roots: ['AGENTS.md'], exclude: [] },
  });
  helper(s.repo, 'journal', ['--task-id', 'example', '--actor', 'test-reviewer', '--step', step]);
  const page = s.context(['--task-id', 'example']);
  assert.equal(page.status, 'IN_PROGRESS');
  assert.match(page.excerpt, /initialization/);
  assert.match(page.context_id, /^sha256:[0-9a-f]{64}$/);
});
check('test_context_rejects_old_profile', (s) => {
  const p = s.profile();
  p.schema_version = '1.0.0';
  s.save(p);
  assert.equal(s.context(['--situation', 'setup'], 2).code, 'CONTEXT_UNAVAILABLE');
});
check('test_context_missing_task_is_controlled', (s) =>
  assert.equal(s.context(['--task-id', 'missing'], 2).code, 'CONTEXT_UNAVAILABLE'),
);
check('test_context_entry_selection_requires_task', (s) =>
  assert.equal(s.context(['--record', 'e000001'], 2).code, 'CONTEXT_UNAVAILABLE'),
);
check('test_human_entry_pages_are_short', (s) => {
  for (const name of ['README.md', 'framework/config/repo-profile.yaml'])
    assert.ok(read(join(s.harness, name)).trim().split(/\s+/).length <= 200, name);
  // The setup guide is an eleven-question script, not one human-facing message.
  const setup = read(join(s.harness, 'framework/workflows/setup/setup.md'));
  const messages = [...setup.matchAll(/```markdown\n([\s\S]*?)```/g)];
  assert.equal(messages.length, 12, 'introduction plus eleven separate questions');
  for (const [index, message] of messages.entries())
    assert.ok(message[1]!.trim().split(/\s+/).length <= 200, 'setup message ' + index);
});
