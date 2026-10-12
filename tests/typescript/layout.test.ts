/** Protect install/update/task behavior across the framework directory reorganization. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname, relative } from 'node:path';
import { existsSync, mkdirSync, renameSync, readFileSync, readdirSync } from 'node:fs';
import {
  Task,
  KIT,
  temp,
  clean,
  cli,
  helper,
  put,
  read,
  yaml,
  save,
  inventory,
  files,
} from './support.js';
import { release_info } from '../../builder-kit/src/installer/install.js';
import { plan_update } from '../../builder-kit/src/cli/releases.js';
import { apply_update } from '../../builder-kit/src/cli/update.js';
import { extract_context } from '../../builder-kit/src/context.js';
import { generate } from '../../builder-kit/src/entries/report.js';

// Historical locations are intentional: do not rewrite this map when current paths change.
const relocated = [
  ['schemas', 'templates/schemas'],
  ['workflows/setup/setup.md', 'workflows/setup.md'],
  ['workflows/updates/update-boneharness.md', 'workflows/update-boneharness.md'],
  ['workflows/shared/context.md', 'workflows/context.md'],
  ['workflows/shared/recovery.md', 'workflows/recovery.md'],
  ['workflows/shared/adapter-interface.md', 'adapters/adapter-interface.md'],
  ['workflows/development/source-evidence.md', 'workflows/source-evidence.md'],
  ['workflows/development/verification-rules.md', 'workflows/verification-rules.md'],
] as const;

function legacyRepo(): string {
  const repo = temp('bh legacy layout ü ');
  cli(repo, ['init']);
  const harness = join(repo, '.harness');
  for (const [current, previous] of relocated) {
    const from = join(harness, 'framework', current),
      to = join(harness, 'framework', previous);
    if (!existsSync(from)) continue; // Also runs against the pre-reorganization baseline.
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  }
  const installationPath = join(harness, 'artifacts/installation/installation-record.yaml');
  const installation = yaml(installationPath);
  installation.files = installation.files.map((name: string) => {
    for (const [current, previous] of relocated) {
      const prefix = 'framework/' + current;
      if (name === prefix || name.startsWith(prefix + '/'))
        return 'framework/' + previous + name.slice(prefix.length);
    }
    return name;
  });
  save(installationPath, installation);
  const contents = Object.fromEntries(
    files(harness)
      .filter((file) => !relative(harness, file).startsWith('artifacts'))
      .map((file) => [relative(harness, file).split('\\').join('/'), readFileSync(file)]),
  );
  const receipt = release_info(KIT, contents);
  put(join(harness, 'artifacts/installation/kit-receipt.json'), JSON.stringify(receipt));
  return repo;
}

function unchangedTaskFiles(task: Task): Record<string, unknown> {
  return {
    captures: inventory(join(task.harness, 'artifacts/configurations')),
    history: read(join(task.harness, 'artifacts/development/task/history.jsonl')),
    docs: inventory(task.docs),
  };
}

test('Layout.fresh_install_exposes_grouped_guides_and_schemas', () => {
  const repo = temp();
  try {
    cli(repo, ['init']);
    for (const [current] of relocated)
      assert.ok(existsSync(join(repo, '.harness/framework', current)), current);
    for (const [, previous] of relocated)
      assert.equal(existsSync(join(repo, '.harness/framework', previous)), false, previous);
    assert.ok(existsSync(join(KIT, 'harness/README.md')));
    assert.equal(existsSync(join(KIT, 'templates/runtime')), false);
    assert.equal(cli(repo, ['doctor']).can_start, true);
    const prompt = cli(repo, ['doctor']).next_action as string;
    assert.match(prompt, /framework\/workflows\/setup\/setup\.md/);
    assert.deepEqual(readdirSync(join(repo, '.harness/framework/workflows')).sort(), [
      'development',
      'maintenance',
      'setup',
      'shared',
      'updates',
    ]);
    const profile = yaml(join(repo, '.harness/framework/config/repo-profile.yaml'));
    assert.equal(profile.reviews.default, 'HUMAN');
    assert.deepEqual(profile.reviews.phases, { initialization: 'LLM' });
  } finally {
    clean(repo);
  }
});

test('Layout.old_task_can_update_without_rewriting_history_or_pending_review', () => {
  const repo = legacyRepo();
  try {
    const task = new Task({ default: 'HUMAN', phases: { initialization: 'LLM' } }, repo);
    task.phase('initialization');
    task.phase('research');
    const before = unchangedTaskFiles(task),
      phases = task.report().phases;
    assert.equal(phases.find((phase) => phase.id === 'research')!.review!.status, 'PENDING');
    const profilePath = join(task.harness, 'framework/config/repo-profile.yaml');
    const profile = read(profilePath);
    const plan = plan_update(repo, KIT);
    assert.equal(plan.status, 'READY', JSON.stringify(plan.issues));
    assert.ok(
      plan.changes.some(
        (change) => change.path === 'framework/schemas/records.schema.json' && change.after,
      ),
    );
    assert.deepEqual(unchangedTaskFiles(task), before, 'preview must not write');
    assert.equal(apply_update(repo, plan).status, 'PUBLISHED');
    assert.deepEqual(unchangedTaskFiles(task), before);
    assert.deepEqual(task.report().phases, phases);
    const after = read(profilePath);
    assert.equal(
      after.replace(/^configuration_id:.*$/m, ''),
      profile.replace(/^configuration_id:.*$/m, ''),
    );
    const context = extract_context(repo, '.harness', { task_id: 'task' });
    assert.match(context.next_action, /Awaiting human review/);
    assert.ok(context.contract);
    assert.equal(cli(repo, ['doctor']).can_start, true);
    assert.equal(cli(repo, ['update', '--dry-run']).no_op, true);
  } finally {
    clean(repo);
  }
});

test('Layout.old_completed_task_report_stays_complete_after_update', () => {
  const repo = legacyRepo();
  try {
    const task = new Task(undefined, repo);
    assert.equal(task.complete(true).status, 'COMPLETE');
    generate(repo, '.harness', 'task');
    const before = unchangedTaskFiles(task);
    const result = cli(repo, ['update', '--yes']);
    assert.equal(result.status, 'PUBLISHED');
    assert.deepEqual(unchangedTaskFiles(task), before);
    assert.equal(
      helper(repo, 'report', ['--task-id', 'task', '--read-only', '--json']).status,
      'COMPLETE',
    );
    assert.equal(extract_context(repo, '.harness', { task_id: 'task' }).status, 'COMPLETE');
  } finally {
    clean(repo);
  }
});

test('Layout.old_unfinished_task_can_record_next_phase_after_update', () => {
  const repo = legacyRepo();
  try {
    const task = new Task(undefined, repo);
    const captured = inventory(join(task.harness, 'artifacts/configurations'));
    const history = read(join(task.harness, 'artifacts/development/task/history.jsonl'));
    assert.equal(cli(repo, ['update', '--yes']).status, 'PUBLISHED');
    task.phase('initialization');
    assert.ok(
      read(join(task.harness, 'artifacts/development/task/history.jsonl')).startsWith(history),
    );
    assert.deepEqual(inventory(join(task.harness, 'artifacts/configurations')), captured);
    assert.equal(task.report().phases[0]!.status, 'PASS');
    const step = join(task.harness, 'artifacts/development/fresh/start.yaml');
    save(step, {
      action: 'start',
      request: task.ev('request.md'),
      source_scope: { roots: ['src'], exclude: [] },
    });
    helper(repo, 'journal', ['--task-id', 'fresh', '--actor', 'reviewer', '--step', step]);
    const fresh = helper(repo, 'report', ['--task-id', 'fresh', '--read-only', '--json']);
    assert.equal(fresh.status, 'IN_PROGRESS');
    // New tasks use the current layout; captured old tasks retain the historical one.
    assert.ok(existsSync(join(task.harness, 'framework/schemas/records.schema.json')));
    assert.ok(
      existsSync(join(task.capture().configuration_root, 'templates/schemas/records.schema.json')),
    );
  } finally {
    clean(repo);
  }
});

test('Layout.edited_old_guide_or_new_path_collision_blocks_update_without_writes', () => {
  for (const edited of [true, false]) {
    const repo = legacyRepo();
    try {
      put(
        join(
          repo,
          '.harness/framework',
          edited ? 'workflows/recovery.md' : 'workflows/shared/recovery.md',
        ),
        'User content\n',
      );
      const before = inventory(repo);
      const plan = plan_update(repo, KIT);
      assert.equal(plan.status, 'BLOCKED');
      assert.match(plan.issues.join(' '), edited ? /Local edit/ : /unowned/);
      assert.deepEqual(inventory(repo), before);
    } finally {
      clean(repo);
    }
  }
});

test('Layout.failed_publication_restores_old_paths_and_profile', () => {
  const repo = legacyRepo();
  try {
    const harness = join(repo, '.harness'),
      before = inventory(join(harness, 'framework'));
    const plan = plan_update(repo, KIT);
    assert.equal(plan.status, 'READY', JSON.stringify(plan.issues));
    const result = apply_update(repo, plan, {
      postcheck() {
        throw new Error('simulated check failure');
      },
    });
    assert.equal(result.status, 'RESTORED');
    assert.deepEqual(inventory(join(harness, 'framework')), before);
    assert.equal(cli(repo, ['doctor']).can_start, true);
  } finally {
    clean(repo);
  }
});

test('Layout.mixed_schema_layouts_are_reported_without_writes', () => {
  const repo = temp();
  try {
    cli(repo, ['init']);
    const framework = join(repo, '.harness/framework');
    put(
      join(framework, 'templates/schemas/records.schema.json'),
      readFileSync(join(framework, 'schemas/records.schema.json')),
    );
    const before = inventory(repo);
    const result = helper(repo, 'view', ['--json']);
    assert.equal(result.can_start, false);
    assert.match(JSON.stringify(result.issues), /Mixed framework schema layouts/);
    assert.deepEqual(inventory(repo), before);
  } finally {
    clean(repo);
  }
});

test('Layout.missing_current_guide_does_not_fall_back_to_old_path', () => {
  const repo = temp();
  try {
    cli(repo, ['init']);
    const framework = join(repo, '.harness/framework');
    renameSync(join(framework, 'workflows/setup/setup.md'), join(framework, 'workflows/setup.md'));
    const result = helper(repo, 'check', ['--format', 'json'], 1);
    assert.equal(result.structure, 'FAIL');
    assert.ok(
      result.diagnostics.some(
        (row: { path: string }) => row.path === 'framework/workflows/setup/setup.md',
      ),
    );
  } finally {
    clean(repo);
  }
});
