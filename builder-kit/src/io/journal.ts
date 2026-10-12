import { framework_path } from '../layout.js';
/** Format-2 append-only storage. Judgments are supplied, never invented by the writer. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parse_document, read_bytes, scoped_path, relative_path } from './loader.js';
import { local_validator, valid_utc_timestamp } from './schemas.js';
import { capture_inventory } from './source_inventory.js';
import { canonical_json, digest as content_identity, unicode_compare } from './canonical.js';
import { writing } from './guard.js';
import { capture_task, check_unchanged, validate_workflow } from '../reporting/evidence.js';
import { derive_report, validate_candidate } from '../reporting/summary.js';
import type {
  Capture,
  Configuration,
  Entry,
  Payload,
  Profile,
  SourceScope,
  Workflow,
} from '../reporting/types.js';
export { canonical_json, content_identity };
export const VERSION = '2.0.0';
const KINDS = new Set(['Task', 'Specification', 'SourceInventory', 'PhaseRecord', 'Operation']);
const FIELDS = [
  'journal_version',
  'sequence',
  'entry_id',
  'previous_hash',
  'actor',
  'timestamp',
  'payload',
  'entry_hash',
].sort();
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exists(file: string): boolean {
  try {
    fs.lstatSync(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
export function name(value: unknown): string {
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/.test(value) ||
    value.endsWith('.') ||
    reserved.test(value.split('.')[0]!)
  )
    throw new Error('Use one portable task name');
  return value;
}
export function ordinary(
  file: string,
  root: string,
  options: {
    missing?: boolean;
  } = {},
): string {
  scoped_path(path.dirname(file), root, { directory: true });
  for (let part = file; part !== root; part = path.dirname(part)) {
    if (exists(part) && fs.lstatSync(part).isSymbolicLink())
      throw new Error('Symlink storage path refused');
    if (path.dirname(part) === part) throw new Error('Storage path is outside scope');
  }
  if (exists(file)) {
    scoped_path(file, root);
    if (fs.statSync(file).nlink !== 1) throw new Error('Hard-linked storage path refused');
  } else if (!options.missing) throw new Error('Storage file missing');
  return file;
}
export function safe_mkdir(directory: string, root: string): string {
  const relative = path.relative(root, directory);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
    throw new Error('Storage directory is outside scope');
  scoped_path(root, root, { directory: true });
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (exists(current)) {
      if (fs.lstatSync(current).isSymbolicLink())
        throw new Error('Symlink storage directory refused');
      scoped_path(current, root, { directory: true });
    } else fs.mkdirSync(current);
  }
  return directory;
}
export function roots(
  repo_root: string,
  harness_root: string,
  task_id: string,
): [string, string, string] {
  if (!path.isAbsolute(repo_root)) throw new Error('repo-root must be absolute');
  const repo = fs.realpathSync(repo_root);
  const harness = scoped_path(
    path.isAbsolute(harness_root) ? harness_root : path.join(repo, harness_root),
    repo,
    { directory: true },
  );
  return [repo, harness, path.join(harness, 'artifacts/development', name(task_id))];
}
export function* walk(value: unknown): Generator<Record<string, unknown>> {
  if (object(value)) {
    yield value;
    for (const child of Object.values(value)) yield* walk(child);
  } else if (Array.isArray(value)) for (const child of value) yield* walk(child);
}
export function make_entry(
  payload: Payload,
  actor: string,
  previous?: Entry | null,
  timestamp?:
    | string
    | {
        timestamp?: string;
      },
): Entry {
  const sequence = previous ? previous.sequence + 1 : 1;
  const time = typeof timestamp === 'string' ? timestamp : timestamp?.timestamp;
  const row = {
    journal_version: VERSION,
    sequence,
    entry_id: 'e' + sequence.toString().padStart(6, '0'),
    previous_hash: previous?.entry_hash ?? null,
    actor,
    timestamp: time ?? new Date().toISOString(),
    payload,
  };
  return { ...row, entry_hash: content_identity(canonical_json(row)) };
}
export function parse_history(raw: Buffer, task_id: string): Entry[] {
  if (!raw.length || raw.at(-1) !== 10)
    throw new Error('Empty or torn journal; preserve and reconcile original bytes');
  const entries: Entry[] = [];
  let offset = 0;
  while (offset < raw.length) {
    const end = raw.indexOf(10, offset);
    const line = raw.subarray(offset, end);
    offset = end + 1;
    const value = parse_document(line, 'record.json');
    if (!object(value) || value.journal_version !== VERSION)
      throw new Error(
        'UNSUPPORTED_FORMAT: use the original installed tools for format 1; no automatic conversion',
      );
    if (
      !isDeepStrictEqual(Object.keys(value).sort(), FIELDS) ||
      !object(value.payload) ||
      !KINDS.has(String(value.payload.record_type))
    )
      throw new Error('Invalid journal envelope or record type');
    if (typeof value.actor !== 'string' || !value.actor.trim()) throw new Error('Missing actor');
    if (typeof value.timestamp !== 'string' || !valid_utc_timestamp(value.timestamp))
      throw new Error('Invalid UTC timestamp');
    const row = value as unknown as Entry;
    const expected = make_entry(row.payload, row.actor, entries.at(-1), row.timestamp);
    if (!isDeepStrictEqual(row, expected)) throw new Error('Journal chain or sequence mismatch');
    if (row.payload.schema_version !== VERSION)
      throw new Error('UNSUPPORTED_FORMAT: record version differs');
    if (
      (!entries.length && row.payload.record_type !== 'Task') ||
      (entries.length && row.payload.record_type === 'Task')
    )
      throw new Error('Exactly one Task must start the journal');
    if ('task_id' in row.payload && row.payload.task_id !== task_id)
      throw new Error('Cross-task record');
    const ids = new Set(entries.map((e) => e.entry_id));
    for (const node of walk(row.payload)) {
      if (node.kind !== 'LOCAL') continue;
      const file = node.path;
      if (
        typeof file !== 'string' ||
        file.startsWith('/') ||
        /[\\:]/.test(file) ||
        file.split('/').some((p) => ['', '.', '..'].includes(p))
      )
        throw new Error('Unsafe evidence reference');
      if (
        'entry_id' in node &&
        (node.scope !== 'HARNESS' ||
          file !== 'artifacts/development/' + task_id + '/history.jsonl' ||
          !ids.has(String(node.entry_id)))
      )
        throw new Error('Entry evidence must select an earlier record in this task');
    }
    entries.push(row);
  }
  return entries;
}
export function read_history(file: string, task_id: string, schemas_root: string): Entry[] {
  ordinary(file, path.dirname(file));
  const entries = parse_history(read_bytes(file, path.dirname(file)), task_id),
    validator = local_validator(path.join(schemas_root, 'records.schema.json'));
  for (const row of entries) {
    const error = [...validator.iter_errors(row.payload)][0];
    if (error) throw new Error('Invalid ' + row.payload.record_type + ': ' + error.message);
  }
  return entries;
}
export function locked<T>(run: string, body: () => T): T {
  // The global exclusive guard also serializes per-task writers; no second stale lock.
  return writing(path.dirname(path.dirname(path.dirname(run))), body);
}
export function capture_configuration(harness: string): Configuration {
  const framework = path.join(harness, 'framework'),
    paths: string[] = [];
  function visit(directory: string): void {
    for (const child of fs.readdirSync(directory).sort(unicode_compare)) {
      if (child === '__pycache__') continue;
      const file = path.join(directory, child),
        stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error('Symlink storage path refused');
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile()) paths.push(file);
    }
  }
  visit(framework);
  paths.sort(unicode_compare);
  const contents = new Map<string, Buffer>(),
    files: {
      path: string;
      identity: string;
    }[] = [];
  for (const file of paths) {
    const raw = read_bytes(ordinary(file, framework), framework),
      relative = path.relative(framework, file).split(path.sep).join('/');
    contents.set(relative, raw);
    files.push({ path: relative, identity: content_identity(raw) });
  }
  const bundle = content_identity(canonical_json(files)),
    destination = path.join(harness, 'artifacts/configurations', bundle.split(':')[1]!);
  safe_mkdir(destination, harness);
  scoped_path(destination, harness, { directory: true });
  for (const [relative, raw] of contents) {
    const file = path.join(destination, relative);
    safe_mkdir(path.dirname(file), harness);
    ordinary(file, harness, { missing: true });
    if (exists(file)) {
      if (!fs.readFileSync(file).equals(raw))
        throw new Error('Existing configuration bundle differs');
    } else fs.writeFileSync(file, raw, { flag: 'wx' });
  }
  const profile = parse_document(
    contents.get('config/repo-profile.yaml')!,
    'profile.yaml',
  ) as Profile;
  if (!object(profile) || profile.schema_version !== VERSION)
    throw new Error('UNSUPPORTED_FORMAT: profile must be format 2');
  const error = [
    ...local_validator(framework_path(destination, 'schemas/profile.schema.json')).iter_errors(
      profile,
    ),
  ][0];
  if (error) throw new Error('Invalid profile: ' + error.message);
  const workflow = parse_document(
    contents.get('workflows/development/workflow.yaml')!,
    'workflow.yaml',
  ) as Workflow;
  validate_workflow(workflow, framework_path(destination, 'schemas'));
  return { id: profile.configuration_id, bundle, files };
}
function fill_evidence(
  value: unknown,
  repo: string,
  harness: string,
  entries: Entry[],
  task_id: string,
): unknown {
  if (Array.isArray(value))
    return value.map((v) => fill_evidence(v, repo, harness, entries, task_id));
  if (!object(value)) return value;
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, fill_evidence(v, repo, harness, entries, task_id)]),
  );
  if ('reference' in result) {
    const ref = result.reference;
    if (!object(ref) || ref.kind !== 'LOCAL')
      throw new Error('Only explicit local evidence is supported');
    let raw: Buffer;
    if ('entry_id' in ref) {
      if (
        ref.scope !== 'HARNESS' ||
        ref.path !== 'artifacts/development/' + task_id + '/history.jsonl'
      )
        throw new Error('Cross-task entry evidence');
      const matches = entries.filter((e) => e.entry_id === ref.entry_id);
      if (matches.length !== 1) throw new Error('Missing evidence entry');
      raw = canonical_json(matches[0]!.payload);
    } else {
      const root =
        ref.scope === 'HARNESS' ? harness : ref.scope === 'REPOSITORY' ? repo : undefined;
      if (!root) throw new Error('Invalid evidence scope');
      if (typeof ref.path !== 'string') throw new Error('Invalid evidence path');
      raw = read_bytes(relative_path(ref.path, root), root);
    }
    const identity = content_identity(raw);
    if ('identity' in result && result.identity !== identity)
      throw new Error('Evidence bytes changed');
    result.identity = identity;
  }
  return result;
}
export interface RecordOptions {
  actor: string;
  context_id?: string | null;
  _lock_held?: boolean;
  _command_capture?: boolean;
}
export function record_step(
  repo: string,
  harness: string,
  task_id: string,
  step: unknown,
  options: RecordOptions,
): Entry {
  return _record_step(repo, harness, task_id, step, options);
}
export function _record_step(
  repo_root: string,
  harness_root: string,
  task_id: string,
  step: unknown,
  options: RecordOptions,
): Entry {
  const [repo, harness, run] = roots(repo_root, harness_root, task_id);
  if (!object(step) || typeof options.actor !== 'string' || !options.actor.trim())
    throw new Error('Step and actor required');
  const { action, ...initial } = step;
  if (
    !['start', 'specification', 'phase', 'operation', 'source', 'review'].includes(String(action))
  )
    throw new Error('Unknown semantic action');
  safe_mkdir(run, harness);
  const history = ordinary(path.join(run, 'history.jsonl'), harness, { missing: true });
  function execute(): Entry {
    let fields = { ...initial },
      entries: Entry[] = [],
      capture: Capture | null = null;
    if (exists(history)) {
      if (action === 'start') throw new Error('Task already exists');
      capture = capture_task(repo, harness, task_id);
      if (options.context_id !== capture.context_id)
        throw new Error('STALE_CONTEXT: read current task context before recording');
      entries = capture.entries;
      if (capture.structural_issues.length)
        throw new Error('Reconcile invalid history before recording');
    } else if (action !== 'start') throw new Error('Start the task before recording work');
    let records: Payload[] = [],
      kind: string;
    if (action === 'review') {
      if (!isDeepStrictEqual(Object.keys(fields).sort(), ['approval', 'record']))
        throw new Error('Review requires only record and approval');
      const target = entries.find((e) => e.entry_id === fields.record);
      if (!target || !['Specification', 'PhaseRecord'].includes(target.payload.record_type))
        throw new Error('Review must select an existing phase result');
      kind = target.payload.record_type;
      const review = { record: target.entry_id, approval: fields.approval };
      const { schema_version: _version, record_type: _kind, ...rest } = target.payload;
      fields = { ...rest, human_review: review };
      const definition = capture!.workflow.phases.find((d) => d.id === fields.phase);
      if (definition?.source_sensitive && fields.source !== capture!.current_source)
        throw new Error('Source changed since the presented result; submit a fresh result');
    } else
      kind = (
        {
          start: 'Task',
          specification: 'Specification',
          phase: 'PhaseRecord',
          operation: 'Operation',
          source: 'SourceInventory',
        } as Record<string, string>
      )[String(action)]!;
    if (action === 'start') {
      if (options.context_id != null) throw new Error('New task has no previous context');
      Object.assign(fields, { task_id, configuration: capture_configuration(harness) });
    } else if (action !== 'review') {
      const accepted = derive_report(capture!).specification,
        spec = entries.find((e) => e.entry_id === accepted);
      const scope =
        action === 'specification'
          ? (fields.source_scope as SourceScope | undefined)
          : capture!.source_scope;
      const inventory = scope
        ? (capture_inventory(repo, harness, task_id, scope) as Payload)
        : null;
      if (
        inventory &&
        inventory.record_type === 'SourceInventory' &&
        !entries.some(
          (e) =>
            e.payload.record_type === 'SourceInventory' &&
            e.payload.revision === inventory.revision,
        )
      )
        records.push(inventory);
      if (action === 'source') {
        if (!inventory) throw new Error('Accept a source scope before capturing it');
        fields = { ...inventory };
        records = [];
      } else if (action === 'phase' || action === 'operation') {
        Object.assign(fields, {
          specification: spec?.entry_id ?? null,
          source: inventory?.record_type === 'SourceInventory' ? inventory.revision : null,
        });
        if (action === 'phase') fields.evidence ??= [];
        else if (fields.status !== 'INTENT') {
          const prior = capture!.operations[String(fields.operation_id)];
          if (!prior) throw new Error('Operation needs a durable intent before dispatch');
          const previous = prior.payload as unknown as Record<string, unknown>;
          for (const key of [
            'phase',
            'specification',
            'source',
            'connection',
            'inputs',
            'deadline',
            'command',
          ]) {
            if (
              key in fields &&
              !['specification', 'source'].includes(key) &&
              !isDeepStrictEqual(fields[key], previous[key])
            )
              throw new Error('Operation input identities cannot change');
            if (key in previous) fields[key] = previous[key];
            else delete fields[key];
          }
          if ('handle' in previous && !('handle' in fields)) fields.handle = previous.handle;
        }
      }
    }
    if (
      action === 'operation' &&
      fields.command &&
      ['RUNNING', 'COMPLETED'].includes(String(fields.status)) &&
      !options._command_capture
    )
      throw new Error('Use command.cjs to run and capture a command operation');
    const payload = fill_evidence(
      { ...fields, schema_version: VERSION, record_type: kind },
      repo,
      harness,
      entries,
      task_id,
    ) as Payload;
    records.push(payload);
    if (action === 'start' && fields.source_scope)
      records.push(capture_inventory(repo, harness, task_id, fields.source_scope) as Payload);
    const schemas = framework_path(
      capture?.configuration_root ?? path.join(harness, 'framework'),
      'schemas',
    );
    const validator = local_validator(path.join(schemas, 'records.schema.json')),
      staged = [...entries];
    for (const record of records) {
      const error = [...validator.iter_errors(record)][0];
      if (error) throw new Error('Invalid ' + record.record_type + ': ' + error.message);
      staged.push(make_entry(record, options.actor, staged.at(-1)));
    }
    if (capture) {
      validate_candidate(capture, staged, records.at(-1)!);
      if (check_unchanged(capture).length)
        throw new Error('Task inputs changed while recording; read context again');
    }
    for (const record of records)
      if (record.record_type === 'SourceInventory') {
        const fresh = capture_inventory(repo, harness, task_id, record.scope);
        if (fresh.revision !== record.revision)
          throw new Error('Source changed before journal append');
      }
    const raw = Buffer.concat(entries.flatMap((e) => [canonical_json(e), Buffer.from('\n')]));
    const serialized = Buffer.concat(
      staged.slice(entries.length).flatMap((e) => [canonical_json(e), Buffer.from('\n')]),
    );
    parse_history(Buffer.concat([raw, serialized]), task_id);
    const descriptor = fs.openSync(
      history,
      fs.constants.O_CREAT |
        fs.constants.O_APPEND |
        fs.constants.O_RDWR |
        (fs.constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    try {
      if (fs.fstatSync(descriptor).nlink !== 1) throw new Error('Storage alias refused');
      if (!fs.readFileSync(descriptor).equals(raw))
        throw new Error('Concurrent writer changed history');
      fs.writeFileSync(descriptor, serialized);
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    return staged.at(-1)!;
  }
  return options._lock_held ? execute() : locked(run, execute);
}
