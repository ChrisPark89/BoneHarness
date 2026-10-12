/** Persisted format-2 records. Values enter these types only after schema validation. */
export interface Reference {
  kind: 'LOCAL';
  scope: 'HARNESS' | 'REPOSITORY';
  path: string;
  entry_id?: string;
}
export interface Evidence {
  reference: Reference;
  identity: string;
  provenance: 'REVIEW' | 'EXECUTION' | 'FIXTURE';
  summary: string;
}
export interface Approval {
  user: string;
  review: string;
  quote: string;
  instruction: Evidence;
}
export interface HumanReview {
  record: string;
  approval: Approval;
}
export interface SourceScope {
  roots: string[];
  exclude: string[];
}
export interface FileIdentity {
  path: string;
  identity: string;
}
export interface Configuration {
  id: string;
  bundle: string;
  files: FileIdentity[];
}
export interface BaseRecord {
  schema_version: '2.0.0';
  record_type: string;
}
export interface TaskRecord extends BaseRecord {
  record_type: 'Task';
  task_id: string;
  request: Evidence;
  configuration: Configuration;
  source_scope?: SourceScope;
}
export interface Criterion {
  id: string;
  description: string;
  required: boolean;
  methods: string[];
}
export interface Verdict {
  criterion_id: string;
  result: string;
  method: string;
  reason: string;
  evidence: Evidence[];
  operation?: string;
}
export interface SpecificationRecord extends BaseRecord {
  record_type: 'Specification';
  document: Evidence;
  acceptance: {
    authority: Evidence;
    review: string;
  };
  criteria: Criterion[];
  source_scope: SourceScope;
  reconcile_skips: string[];
  human_review?: HumanReview;
}
export interface InventoryRecord extends BaseRecord {
  record_type: 'SourceInventory';
  task_id: string;
  revision: string;
  scope: SourceScope;
  files: FileIdentity[];
}
export interface PhaseRecord extends BaseRecord {
  record_type: 'PhaseRecord';
  phase: string;
  status: string;
  specification: string | null;
  source: string | null;
  summary: string;
  evidence: Evidence[];
  criteria?: Verdict[];
  approval?: Approval;
  operation?: string;
  retry_of?: string;
  human_review?: HumanReview;
}
export interface OperationRecord extends BaseRecord {
  record_type: 'Operation';
  operation_id: string;
  phase: string;
  status: string;
  specification: string | null;
  source: string;
  connection: string;
  inputs?: {
    target?: string;
    environment?: string;
    artifact?: Evidence;
  };
  deadline?: string;
  handle?: string | null;
  outcome?: string;
  evidence: Evidence[];
  command?: string[];
}
export type Payload =
  | TaskRecord
  | SpecificationRecord
  | InventoryRecord
  | PhaseRecord
  | OperationRecord;
export interface Entry<P extends Payload = Payload> {
  journal_version: string;
  sequence: number;
  entry_id: string;
  previous_hash: string | null;
  actor: string;
  timestamp: string;
  payload: P;
  entry_hash: string;
}
export interface PhaseDefinition {
  id: string;
  label: string;
  mandatory?: boolean;
  proof?: string;
  source_sensitive?: boolean;
}
export interface Workflow {
  schema_version: string;
  phases: PhaseDefinition[];
}
export interface Adapter {
  instructions?: string;
  connection?: string | null;
  status: string;
  reason?: string;
  evidence?: unknown[];
}
export interface Profile {
  schema_version: string;
  configuration_id: string;
  adapters: Record<string, Adapter>;
  reviews?: {
    default: string;
    phases: Record<string, string>;
  };
}
export interface Issue {
  code: string;
  record: string | null;
  message: string;
}
export interface EvidenceCheck {
  valid: boolean;
  reference: Reference;
  identity: string;
}
export interface Capture {
  task_id: string;
  repo_root: string;
  harness_root: string;
  run_root: string;
  configuration_root: string;
  task: TaskRecord;
  entries: Entry[];
  workflow: Workflow;
  profile: Profile;
  specification: Entry<SpecificationRecord> | null;
  source_scope: SourceScope | undefined;
  current_source: string | null;
  current_files: FileIdentity[] | null;
  operations: Record<string, Entry<OperationRecord>>;
  record_issues: Record<string, string[]>;
  evidence_checks: Record<string, EvidenceCheck>;
  structural_issues: Issue[];
  inputs: Record<string, string>;
  context_id: string;
  evidence_contents: Record<string, string>;
}
export interface ReviewStatus {
  mode: string;
  status: string;
  record: string;
}
export interface PhaseStatus {
  id: string;
  label: string;
  status: string;
  record: string | null;
  evidence: Evidence[];
  review?: ReviewStatus | null;
  source?: string | null;
  specification?: string | null;
  summary?: string;
}
export interface CriterionStatus {
  id: string;
  required: boolean;
  status: string;
  evidence: Evidence[];
}
export interface HistoryRow {
  record: string;
  kind: string;
  phase: string;
  status: string;
  outcome: string | null;
  evidence: Evidence[];
  supported: boolean;
  actor: string;
  timestamp: string;
}
export interface Report {
  generated_at: string;
  report_version: string;
  task_id: string;
  context_id: string;
  status: string;
  specification: string | null;
  phases: PhaseStatus[];
  criteria: CriterionStatus[];
  issues: Issue[];
  history: HistoryRow[];
  open_operations: string[];
  inputs: FileIdentity[];
  limitations: string[];
  generation_id: string;
}
