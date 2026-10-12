/** Read-only ownership/compatibility preview. Unproven migrations never mutate. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseDocument, isMap, isScalar } from 'yaml';
import { payload, release_info } from '../installer/install.js';
import { load_document } from '../io/loader.js';
import { validate_document } from '../io/schemas.js';
import { parse_history } from '../io/journal.js';
import { writing } from '../io/guard.js';
import * as views from './views.js';
import {
  message,
  type Change,
  type CheckReport,
  type Release,
  type TaskReport,
  type TaskRow,
  type UpdatePlan,
} from './types.js';
export const PROFILE = 'framework/config/repo-profile.yaml',
  RECEIPT = 'artifacts/installation/kit-receipt.json';
export const guard = writing;
export function fingerprint(harness: string): Record<string, string> {
  const files: Record<string, string> = {};
  function scan(root: string): void {
    for (const entry of fs
      .readdirSync(root, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (
        ['__pycache__', '.writer.lock', '.writer.lock.recovery', 'doctor.json'].includes(entry.name)
      )
        continue;
      const file = path.join(root, entry.name),
        relative = path.relative(harness, file).split(path.sep).join('/');
      if (entry.isSymbolicLink()) throw new Error('Symlink in update inputs: ' + relative);
      if (entry.isDirectory()) scan(file);
      else if (entry.isFile())
        files[relative] = views.identity(fs.readFileSync(views.local(harness, relative)));
    }
  }
  for (const name of ['framework', 'docs', 'artifacts']) scan(views.local(harness, name));
  for (const name of ['README.md', '.gitignore']) {
    const file = views.local(harness, name, { missing: true });
    if (fs.existsSync(file)) files[name] = views.identity(fs.readFileSync(file));
  }
  return files;
}
export function receipt(harness: string, baseline?: string | null): Release {
  const file = views.local(harness, RECEIPT, { missing: true });
  let value: Release;
  if (fs.existsSync(file)) {
    value = load_document(file, harness) as Release;
    const { identity, ...body } = value;
    if (identity !== views.identity(views.canonical(body)))
      throw new Error('Invalid installed release receipt; restore the recorded receipt');
  } else if (baseline) {
    if (!fs.existsSync(path.join(baseline, 'release.json')))
      throw new Error(
        'Baseline predates release ownership metadata; a separately reviewed migration is required. Installation unchanged.',
      );
    value = release_info(baseline, payload(baseline));
  } else
    throw new Error(
      'No ownership receipt. Supply the original kit with --baseline PATH; otherwise preserve this installation and review migration separately.',
    );
  if (
    JSON.stringify(value.formats) !== '["2.0.0"]' ||
    value.runtime_api !== 2 ||
    !value.managed ||
    typeof value.managed !== 'object'
  )
    throw new Error(
      'Unsupported installed release; a separate migration is required. Python runtime installations are not automatically converted. Installation unchanged.',
    );
  for (const [name, digest] of Object.entries(value.managed)) {
    if (
      !(
        (name.startsWith('framework/') && !name.startsWith('framework/config/')) ||
        ['README.md', '.gitignore'].includes(name)
      )
    )
      throw new Error('Invalid managed path: ' + name);
    const current = views.local(harness, name, { missing: true });
    if (
      !fs.existsSync(current) ||
      !fs.statSync(current).isFile() ||
      views.identity(fs.readFileSync(current)) !== digest
    )
      throw new Error(
        'Local edit or missing managed file: ' +
          name +
          '. Preserve the edit and resolve it before updating.',
      );
  }
  return value;
}
export function configured_bytes(raw: Buffer, configuration: string): Buffer {
  const text = raw.toString('utf8'),
    document = parseDocument(text);
  if (document.errors.length || !isMap(document.contents))
    throw new Error('Profile needs exactly one configuration_id');
  const nodes = document.contents.items
    .filter((pair) => isScalar(pair.key) && pair.key.value === 'configuration_id')
    .map((pair) => pair.value);
  if (nodes.length !== 1 || !isScalar(nodes[0]) || !nodes[0].range)
    throw new Error('Profile needs exactly one configuration_id');
  const range = nodes[0].range;
  return Buffer.from(
    text.slice(0, range[0]) + JSON.stringify(configuration) + text.slice(range[1]),
  );
}
export function stage(
  harness: string,
  target: string,
  files: Record<string, Buffer>,
  changes: Change[],
  configuration: string,
): void {
  fs.mkdirSync(target);
  for (const name of ['framework', 'docs', 'artifacts'])
    fs.cpSync(views.local(harness, name), path.join(target, name), {
      recursive: true,
      filter: (source) =>
        !['__pycache__', '.writer.lock', '.writer.lock.recovery'].includes(path.basename(source)),
      dereference: false,
    });
  for (const name of ['README.md', '.gitignore'])
    if (fs.existsSync(path.join(harness, name)))
      fs.copyFileSync(views.local(harness, name), path.join(target, name));
  for (const change of changes) {
    const file = views.local(target, change.path, { missing: true });
    if (change.after) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, files[change.path]!);
    } else if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  const file = path.join(target, PROFILE);
  fs.writeFileSync(file, configured_bytes(fs.readFileSync(file), configuration));
}
export function compare_tasks(repo: string, candidate: string): [TaskRow[], string[]] {
  const rows: TaskRow[] = [],
    issues: string[] = [],
    root = path.join(repo, '.harness/artifacts/development'),
    schema = path.join(candidate, 'framework/schemas/records.schema.json');
  try {
    for (const name of fs.readdirSync(root).sort()) {
      if (!fs.statSync(path.join(root, name)).isDirectory()) continue;
      for (const row of parse_history(
        fs.readFileSync(views.local(root, name + '/history.jsonl')),
        name,
      )) {
        const errors = validate_document(row.payload, schema);
        if (errors.length) throw new Error(name + ': ' + errors[0]!.message);
      }
    }
  } catch (error) {
    issues.push('Candidate cannot read retained histories: ' + message(error).slice(-600));
  }
  for (const row of views.task_rows(repo)) {
    row.compatibility = 'UNKNOWN';
    row.action = 'Inspect task evidence before updating.';
    try {
      const before = views.run_tool<TaskReport>(repo, 'report.cjs', [
          '--task-id',
          row.id,
          '--read-only',
          '--json',
        ]),
        after = views.run_tool<TaskReport>(
          repo,
          'report.cjs',
          ['--task-id', row.id, '--read-only', '--json'],
          { tools_root: path.join(candidate, 'framework/tools') },
        );
      // Compare the decision fields defined by the report schema. The old
      // Python reader also queried a nonexistent "configuration" key;
      // Python returned None, while encoding undefined correctly fails here.
      for (const key of [
        'status',
        'phases',
        'criteria',
        'issues',
        'open_operations',
        'specification',
      ] as const)
        if (!views.canonical(before[key]).equals(views.canonical(after[key])))
          throw new Error('Candidate changes recorded phase decisions');
      if (before.open_operations.length)
        throw new Error('Unresolved operations: ' + before.open_operations.join(', '));
      if (row.status === 'UNKNOWN') throw new Error(row.error ?? 'Unverified task history');
      const final = [...before.history]
          .reverse()
          .find((h) => h.kind === 'PhaseRecord' && h.phase === 'final_review'),
        closed =
          final &&
          ['PASS', 'USER_SKIPPED'].includes(final.status) &&
          ['COMPLETE', 'UNVERIFIED'].includes(before.status);
      if (row.status === 'COMPLETE' || closed) {
        const archived = views.saved_completion(repo, row.id);
        if (!archived)
          throw new Error('Save a supported completion report before upgrading this task');
        if (
          validate_document(
            archived,
            path.join(candidate, 'framework/schemas/task-report.schema.json'),
          ).length
        )
          throw new Error('Candidate cannot read saved completion report');
      }
      row.compatibility = 'COMPATIBLE';
      row.action = 'Keep captured settings and any pending approvals.';
    } catch (error) {
      row.action = message(error);
      issues.push('Task ' + row.id + ': ' + message(error));
    }
    rows.push(row);
  }
  return [rows, issues];
}
export function plan_update(
  repo: string,
  kit: string,
  options: {
    baseline?: string | null;
  } = {},
): UpdatePlan {
  repo = fs.realpathSync(repo);
  const harness = views.local(repo, '.harness');
  kit = fs.realpathSync(kit);
  const plan: UpdatePlan = {
    kind: 'update_plan',
    kit,
    baseline: options.baseline ? fs.realpathSync(options.baseline) : null,
    issues: [],
    changes: [],
    tasks: [],
    no_op: false,
    status: 'BLOCKED',
  };
  try {
    const pending = views.pending_updates(harness);
    if (pending.length) throw new Error('Recover interrupted update first: ' + pending.join(', '));
    const maintenance = views.local(harness, 'artifacts/maintenance');
    for (const name of fs.readdirSync(maintenance)) {
      const base = views.local(maintenance, name);
      if (!fs.statSync(base).isDirectory()) continue;
      const update = views.local(base, 'update.yaml', { missing: true });
      if (
        fs.existsSync(update) &&
        !fs.existsSync(path.join(base, 'publication.json')) &&
        (
          load_document(update, harness) as {
            status: string;
          }
        ).status !== 'PUBLISHED'
      )
        throw new Error('Reconcile unfinished maintenance update: ' + name);
    }
    plan.inputs = fingerprint(harness);
    if (Object.keys(plan.inputs).some((p) => p.endsWith('/.journal.lock')))
      throw new Error('A task writer is active or interrupted; reconcile its journal lock first');
    const old = receipt(harness, options.baseline),
      files = payload(kit),
      next = release_info(kit, files);
    plan.base = old;
    plan.candidate = next;
    views.profile(harness);
    for (const name of [
      ...new Set([...Object.keys(old.managed), ...Object.keys(next.managed)]),
    ].sort()) {
      const current = views.local(harness, name, { missing: true });
      if (!(name in old.managed) && fs.existsSync(current))
        throw new Error('Candidate would replace an unowned file: ' + name);
      const before = old.managed[name] ?? null,
        after = next.managed[name] ?? null;
      if (before !== after) plan.changes.push({ path: name, before, after });
    }
    plan.no_op = old.identity === next.identity && fs.existsSync(path.join(harness, RECEIPT));
    plan.configuration = 'cfg-' + randomUUID().replaceAll('-', '').slice(0, 12);
    const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bh candidate '))),
      candidate = path.join(parent, '.harness');
    try {
      stage(harness, candidate, files, plan.changes, plan.configuration);
      const findings = views.run_tool<CheckReport>(parent, 'check.cjs', ['--format', 'json']);
      if (findings.structure !== 'PASS')
        throw new Error(
          'Candidate structure is invalid: ' + JSON.stringify(findings.diagnostics).slice(0, 800),
        );
      const problems = views.environment(candidate);
      if (problems.length)
        throw new Error('Candidate Node.js helpers are unavailable: ' + problems.join('; '));
      const [tasks, errors] = compare_tasks(repo, candidate);
      plan.tasks = tasks;
      plan.issues.push(...errors);
      plan.validation = { structure: findings, environment: 'PASS', tasks };
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
    plan.status = plan.issues.length ? 'BLOCKED' : plan.no_op ? 'UNCHANGED' : 'READY';
  } catch (error) {
    plan.issues.push(message(error));
  }
  return plan;
}
