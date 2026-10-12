import { framework_relative } from '../layout.js';
/** Validate setup facts and locally retained assessments, without executing adapters. */
import fs from 'node:fs';
import { connection_ready } from '../adapters.js';
import path from 'node:path';
import { DocumentError, load_document, relative_path } from '../io/loader.js';
import { local_validator, validate_document } from '../io/schemas.js';
import { digest } from '../installer/install.js';
import { canonical_json } from '../io/canonical.js';
import type {
  Adapter,
  CheckReport,
  InstallationRecord,
  Profile,
  UpdateRecord,
} from '../cli/types.js';
export const PROFILE = 'framework/config/repo-profile.yaml',
  SCHEMAS = 'framework/schemas',
  INSTALLATION = 'artifacts/installation/installation-record.yaml';
export const REQUIRED = [
  'README.md',
  PROFILE,
  INSTALLATION,
  'framework/workflows/shared/adapter-interface.md',
  'framework/workflows/setup/setup.md',
  'framework/workflows/shared/recovery.md',
  'framework/workflows/development/HARNESS.md',
  'framework/workflows/development/workflow.yaml',
  'framework/workflows/development/command-capture.md',
  'framework/workflows/development/human-review.md',
  'framework/workflows/development/verification-plan.md',
  'framework/templates/development/review.yaml',
  'framework/workflows/maintenance/harness-maintenance.md',
  'framework/workflows/maintenance/maintenance-workflow.yaml',
  'framework/templates/maintenance/harness-update-record.yaml',
  ...['check', 'report', 'journal', 'view', 'command', 'context', 'source'].map(
    (n) => 'framework/tools/' + n + '.cjs',
  ),
  ...['common', 'profile', 'records', 'workflow'].map((n) => SCHEMAS + '/' + n + '.schema.json'),
];
export function new_report(): CheckReport {
  return {
    schema_version: '2.0.0',
    configuration_id: null,
    structure: 'FAIL',
    activation: 'PENDING',
    adapters: {},
    checks: [],
    diagnostics: [],
    limitations: [
      'Read-only structure and local-reference checks; no adapter is executed.',
      'Compatibility meaning, current permissions, activation and task completion need actual review.',
      'Adapter status and activation are recorded claims; this checker does not authenticate them.',
    ],
    exit_code: 0,
  };
}
export function check_installation(
  repo: string,
  options: {
    update?: string;
    harness_root?: string;
  } = {},
): CheckReport {
  const report = new_report();
  const issue = (code: string, p: string, message: string) => {
    report.diagnostics.push({ code, path: p, message });
  };
  function failure(error: unknown, owner?: string): void {
    if (error instanceof DocumentError) issue(error.code, owner ?? error.path, error.message);
    else issue('IO_ERROR', owner ?? repo, error instanceof Error ? error.message : String(error));
  }
  let harness: string;
  try {
    harness = relative_path(options.harness_root ?? '.harness', repo, { directory: true });
    if (fs.lstatSync(harness).isSymbolicLink())
      throw new DocumentError(
        'PATH_SYMLINK',
        '.harness',
        'Harness root must be an actual repository directory',
      );
  } catch (error) {
    failure(error);
    report.exit_code = 1;
    return report;
  }
  let schemaRoot: string;
  try {
    schemaRoot = 'framework/' + framework_relative(path.join(harness, 'framework'), 'schemas');
  } catch (error) {
    failure(error);
    report.exit_code = 1;
    return report;
  }
  function read(name: string): unknown {
    try {
      return load_document(relative_path(name, harness), harness);
    } catch (error) {
      failure(error, name);
      return null;
    }
  }
  function validate(
    value: unknown,
    schema: string,
    definition: string | undefined,
    name: string,
  ): boolean {
    if (
      !value ||
      typeof value !== 'object' ||
      (
        value as {
          schema_version?: unknown;
        }
      ).schema_version !== '2.0.0'
    ) {
      issue(
        'FORMAT_UNSUPPORTED',
        name,
        'Require format 2.0.0; older records need their original tools',
      );
      return false;
    }
    try {
      const errors = validate_document(
        value,
        relative_path(schemaRoot + '/' + schema, harness),
        definition,
      );
      for (const e of errors) issue(e.code, name + e.path, e.message);
      return errors.length === 0;
    } catch (error) {
      failure(error, name);
      return false;
    }
  }
  function evidence(paths: string[], owner: string): void {
    for (const name of paths)
      try {
        relative_path(name, harness);
      } catch (error) {
        failure(error, owner);
      }
  }
  function checked_rows(value: InstallationRecord | UpdateRecord, owner: string): void {
    for (const check of value.checks ?? []) {
      evidence(check.evidence ?? [], owner);
      if (check.result === 'PASS' && !check.evidence?.length && !check.adapter)
        issue('CHECK_EVIDENCE', owner, 'PASS requires retained evidence: ' + check.name);
    }
  }
  const assessments = new Map<string, InstallationRecord | UpdateRecord | null>();
  function assess_adapter(capability: string, adapter: Adapter): void {
    const owner = PROFILE + '#/adapters/' + capability;
    for (const name of adapter.evidence ?? []) {
      const location = name.split('/');
      let kind: string;
      if (name === INSTALLATION) kind = 'Installation';
      else if (
        location.length === 4 &&
        location[0] === 'artifacts' &&
        location[1] === 'maintenance' &&
        location[3] === 'update.yaml'
      )
        kind = 'Update';
      else {
        issue(
          'ADAPTER_ASSESSMENT',
          owner,
          'Reference an installation/maintenance record with a matching adapter assessment; the profile and definitions cannot prove their own assessment. Otherwise use ACTION_NEEDED and explain the missing check.',
        );
        continue;
      }
      if (!assessments.has(name)) {
        const value = read(name);
        const valid = validate(value, 'records.schema.json', kind, name);
        assessments.set(name, valid ? (value as InstallationRecord | UpdateRecord) : null);
        if (valid) checked_rows(value as InstallationRecord | UpdateRecord, name);
      }
      const value = assessments.get(name);
      if (!value) continue;
      if (kind === 'Update' && !['CHECKED', 'PUBLISHED'].includes(value.status)) {
        issue('ADAPTER_ASSESSMENT', owner, 'Maintenance assessment must be CHECKED or PUBLISHED.');
        continue;
      }
      const rows = value.checks.filter((row) => row.adapter === capability);
      if (
        rows.length !== 1 ||
        rows[0]!.connection !== adapter.connection ||
        rows[0]!.result !== 'PASS'
      )
        issue(
          'ADAPTER_ASSESSMENT',
          owner,
          'Need one PASS assessment for this adapter and exact connection, with method and observations; otherwise use ACTION_NEEDED and explain the missing check.',
        );
      else if (rows[0]!.evidence?.some((ref) => [PROFILE, name].includes(ref)))
        issue(
          'ADAPTER_ASSESSMENT',
          owner,
          'An assessment cannot cite itself or the profile as supporting proof; retain actual observations.',
        );
    }
  }
  for (const name of REQUIRED)
    try {
      relative_path(
        name.startsWith('framework/')
          ? 'framework/' +
              framework_relative(path.join(harness, 'framework'), name.slice('framework/'.length))
          : name,
        harness,
      );
    } catch (error) {
      failure(error, name);
    }
  try {
    const root = relative_path(schemaRoot, harness, { directory: true });
    for (const name of fs
      .readdirSync(root)
      .filter((n) => n.endsWith('.schema.json'))
      .sort())
      local_validator(path.join(root, name), undefined, { scope_root: root });
  } catch (error) {
    failure(error);
  }
  const profile = read(PROFILE);
  if (validate(profile, 'profile.schema.json', undefined, PROFILE)) {
    const p = profile as Profile;
    report.configuration_id = p.configuration_id;
    report.adapters = p.adapters;
    report.reviews = p.reviews;
    for (const [capability, adapter] of Object.entries(p.adapters)) {
      evidence(adapter.evidence ?? [], PROFILE + '#/adapters/' + capability);
      if (connection_ready(adapter)) assess_adapter(capability, adapter);
    }
  }
  const record = read(INSTALLATION);
  if (validate(record, 'records.schema.json', 'Installation', INSTALLATION)) {
    const r = record as InstallationRecord;
    report.activation = r.activation;
    checked_rows(r, INSTALLATION);
    if (r.configuration_id === report.configuration_id) evidence(r.files, INSTALLATION);
    if (r.status === 'CHECKED' && (!r.checks.length || r.checks.some((c) => c.result !== 'PASS')))
      issue('INSTALLATION_CHECKS', INSTALLATION, 'CHECKED requires completed PASS checks');
    if (
      r.activation === 'CONFIRMED' &&
      !r.checks.some((c) => c.name === 'activation' && c.result === 'PASS' && c.evidence?.length)
    )
      issue(
        'ACTIVATION_EVIDENCE',
        INSTALLATION,
        'CONFIRMED requires an activation check with retained evidence',
      );
  }
  const workflowName = 'framework/workflows/development/workflow.yaml',
    workflow = read(workflowName);
  if (validate(workflow, 'workflow.schema.json', undefined, workflowName)) {
    const phases = (
      workflow as {
        phases: {
          id: string;
          mandatory?: boolean;
        }[];
      }
    ).phases;
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
    if (
      JSON.stringify(phases.map((p) => p.id)) !== JSON.stringify(expected) ||
      JSON.stringify(
        phases
          .filter((p) => p.mandatory)
          .map((p) => p.id)
          .sort(),
      ) !== JSON.stringify(['specification', 'specification_verification'])
    )
      issue(
        'WORKFLOW_PHASES',
        workflowName,
        'Require the ordered format 2 phases and exactly two mandatory specification phases',
      );
  }
  const maintenanceName = 'framework/workflows/maintenance/maintenance-workflow.yaml';
  if (
    !canonical_json(read(maintenanceName)).equals(
      canonical_json({
        schema_version: '2.0.0',
        steps: ['inspect', 'stage', 'check', 'publish', 'update_status'],
      }),
    )
  )
    issue('MAINTENANCE_STEPS', maintenanceName, 'Require the five format 2 maintenance steps');
  if (options.update) {
    const name = options.update,
      value = read(name);
    if (validate(value, 'records.schema.json', 'Update', name)) {
      const v = value as UpdateRecord;
      checked_rows(v, name);
      evidence(v.evidence ?? [], name);
      if (v.base_configuration === v.candidate_configuration)
        issue(
          'UPDATE_CONFIGURATION',
          name,
          'Candidate configuration must differ from the inspected base',
        );
      if (
        (v.status === 'PUBLISHED' ? v.candidate_configuration : v.base_configuration) !==
        report.configuration_id
      )
        issue(
          'UPDATE_BASE',
          name,
          'Current configuration differs from the recorded publication state; reconcile before continuing',
        );
      if (
        ['CHECKED', 'PUBLISHED'].includes(v.status) &&
        (!v.checks.length || v.checks.some((c) => c.result !== 'PASS'))
      )
        issue('UPDATE_CHECKS', name, 'Checked/published update requires completed checks');
      const paths = v.changes.map((c) => c.path);
      if (new Set(paths).size !== paths.length)
        issue('UPDATE_PATH', name, 'Changed paths must be unique');
      if (['CHECKED', 'PUBLISHED'].includes(v.status) && !paths.includes(PROFILE))
        issue('UPDATE_PROFILE', name, 'Configuration publication must include the profile change');
      if (v.status === 'PUBLISHED' && !v.evidence?.length)
        issue('UPDATE_EVIDENCE', name, 'Retain before/after publication evidence');
      for (const c of v.changes) {
        const p = c.path;
        if (
          !p ||
          /[\\:\x00-\x1f]/.test(p) ||
          p.startsWith('/') ||
          p.split('/').some((part) => ['', '.', '..'].includes(part))
        ) {
          issue('UPDATE_PATH', name, 'Require a canonical path inside .harness');
          continue;
        }
        if (
          !(p.startsWith('framework/') || ['README.md', 'docs/setup.md', '.gitignore'].includes(p))
        ) {
          issue(
            'UPDATE_SCOPE',
            name,
            'Maintenance changes definitions and setup, never task captures or history',
          );
          continue;
        }
        if (!('before' in c) && !('after' in c)) {
          issue('UPDATE_IDENTITY', name, 'A change needs before and/or after identity');
          continue;
        }
        const expected = v.status === 'PUBLISHED' ? c.after : c.before;
        // Inspect existing ancestors even for an expected absence: a dangling
        // alias must not disguise a maintenance path outside the harness.
        let candidate = harness;
        let unsafe = false;
        for (const part of p.split('/')) {
          candidate = path.join(candidate, part);
          try {
            if (fs.lstatSync(candidate).isSymbolicLink()) {
              issue('PATH_SYMLINK', name, 'Changed path must not use an alias');
              unsafe = true;
              break;
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              failure(error, p);
              unsafe = true;
            }
            break;
          }
        }
        if (unsafe) continue;
        if (expected == null) {
          if (fs.existsSync(path.join(harness, p)))
            issue('UPDATE_BYTES', p, 'Expected absence; reconcile actual files before continuing');
        } else
          try {
            if (digest(fs.readFileSync(relative_path(p, harness))) !== expected)
              issue('UPDATE_BYTES', p, 'Actual bytes do not match recorded publication state');
          } catch (error) {
            failure(error, p);
          }
      }
    }
  }
  report.exit_code = report.diagnostics.length ? 1 : 0;
  report.structure = report.exit_code ? 'FAIL' : 'PASS';
  report.checks = [
    'required_files',
    'schemas',
    'profile',
    'local_evidence',
    'adapter_assessments',
    'installation_record',
    'workflow',
    'maintenance_steps',
  ];
  if (options.update) report.checks.push('update_record');
  return report;
}
