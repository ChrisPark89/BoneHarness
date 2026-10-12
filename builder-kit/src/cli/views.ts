import { framework_relative } from '../layout.js';
/** Shared evidence-based views for CLI, chat helpers and optional exports. */
import fs from 'node:fs';
import { adapter_status, connection_ready } from '../adapters.js';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonical_json, digest } from '../io/canonical.js';
import { load_document } from '../io/loader.js';
import { validate_document } from '../io/schemas.js';
import type {
  CheckReport,
  DoctorRecord,
  Evidence,
  InstallationRecord,
  Profile,
  Publication,
  SetupView,
  TaskReport,
  TaskRow,
  TaskView,
  UpdateRecord,
  View,
} from './types.js';
import { message } from './types.js';
export const canonical = canonical_json,
  identity = digest;
export function local(
  root: string,
  relative: string,
  options: {
    missing?: boolean;
  } = {},
): string {
  if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink())
    throw new Error('Symlink harness/storage root refused');
  if (
    !relative ||
    /[\\:]/.test(relative) ||
    relative.startsWith('/') ||
    relative.split('/').some((p) => ['', '.', '..'].includes(p))
  )
    throw new Error('Use a relative path inside the harness');
  let file = root;
  for (const part of relative.split('/')) {
    file = path.join(file, part);
    try {
      if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Symlink path refused: ' + relative);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  if (fs.existsSync(file)) {
    const s = fs.statSync(file);
    if (s.isFile() && s.nlink !== 1) throw new Error('Hard-linked storage refused: ' + relative);
  } else if (!options.missing) throw new Error('Missing: ' + relative);
  return file;
}
export function task_name(value: string): string {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/.test(value) ||
    value.endsWith('.') ||
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(value.split('.')[0]!)
  )
    throw new Error('Use a portable task/update ID from bh status');
  return value;
}
export function run_tool<T = Record<string, unknown>>(
  repo: string,
  tool: string,
  args: string[] = [],
  options: {
    tools_root?: string;
  } = {},
): T {
  const root = options.tools_root ?? local(path.join(repo, '.harness'), 'framework/tools'),
    script = local(root, tool);
  const result = spawnSync(process.execPath, [script, '--repo-root', repo, ...args], {
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw new Error('Cannot run ' + tool + ': ' + result.error.message);
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(result.stdout) as Record<string, unknown>;
  } catch {
    throw new Error(
      'Cannot read ' + tool + ': ' + (result.stderr || result.stdout).trim().slice(0, 600),
    );
  }
  if (![0, 1].includes(result.status ?? -1))
    throw new Error(
      String(value.error ?? JSON.stringify(value.diagnostics ?? 'Helper unavailable')),
    );
  return value as T;
}
export function profile(harness: string): Profile {
  try {
    const value = load_document(local(harness, 'framework/config/repo-profile.yaml'), harness);
    const errors = validate_document(
      value,
      local(
        harness,
        'framework/' +
          framework_relative(path.join(harness, 'framework'), 'schemas/profile.schema.json'),
      ),
    );
    if (errors.length) throw new Error(errors[0]!.message);
    return value as Profile;
  } catch (error) {
    throw new Error('Invalid adapter/review configuration: ' + message(error).slice(0, 400));
  }
}
export function environment(harness: string): string[] {
  const issues: string[] = [];
  if (Number(process.versions.node.split('.')[0]) < 22) issues.push('Node.js 22+ is required');
  for (const name of ['check', 'report', 'journal', 'command', 'context', 'source', 'view'])
    try {
      local(harness, 'framework/tools/' + name + '.cjs');
    } catch (error) {
      issues.push(message(error));
    }
  return issues;
}
export function saved_completion(repo: string, taskId: string): TaskReport | null {
  const harness = path.join(repo, '.harness'),
    run = local(harness, 'artifacts/development/' + task_name(taskId)),
    file = local(run, 'report.json', { missing: true });
  if (!fs.existsSync(file)) return null;
  try {
    const value = load_document(file, harness) as TaskReport;
    const { generation_id, ...body } = value;
    if (
      value.status !== 'COMPLETE' ||
      value.task_id !== taskId ||
      value.report_version !== '2.0.0' ||
      generation_id !== identity(canonical(body))
    )
      return null;
    const refs = value.inputs.filter((r) =>
      r.path.replaceAll('\\', '/').endsWith('/artifacts/development/' + taskId + '/history.jsonl'),
    );
    if (
      refs.length !== 1 ||
      refs[0]!.identity !== identity(fs.readFileSync(local(run, 'history.jsonl')))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function task_report(
  repo: string,
  taskId: string,
  options: {
    tools_root?: string;
  } = {},
): TaskView {
  task_name(taskId);
  local(path.join(repo, '.harness'), 'artifacts/development/' + taskId + '/history.jsonl');
  const archived = saved_completion(repo, taskId);
  if (archived) return { kind: 'task', basis: 'recorded completion', report: archived };
  return {
    kind: 'task',
    basis: 'current evidence',
    report: run_tool<TaskReport>(
      repo,
      'report.cjs',
      ['--task-id', taskId, '--read-only', '--json'],
      options,
    ),
  };
}
export function task_rows(repo: string): TaskRow[] {
  const folder = local(path.join(repo, '.harness'), 'artifacts/development'),
    rows: TaskRow[] = [];
  for (const name of fs.readdirSync(folder).sort()) {
    if (!fs.statSync(path.join(folder, name)).isDirectory()) continue;
    task_name(name);
    try {
      const result = task_report(repo, name),
        r = result.report,
        p = r.phases.find((v) => !['PASS', 'USER_SKIPPED'].includes(v.status));
      rows.push({
        id: name,
        status: r.status,
        phase: p?.label ?? 'Complete',
        basis: result.basis,
        open_operations: r.open_operations,
      });
    } catch (error) {
      rows.push({
        id: name,
        status: 'UNKNOWN',
        phase: 'Inspect records',
        error: message(error),
        open_operations: [],
      });
    }
  }
  return rows;
}
export function pending_updates(harness: string): string[] {
  const folder = local(harness, 'artifacts/maintenance'),
    found: string[] = [];
  for (const name of fs.readdirSync(folder).sort()) {
    const base = local(folder, name);
    if (!fs.statSync(base).isDirectory()) continue;
    const file = local(base, 'publication.json', { missing: true });
    if (fs.existsSync(file)) {
      const value = load_document(file, harness) as {
        status: string;
      };
      if (!['PUBLISHED', 'RESTORED'].includes(value.status)) found.push(name);
    }
  }
  return found;
}
export function inspect(
  repo: string,
  options: {
    task_id?: string;
    update_id?: string;
    fresh_checks?: boolean;
  } = {},
): Exclude<
  View,
  {
    error: string;
  }
> {
  repo = fs.realpathSync(repo);
  const harness = local(repo, '.harness');
  if (options.task_id) return task_report(repo, options.task_id);
  if (options.update_id) {
    const base = local(harness, 'artifacts/maintenance/' + task_name(options.update_id)),
      publication = local(base, 'publication.json', { missing: true });
    return {
      kind: 'update',
      update: load_document(
        fs.existsSync(publication) ? publication : local(base, 'update.yaml'),
        harness,
      ) as Publication | UpdateRecord,
    };
  }
  const issues: SetupView['issues'] = [];
  try {
    const findings = run_tool<CheckReport>(repo, 'check.cjs', ['--format', 'json']);
    issues.push(
      ...findings.diagnostics.map((i) => ({
        ...i,
        action: 'Inspect this file and rerun bh doctor.',
      })),
    );
  } catch (error) {
    issues.push({
      code: 'CHECKER_UNAVAILABLE',
      message: message(error),
      action: 'Restore the installed helper or use Node.js 22+.',
    });
  }
  let config: Profile | undefined;
  let setupGuide = 'workflows/setup/setup.md';
  try {
    config = profile(harness);
    setupGuide = framework_relative(path.join(harness, 'framework'), setupGuide);
  } catch (error) {
    issues.push({ code: 'CONFIGURATION', message: message(error) });
  }
  let setupComplete = false;
  try {
    const record = load_document(
      local(harness, 'artifacts/installation/installation-record.yaml'),
      harness,
    ) as InstallationRecord;
    setupComplete = record.status === 'CHECKED' && record.activation === 'CONFIRMED';
  } catch {
    // The checker reports missing or invalid records above.
  }
  const setupPrompt =
    'Follow .harness/framework/' + setupGuide + ' to finish setting up this repository.';
  const gaps: SetupView['gaps'] = [];
  for (const [phase, capability] of [
    ['preflight', 'preflight'],
    ['build', 'build'],
    ['testing', 'test'],
  ] as const) {
    const binding = config?.adapters[capability];
    if (!connection_ready(binding))
      gaps.push({
        phase,
        reason:
          adapter_status(binding) === 'ACTION_NEEDED'
            ? (binding?.reason ?? 'Choose and assess a tool for this phase.')
            : 'No executable tool is connected. Connect one or authorize a task-scoped skip.',
        action: 'Connect through maintenance, or explicitly authorize skipping this phase.',
      });
  }
  for (const [capability, binding] of Object.entries(config?.adapters ?? {})) {
    if (['preflight', 'build', 'test'].includes(capability) || adapter_status(binding) === 'OK')
      continue;
    gaps.push({
      phase: capability === 'pattern_search' ? 'pattern_review' : capability,
      reason: binding.reason,
      action: binding.reason,
    });
  }
  let previous: DoctorRecord | null = null;
  const cache = local(harness, 'artifacts/installation/doctor.json', { missing: true });
  if (fs.existsSync(cache))
    try {
      previous = load_document(cache, harness) as DoctorRecord;
    } catch {
      previous = { error: 'Previous diagnostic record is unreadable; run bh doctor.' };
    }
  let checked_at: string | null = null;
  if (options.fresh_checks) {
    checked_at = new Date().toISOString();
    for (const problem of environment(harness))
      issues.push({
        code: 'ENVIRONMENT',
        message: problem,
        action: 'Use Node.js 22+ and restore missing helper bundles.',
      });
  } else
    for (const issue of previous?.issues ?? [])
      if (issue.code === 'ENVIRONMENT')
        issues.push({
          ...issue,
          action: 'Last doctor finding; run bh doctor to recheck after correcting the environment.',
        });
  for (const item of pending_updates(harness))
    issues.push({
      code: 'UPDATE_INTERRUPTED',
      message: 'Update ' + item + ' needs recovery.',
      action: 'Run bh update to reconcile it.',
    });
  function hasHistorical(dir: string): boolean {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .some(
        (e) =>
          (e.isFile() && e.name === 'report.md') ||
          (e.isDirectory() && hasHistorical(path.join(dir, e.name))),
      );
  }
  return {
    kind: 'setup',
    status: issues.length ? 'FAIL' : !setupComplete || gaps.length ? 'WARN' : 'PASS',
    can_start: !issues.length,
    setup_complete: setupComplete && !issues.length,
    checked_at,
    previous_check: previous,
    issues,
    gaps,
    ...(config ? { reviews: config.reviews } : {}),
    historical_pages:
      hasHistorical(local(harness, 'docs')) || fs.existsSync(path.join(harness, 'docs/setup.md')),
    tasks: task_rows(repo),
    next_action: issues.length
      ? 'Resolve the listed blockers.'
      : !setupComplete
        ? 'Ask the LLM to finish repository setup. Copy this prompt:\n\n' + setupPrompt
        : 'Give the LLM a task and point it to .harness/README.md. Missing connections affect only their phases.',
  };
}
export function render(
  value: View,
  options: {
    export_root?: string;
    repo?: string;
  } = {},
): string {
  if ('error' in value) return 'Unable to continue: ' + value.error;
  if (value.kind === 'task') {
    const r = value.report,
      lines = [
        '# ' + r.task_id + ': ' + r.status,
        '',
        value.basis[0]!.toUpperCase() + value.basis.slice(1) + '.',
        '',
        '| Phase | Status / review | Evidence |',
        '|---|---|---|',
      ];
    const link = (e: Evidence) => {
      const ref = e.reference;
      let target = ref.path;
      if (options.export_root) {
        const root = ref.scope === 'HARNESS' ? path.join(options.repo!, '.harness') : options.repo!;
        target = path
          .relative(options.export_root, path.join(root, target))
          .split(path.sep)
          .map(encodeURIComponent)
          .join('/');
      } else target = (ref.scope === 'HARNESS' ? '.harness/' : '') + target;
      if (ref.entry_id) target += '#' + ref.entry_id;
      return '[evidence](' + target + ')';
    };
    for (const p of r.phases)
      lines.push(
        `| ${p.label} | ${p.status}${p.review?.status === 'PENDING' ? ' / HUMAN pending' : ''} | ${p.evidence.slice(0, 1).map(link).join(', ') || '—'} |`,
      );
    const required = r.criteria.filter((c) => c.required),
      failed = (h: { status: string; outcome?: string }) =>
        ['FAIL', 'UNKNOWN', 'BLOCKED'].includes(h.status) ||
        ['FAIL', 'UNKNOWN', 'BLOCKED'].includes(h.outcome ?? '');
    lines.push(
      '',
      `Required criteria: ${required.filter((c) => c.status === 'PASS').length}/${required.length}. Prior failure/uncertainty records: ${r.history.filter(failed).length}.`,
    );
    const earlier = [...r.history].reverse().find((h) => failed(h) && h.evidence?.length);
    if (earlier) lines.push('Earlier failure/uncertainty: ' + link(earlier.evidence![0]!));
    const pending = r.phases.find((p) => !['PASS', 'USER_SKIPPED'].includes(p.status));
    lines.push(
      'Next: ' +
        (pending
          ? pending.review?.status === 'PENDING'
            ? 'Await human review of ' + pending.label + '.'
            : 'Resolve ' + pending.label + '; inspect its evidence.'
          : 'Review the completed result.'),
      'Evidence checked: ' + r.generated_at,
    );
    if (r.issues.length) lines.push('Issues: ' + r.issues[0]!.message + ' (full list in JSON).');
    return lines.join('\n');
  }
  if (value.kind === 'config')
    return [
      'Adapter | Connection | Status | What to do',
      ...Object.entries(value.adapters).map(
        ([name, row]) =>
          `${name} | ${row.connection || '—'} | ${adapter_status(row)} | ${row.reason}`,
      ),
      'Review default: ' + value.reviews.default,
      ...Object.entries(value.reviews.phases).map(([k, v]) => `Review ${k}: ${v}`),
    ].join('\n');
  if (value.kind === 'setup') {
    const v = value,
      lines = [
        'Can start: ' +
          (!v.can_start
            ? 'Resolve setup blockers first.'
            : v.setup_complete
              ? 'Yes; no known setup blockers.'
              : 'Eligible phases only; repository setup is unfinished.'),
      ];
    lines.push(
      v.checked_at
        ? 'Checked: ' + v.checked_at
        : v.previous_check
          ? 'Last doctor: ' +
            (v.previous_check.checked_at ?? 'unknown') +
            ' (environment not rechecked by status).'
          : 'Environment not checked here; use bh doctor for fresh diagnostics.',
    );
    for (const i of v.issues) lines.push('FAIL: ' + i.message + ' ' + (i.action ?? ''));
    for (const g of v.gaps) lines.push('Action: ' + g.phase + ' — ' + g.reason);
    lines.push(
      'Task | Status | Phase',
      ...v.tasks.map((t) => `${t.id} | ${t.status} | ${t.phase}`),
    );
    if (!v.tasks.length) lines.push('No tasks yet.');
    if (v.reviews)
      lines.push(
        'Reviews: ' +
          v.reviews.default +
          ' by default; ' +
          Object.entries(v.reviews.phases)
            .map(([k, v]) => `${k}=${v}`)
            .join(', '),
      );
    if (v.historical_pages)
      lines.push('Existing report/setup pages are historical snapshots; this view uses records.');
    lines.push('Next: ' + v.next_action);
    return lines.join('\n');
  }
  const v = 'update' in value ? value.update : value,
    lines = ['Update: ' + v.status];
  if ('update_id' in v) lines.push('ID: ' + v.update_id);
  lines.push('Files affected: ' + v.changes.length);
  if ('issues' in v) for (const i of v.issues) lines.push('Blocked: ' + i);
  lines.push('Task | Phase | Compatibility | Action');
  if ('tasks' in v)
    for (const t of v.tasks)
      lines.push([t.id, t.phase, t.compatibility ?? '—', t.action ?? '—'].join(' | '));
  if (value.kind === 'update_plan') lines.push(...value.changes.map((c) => c.path));
  lines.push(
    'Next: ' +
      ('next_action' in v
        ? v.next_action
        : 'issues' in v && v.issues.length
          ? 'Resolve blockers.'
          : 'no_op' in v && v.no_op
            ? 'Already current.'
            : 'Review changes, then run bh update --yes with the same kit.'),
  );
  return lines.join('\n');
}
