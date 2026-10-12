import { canonical_json, content_identity } from '../../builder-kit/src/io/journal.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import {
  Task,
  temp,
  clean,
  cli,
  put,
  read,
  yaml,
  save,
  json,
  inventory,
  KIT,
  candidate,
  files,
  run,
} from './support.js';
import { plan_update, guard } from '../../builder-kit/src/cli/releases.js';
import { apply_update, recover_pending } from '../../builder-kit/src/cli/update.js';
function check(name: string, fn: (repo: string) => void) {
  test('UpdateTests.' + name, () => {
    const repo = temp();
    try {
      cli(repo, ['init']);
      fn(repo);
    } finally {
      clean(repo, repo + ' kit');
    }
  });
}
function interrupted(repo: string, kit: string, rollback = false): void {
  const releases = new URL('../../builder-kit/src/cli/releases.js', import.meta.url).href,
    update = new URL('../../builder-kit/src/cli/update.js', import.meta.url).href;
  const code = `import {plan_update} from ${JSON.stringify(releases)};import {apply_update,save} from ${JSON.stringify(update)};apply_update(${JSON.stringify(repo)},plan_update(${JSON.stringify(repo)},${JSON.stringify(kit)}),${rollback ? "{postcheck(){throw new Error('post-publication failure')},save(path,value){if(path.endsWith('update.yaml')&&value.status==='FAILED')process.exit(71);save(path,value)}}" : '{after_replace(){process.exit(71)}}'});`;
  run([process.execPath, '--input-type=module', '-e', code], repo, 71);
}
check('test_same_release_and_preview_do_not_write', (r) => {
  const before = inventory(r);
  assert.equal(cli(r, ['update', '--dry-run']).no_op, true);
  const v = cli(r, ['update', '--kit', candidate(r), '--dry-run']);
  assert.deepEqual(v.issues, []);
  assert.ok(v.changes.length);
  assert.deepEqual(inventory(r), before);
});
check('test_profile_history_unknown_files_and_old_pages_survive', (r) => {
  const h = join(r, '.harness'),
    path = join(h, 'framework/config/repo-profile.yaml'),
    v = yaml(path);
  v.reviews = { default: 'LLM', phases: {} };
  save(path, v);
  put(join(h, 'docs/setup.md'), 'Old snapshot\n');
  put(join(h, 'framework/custom.txt'), 'Custom\n');
  const kit = candidate(r),
    result = cli(r, ['update', '--kit', kit, '--yes']);
  assert.equal(result.status, 'PUBLISHED');
  const current = yaml(path);
  assert.deepEqual(current.reviews, v.reviews);
  assert.notEqual(current.configuration_id, v.configuration_id);
  assert.equal(read(join(h, 'docs/setup.md')), 'Old snapshot\n');
  assert.equal(read(join(h, 'framework/custom.txt')), 'Custom\n');
  assert.equal(cli(r, ['update', '--kit', kit, '--dry-run']).no_op, true);
  assert.equal(cli(r, ['status', '--update', result.update_id]).update.status, 'PUBLISHED');
  assert.equal(cli(r, ['doctor']).can_start, true);
});
check('test_conflicts_unsupported_and_missing_receipt_stop_unchanged', (r) => {
  const kit = candidate(r),
    h = join(r, '.harness'),
    path = join(h, 'framework/workflows/shared/recovery.md');
  put(path, 'local edit');
  let before = inventory(r);
  assert.ok(cli(r, ['update', '--kit', kit, '--yes'], 1).issues.length);
  assert.deepEqual(inventory(r), before);
  put(path, readFileSync(join(KIT, 'harness/framework/workflows/shared/recovery.md')));
  const release = join(kit, 'release.json'),
    v = json(release);
  v.formats = ['99'];
  put(release, JSON.stringify(v));
  before = inventory(r);
  cli(r, ['update', '--kit', kit, '--yes'], 1);
  assert.deepEqual(inventory(r), before);
  unlinkSync(join(h, 'artifacts/installation/kit-receipt.json'));
  before = inventory(r);
  cli(r, ['update', '--yes'], 1);
  assert.deepEqual(inventory(r), before);
});
check('test_failure_restores_and_interruption_can_be_recovered', (r) => {
  const kit = candidate(r),
    h = join(r, '.harness'),
    path = join(h, 'framework/workflows/shared/recovery.md'),
    original = readFileSync(path);
  const result = apply_update(r, plan_update(r, kit), {
    after_replace() {
      throw new Error('simulated disk failure');
    },
  });
  assert.equal(result.status, 'RESTORED');
  assert.deepEqual(readFileSync(path), original);
  interrupted(r, kit);
  assert.equal(cli(r, ['doctor'], 1).can_start, false);
  assert.equal(recover_pending(r)!.status, 'RESTORED');
  assert.deepEqual(readFileSync(path), original);
});
check('test_recovery_preserves_later_edits_and_blocks_writers', (r) => {
  const kit = candidate(r),
    h = join(r, '.harness');
  interrupted(r, kit);
  const publication = files(join(h, 'artifacts/maintenance')).find(
      (p) => basename(p) === 'publication.json',
    )!,
    record = json(publication),
    changed = record.changes[0].path;
  put(join(h, changed), 'later user edit');
  assert.equal(recover_pending(r)!.status, 'RECOVERY_REQUIRED');
  assert.equal(read(join(h, changed)), 'later user edit');
  assert.ok(cli(r, ['update', '--kit', kit, '--dry-run'], 1).issues.length);
});
check('test_candidate_validation_and_preview_race_leave_installation_unchanged', (r) => {
  const kit = candidate(r),
    plan = plan_update(r, kit);
  put(join(r, '.harness/framework/config/repo-profile.yaml'), 'bad: true');
  const before = inventory(r);
  assert.throws(() => apply_update(r, plan));
  assert.deepEqual(inventory(r), before);
});
check('test_verified_baseline_can_establish_ownership', (r) => {
  unlinkSync(join(r, '.harness/artifacts/installation/kit-receipt.json'));
  const kit = candidate(r);
  assert.deepEqual(cli(r, ['update', '--kit', kit, '--baseline', KIT, '--dry-run']).issues, []);
  assert.equal(cli(r, ['update', '--kit', kit, '--baseline', KIT, '--yes']).status, 'PUBLISHED');
});
check('test_interrupted_rollback_does_not_leave_false_published_record', (r) => {
  const kit = candidate(r);
  interrupted(r, kit, true);
  const publication = files(join(r, '.harness/artifacts/maintenance')).find(
    (p) => basename(p) === 'publication.json',
  )!;
  assert.notEqual(json(publication).status, 'RESTORED');
  assert.equal(recover_pending(r)!.status, 'RESTORED');
  assert.equal(yaml(join(publication, '../update.yaml')).status, 'FAILED');
});
check('test_profile_comments_and_unfinished_manual_update', (r) => {
  const path = join(r, '.harness/framework/config/repo-profile.yaml');
  put(path, '# A human configuration note\n' + read(path));
  const kit = candidate(r);
  cli(r, ['update', '--kit', kit, '--yes']);
  assert.ok(read(path).startsWith('# A human configuration note\n'));
  put(join(r, '.harness/artifacts/maintenance/manual/update.yaml'), 'status: STAGED\n');
  const before = inventory(r);
  assert.match(cli(r, ['update', '--kit', kit, '--dry-run'], 1).issues.join(' '), /manual/);
  assert.deepEqual(inventory(r), before);
});
check('test_unowned_collision_symlink_and_unknown_format_are_refused', (r) => {
  const kit = candidate(r),
    h = join(r, '.harness');
  put(join(h, 'framework/new.txt'), 'User file');
  put(join(kit, 'harness/framework/new.txt'), 'Kit file');
  let before = inventory(r);
  assert.match(cli(r, ['update', '--kit', kit, '--yes'], 1).issues.join(' '), /unowned/);
  assert.deepEqual(inventory(r), before);
  unlinkSync(join(kit, 'harness/framework/new.txt'));
  const manifest = join(kit, 'release.json'),
    v = json(manifest);
  v.runtime_api = 99;
  put(manifest, JSON.stringify(v));
  before = inventory(r);
  assert.ok(cli(r, ['update', '--kit', kit, '--dry-run'], 1).issues.length);
  assert.deepEqual(inventory(r), before);
});
test('TaskViews.test_update_guard_blocks_helpers_and_releases_after_failure', () => {
  const r = temp();
  try {
    cli(r, ['init']);
    const t = new Task(undefined, r);
    guard(t.harness, () => {
      assert.throws(() => t.phase('initialization'), /writer/);
    });
    t.phase('initialization');
  } finally {
    clean(r);
  }
});
test('Conversion.python_runtime_upgrade_is_refused_unchanged', () => {
  const repo = temp();
  try {
    cli(repo, ['init']);
    const path = join(repo, '.harness/artifacts/installation/kit-receipt.json');
    const receipt = json(path);
    receipt.runtime_api = 1;
    delete receipt.identity;
    receipt.identity = content_identity(canonical_json(receipt));
    put(path, JSON.stringify(receipt));
    const before = inventory(repo);
    const result = cli(repo, ['update', '--kit', candidate(repo), '--dry-run'], 1);
    assert.ok(result.issues.length);
    assert.deepEqual(inventory(repo), before);
  } finally {
    clean(repo, repo + ' kit');
  }
});
