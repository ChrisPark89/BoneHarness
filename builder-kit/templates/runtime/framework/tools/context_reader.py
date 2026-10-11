"""Read the next relevant format 2 context without writing or executing adapters."""
from pathlib import Path
import json

from harness_io.loader import load_document, read_bytes, relative_path, scoped_path
from harness_io.schemas import local_validator
from harness_io.journal import name, canonical_json, content_identity
from reporting.evidence import capture_task, check_unchanged
from reporting.summary import derive_report

CAPABILITIES = {'research': 'research', 'pattern_review': 'pattern_search', 'preflight': 'preflight',
                'build': 'build', 'testing': 'test', 'final_review': 'final_review'}


def extract_context(repo_root, harness_root='.harness', *, situation='development', task_id=None,
                    update_id=None, record_id=None):
    if situation not in ('development', 'recovery', 'setup', 'maintenance'):
        raise ValueError('Unknown situation')
    if task_id and update_id:
        raise ValueError('Select one task or update')
    if record_id and not task_id:
        raise ValueError('--record requires --task-id')
    repo = Path(repo_root)
    if not repo.is_absolute() or not repo.is_dir():
        raise ValueError('repo-root must be an existing absolute directory')
    repo = repo.resolve(strict=True)
    selected_root = Path(harness_root)
    harness = (scoped_path(selected_root, repo, directory=True) if selected_root.is_absolute() else
               relative_path(str(selected_root), repo, directory=True))
    if task_id:
        capture = capture_task(repo, harness, task_id)
        report = derive_report(capture)
        next_phase = next((p for p in report['phases'] if p['status'] not in ('PASS', 'USER_SKIPPED')), None)
        phase_id = next_phase['id'] if next_phase else None
        definition = next((p for p in capture['workflow']['phases'] if p['id'] == phase_id), None)
        open_operations = set(report['open_operations'])
        operations = []
        for operation_id, row in capture['operations'].items():
            payload = row['payload']
            if operation_id in open_operations:
                operations.append(dict(operation_id=operation_id, record=row['entry_id'],
                    **{key: payload[key] for key in ('status', 'phase', 'handle', 'deadline', 'connection', 'inputs') if key in payload}))
        result = dict(context_version='2.0.0', situation=situation, task_id=task_id,
            context_id=capture['context_id'], status=report['status'], next_phase=next_phase,
            phase_definition=definition, source=capture['current_source'], source_scope=capture['source_scope'],
            specification=capture['specification']['entry_id'] if capture['specification'] else None,
            operations=operations, issues=report['issues'])
        if phase_id in CAPABILITIES:
            capability = CAPABILITIES[phase_id]
            result['adapter'] = dict(capability=capability, **capture['profile']['adapters'][capability])
        if phase_id == 'specification':
            result['reconcile_skips'] = [p['record'] for p in report['phases'] if p['status'] == 'USER_SKIPPED']
        if phase_id == 'specification_verification' and capture['specification']:
            result['criteria'] = capture['specification']['payload']['criteria']
        if record_id:
            selected = next((row for row in capture['entries'] if row['entry_id'] == record_id), None)
            if not selected:
                raise ValueError('No such journal entry: ' + record_id)
            result['record'] = selected
        config = Path(capture['configuration_root'])
        guide = relative_path('workflows/verification-rules.md', config)
        result['contract'] = read_bytes(guide, config).decode('utf-8')
        if check_unchanged(capture):
            raise ValueError('STALE_CONTEXT: inputs changed while reading')
        result['next_action'] = ('Read the completed task report; historical findings remain visible.' if report['status'] == 'COMPLETE' else
            'Reconcile the listed operation before advancing.' if operations else
            'Recheck the next unresolved phase against current evidence.' if report['status'] == 'UNVERIFIED' else
            'Record the next semantic step with this context_id.' if next_phase else 'Read the completed task report.')
        return result
    profile_path = relative_path('framework/config/repo-profile.yaml', harness)
    profile = load_document(profile_path, harness)
    error = next(local_validator(harness / 'framework/templates/schemas/profile.schema.json').iter_errors(profile), None)
    if error:
        raise ValueError('Require valid format 2 profile: ' + error.message)
    result = dict(context_version='2.0.0', situation=situation, configuration_id=profile['configuration_id'],
                  adapters=profile['adapters'], issues=[])
    if update_id:
        name(update_id)
        path = relative_path('artifacts/maintenance/' + update_id + '/update.yaml', harness)
        update = load_document(path, harness)
        error = next(local_validator(harness / 'framework/templates/schemas/records.schema.json', 'Update').iter_errors(update), None)
        if error:
            raise ValueError('Invalid format 2 update: ' + error.message)
        result['update'] = update
        result['next_action'] = 'Compare actual files with the recorded base/candidate; reconcile interruptions before publication.'
    elif situation in ('maintenance', 'recovery'):
        result['next_action'] = 'Inspect the profile and start or select an actual maintenance update.'
    elif situation == 'setup':
        result['next_action'] = 'Follow the setup checklist; structural checks, activation and adapter compatibility are separate.'
    else:
        result['next_action'] = 'Save the original request, then record a start step for a new task.'
    guide = ('maintenance/harness-maintenance.md' if update_id or situation in ('maintenance', 'recovery') else
             'setup.md' if situation == 'setup' else 'development/HARNESS.md')
    path = relative_path('framework/workflows/' + guide, harness)
    result['contract'] = read_bytes(path, harness).decode('utf-8')
    return result


def context_page(context, page=1, *, expected_context_id=None, limit=2400):
    """Bound excerpts of the parsed, relevant view; never silently drop content."""
    token = context.get('context_id') or content_identity(canonical_json(context))
    if expected_context_id is not None and expected_context_id != token:
        raise ValueError('STALE_CONTEXT: restart at page 1')
    if page > 1 and expected_context_id is None:
        raise ValueError('Continuation requires --context-id from page 1')
    text = json.dumps(context, ensure_ascii=False, indent=2)
    chunks = []
    while text:
        end = len(text) if len(text) <= limit else text.rfind('\n', 0, limit) + 1
        if end <= 0:
            end = limit
        chunks.append(text[:end]); text = text[end:]
    if page < 1 or page > len(chunks):
        raise ValueError('Page is outside the available context')
    return dict(context_version='2.0.0', context_id=token, page=page, pages=len(chunks),
                next_page=page+1 if page<len(chunks) else None, next_action=context['next_action'],
                status=context.get('status', 'NOT_RECORDED'), excerpt=chunks[page-1],
                note='Excerpts continue without omission; individual pages are not standalone record JSON.')


def render_text(page):
    lines = ['# Harness context', '', 'Status: ' + page['status'],
             'Next: ' + page['next_action'], 'Context ID: ' + page['context_id'],
             'Page: ' + str(page['page']) + '/' + str(page['pages']), '', page['excerpt']]
    if page['next_page']:
        lines += ['', 'Continue with --page ' + str(page['next_page']) + ' --context-id ' + page['context_id'] + ' and the same selection.']
    return '\n'.join(lines)
