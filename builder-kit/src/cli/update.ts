/** Durable compatible publication and explicit undo; preserve later edits. */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { payload, release_info } from '../installer/install.js';
import { load_document } from '../io/loader.js';
import * as views from './views.js';
import { PROFILE, RECEIPT, fingerprint, guard, plan_update, configured_bytes } from './releases.js';
import { message, type CheckReport, type Publication, type UpdatePlan } from './types.js';
export function atomic(file: string, raw: Uint8Array): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), '.bh-' + randomUUID()),
    fd = fs.openSync(temp, 'wx', 0o600);
  try {
    try {
      fs.writeFileSync(fd, raw);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, file);
    if (process.platform !== 'win32') {
      const dir = fs.openSync(path.dirname(file), 'r');
      try {
        fs.fsyncSync(dir);
      } finally {
        fs.closeSync(dir);
      }
    }
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
export function save(file: string, value: unknown): void {
  atomic(file, Buffer.concat([views.canonical(value), Buffer.from('\n')]));
}
export function actual(harness: string, name: string): string | null {
  const file = views.local(harness, name, { missing: true });
  return fs.existsSync(file) && fs.statSync(file).isFile()
    ? views.identity(fs.readFileSync(file))
    : null;
}
export interface UpdateHooks {
  after_replace?: (file: string) => void;
  save?: (file: string, value: unknown) => void;
  postcheck?: (repo: string, updatePath: string) => CheckReport;
}
export function restore(
  harness: string,
  recordPath: string,
  value: Publication,
  hooks: Pick<UpdateHooks, 'save'> = {},
): Publication {
  const persist = hooks.save ?? save;
  const conflicts: string[] = [];
  for (let i = value.changes.length - 1; i >= 0; i--) {
    const change = value.changes[i]!,
      name = change.path;
    try {
      const file = views.local(harness, name, { missing: true }),
        current = actual(harness, name);
      if (current === change.before) continue;
      if (current !== change.after) throw new Error('Later edit preserved: ' + name);
      if (change.before == null) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } else {
        const backup = views.local(path.dirname(recordPath), 'before/' + i),
          raw = fs.readFileSync(backup);
        if (views.identity(raw) !== change.before)
          throw new Error('Recovery backup differs: ' + name);
        atomic(file, raw);
      }
    } catch (error) {
      conflicts.push(message(error));
    }
  }
  value.status = conflicts.length ? 'RECOVERY_REQUIRED' : 'RESTORED';
  value.issues = conflicts;
  value.next_action = conflicts.length
    ? 'Resolve the preserved edits, then rerun bh update.'
    : 'Previous installation restored. Review the failure before retrying.';
  const update = views.local(path.dirname(recordPath), 'update.yaml', { missing: true });
  if (fs.existsSync(update)) {
    const record = load_document(update, harness) as Record<string, unknown>;
    record.status = 'FAILED';
    record.recovery = value.next_action;
    persist(update, record);
  }
  persist(recordPath, value);
  return value;
}
export function recover_pending(repo: string): Publication | null {
  const harness = views.local(repo, '.harness');
  if (!views.pending_updates(harness).length) return null;
  return guard(
    harness,
    () => {
      const pending = views.pending_updates(harness);
      if (!pending.length) return null;
      if (pending.length !== 1)
        throw new Error(
          'Multiple interrupted publications; inspect maintenance records before recovery',
        );
      const file = views.local(
        harness,
        'artifacts/maintenance/' + pending[0] + '/publication.json',
      );
      return restore(harness, file, load_document(file, harness) as Publication);
    },
    { recovery: true },
  );
}
function same(a: unknown, b: unknown): boolean {
  return views.canonical(a).equals(views.canonical(b));
}
export function apply_update(repo: string, plan: UpdatePlan, hooks: UpdateHooks = {}): Publication {
  const harness = views.local(repo, '.harness');
  if (plan.issues.length || plan.no_op)
    throw new Error('Only a reviewed, ready update can be applied');
  if (!same(fingerprint(harness), plan.inputs))
    throw new Error('Installation changed after preview; run bh update --dry-run again');
  return guard(harness, () => {
    const fresh = plan_update(repo, plan.kit, { baseline: plan.baseline });
    if (
      fresh.issues.length ||
      !same(fresh.inputs, plan.inputs) ||
      fresh.candidate?.identity !== plan.candidate?.identity
    )
      throw new Error('Update inputs changed or failed validation; preview again');
    if (!fresh.base || !fresh.candidate || !fresh.configuration || !fresh.validation)
      throw new Error('Incomplete update validation');
    const files = payload(plan.kit);
    if (!same(release_info(plan.kit, files), fresh.candidate))
      throw new Error('Candidate changed while preparing publication');
    const previous = views.profile(harness).configuration_id;
    files[PROFILE] = configured_bytes(
      fs.readFileSync(path.join(harness, PROFILE)),
      fresh.configuration,
    );
    files[RECEIPT] = Buffer.concat([views.canonical(fresh.candidate), Buffer.from('\n')]);
    const changes = [...fresh.changes];
    for (const name of [PROFILE, RECEIPT])
      changes.push({
        path: name,
        before: actual(harness, name),
        after: views.identity(files[name]!),
      });
    const updateId = 'kit-' + randomUUID().replaceAll('-', '').slice(0, 12),
      base = views.local(harness, 'artifacts/maintenance/' + updateId, { missing: true });
    fs.mkdirSync(base);
    const recordPath = path.join(base, 'publication.json');
    const value: Publication = {
      kind: 'update',
      update_id: updateId,
      status: 'APPLYING',
      changes,
      issues: [],
      from_version: fresh.base.version,
      to_version: fresh.candidate.version,
      tasks: fresh.tasks,
      validation: fresh.validation,
      checked_at: new Date().toISOString(),
      next_action:
        'Publication in progress; wait for the writer or run bh update after interruption.',
    };
    for (const [i, c] of changes.entries()) {
      if (actual(harness, c.path) !== c.before) throw new Error('Files changed before staging');
      if (c.before != null)
        atomic(path.join(base, 'before', String(i)), fs.readFileSync(path.join(harness, c.path)));
      if (c.after != null) atomic(path.join(base, 'candidate', String(i)), files[c.path]!);
    }
    const persist = hooks.save ?? save;
    persist(recordPath, value);
    try {
      const inputs = Object.fromEntries(
        Object.entries(fingerprint(harness)).filter(
          ([p]) => !p.startsWith('artifacts/maintenance/' + updateId + '/'),
        ),
      );
      if (!same(inputs, fresh.inputs)) throw new Error('Installation changed during staging');
      for (const [i, c] of changes.entries()) {
        const file = views.local(harness, c.path, { missing: true });
        if (actual(harness, c.path) !== c.before) throw new Error('Concurrent edit: ' + c.path);
        if (c.after == null) fs.unlinkSync(file);
        else {
          const raw = fs.readFileSync(views.local(base, 'candidate/' + i));
          if (views.identity(raw) !== c.after) throw new Error('Candidate backup changed');
          atomic(file, raw);
        }
        hooks.after_replace?.(file);
      }
      if (changes.some((c) => actual(harness, c.path) !== c.after))
        throw new Error('Published bytes changed before verification');
      const proof = 'artifacts/maintenance/' + updateId + '/publication.json',
        record = {
          schema_version: '2.0.0',
          record_type: 'Update',
          id: updateId,
          request: 'Apply compatible kit ' + fresh.candidate.version,
          base_configuration: previous,
          candidate_configuration: fresh.configuration,
          status: 'PUBLISHED',
          changes: changes
            .filter((c) => c.path !== RECEIPT)
            .map((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => v != null))),
          checks: [
            {
              name: 'kit-compatibility',
              result: 'PASS',
              reason: 'Candidate structure, environment and retained task decisions checked.',
              evidence: [proof],
            },
          ],
          evidence: [proof],
        };
      persist(path.join(base, 'update.yaml'), record);
      const updatePath = 'artifacts/maintenance/' + updateId + '/update.yaml';
      const findings = hooks.postcheck
        ? hooks.postcheck(repo, updatePath)
        : views.run_tool<CheckReport>(repo, 'check.cjs', [
            '--format',
            'json',
            '--update',
            updatePath,
          ]);
      if (findings.structure !== 'PASS')
        throw new Error('Post-publication check failed: ' + JSON.stringify(findings.diagnostics));
      value.validation.published_structure = findings;
      value.status = 'PUBLISHED';
      value.next_action =
        'Continue eligible work. Existing tasks keep their captured configuration.';
      persist(recordPath, value);
      return value;
    } catch (error) {
      value.failure = message(error);
      return restore(harness, recordPath, value, hooks);
    }
  });
}
