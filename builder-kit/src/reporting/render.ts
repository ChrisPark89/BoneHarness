/** Compact optional human view; JSON retains all attempts and diagnostics. */
import * as path from 'node:path';
import type { Evidence, Report } from './types.js';
function text(value: unknown, limit = 5): string {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, limit)
    .join(' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\|/g, '&#124;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/\*/g, '&#42;')
    .replace(/`/g, '&#96;');
}
function quotedPath(file: string): string {
  return file
    .split(path.sep)
    .join('/')
    .split('/')
    .map((part) =>
      encodeURIComponent(part).replace(
        /[!'()*]/g,
        (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
      ),
    )
    .join('/');
}
export function render_markdown(
  report: Report,
  options: {
    repo_root: string;
    harness_root: string;
    report_root: string;
  },
): string {
  function link(evidence: Evidence, label = 'evidence'): string {
    const ref = evidence.reference,
      root = ref.scope === 'HARNESS' ? options.harness_root : options.repo_root;
    let target = quotedPath(path.relative(options.report_root, path.join(root, ref.path)));
    if (ref.entry_id) target += '#' + encodeURIComponent(ref.entry_id);
    return '[' + label + '](' + target + ')';
  }
  const lines = [
    '# Task report',
    '',
    '**' + report.status + '**',
    'Snapshot: ' + text(report.generated_at, 1) + '.',
    '',
    '| Phase | Status | Evidence |',
    '|---|---|---|',
  ];
  for (const row of report.phases) {
    const label = row.status === 'USER_SKIPPED' ? 'approval' : 'evidence';
    lines.push(
      '| ' +
        text(row.label, 3) +
        ' | ' +
        row.status +
        ' | ' +
        (row.evidence.length ? link(row.evidence[0]!, label) : '—') +
        ' |',
    );
  }
  const required = report.criteria.filter((c) => c.required);
  const failures = report.history.filter(
    (r) =>
      ['FAIL', 'UNKNOWN', 'BLOCKED'].includes(r.status) ||
      ['FAIL', 'UNKNOWN', 'BLOCKED'].includes(r.outcome ?? ''),
  ).length;
  const awaiting = report.phases.find(
    (p) => p.status === 'BLOCKED' && p.review?.status === 'PENDING',
  );
  const pending = report.phases.find((p) => !['PASS', 'USER_SKIPPED'].includes(p.status));
  lines.push(
    '',
    `Accepted criteria: ${required.filter((c) => c.status === 'PASS').length}/${required.length} supported. Prior failure/uncertainty records: ${failures}.`,
    '',
    'Next: ' +
      (awaiting
        ? text(awaiting.label, 3) + '; awaiting human review (' + awaiting.record + ').'
        : pending
          ? text(pending.label, 3) + '; inspect unresolved evidence.'
          : 'Review the completed task and retained evidence.'),
    '',
    'Local hashes check bytes; user attribution and semantic review remain recorded judgments.',
    '',
    '[Full evidence, attempts and issues](' +
      quotedPath(
        path.relative(
          options.report_root,
          path.join(options.harness_root, 'artifacts/development', report.task_id, 'report.json'),
        ),
      ) +
      ')',
  );
  return lines.join('\n') + '\n';
}
