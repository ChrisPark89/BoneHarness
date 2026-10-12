/** One reducer validates proposed steps and derives evidence-bound task reports. */
import { connection_ready } from '../adapters.js';
import { unicode_compare } from '../io/canonical.js';
import { isDeepStrictEqual } from 'node:util';
import { canonical_json, content_identity } from '../io/journal.js';
import { read_bytes } from '../io/loader.js';
import { collect_files, inventory_identity } from '../io/source_inventory.js';
import { valid_result } from '../io/command.js';
import { evidence_key, inspect_evidence, operation_identity } from './evidence.js';
import type {
  Approval,
  Capture,
  CriterionStatus,
  Entry,
  Evidence,
  HistoryRow,
  Issue,
  OperationRecord,
  Payload,
  PhaseRecord,
  PhaseStatus,
  Report,
  ReviewStatus,
  SpecificationRecord,
} from './types.js';
export const RESOLVED = new Set(['PASS', 'USER_SKIPPED']);
export const TERMINAL = new Set(['COMPLETED', 'CANCELLED']);
export function derive_report(capture: Capture): Report {
  const definitions = capture.workflow.phases,
    ids = definitions.map((p) => p.id);
  const phases: Record<string, PhaseStatus> = Object.fromEntries(
    definitions.map((p) => [
      p.id,
      { id: p.id, label: p.label, status: 'NOT_STARTED', record: null, evidence: [] },
    ]),
  );
  const issues: Issue[] = [...capture.structural_issues],
    history: HistoryRow[] = [];
  const operations: Record<string, Entry<OperationRecord>> = Object.create(null),
    known_closed: Record<string, boolean> = Object.create(null);
  let spec: Entry<SpecificationRecord> | null = null,
    criteria: CriterionStatus[] = [];
  const checks = capture.evidence_checks,
    contents = capture.evidence_contents;
  const supported: Record<string, boolean> = {},
    inventories = new Set<string>();
  const by_entry = new Map(capture.entries.map((e) => [e.entry_id, e]));
  const review_settings = capture.profile.reviews ?? {
    default: 'LLM',
    phases: { specification: 'HUMAN' },
  };
  function usable(evidence: Evidence[] | undefined, method?: string): boolean {
    return Boolean(
      evidence?.length &&
        evidence.every(
          (e) =>
            e?.reference &&
            e.identity &&
            checks[evidence_key(e)]?.valid &&
            e.provenance !== 'FIXTURE' &&
            (method === undefined || e.provenance === method),
        ),
    );
  }
  function approval(value?: Approval): boolean {
    return Boolean(
      value?.user?.trim() &&
        value.review?.trim() &&
        value.quote?.trim() &&
        usable([value.instruction], 'REVIEW') &&
        contents[evidence_key(value.instruction)]?.includes(value.quote),
    );
  }
  function review_gate(
    payload: SpecificationRecord | PhaseRecord,
    eid: string,
    phase: string,
    errors: string[],
  ): ReviewStatus {
    const mode = review_settings.phases[phase] ?? review_settings.default,
      requested = payload.human_review;
    if (mode === 'LLM') {
      if (requested) errors.push('This phase does not have a pending human review');
      return { mode: 'LLM', status: 'APPROVED', record: eid };
    }
    if (!requested) return { mode: 'HUMAN', status: 'PENDING', record: eid };
    const target = requested.record,
      old = by_entry.get(target),
      prior = phases[phase]!;
    const { human_review: _review, ...rest } = payload;
    const same = Boolean(old && isDeepStrictEqual(rest, old.payload));
    if (
      !same ||
      prior.record !== target ||
      prior.review?.status !== 'PENDING' ||
      prior.status !== 'BLOCKED' ||
      !supported[target]
    )
      errors.push('Human approval must select the current unchanged pending result');
    const authority = requested.approval,
      evidence = authority.instruction;
    if (!approval(authority) || !contents[evidence_key(evidence)]?.includes(target))
      errors.push(
        'Human review needs the original exchange containing this review reference and approval quote',
      );
    return { mode: 'HUMAN', status: 'APPROVED', record: target };
  }
  function unresolved(): string[] {
    return Object.keys(operations).filter((key) => !known_closed[key]);
  }
  function prior_ok(phase: string, source?: string | null): boolean {
    return definitions.slice(0, ids.indexOf(phase)).every((definition) => {
      const row = phases[definition.id]!;
      return (
        RESOLVED.has(row.status) &&
        !(source && row.status === 'PASS' && definition.source_sensitive && row.source !== source)
      );
    });
  }
  function op_pass(
    key: string | undefined,
    source: string | null,
    specid: string | null,
    phase?: string,
  ): boolean {
    const row = key ? operations[key] : undefined,
      p = row?.payload;
    return Boolean(
      row &&
        supported[row.entry_id] &&
        p?.status === 'COMPLETED' &&
        p.outcome === 'PASS' &&
        p.source === source &&
        p.specification === specid &&
        (phase === undefined || p.phase === phase),
    );
  }
  for (const entry of capture.entries) {
    const p = entry.payload,
      kind = p.record_type,
      eid = entry.entry_id;
    const errors = [...(capture.record_issues[eid] ?? [])];
    if (p.record_type === 'SourceInventory') {
      inventories.add(p.revision);
      supported[eid] = errors.length === 0;
      continue;
    }
    if (p.record_type === 'Task') {
      supported[eid] = errors.length === 0;
      continue;
    }
    const phase = p.record_type === 'Specification' ? 'specification' : p.phase;
    if (!Object.hasOwn(phases, phase)) {
      issues.push({ code: 'UNKNOWN_PHASE', record: eid, message: 'Unknown phase' });
      supported[eid] = false;
      continue;
    }
    const definition = definitions.find((d) => d.id === phase)!;
    if (p.record_type === 'Operation') {
      const old = operations[p.operation_id];
      if (!inventories.has(p.source)) errors.push('Operation source inventory is missing');
      if (old) {
        if (!supported[old.entry_id])
          errors.push('Operation origin or preceding update is unsupported');
        if (TERMINAL.has(old.payload.status))
          errors.push('Closed operation cannot change; use a new operation ID');
        if (!isDeepStrictEqual(operation_identity(p), operation_identity(old.payload)))
          errors.push('Operation identity changed');
      } else if (p.status !== 'INTENT') errors.push('Operation intent must precede dispatch');
      if (p.status === 'INTENT') {
        if (old) errors.push('Operation ID already exists');
        if (!prior_ok(phase, p.source))
          errors.push('Earlier phases are unresolved or source evidence is stale');
        if (unresolved().length) errors.push('Reconcile the previous operation before dispatch');
        const capability =
          ({ pattern_review: 'pattern_search', testing: 'test' } as Record<string, string>)[
            phase
          ] ?? phase;
        const binding = capture.profile.adapters[capability];
        if (binding?.connection !== p.connection || !connection_ready(binding))
          errors.push('Operation connection is not a compatible captured adapter');
        if (p.specification !== (spec?.entry_id ?? null))
          errors.push('Operation specification differs');
      }
      if (TERMINAL.has(p.status)) {
        if (!usable(p.evidence, 'EXECUTION'))
          errors.push('Terminal operation needs execution or reconciliation evidence');
        if (
          p.status === 'COMPLETED' &&
          !['PASS', 'FAIL', 'BLOCKED', 'UNKNOWN'].includes(p.outcome ?? '')
        )
          errors.push('Completed operation needs an explicit outcome');
      }
      let captured = true;
      if (p.command?.length && p.status === 'COMPLETED') {
        captured = valid_result(p, capture, checks, contents);
        if (!captured) errors.push('Command completion needs its matching captured command result');
      }
      const stable = Boolean(
        old && isDeepStrictEqual(operation_identity(p), operation_identity(old.payload)),
      );
      if (TERMINAL.has(p.status) && stable && captured && usable(p.evidence, 'EXECUTION'))
        known_closed[p.operation_id] = true;
      else known_closed[p.operation_id] ??= false;
      operations[p.operation_id] = entry as Entry<OperationRecord>;
    } else if (p.record_type === 'Specification') {
      if (!prior_ok(phase)) errors.push('Resolve earlier phases before specification acceptance');
      if (unresolved().length)
        errors.push('Reconcile live or uncertain operations before specification acceptance');
      if (!usable([p.acceptance.authority]) || !p.acceptance.review.trim())
        errors.push('Specification acceptance needs actual authority evidence and review');
      if (!usable([p.document], 'REVIEW')) errors.push('Specification document is unsupported');
      const names = p.criteria.map((c) => c.id);
      if (names.length !== new Set(names).size || !p.criteria.some((c) => c.required))
        errors.push('Specification needs distinct criteria and at least one required criterion');
      const skips = new Set(
        Object.values(phases)
          .filter((v) => v.status === 'USER_SKIPPED')
          .map((v) => v.record),
      );
      if (!isDeepStrictEqual(new Set(p.reconcile_skips), skips))
        errors.push('Explicitly reconcile every active skip with this specification');
      const review = review_gate(p, eid, phase, errors);
      phases[phase]!.review = review;
      if (!errors.length && review.status === 'PENDING') {
        Object.assign(phases[phase]!, {
          status: 'BLOCKED',
          record: eid,
          evidence: [p.document],
          summary: 'Awaiting human review',
        });
      } else if (!errors.length) {
        spec = entry as Entry<SpecificationRecord>;
        for (const [name, row] of Object.entries(phases)) {
          if (ids.indexOf(name) > ids.indexOf('specification') && row.status !== 'USER_SKIPPED')
            Object.assign(row, { status: 'NOT_STARTED', record: null, evidence: [] });
        }
        const authority = p.human_review?.approval,
          evidence = [p.document, p.acceptance.authority];
        if (authority) evidence.push(authority.instruction);
        Object.assign(phases.specification!, {
          status: 'PASS',
          record: eid,
          evidence,
          summary: authority?.review ?? p.acceptance.review,
        });
        criteria = p.criteria.map((c) => ({
          id: c.id,
          required: c.required,
          status: 'NOT_STARTED',
          evidence: [],
        }));
      } else
        Object.assign(phases.specification!, {
          status: 'UNVERIFIED',
          record: eid,
          evidence: [p.document],
        });
    } else if (p.record_type === 'PhaseRecord') {
      const status = p.status;
      if (phase === 'specification')
        errors.push('Use specification acceptance; a phase record cannot accept or skip it');
      if (p.source && !inventories.has(p.source)) errors.push('Missing preceding source inventory');
      if (p.specification !== (spec?.entry_id ?? null))
        errors.push('Phase specification differs from accepted specification');
      if (ids.indexOf(phase) > ids.indexOf('specification') && !spec)
        errors.push('Specification acceptance is required');
      if (RESOLVED.has(status)) {
        if (!prior_ok(phase, p.source))
          errors.push('Earlier phases are unresolved or source evidence is stale');
        if (unresolved().length)
          errors.push('Reconcile live or uncertain operations before advancing or skipping');
        if (status === 'USER_SKIPPED') {
          if (definition.mandatory) errors.push('Mandatory phase cannot be skipped');
          if (!approval(p.approval))
            errors.push('Skip needs original explicit instruction and scope review');
        } else {
          if (!usable(p.evidence)) errors.push('Phase success needs usable evidence');
          if (
            (definition.proof ?? 'REVIEW') === 'EXECUTION' &&
            !op_pass(p.operation, p.source, p.specification, phase)
          )
            errors.push('Execution phase needs a matching successful operation');
          if (definition.source_sensitive && !p.source)
            errors.push('Phase needs a captured source scope');
          if (phase === 'specification_verification' && spec) {
            const verdicts = p.criteria ?? [],
              by_id = new Map(verdicts.map((v) => [v.criterion_id, v]));
            const expected = new Set(spec.payload.criteria.map((c) => c.id));
            if (by_id.size !== verdicts.length || [...by_id.keys()].some((id) => !expected.has(id)))
              errors.push('Criterion IDs are duplicate or not accepted');
            criteria = spec.payload.criteria.map((criterion) => {
              const v = by_id.get(criterion.id);
              let valid = Boolean(
                v &&
                  v.result === 'PASS' &&
                  criterion.methods.includes(v.method) &&
                  usable(v.evidence, v.method === 'EXECUTION' ? 'EXECUTION' : undefined),
              );
              if (valid && v?.method === 'EXECUTION')
                valid = op_pass(v.operation, p.source, p.specification);
              if (criterion.required && !valid)
                errors.push('Required criterion lacks current supported evidence: ' + criterion.id);
              return {
                id: criterion.id,
                required: criterion.required,
                status: valid ? 'PASS' : 'UNVERIFIED',
                evidence: v?.evidence ?? [],
              };
            });
          }
        }
      }
      const review = status === 'PASS' ? review_gate(p, eid, phase, errors) : null;
      if (p.human_review && status !== 'PASS')
        errors.push('Human review applies to a proposed PASS result');
      const evidence = [...p.evidence];
      if (p.human_review) evidence.push(p.human_review.approval.instruction);
      if (status === 'USER_SKIPPED' && p.approval) evidence.unshift(p.approval.instruction);
      Object.assign(phases[phase]!, {
        status: errors.length ? 'UNVERIFIED' : review?.status === 'PENDING' ? 'BLOCKED' : status,
        record: eid,
        evidence,
        source: p.source,
        specification: p.specification,
        review,
        summary: p.summary,
      });
    }
    supported[eid] = errors.length === 0;
    history.push({
      record: eid,
      kind,
      phase,
      status: 'status' in p ? p.status : 'ACCEPTED',
      outcome: 'outcome' in p ? (p.outcome ?? null) : null,
      evidence: 'evidence' in p ? p.evidence : [],
      supported: !errors.length,
      actor: entry.actor,
      timestamp: entry.timestamp,
    });
    for (const error of errors)
      issues.push({ code: 'UNSUPPORTED_RECORD', record: eid, message: error });
  }
  for (const definition of definitions) {
    const row = phases[definition.id]!,
      awaiting = row.status === 'BLOCKED' && row.review?.status === 'PENDING';
    if (
      (row.status === 'PASS' || awaiting) &&
      definition.source_sensitive &&
      row.source !== capture.current_source
    ) {
      row.status = 'UNVERIFIED';
      issues.push({
        code: 'SOURCE_CHANGED',
        record: row.record,
        message: definition.label + ' needs current source evidence',
      });
      if (definition.id === 'specification_verification')
        for (const criterion of criteria) criterion.status = 'UNVERIFIED';
    }
  }
  for (const row of Object.values(phases))
    if (row.status === 'BLOCKED' && row.review?.status === 'PENDING')
      issues.push({
        code: 'AWAITING_REVIEW',
        record: row.record,
        message: row.label + ': awaiting human review',
      });
  if (unresolved().length)
    issues.push({
      code: 'UNRESOLVED_OPERATION',
      record: null,
      message: 'Reconcile: ' + unresolved().join(', '),
    });
  if (!supported[capture.entries[0]!.entry_id])
    issues.push({
      code: 'REQUEST_UNSUPPORTED',
      record: capture.entries[0]!.entry_id,
      message: 'Original request evidence is unsupported',
    });
  const integrity =
    !capture.structural_issues.length &&
    supported[capture.entries[0]!.entry_id] &&
    !issues.some((i) => i.code === 'UNKNOWN_PHASE');
  const complete =
    integrity &&
    spec &&
    capture.current_files?.length &&
    Object.values(phases).every((v) => RESOLVED.has(v.status)) &&
    criteria.filter((c) => c.required).every((c) => c.status === 'PASS') &&
    !unresolved().length;
  const status = complete
    ? 'COMPLETE'
    : Object.values(phases).some((v) => v.status === 'UNVERIFIED') || !integrity
      ? 'UNVERIFIED'
      : unresolved().length ||
          Object.values(phases).some((v) => ['FAIL', 'BLOCKED', 'UNKNOWN'].includes(v.status))
        ? 'BLOCKED'
        : 'IN_PROGRESS';
  const report: Report = {
    generated_at: new Date().toISOString(),
    report_version: '2.0.0',
    task_id: capture.task_id,
    context_id: capture.context_id,
    status,
    specification: spec?.entry_id ?? null,
    phases: Object.values(phases),
    criteria,
    issues,
    history,
    open_operations: unresolved(),
    inputs: Object.entries(capture.inputs)
      .sort(([a], [b]) => unicode_compare(a, b))
      .map(([path, identity]) => ({ path, identity })),
    limitations: [
      'Local hashes check bytes, not authorship. Reviews and user attribution remain recorded judgments.',
    ],
    generation_id: '',
  };
  const { generation_id: _id, ...unsigned } = report;
  report.generation_id = content_identity(canonical_json(unsigned));
  return report;
}
export function validate_candidate(capture: Capture, entries: Entry[], payload: Payload): void {
  const trial: Capture = structuredClone(capture);
  trial.entries = entries;
  function read(file: string, root: string): Buffer {
    const raw = read_bytes(file, root);
    capture.inputs[file] = content_identity(raw);
    return raw;
  }
  [trial.evidence_checks, trial.record_issues, trial.evidence_contents] = inspect_evidence(
    entries,
    capture.repo_root,
    capture.harness_root,
    capture.task_id,
    read,
  );
  if (payload.record_type === 'Specification') {
    trial.source_scope = payload.source_scope;
    trial.current_files = collect_files(
      capture.repo_root,
      capture.harness_root,
      payload.source_scope,
      { allow_missing: true },
    );
    trial.current_source = inventory_identity(payload.source_scope, trial.current_files);
  }
  const report = derive_report(trial),
    eid = entries.at(-1)!.entry_id;
  const errors = report.issues
    .filter((i) => i.record === eid && ['UNSUPPORTED_RECORD', 'UNKNOWN_PHASE'].includes(i.code))
    .map((i) => i.message);
  const observation =
    payload.record_type === 'PhaseRecord' &&
    ['FAIL', 'BLOCKED', 'UNKNOWN'].includes(payload.status) &&
    capture.workflow.phases.some((p) => p.id === payload.phase);
  const reconciliation =
    payload.record_type === 'Operation' &&
    TERMINAL.has(payload.status) &&
    !report.open_operations.includes(payload.operation_id) &&
    errors.every((e) => e === 'Operation origin or preceding update is unsupported');
  if (errors.length && !observation && !reconciliation) throw new Error(errors.join('; '));
}
