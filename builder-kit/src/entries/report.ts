import { framework_path } from '../layout.js';
/** Capture or publish a format-2 report without changing task history. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import {
  roots,
  ordinary,
  safe_mkdir,
  locked,
  canonical_json,
  content_identity,
} from '../io/journal.js';
import { capture_task, check_unchanged, assert_schema } from '../reporting/evidence.js';
import { derive_report } from '../reporting/summary.js';
import { render_markdown } from '../reporting/render.js';
import type { Capture, Report } from '../reporting/types.js';
function _collect(repo_root: string, harness_root: string, task_id: string): [Report, Capture] {
  const [repo, harness] = roots(repo_root, harness_root, task_id);
  const capture = capture_task(repo, harness, task_id),
    report = derive_report(capture);
  assert_schema(
    report,
    framework_path(capture.configuration_root, 'schemas/task-report.schema.json'),
    'Invalid derived report: ',
  );
  if (check_unchanged(capture).length) throw new Error('Inputs changed during report capture');
  return [report, capture];
}
export function collect(repo: string, harness: string, task_id: string): Report {
  return _collect(repo, harness, task_id)[0];
}
export function generate(
  repo_root: string,
  harness_root: string,
  task_id: string,
  options: {
    markdown?: boolean;
  } = {},
): [Report, string] {
  const [repo, harness, run] = roots(repo_root, harness_root, task_id);
  return locked(run, () => {
    const [report, capture] = _collect(repo, harness, task_id),
      raw = Buffer.concat([canonical_json(report), Buffer.from('\n')]);
    let destination = path.join(run, 'report.json');
    const outputs: [string, Buffer][] = [[destination, raw]];
    if (options.markdown) {
      const report_root = safe_mkdir(path.join(harness, 'docs/development', task_id), harness);
      let text = render_markdown(report, { repo_root: repo, harness_root: harness, report_root });
      text +=
        '\n<!-- generation: ' + report.generation_id + ' json: ' + content_identity(raw) + ' -->\n';
      destination = path.join(report_root, 'report.md');
      outputs.push([destination, Buffer.from(text)]);
    }
    const staged: [string, string][] = [];
    try {
      for (const [target, content] of outputs) {
        ordinary(target, harness, { missing: true });
        const temporary = path.join(path.dirname(target), '.report-' + randomUUID());
        const descriptor = fs.openSync(temporary, 'wx', 0o600);
        staged.push([temporary, target]);
        try {
          fs.writeFileSync(descriptor, content);
          fs.fsyncSync(descriptor);
        } finally {
          fs.closeSync(descriptor);
        }
      }
      if (check_unchanged(capture).length)
        throw new Error('Inputs changed before report publication');
      for (const [temporary, target] of staged) {
        ordinary(target, harness, { missing: true });
        ordinary(temporary, harness);
        fs.renameSync(temporary, target);
      }
    } finally {
      for (const [temporary] of staged)
        if (fs.existsSync(temporary)) fs.unlinkSync(ordinary(temporary, harness));
    }
    return [report, destination];
  });
}
export function main(argv = process.argv.slice(2)): number {
  let json = argv.includes('--json');
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        'repo-root': { type: 'string' },
        'harness-root': { type: 'string', default: '.harness' },
        'task-id': { type: 'string' },
        'read-only': { type: 'boolean' },
        json: { type: 'boolean' },
        markdown: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
    if (values.help) {
      console.log(
        'report.cjs --repo-root PATH --task-id ID [--harness-root PATH] [--read-only] [--json] [--markdown]',
      );
      return 0;
    }
    if (!values['repo-root'] || !values['task-id'])
      throw new Error('--repo-root and --task-id are required');
    json = Boolean(values.json);
    const [report, file] = values['read-only']
      ? [collect(values['repo-root'], values['harness-root'], values['task-id']), null]
      : generate(values['repo-root'], values['harness-root'], values['task-id'], {
          markdown: values.markdown,
        });
    if (json) console.log(JSON.stringify(report));
    else {
      console.log(file ?? report.task_id);
      console.log(report.status);
    }
    return report.status === 'UNVERIFIED' ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) console.log(JSON.stringify({ error: message }));
    else console.error('REPORT_UNAVAILABLE: ' + message + '. Prior reports may be stale.');
    return 2;
  }
}
if (typeof require !== 'undefined' && require.main === module) process.exitCode = main();
