import { framework_relative } from '../layout.js';
/** Capture format-2 inputs once; hashes establish byte identity, not authorship. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { read_bytes, parse_document, relative_path } from '../io/loader.js';
import { local_validator } from '../io/schemas.js';
import {
  roots,
  ordinary,
  parse_history,
  canonical_json,
  content_identity,
  walk,
} from '../io/journal.js';
import { unicode_compare } from '../io/canonical.js';
import { collect_files, inventory_identity, validate_inventory } from '../io/source_inventory.js';
import type {
  Capture,
  Entry,
  Evidence,
  EvidenceCheck,
  Issue,
  OperationRecord,
  Profile,
  Reference,
  SpecificationRecord,
  TaskRecord,
  Workflow,
} from './types.js';
export function reference_key(ref: Reference): string {
  return ref.scope + ':' + ref.path + (ref.entry_id ? '#' + ref.entry_id : '');
}
export function evidence_key(evidence: Evidence): string {
  return reference_key(evidence.reference) + '@' + evidence.identity;
}
export function assert_schema(value: unknown, file: string, prefix: string): void {
  const error = [...local_validator(file).iter_errors(value)][0];
  if (error) throw new Error(prefix + error.message);
}
export function capture_task(repo_root: string, harness_root: string, task_id: string): Capture {
  const [repo, harness, run] = roots(repo_root, harness_root, task_id);
  const captured: Record<string, string> = {};
  function read(file: string, root: string): Buffer {
    const raw = read_bytes(file, root);
    captured[file] = content_identity(raw);
    return raw;
  }
  const history = ordinary(path.join(run, 'history.jsonl'), harness);
  const entries = parse_history(read(history, harness), task_id);
  const task = entries[0]!.payload as TaskRecord;
  const config = task.configuration;
  const files = config?.files ?? [];
  if (content_identity(canonical_json(files)) !== config?.bundle)
    throw new Error('Configuration manifest identity mismatch');
  const bundle = path.join(harness, 'artifacts/configurations', config.bundle.split(':')[1]!);
  const known = new Set<string>();
  for (const item of files) {
    if (known.has(item.path)) throw new Error('Duplicate configuration path');
    known.add(item.path);
    const file = relative_path(item.path, bundle);
    if (content_identity(read(file, bundle)) !== item.identity)
      throw new Error('Pinned configuration bytes differ: ' + item.path);
  }
  if (
    [
      framework_relative(bundle, 'schemas/records.schema.json'),
      'workflows/development/workflow.yaml',
      'config/repo-profile.yaml',
    ].some((p) => !known.has(p))
  )
    throw new Error('Incomplete pinned configuration');
  const schemaName = framework_relative(bundle, 'schemas');
  const schemas = path.join(bundle, schemaName);
  for (const filename of fs.readdirSync(schemas).filter((p) => p.endsWith('.json'))) {
    if (!known.has(schemaName + '/' + filename))
      throw new Error('Every pinned schema dependency must be in the captured manifest');
  }
  const recordsValidator = local_validator(path.join(schemas, 'records.schema.json'));
  for (const entry of entries) {
    const error = recordsValidator.iter_errors(entry.payload)[0];
    if (error) throw new Error('Invalid ' + entry.entry_id + ': ' + error.message);
  }
  const workflow = parse_document(
    read(path.join(bundle, 'workflows/development/workflow.yaml'), bundle),
    'workflow.yaml',
  ) as Workflow;
  validate_workflow(workflow, schemas);
  const profile = parse_document(
    read(path.join(bundle, 'config/repo-profile.yaml'), bundle),
    'profile.yaml',
  ) as Profile;
  assert_schema(profile, path.join(schemas, 'profile.schema.json'), 'Invalid pinned profile: ');
  if (profile.schema_version !== '2.0.0' || profile.configuration_id !== config.id)
    throw new Error('Pinned profile identity mismatch');
  const [evidence_checks, record_issues, contents] = inspect_evidence(
    entries,
    repo,
    harness,
    task_id,
    read,
  );
  const structural: Issue[] = [];
  const specs = entries.filter(
    (e): e is Entry<SpecificationRecord> => e.payload.record_type === 'Specification',
  );
  const spec = specs.at(-1) ?? null;
  const scope = spec ? spec.payload.source_scope : task.source_scope;
  const current_files = scope ? collect_files(repo, harness, scope, { allow_missing: true }) : null;
  const current_source = scope ? inventory_identity(scope, current_files!) : null;
  for (const row of current_files ?? []) read(path.join(repo, row.path), repo);
  const operations: Record<string, Entry<OperationRecord>> = Object.create(null);
  const original: Record<string, unknown> = Object.create(null);
  const inventories = new Set<string>();
  for (const entry of entries) {
    const p = entry.payload;
    if (p.record_type === 'SourceInventory') {
      validate_inventory(p);
      inventories.add(p.revision);
    }
    if (
      (p.record_type === 'Operation' || p.record_type === 'PhaseRecord') &&
      p.source &&
      !inventories.has(p.source)
    ) {
      structural.push({
        code: 'SOURCE_ORDER',
        record: entry.entry_id,
        message: 'Source inventory must precede evidence using it',
      });
    }
    if (p.record_type === 'Operation') {
      const op = p.operation_id,
        prior = operations[op];
      const stable = operation_identity(p);
      if (!prior) {
        if (p.status !== 'INTENT')
          structural.push({
            code: 'MISSING_INTENT',
            record: entry.entry_id,
            message: 'Operation has no recorded intent',
          });
        original[op] = stable;
      } else if (
        !isDeepStrictEqual(stable, original[op]) ||
        ['COMPLETED', 'CANCELLED'].includes(prior.payload.status)
      ) {
        structural.push({
          code: 'OPERATION_CHANGED',
          record: entry.entry_id,
          message: 'Operation immutable inputs changed or a closed operation reopened',
        });
      }
      operations[op] = entry as Entry<OperationRecord>;
    }
  }
  const context_id = content_identity(
    canonical_json({
      head: entries.at(-1)!.entry_hash,
      source: current_source,
      inputs: Object.entries(captured).sort(([a], [b]) => unicode_compare(a, b)),
    }),
  );
  return {
    task_id,
    repo_root: repo,
    harness_root: harness,
    run_root: run,
    configuration_root: bundle,
    task,
    entries,
    workflow,
    profile,
    specification: spec,
    source_scope: scope,
    current_source,
    current_files,
    operations: { ...operations },
    record_issues,
    evidence_checks,
    structural_issues: structural,
    inputs: captured,
    context_id,
    evidence_contents: contents,
  };
}
export function operation_identity(p: OperationRecord): unknown {
  return {
    operation_id: p.operation_id,
    phase: p.phase,
    specification: p.specification,
    source: p.source,
    connection: p.connection,
    inputs: p.inputs ?? null,
    deadline: p.deadline ?? null,
    command: p.command ?? null,
  };
}
export function check_unchanged(capture: Capture): string[] {
  const issues: string[] = [];
  for (const [file, identity] of Object.entries(capture.inputs)) {
    try {
      if (content_identity(read_bytes(file, capture.repo_root)) !== identity) issues.push(file);
    } catch {
      issues.push(file);
    }
  }
  if (capture.source_scope) {
    try {
      if (
        !isDeepStrictEqual(
          collect_files(capture.repo_root, capture.harness_root, capture.source_scope, {
            allow_missing: true,
          }),
          capture.current_files,
        )
      )
        issues.push('Source membership changed');
    } catch {
      issues.push('Source scope unreadable');
    }
  }
  return issues;
}
export function inspect_evidence(
  entries: Entry[],
  repo: string,
  harness: string,
  task_id: string,
  read: (file: string, root: string) => Buffer,
): [Record<string, EvidenceCheck>, Record<string, string[]>, Record<string, string>] {
  const run = path.join(harness, 'artifacts/development', task_id);
  const by_id = new Map(entries.map((e) => [e.entry_id, e]));
  const evidence_checks: Record<string, EvidenceCheck> = {},
    record_issues: Record<string, string[]> = {},
    contents: Record<string, string> = {};
  for (const entry of entries) {
    const problems: string[] = [];
    for (const value of walk(entry.payload)) {
      if (!('reference' in value) || !('identity' in value)) continue;
      const evidence = value as unknown as Evidence;
      const ref = evidence.reference,
        key = evidence_key(evidence);
      const check: EvidenceCheck = { valid: false, reference: ref, identity: evidence.identity };
      try {
        let raw: Buffer;
        if (ref.entry_id) {
          const selected = by_id.get(ref.entry_id);
          if (!selected) throw new Error('Missing evidence entry');
          if (selected.sequence >= entry.sequence) throw new Error('Evidence must precede its use');
          raw = canonical_json(selected.payload);
        } else {
          const root =
            ref.scope === 'HARNESS' ? harness : ref.scope === 'REPOSITORY' ? repo : undefined;
          if (!root) throw new Error('Invalid evidence scope');
          const file = relative_path(ref.path, root);
          if (
            [
              path.join(run, 'report.json'),
              path.join(harness, 'docs/development', task_id, 'report.md'),
            ].includes(file)
          )
            throw new Error('A derived report cannot be its own evidence');
          raw = read(file, root);
        }
        if (content_identity(raw) !== evidence.identity) throw new Error('Evidence bytes differ');
        if (evidence.provenance === 'FIXTURE')
          throw new Error('Fixture is not evidence for real task support');
        check.valid = true;
        contents[key] = raw.toString('utf8');
      } catch (error) {
        problems.push(error instanceof Error ? error.message : String(error));
      }
      evidence_checks[key] = check;
    }
    record_issues[entry.entry_id] = problems;
  }
  return [evidence_checks, record_issues, contents];
}
export function validate_workflow(workflow: Workflow, schemas: string): void {
  assert_schema(workflow, path.join(schemas, 'workflow.schema.json'), 'Invalid workflow: ');
  const phases = workflow.phases,
    ids = phases.map((p) => p.id);
  if (
    new Set(ids).size !== ids.length ||
    !isDeepStrictEqual(
      phases.filter((p) => p.mandatory).map((p) => p.id),
      ['specification', 'specification_verification'],
    )
  )
    throw new Error('Exactly specification acceptance and final verification must be mandatory');
  const expected = [
    'initialization',
    'research',
    'pattern_review',
    'specification',
    'verification_plan',
    'implementation_plan',
    'implementation',
    'preflight',
    'build',
    'testing',
    'specification_verification',
    'final_review',
  ];
  if (!isDeepStrictEqual(ids, expected))
    throw new Error('Format 2 requires the twelve approved ordered phases; omission is not a skip');
  for (const phase of phases) {
    const execution = ['preflight', 'build', 'testing'].includes(phase.id),
      sensitive = expected.slice(6).includes(phase.id);
    if (
      (phase.proof ?? 'REVIEW') !== (execution ? 'EXECUTION' : 'REVIEW') ||
      (phase.source_sensitive ?? false) !== sensitive
    )
      throw new Error('Format 2 phase evidence requirements cannot be downgraded');
  }
}
