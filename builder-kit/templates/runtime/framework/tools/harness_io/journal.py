"""Format 2 storage and a small semantic writer; no adapter dispatch or invented review."""
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile

from .loader import DocumentError, parse_document, read_bytes, scoped_path
from .schemas import local_validator
from .source_inventory import capture_inventory

VERSION = '2.0.0'
KINDS = {'Task', 'Specification', 'SourceInventory', 'PhaseRecord', 'Operation'}
FIELDS = {'journal_version', 'sequence', 'entry_id', 'previous_hash', 'actor', 'timestamp', 'payload', 'entry_hash'}


def canonical_json(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')


def content_identity(raw):
    return 'sha256:' + hashlib.sha256(raw).hexdigest()


def name(value):
    reserved = {'CON','PRN','AUX','NUL'} | {f'{p}{n}' for p in ('COM','LPT') for n in range(1,10)}
    if (not isinstance(value,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,119}',value)
            or value.endswith('.') or value.split('.')[0].upper() in reserved):
        raise ValueError('Use one portable task name')
    return value


def ordinary(path, root, *, missing=False):
    path = Path(path)
    scoped_path(path.parent, root, directory=True)
    for part in (path, *path.parents):
        if part == root: break
        if part.is_symlink(): raise ValueError('Symlink storage path refused')
    if path.exists():
        scoped_path(path, root)
        if path.stat().st_nlink != 1: raise ValueError('Hard-linked storage path refused')
    elif not missing:
        raise ValueError('Storage file missing')
    return path


def safe_mkdir(path, root):
    """Check every existing ancestor before creating any directory."""
    path=Path(path);root=Path(root)
    relative=path.relative_to(root)
    scoped_path(root,root,directory=True)
    current=root
    for part in relative.parts:
        current=current/part
        if current.is_symlink():raise ValueError('Symlink storage directory refused')
        if current.exists():scoped_path(current,root,directory=True)
        else:current.mkdir()
    return path


def roots(repo_root, harness_root, task_id):
    repo = Path(repo_root)
    if not repo.is_absolute(): raise ValueError('repo-root must be absolute')
    repo = repo.resolve(strict=True)
    harness = Path(harness_root)
    harness = scoped_path(harness if harness.is_absolute() else repo / harness, repo, directory=True)
    run = harness / 'artifacts/development' / name(task_id)
    return repo, harness, run


def walk(value):
    if isinstance(value,dict):
        yield value
        for child in value.values(): yield from walk(child)
    elif isinstance(value,list):
        for child in value: yield from walk(child)


def make_entry(payload, actor, previous=None, timestamp=None):
    sequence = previous['sequence'] + 1 if previous else 1
    row = dict(journal_version=VERSION,sequence=sequence,entry_id=f'e{sequence:06}',
               previous_hash=previous['entry_hash'] if previous else None,actor=actor,
               timestamp=timestamp if timestamp is not None else datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),payload=payload)
    row['entry_hash'] = content_identity(canonical_json(row))
    return row


def parse_history(raw, task_id):
    if not raw or not raw.endswith(b'\n'): raise ValueError('Empty or torn journal; preserve and reconcile original bytes')
    entries=[]
    for line in raw.splitlines():
        row=parse_document(line,Path('record.json'))
        if not isinstance(row,dict) or row.get('journal_version') != VERSION:
            raise ValueError('UNSUPPORTED_FORMAT: use the original installed tools for format 1; no automatic conversion')
        if set(row)!=FIELDS or not isinstance(row['payload'],dict) or row['payload'].get('record_type') not in KINDS:
            raise ValueError('Invalid journal envelope or record type')
        if not isinstance(row['actor'],str) or not row['actor'].strip(): raise ValueError('Missing actor')
        from .schemas import valid_utc_timestamp
        try:
            valid_time=isinstance(row['timestamp'],str) and valid_utc_timestamp(row['timestamp'])
        except (ValueError,TypeError,OverflowError):valid_time=False
        if not valid_time: raise ValueError('Invalid UTC timestamp')
        expected=make_entry(row['payload'],row['actor'],entries[-1] if entries else None,row['timestamp'])
        if row!=expected: raise ValueError('Journal chain or sequence mismatch')
        if row['payload'].get('schema_version')!=VERSION: raise ValueError('UNSUPPORTED_FORMAT: record version differs')
        if (not entries and row['payload']['record_type']!='Task'
                or entries and row['payload']['record_type']=='Task'):
            raise ValueError('Exactly one Task must start the journal')
        if row['payload'].get('task_id',task_id)!=task_id: raise ValueError('Cross-task record')
        ids={e['entry_id'] for e in entries}
        for node in walk(row['payload']):
            if node.get('kind')=='LOCAL':
                path=node.get('path','')
                if (not isinstance(path,str) or path.startswith('/') or any(c in path for c in '\\:')
                        or any(p in ('','.','..') for p in path.split('/'))): raise ValueError('Unsafe evidence reference')
                if 'entry_id' in node and (node.get('scope')!='HARNESS' or path!='artifacts/development/'+task_id+'/history.jsonl'
                                          or node['entry_id'] not in ids):
                    raise ValueError('Entry evidence must select an earlier record in this task')
        entries.append(row)
    return entries


def read_history(path, task_id, schemas_root):
    path=Path(path);ordinary(path,path.parent)
    entries=parse_history(read_bytes(path,path.parent),task_id)
    validator=local_validator(Path(schemas_root)/'records.schema.json')
    for row in entries:
        error=next(validator.iter_errors(row['payload']),None)
        if error: raise ValueError('Invalid '+row['payload']['record_type']+': '+error.message)
    return entries


@contextmanager
def locked(run):
    lock=run/'.journal.lock'
    descriptor=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    stat=os.fstat(descriptor)
    try: yield
    finally:
        os.close(descriptor)
        current=lock.lstat()
        if (current.st_dev,current.st_ino)==(stat.st_dev,stat.st_ino):lock.unlink()


def capture_configuration(harness):
    framework=harness/'framework'
    paths=sorted(p for p in framework.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    files=[];contents={}
    for path in paths:
        raw=read_bytes(ordinary(path,framework),framework)
        relative=path.relative_to(framework).as_posix()
        contents[relative]=raw;files.append(dict(path=relative,identity=content_identity(raw)))
    bundle=content_identity(canonical_json(files))
    destination=harness/'artifacts/configurations'/bundle.split(':')[1]
    safe_mkdir(destination,harness)
    scoped_path(destination,harness,directory=True)
    for relative,raw in contents.items():
        path=destination/relative;safe_mkdir(path.parent,harness)
        ordinary(path,harness,missing=True)
        if path.exists():
            if path.read_bytes()!=raw:raise ValueError('Existing configuration bundle differs')
        else:
            with path.open('xb') as stream:stream.write(raw)
    profile=parse_document(contents['config/repo-profile.yaml'],Path('profile.yaml'))
    if not isinstance(profile,dict) or profile.get('schema_version')!=VERSION:raise ValueError('UNSUPPORTED_FORMAT: profile must be format 2')
    error=next(local_validator(destination/'templates/schemas/profile.schema.json').iter_errors(profile),None)
    if error:raise ValueError('Invalid profile: '+error.message)
    from reporting.evidence import validate_workflow
    workflow=parse_document(contents['workflows/development/workflow.yaml'],Path('workflow.yaml'))
    validate_workflow(workflow,destination/'templates/schemas')
    return dict(id=profile['configuration_id'],bundle=bundle,files=files)


def _evidence(value, repo, harness, entries, task_id):
    """Fill omitted byte identities, never infer evidence provenance or judgment."""
    if isinstance(value,list):return [_evidence(v,repo,harness,entries,task_id) for v in value]
    if not isinstance(value,dict):return value
    value={k:_evidence(v,repo,harness,entries,task_id) for k,v in value.items()}
    if 'reference' in value:
        ref=value['reference']
        if not isinstance(ref,dict) or ref.get('kind')!='LOCAL':raise ValueError('Only explicit local evidence is supported')
        if 'entry_id' in ref:
            if ref.get('scope')!='HARNESS' or ref.get('path')!='artifacts/development/'+task_id+'/history.jsonl':raise ValueError('Cross-task entry evidence')
            matches=[e for e in entries if e['entry_id']==ref['entry_id']]
            if len(matches)!=1:raise ValueError('Missing evidence entry')
            raw=canonical_json(matches[0]['payload'])
        else:
            root={'HARNESS':harness,'REPOSITORY':repo}.get(ref.get('scope'))
            if root is None:raise ValueError('Invalid evidence scope')
            from .loader import relative_path
            raw=read_bytes(relative_path(ref.get('path'),root),root)
        digest=content_identity(raw)
        if value.get('identity',digest)!=digest:raise ValueError('Evidence bytes changed')
        value['identity']=digest
    return value


def record_step(repo_root,harness_root,task_id,step,*,actor,context_id=None):
    """Record one semantic step; callers supply judgments, the writer supplies bookkeeping."""
    from reporting.evidence import capture_task, check_unchanged
    from reporting.summary import derive_report, validate_candidate
    repo,harness,run=roots(repo_root,harness_root,task_id)
    if not isinstance(step,dict) or not isinstance(actor,str) or not actor.strip():raise ValueError('Step and actor required')
    action=step.get('action'); fields={k:v for k,v in step.items() if k!='action'}
    if action not in ('start','specification','phase','operation','source'):raise ValueError('Unknown semantic action')
    safe_mkdir(run,harness)
    history=ordinary(run/'history.jsonl',harness,missing=True)
    with locked(run):
        entries=[];capture=None
        if history.exists():
            if action=='start':raise ValueError('Task already exists')
            capture=capture_task(repo,harness,task_id)
            if context_id!=capture['context_id']:raise ValueError('STALE_CONTEXT: read current task context before recording')
            entries=capture['entries']
            if capture['structural_issues']:raise ValueError('Reconcile invalid history before recording')
        elif action!='start':raise ValueError('Start the task before recording work')
        records=[]
        kind={'start':'Task','specification':'Specification','phase':'PhaseRecord','operation':'Operation','source':'SourceInventory'}[action]
        if action=='start':
            if context_id is not None:raise ValueError('New task has no previous context')
            fields.update(task_id=task_id,configuration=capture_configuration(harness))
        else:
            spec=capture['specification'];scope=fields.get('source_scope') if action=='specification' else capture['source_scope']
            inventory=capture_inventory(repo,harness,task_id,scope) if scope else None
            if inventory and not any(e['payload'].get('revision')==inventory['revision'] for e in entries):records.append(inventory)
            if action=='source':
                if not inventory:raise ValueError('Accept a source scope before capturing it')
                fields=inventory;records=[]
            elif action in ('phase','operation'):
                fields.update(specification=spec['entry_id'] if spec else None,source=inventory['revision'] if inventory else None)
                if action=='phase':fields.setdefault('evidence',[])
                elif fields.get('status')!='INTENT':
                    prior=capture['operations'].get(fields.get('operation_id'))
                    if not prior:raise ValueError('Operation needs a durable intent before dispatch')
                    for key in ('phase','specification','source','connection','inputs','deadline'):
                        if key in fields and key not in ('specification','source') and fields[key]!=prior['payload'].get(key):raise ValueError('Operation input identities cannot change')
                        if key in prior['payload']:fields[key]=prior['payload'][key]
                        else:fields.pop(key,None)
                    if 'handle' in prior['payload']:fields.setdefault('handle',prior['payload']['handle'])
        payload=_evidence(dict(fields,schema_version=VERSION,record_type=kind),repo,harness,entries,task_id)
        records.append(payload)
        if action=='start' and fields.get('source_scope'):
            records.append(capture_inventory(repo,harness,task_id,fields['source_scope']))
        schemas=(Path(capture['configuration_root'])/'templates/schemas') if capture else harness/'framework/templates/schemas'
        validator=local_validator(schemas/'records.schema.json')
        staged=list(entries)
        for record in records:
            error=next(validator.iter_errors(record),None)
            if error:raise ValueError('Invalid '+record['record_type']+': '+error.message)
            staged.append(make_entry(record,actor,staged[-1] if staged else None))
        # One reducer handles both proposed and retained claims. Failed/unknown
        # observations are retained; unsupported success or skipping is refused.
        if capture:
            validate_candidate(capture,staged,records[-1])
            if check_unchanged(capture):raise ValueError('Task inputs changed while recording; read context again')
        for record in records:
            if record['record_type']=='SourceInventory':
                fresh=capture_inventory(repo,harness,task_id,record['scope'])
                if fresh['revision']!=record['revision']:raise ValueError('Source changed before journal append')
        raw=b''.join(canonical_json(e)+b'\n' for e in entries)
        serialized=b''.join(canonical_json(e)+b'\n' for e in staged[len(entries):])
        parse_history(raw+serialized,task_id)
        descriptor=os.open(history,os.O_CREAT|os.O_APPEND|os.O_RDWR|getattr(os,'O_NOFOLLOW',0),0o600)
        with os.fdopen(descriptor,'a+b') as stream:
            if os.fstat(stream.fileno()).st_nlink!=1:raise ValueError('Storage alias refused')
            stream.seek(0)
            if stream.read()!=raw:raise ValueError('Concurrent writer changed history')
            stream.write(serialized);stream.flush();os.fsync(stream.fileno())
        return staged[-1]
