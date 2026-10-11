"""Proportionate checks of format 2 installation facts, not a workflow engine."""
import hashlib
from pathlib import Path, PureWindowsPath
from .loader import DocumentError, load_document, relative_path
from .schemas import local_validator, validate_document
from .report import new_report

PROFILE = 'framework/config/repo-profile.yaml'
SCHEMAS = 'framework/templates/schemas'
INSTALLATION = 'artifacts/installation/installation-record.yaml'
REQUIRED = (
    'README.md', 'docs/setup.md', PROFILE, INSTALLATION,
    'framework/adapters/adapter-interface.md', 'framework/workflows/setup.md',
    'framework/workflows/recovery.md', 'framework/workflows/development/HARNESS.md',
    'framework/workflows/development/workflow.yaml',
    'framework/workflows/maintenance/harness-maintenance.md',
    'framework/workflows/maintenance/maintenance-workflow.yaml',
    'framework/templates/maintenance/harness-update-record.yaml',
    'framework/tools/check.py', 'framework/tools/report.py', 'framework/tools/journal.py',
    'framework/tools/context.py', 'framework/tools/context_reader.py', 'framework/tools/source.py',
    'framework/tools/harness_io/__init__.py', 'framework/tools/harness_io/journal.py',
    'framework/tools/harness_io/loader.py', 'framework/tools/harness_io/schemas.py',
    'framework/tools/harness_io/source_inventory.py',
    'framework/tools/reporting/__init__.py', 'framework/tools/reporting/evidence.py',
    'framework/tools/reporting/summary.py', 'framework/tools/reporting/render.py',
    'framework/tools/harness_check/__init__.py', 'framework/tools/harness_check/checks.py',
    'framework/tools/harness_check/cli.py', 'framework/tools/harness_check/loader.py',
    'framework/tools/harness_check/schemas.py', 'framework/tools/harness_check/report.py',
    'framework/tools/requirements.lock', SCHEMAS + '/common.schema.json', SCHEMAS + '/profile.schema.json',
    SCHEMAS + '/records.schema.json', SCHEMAS + '/workflow.schema.json',
)


def check_installation(repo: Path, *, update=None):
    report = new_report()

    def issue(code, path, message):
        report['diagnostics'].append(dict(code=code, path=str(path), message=message))

    try:
        harness = relative_path('.harness', repo, directory=True)
    except DocumentError as exc:
        issue(exc.code, exc.path, str(exc)); report['exit_code'] = 1
        return report
    # .harness itself must be local: an alias would make ownership/recovery ambiguous.
    if harness.is_symlink():
        issue('PATH_SYMLINK', '.harness', 'Harness root must be an actual repository directory')
        report['exit_code'] = 1
        return report

    def read(name):
        try:
            return load_document(relative_path(name, harness), harness)
        except DocumentError as exc:
            issue(exc.code, name, str(exc))
        return None

    def validate(value, schema, definition, name):
        if not isinstance(value, dict) or value.get('schema_version') != '2.0.0':
            issue('FORMAT_UNSUPPORTED', name, 'Require format 2.0.0; older records need their original tools')
            return False
        try:
            path = relative_path(SCHEMAS + '/' + schema, harness)
            errors = validate_document(value, path, definition)
        except DocumentError as exc:
            issue(exc.code, name, str(exc)); return False
        for error in errors:
            issue(error['code'], name + error['path'], error['message'])
        return not errors

    def evidence(paths, owner):
        for name in paths:
            try:
                relative_path(name, harness)
            except DocumentError as exc:
                issue(exc.code, owner, str(exc))

    def checked_rows(value, owner):
        for check in value.get('checks', []):
            evidence(check.get('evidence', []), owner)
            if check['result'] == 'PASS' and not check.get('evidence'):
                issue('CHECK_EVIDENCE', owner, 'PASS requires retained evidence: ' + check['name'])

    for name in REQUIRED:
        try:
            relative_path(name, harness)
        except DocumentError as exc:
            issue(exc.code, name, str(exc))
    # Validate every installed schema; only confined local references are resolved.
    try:
        schema_root = relative_path(SCHEMAS, harness, directory=True)
        for path in sorted(schema_root.glob('*.schema.json')):
            local_validator(path, scope_root=schema_root)
    except DocumentError as exc:
        issue(exc.code, exc.path, str(exc))

    profile = read(PROFILE)
    if validate(profile, 'profile.schema.json', None, PROFILE):
        report['configuration_id'] = profile['configuration_id']
        report['adapters'] = profile['adapters']
        for capability, adapter in profile['adapters'].items():
            evidence(adapter.get('evidence', []), PROFILE + '#/adapters/' + capability)
    record = read(INSTALLATION)
    if validate(record, 'records.schema.json', 'Installation', INSTALLATION):
        report['activation'] = record['activation']
        checked_rows(record, INSTALLATION)
        # This is the original installation inventory, not a mutable current registry.
        if record['configuration_id'] == report['configuration_id']:
            evidence(record['files'], INSTALLATION)
        if record['status'] == 'CHECKED' and (not record['checks'] or any(c['result'] != 'PASS' for c in record['checks'])):
            issue('INSTALLATION_CHECKS', INSTALLATION, 'CHECKED requires completed PASS checks')
        if record['activation'] == 'CONFIRMED' and not any(
                c['name'] == 'activation' and c['result'] == 'PASS' and c.get('evidence') for c in record['checks']):
            issue('ACTIVATION_EVIDENCE', INSTALLATION, 'CONFIRMED requires an activation check with retained evidence')
    workflow = read('framework/workflows/development/workflow.yaml')
    if validate(workflow, 'workflow.schema.json', None, 'framework/workflows/development/workflow.yaml'):
        ids = [p['id'] for p in workflow['phases']]
        expected = ['initialization', 'research', 'pattern_review', 'specification', 'verification_plan',
                    'implementation_plan', 'implementation', 'preflight', 'build', 'testing',
                    'specification_verification', 'final_review']
        mandatory = {p['id'] for p in workflow['phases'] if p.get('mandatory')}
        if ids != expected or mandatory != {'specification', 'specification_verification'}:
            issue('WORKFLOW_PHASES', 'framework/workflows/development/workflow.yaml',
                  'Require the ordered format 2 phases and exactly two mandatory specification phases')
    maintenance = read('framework/workflows/maintenance/maintenance-workflow.yaml')
    if maintenance != {'schema_version': '2.0.0', 'steps': ['inspect', 'stage', 'check', 'publish', 'update_status']}:
        issue('MAINTENANCE_STEPS', 'framework/workflows/maintenance/maintenance-workflow.yaml', 'Require the five format 2 maintenance steps')
    if update:
        value = read(update)
        if validate(value, 'records.schema.json', 'Update', update):
            checked_rows(value, update)
            evidence(value.get('evidence', []), update)
            if value['base_configuration'] == value['candidate_configuration']:
                issue('UPDATE_CONFIGURATION', update, 'Candidate configuration must differ from the inspected base')
            expected = value['candidate_configuration'] if value['status'] == 'PUBLISHED' else value['base_configuration']
            if expected != report['configuration_id']:
                issue('UPDATE_BASE', update, 'Current configuration differs from the recorded publication state; reconcile before continuing')
            if value['status'] in ('CHECKED', 'PUBLISHED') and (not value['checks'] or any(c['result'] != 'PASS' for c in value['checks'])):
                issue('UPDATE_CHECKS', update, 'Checked/published update requires completed checks')
            paths = [change['path'] for change in value['changes']]
            if len(paths) != len(set(paths)):
                issue('UPDATE_PATH', update, 'Changed paths must be unique')
            if value['status'] in ('CHECKED', 'PUBLISHED') and PROFILE not in paths:
                issue('UPDATE_PROFILE', update, 'Configuration publication must include the profile change')
            if value['status'] == 'PUBLISHED' and not value.get('evidence'):
                issue('UPDATE_EVIDENCE', update, 'Retain before/after publication evidence')
            for change in value['changes']:
                name = change['path']
                if (not name or PureWindowsPath(name).drive or '\\' in name or name.startswith('/')
                        or any(part in ('', '.', '..') or ':' in part for part in name.split('/'))
                        or any(ord(char) < 32 for char in name)):
                    issue('UPDATE_PATH', update, 'Require a canonical path inside .harness'); continue
                if not (name.startswith('framework/') or name in ('README.md', 'docs/setup.md')):
                    issue('UPDATE_SCOPE', update, 'Maintenance changes definitions and setup, never task captures or history'); continue
                candidate = harness / name
                try:
                    resolved = candidate.resolve(strict=False)
                except (OSError, RuntimeError, ValueError) as exc:
                    issue('UPDATE_PATH', update, str(exc)); continue
                if not resolved.is_relative_to(harness.resolve()):
                    issue('PATH_SYMLINK', update, 'Changed path escapes .harness'); continue
                if not any(key in change for key in ('before', 'after')):
                    issue('UPDATE_IDENTITY', update, 'A change needs before and/or after identity'); continue
                expected_hash = change.get('after' if value['status'] == 'PUBLISHED' else 'before')
                if expected_hash is None:
                    if candidate.exists() or candidate.is_symlink():
                        issue('UPDATE_BYTES', name, 'Expected absence; reconcile actual files before continuing')
                else:
                    try:
                        actual = relative_path(name, harness).read_bytes()
                        if 'sha256:' + hashlib.sha256(actual).hexdigest() != expected_hash:
                            issue('UPDATE_BYTES', name, 'Actual bytes do not match recorded publication state')
                    except DocumentError as exc:
                        issue(exc.code, name, str(exc))
    report['exit_code'] = 1 if report['diagnostics'] else 0
    report['structure'] = 'FAIL' if report['diagnostics'] else 'PASS'
    report['checks'] = ['required_files', 'schemas', 'profile', 'local_evidence', 'installation_record', 'workflow', 'maintenance_steps']
    if update:
        report['checks'].append('update_record')
    return report
