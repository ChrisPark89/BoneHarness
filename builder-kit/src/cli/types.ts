export interface Diagnostic {
  code: string;
  path?: string;
  message: string;
  action?: string;
}
export interface Adapter {
  instructions?: string;
  connection: string | null;
  status: string;
  reason: string;
  evidence?: string[];
}
export interface Profile {
  /** @deprecated Read-only compatibility for older profiles. */
  setup_answers?: Record<string, { answer: string; resolved: boolean }>;
  configuration_id: string;
  adapters: Record<string, Adapter>;
  reviews: {
    default: string;
    phases: Record<string, string>;
  };
}
export interface CheckRow {
  name: string;
  result: string;
  evidence?: string[];
  adapter?: string;
  connection?: string;
}
export interface Change {
  path: string;
  before?: string | null;
  after?: string | null;
}
export interface InstallationRecord {
  schema_version: string;
  configuration_id: string;
  status: string;
  activation: string;
  files: string[];
  checks: CheckRow[];
}
export interface UpdateRecord {
  schema_version: string;
  status: string;
  checks: CheckRow[];
  evidence?: string[];
  changes: Change[];
  base_configuration: string;
  candidate_configuration: string;
}
export interface CheckReport {
  schema_version: string;
  configuration_id: string | null;
  structure: string;
  activation: string;
  adapters: Record<string, Adapter>;
  reviews?: Profile['reviews'];
  checks: string[];
  diagnostics: Diagnostic[];
  limitations: string[];
  exit_code: number;
}
export interface Release {
  version: string;
  formats: string[];
  runtime_api: number;
  managed: Record<string, string>;
  identity: string;
}
export interface TaskRow {
  id: string;
  status: string;
  phase: string;
  basis?: string;
  open_operations: string[];
  error?: string;
  compatibility?: string;
  action?: string;
}
export interface Reference {
  scope: string;
  path: string;
  entry_id?: string;
}
export interface Evidence {
  reference: Reference;
}
export interface Phase {
  label: string;
  status: string;
  evidence: Evidence[];
  review?: {
    status: string;
  } | null;
}
export interface HistoryRow {
  kind: string;
  phase?: string;
  status: string;
  outcome?: string;
  evidence?: Evidence[];
}
export interface TaskReport {
  task_id: string;
  status: string;
  report_version: string;
  generation_id: string;
  generated_at: string;
  inputs: {
    path: string;
    identity: string;
  }[];
  phases: Phase[];
  criteria: {
    required: boolean;
    status: string;
  }[];
  history: HistoryRow[];
  issues: Diagnostic[];
  open_operations: string[];
  specification: unknown;
}
export interface TaskView {
  kind: 'task';
  basis: string;
  report: TaskReport;
}
export interface DoctorRecord {
  checked_at?: string | null;
  status?: string;
  issues?: Diagnostic[];
  gaps?: Gap[];
  error?: string;
}
export interface Gap {
  phase: string;
  reason: string;
  action: string;
}
export interface SetupView {
  kind: 'setup';
  status: string;
  can_start: boolean;
  setup_complete: boolean;
  checked_at: string | null;
  previous_check: DoctorRecord | null;
  issues: Diagnostic[];
  gaps: Gap[];
  reviews?: Profile['reviews'];
  historical_pages: boolean;
  tasks: TaskRow[];
  next_action: string;
}
export interface UpdatePlan {
  kind: 'update_plan';
  kit: string;
  baseline: string | null;
  issues: string[];
  changes: Change[];
  tasks: TaskRow[];
  no_op: boolean;
  status: string;
  inputs?: Record<string, string>;
  base?: Release;
  candidate?: Release;
  configuration?: string;
  validation?: Record<string, unknown>;
}
export interface Publication {
  kind: 'update';
  update_id: string;
  status: string;
  changes: Change[];
  issues: string[];
  from_version: string;
  to_version: string;
  tasks: TaskRow[];
  validation: Record<string, unknown>;
  checked_at: string;
  next_action: string;
  failure?: string;
}
export type View =
  | TaskView
  | SetupView
  | (Profile & {
      kind: 'config';
    })
  | UpdatePlan
  | Publication
  | {
      kind: 'update';
      update: Publication | UpdateRecord;
    }
  | {
      error: string;
    };
export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
