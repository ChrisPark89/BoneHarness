"""Read format 2 once. Local identities are integrity checks, not authenticated authorship."""
from pathlib import Path
from copy import deepcopy

from harness_io.loader import read_bytes, parse_document, relative_path
from harness_io.schemas import local_validator
from harness_io.journal import roots, ordinary, parse_history, canonical_json, content_identity, walk
from harness_io.source_inventory import collect_files, inventory_identity, validate_inventory


def reference_key(ref):
    return ref['scope']+':'+ref['path']+('#'+ref['entry_id'] if ref.get('entry_id') else '')


def evidence_key(evidence):
    return reference_key(evidence['reference'])+'@'+evidence['identity']


def capture_task(repo_root,harness_root,task_id):
    repo,harness,run=roots(repo_root,harness_root,task_id)
    captured={}
    def read(path,root):
        raw=read_bytes(path,root)
        captured[str(path)]=content_identity(raw)
        return raw
    history=ordinary(run/'history.jsonl',harness)
    entries=parse_history(read(history,harness),task_id)
    task=entries[0]['payload']
    config=task.get('configuration',{})
    files=config.get('files',[])
    if content_identity(canonical_json(files))!=config.get('bundle'):raise ValueError('Configuration manifest identity mismatch')
    bundle=harness/'artifacts/configurations'/config['bundle'].split(':')[1]
    known=set()
    for item in files:
        if item['path'] in known:raise ValueError('Duplicate configuration path')
        known.add(item['path'])
        path=relative_path(item['path'],bundle)
        if content_identity(read(path,bundle))!=item['identity']:raise ValueError('Pinned configuration bytes differ: '+item['path'])
    if not {'templates/schemas/records.schema.json','workflows/development/workflow.yaml','config/repo-profile.yaml'}.issubset(known):
        raise ValueError('Incomplete pinned configuration')
    schemas=bundle/'templates/schemas'
    if any(p.relative_to(bundle).as_posix() not in known for p in schemas.glob('*.json')):
        raise ValueError('Every pinned schema dependency must be in the captured manifest')
    validator=local_validator(schemas/'records.schema.json')
    for entry in entries:
        error=next(validator.iter_errors(entry['payload']),None)
        if error:raise ValueError('Invalid '+entry['entry_id']+': '+error.message)
    workflow=parse_document(read(bundle/'workflows/development/workflow.yaml',bundle),Path('workflow.yaml'))
    validate_workflow(workflow,schemas)
    profile=parse_document(read(bundle/'config/repo-profile.yaml',bundle),Path('profile.yaml'))
    error=next(local_validator(schemas/'profile.schema.json').iter_errors(profile),None)
    if error:raise ValueError('Invalid pinned profile: '+error.message)
    if profile.get('schema_version')!='2.0.0' or profile.get('configuration_id')!=config['id']:raise ValueError('Pinned profile identity mismatch')
    evidence_checks,record_issues,contents=inspect_evidence(entries,repo,harness,task_id,read)
    structural=[]
    specs=[e for e in entries if e['payload']['record_type']=='Specification']
    spec=specs[-1] if specs else None
    scope=spec['payload']['source_scope'] if spec else task.get('source_scope')
    current_files=collect_files(repo,harness,scope,allow_missing=True) if scope else None
    current_source=inventory_identity(scope,current_files) if scope else None
    for row in current_files or []:read(repo/row['path'],repo)
    operations={};original={};inventories={}
    for entry in entries:
        p=entry['payload'];kind=p['record_type']
        if kind=='SourceInventory':
            validate_inventory(p);inventories[p['revision']]=entry
        if kind in ('Operation','PhaseRecord') and p.get('source') and p['source'] not in inventories:
            structural.append(dict(code='SOURCE_ORDER',record=entry['entry_id'],message='Source inventory must precede evidence using it'))
        if kind=='Operation':
            op=p['operation_id'];prior=operations.get(op)
            stable={k:p.get(k) for k in ('operation_id','phase','specification','source','connection','inputs','deadline')}
            if prior is None:
                if p['status']!='INTENT':structural.append(dict(code='MISSING_INTENT',record=entry['entry_id'],message='Operation has no recorded intent'))
                original[op]=stable
            elif (stable!=original[op] or prior['payload']['status'] in ('COMPLETED','CANCELLED') ):
                structural.append(dict(code='OPERATION_CHANGED',record=entry['entry_id'],message='Operation immutable inputs changed or a closed operation reopened'))
            operations[op]=entry
    context_id=content_identity(canonical_json(dict(head=entries[-1]['entry_hash'],source=current_source,inputs=sorted(captured.items()))))
    return dict(task_id=task_id,repo_root=str(repo),harness_root=str(harness),run_root=str(run),configuration_root=str(bundle),
        task=task,entries=entries,workflow=workflow,profile=profile,specification=spec,source_scope=scope,current_source=current_source,
        current_files=current_files,operations=operations,record_issues=record_issues,evidence_checks=evidence_checks,
        structural_issues=structural,inputs=captured,context_id=context_id,evidence_contents=contents)


def check_unchanged(capture):
    issues=[]
    for path,identity in capture['inputs'].items():
        try:
            root=Path(capture['repo_root'])
            if content_identity(read_bytes(Path(path),root))!=identity:issues.append(path)
        except (ValueError,OSError):issues.append(path)
    if capture['source_scope']:
        try:
            if collect_files(capture['repo_root'],capture['harness_root'],capture['source_scope'],allow_missing=True)!=capture['current_files']:
                issues.append('Source membership changed')
        except (ValueError,OSError):issues.append('Source scope unreadable')
    return issues

def inspect_evidence(entries,repo,harness,task_id,read):
    run=harness/'artifacts/development'/task_id
    by_id={e['entry_id']:e for e in entries};evidence_checks={};record_issues={};contents={}
    for entry in entries:
        problems=[]
        for value in walk(entry['payload']):
            if 'reference' not in value or 'identity' not in value:continue
            ref=value['reference'];key=evidence_key(value)
            check=dict(valid=False,reference=ref,identity=value['identity'])
            try:
                if ref.get('entry_id'):
                    selected=by_id[ref['entry_id']]
                    if selected['sequence']>=entry['sequence']:raise ValueError('Evidence must precede its use')
                    raw=canonical_json(selected['payload'])
                else:
                    root={'HARNESS':harness,'REPOSITORY':repo}[ref['scope']]
                    path=relative_path(ref['path'],root)
                    if path in (run/'report.json',harness/'docs/development'/task_id/'report.md'):
                        raise ValueError('A derived report cannot be its own evidence')
                    raw=read(path,root)
                if content_identity(raw)!=value['identity']:raise ValueError('Evidence bytes differ')
                if value.get('provenance')=='FIXTURE':raise ValueError('Fixture is not evidence for real task support')
                check['valid']=True
                contents[key]=raw.decode('utf-8',errors='replace')
            except (ValueError,OSError,KeyError) as exc:problems.append(str(exc))
            evidence_checks[key]=check
        record_issues[entry['entry_id']]=problems
    return evidence_checks,record_issues,contents



def validate_workflow(workflow,schemas):
    error=next(local_validator(schemas/'workflow.schema.json').iter_errors(workflow),None)
    if error:raise ValueError('Invalid workflow: '+error.message)
    phases=workflow['phases'];ids=[p['id'] for p in phases]
    if len(ids)!=len(set(ids)) or [p['id'] for p in phases if p.get('mandatory')] != ['specification','specification_verification']:
        raise ValueError('Exactly specification acceptance and final verification must be mandatory')
    expected=['initialization','research','pattern_review','specification','verification_plan','implementation_plan',
              'implementation','preflight','build','testing','specification_verification','final_review']
    if ids!=expected:raise ValueError('Format 2 requires the twelve approved ordered phases; omission is not a skip')
    for phase in phases:
        execution=phase['id'] in ('preflight','build','testing')
        sensitive=phase['id'] in expected[6:]
        if phase.get('proof','REVIEW')!=('EXECUTION' if execution else 'REVIEW') or phase.get('source_sensitive',False)!=sensitive:
            raise ValueError('Format 2 phase evidence requirements cannot be downgraded')
