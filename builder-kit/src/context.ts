import { framework_path, framework_relative } from './layout.js';
/** Read-only, bounded context views over the same records used by reporting. */
import * as path from 'node:path';
import { adapter_status, connection_ready } from './adapters.js';
import * as fs from 'node:fs';
import { load_document, read_bytes, relative_path, scoped_path } from './io/loader.js';
import { local_validator } from './io/schemas.js';
import { canonical_json, digest } from './io/canonical.js';
import { name } from './io/journal.js';
import { capture_task, check_unchanged } from './reporting/evidence.js';
import { derive_report } from './reporting/summary.js';
import type { Profile, Workflow } from './reporting/types.js';

const CAPABILITIES: Record<string, string> = {
  research: 'research',
  pattern_review: 'pattern_search',
  specification: 'specification',
  verification_plan: 'verification_plan',
  implementation_plan: 'implementation_plan',
  implementation: 'implementation',
  preflight: 'preflight',
  build: 'build',
  testing: 'test',
  specification_verification: 'specification_verification',
  final_review: 'final_review',
};
export interface Context extends Record<string, unknown> {
  context_version: string;
  situation: string;
  next_action: string;
  issues: unknown[];
  context_id?: string;
  status?: string;
}
export interface ContextOptions {
  situation?: string;
  task_id?: string;
  update_id?: string;
  record_id?: string;
}
export function extract_context(
  repo_root: string,
  harness_root = '.harness',
  options: ContextOptions = {},
): Context {
  const { situation = 'development', task_id, update_id, record_id } = options;
  if (!['development', 'recovery', 'setup', 'maintenance'].includes(situation))
    throw new Error('Unknown situation');
  if (task_id && update_id) throw new Error('Select one task or update');
  if (record_id && !task_id) throw new Error('--record requires --task-id');
  if (!path.isAbsolute(repo_root) || !fs.statSync(repo_root).isDirectory())
    throw new Error('repo-root must be an existing absolute directory');
  const repo = fs.realpathSync(repo_root);
  const harness = path.isAbsolute(harness_root)
    ? scoped_path(harness_root, repo, { directory: true })
    : relative_path(harness_root, repo, { directory: true });
  if (task_id) {
    const capture = capture_task(repo, harness, task_id);
    const report = derive_report(capture);
    const next =
      report.phases.find((phase) => !['PASS', 'USER_SKIPPED'].includes(phase.status)) ?? null;
    const phase_id = next?.id;
    const operations = Object.entries(capture.operations)
      .filter(([id]) => report.open_operations.includes(id))
      .map(([id, row]) => {
        const selected: Record<string, unknown> = { operation_id: id, record: row.entry_id };
        for (const key of [
          'status',
          'phase',
          'handle',
          'deadline',
          'connection',
          'inputs',
          'command',
        ] as const)
          if (key in row.payload) selected[key] = row.payload[key];
        return selected;
      });
    const result: Context = {
      context_version: '2.0.0',
      situation,
      task_id,
      context_id: capture.context_id,
      status: report.status,
      next_phase: next,
      review_policy: capture.profile.reviews ?? null,
      phase_definition: capture.workflow.phases.find((phase) => phase.id === phase_id) ?? null,
      source: capture.current_source,
      source_scope: capture.source_scope ?? null,
      specification: report.specification,
      operations,
      issues: report.issues,
      next_action: '',
    };
    if (phase_id && CAPABILITIES[phase_id]) {
      const capability = CAPABILITIES[phase_id];
      result.adapter = {
        capability,
        ...(capture.profile.adapters[capability] ?? {
          connection: null,
          status: 'ACTION_NEEDED',
          reason: 'Choose a tool or ask the LLM to perform this phase directly.',
        }),
      };
      (result.adapter as Record<string, unknown>).status = adapter_status(
        capture.profile.adapters[capability],
      );
    }
    const readGuide = (file: string): string =>
      read_bytes(
        relative_path(
          framework_relative(capture.configuration_root, 'workflows/' + file),
          capture.configuration_root,
        ),
        capture.configuration_root,
      ).toString('utf8');
    if (phase_id === 'verification_plan')
      result.phase_guide = readGuide('development/verification-plan.md');
    if (next?.review?.status === 'PENDING')
      result.review_guide = readGuide('development/human-review.md');
    if (phase_id === 'specification')
      result.reconcile_skips = report.phases
        .filter((p) => p.status === 'USER_SKIPPED')
        .map((p) => p.record);
    if (phase_id === 'specification_verification' && capture.specification)
      result.criteria = capture.specification.payload.criteria;
    if (record_id) {
      const selected = capture.entries.find((row) => row.entry_id === record_id);
      if (!selected) throw new Error('No such journal entry: ' + record_id);
      result.record = selected;
    }
    result.contract = readGuide('development/verification-rules.md');
    if (check_unchanged(capture).length)
      throw new Error('STALE_CONTEXT: inputs changed while reading');
    result.next_action =
      report.status === 'COMPLETE'
        ? 'Read the completed task report; historical findings remain visible.'
        : next?.review?.status === 'PENDING' && next.status === 'BLOCKED'
          ? 'Awaiting human review: present this result and its review reference; record approval before continuing.'
          : operations.length
            ? 'Reconcile the listed operation before advancing.'
            : report.status === 'UNVERIFIED'
              ? 'Recheck the next unresolved phase against current evidence.'
              : next
                ? 'Record the next semantic step with this context_id.'
                : 'Read the completed task report.';
    return result;
  }
  const profile = load_document(
    relative_path('framework/config/repo-profile.yaml', harness),
    harness,
  ) as Profile;
  const validate = (value: unknown, schema: string, definition?: string): void => {
    const error = local_validator(
      framework_path(path.join(harness, 'framework'), 'schemas/' + schema),
      definition,
    ).iter_errors(value)[0];
    if (error) throw new Error('Invalid format 2 record: ' + error.message);
  };
  validate(profile, 'profile.schema.json');
  const result: Context = {
    context_version: '2.0.0',
    situation,
    configuration_id: profile.configuration_id,
    adapters: profile.adapters,
    reviews: profile.reviews ?? null,
    issues: [],
    next_action: '',
  };
  if (update_id) {
    name(update_id);
    const update = load_document(
      relative_path(`artifacts/maintenance/${update_id}/update.yaml`, harness),
      harness,
    );
    validate(update, 'records.schema.json', 'Update');
    result.update = update;
    result.next_action =
      'Compare actual files with the recorded base/candidate; reconcile interruptions before publication.';
  } else if (['maintenance', 'recovery'].includes(situation)) {
    result.next_action = 'Inspect the profile and start or select an actual maintenance update.';
  } else if (situation === 'setup') {
    const installation = load_document(
      relative_path('artifacts/installation/installation-record.yaml', harness),
      harness,
    ) as Record<string, unknown>;
    validate(installation, 'records.schema.json', 'Installation');
    result.status = installation.status as string;
    result.installation = Object.fromEntries(
      ['configuration_id', 'status', 'activation', 'checks'].map((key) => [key, installation[key]]),
    );
    result.issues = (installation.issues ?? []) as unknown[];
    const workflow = load_document(
      relative_path('framework/workflows/development/workflow.yaml', harness),
      harness,
    ) as Workflow;
    validate(workflow, 'workflow.schema.json');
    const gaps = workflow.phases
      .filter(
        (phase) =>
          phase.proof === 'EXECUTION' &&
          !connection_ready(profile.adapters[CAPABILITIES[phase.id] ?? phase.id]),
      )
      .map((phase) => ({
        phase: phase.id,
        reason:
          profile.adapters[CAPABILITIES[phase.id] ?? phase.id]?.reason ??
          'No compatible connection.',
        action: 'Connect and assess a tool or obtain an explicit user skip for this phase.',
      }));
    result.connection_gaps = gaps;
    result.status_meaning =
      'Recorded installation checks; not a task result or independent readiness verification.';
    result.next_action =
      installation.configuration_id !== profile.configuration_id
        ? 'Installation describes an earlier configuration; inspect current readiness with view.cjs and its maintenance evidence.'
        : installation.status !== 'CHECKED' ||
            installation.activation !== 'CONFIRMED' ||
            result.issues.length
          ? 'Finish the pending setup checks and entry-guide activation; retain evidence and present recorded readiness.'
          : gaps.length
            ? 'Read recorded readiness with view.cjs; early work can begin, but listed execution phases need a connection or explicit user skip.'
            : 'Inspect readiness with view.cjs and check Node.js prerequisites, then start a task through .harness/README.md.';
  } else result.next_action = 'Save the original request, then record a start step for a new task.';
  const guide =
    update_id || ['maintenance', 'recovery'].includes(situation)
      ? 'maintenance/harness-maintenance.md'
      : situation === 'setup'
        ? 'setup/setup.md'
        : 'development/HARNESS.md';
  result.contract = read_bytes(
    relative_path(
      'framework/' + framework_relative(path.join(harness, 'framework'), 'workflows/' + guide),
      harness,
    ),
    harness,
  ).toString('utf8');
  return result;
}
export interface ContextPage {
  context_version: string;
  context_id: string;
  page: number;
  pages: number;
  next_page: number | null;
  next_action: string;
  status: string;
  excerpt: string;
  note: string;
}
export function context_page(
  context: Context,
  page = 1,
  options: { expected_context_id?: string; limit?: number } = {},
): ContextPage {
  const token = context.context_id ?? digest(canonical_json(context));
  if (options.expected_context_id !== undefined && options.expected_context_id !== token)
    throw new Error('STALE_CONTEXT: restart at page 1');
  if (page > 1 && !options.expected_context_id)
    throw new Error('Continuation requires --context-id from page 1');
  const limit = options.limit ?? 8000;
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Page limit must be positive');
  // Slice code points so a page never splits a supplementary Unicode character.
  let text = Array.from(JSON.stringify(context, null, 2));
  const chunks: string[] = [];
  while (text.length) {
    let end = text.length <= limit ? text.length : text.slice(0, limit).lastIndexOf('\n') + 1;
    if (end <= 0) end = limit;
    chunks.push(text.slice(0, end).join(''));
    text = text.slice(end);
  }
  if (!Number.isSafeInteger(page) || page < 1 || page > chunks.length)
    throw new Error('Page is outside the available context');
  return {
    context_version: '2.0.0',
    context_id: token,
    page,
    pages: chunks.length,
    next_page: page < chunks.length ? page + 1 : null,
    next_action: context.next_action,
    status: context.status ?? 'NOT_RECORDED',
    excerpt: chunks[page - 1],
    note: 'Excerpts continue without omission; individual pages are not standalone record JSON.',
  };
}
export function render_text(page: ContextPage): string {
  const lines = [
    '# Harness context',
    '',
    'Status: ' + page.status,
    'Next: ' + page.next_action,
    'Context ID: ' + page.context_id,
    `Page: ${page.page}/${page.pages}`,
    '',
    page.excerpt,
  ];
  if (page.next_page)
    lines.push(
      '',
      `Continue with --page ${page.next_page} --context-id ${page.context_id} and the same selection.`,
    );
  return lines.join('\n');
}
