"""One sequential reducer for proposed steps and evidence-bound task reports."""
from copy import deepcopy
from pathlib import Path
from datetime import datetime,timezone
from harness_io.journal import canonical_json, content_identity
from harness_io.loader import read_bytes
from harness_io.source_inventory import collect_files, inventory_identity
from .evidence import evidence_key, inspect_evidence

RESOLVED={'PASS','USER_SKIPPED'}
TERMINAL={'COMPLETED','CANCELLED'}


def derive_report(capture):
    definitions=capture['workflow']['phases']; ids=[p['id'] for p in definitions]
    phases={p['id']:dict(id=p['id'],label=p['label'],status='NOT_STARTED',record=None,evidence=[]) for p in definitions}
    issues=list(capture['structural_issues']);history=[];operations={};known_closed={};spec=None;criteria=[]
    checks=capture['evidence_checks'];contents=capture['evidence_contents']
    supported={};accepted_skips=set();inventories=set()
    def usable(evidence,method=None):
        return bool(evidence and all(e.get('reference') and e.get('identity') and checks.get(evidence_key(e),{}).get('valid') and e['provenance']!='FIXTURE'
                   and (method is None or e['provenance']==method) for e in evidence))
    def approval(value):
        evidence=value.get('instruction',{})
        return (bool(value.get('user','').strip() and value.get('review','').strip() and value.get('quote','').strip())
                and usable([evidence],'REVIEW') and value['quote'] in contents.get(evidence_key(evidence),''))
    def unresolved():
        return [key for key in operations if not known_closed.get(key)]
    def prior_ok(phase,source=None):
        for definition in definitions[:ids.index(phase)]:
            row=phases[definition['id']]
            if row['status'] not in RESOLVED:return False
            if source and row['status']=='PASS' and definition.get('source_sensitive') and row.get('source')!=source:return False
        return True
    def op_pass(key,source,specid,phase=None):
        row=operations.get(key);p=row['payload'] if row else {}
        return bool(row and supported.get(row['entry_id']) and p.get('status')=='COMPLETED' and p.get('outcome')=='PASS'
                    and p.get('source')==source and p.get('specification')==specid and (phase is None or p.get('phase')==phase))
    for entry in capture['entries']:
        p=entry['payload'];kind=p['record_type'];eid=entry['entry_id'];errors=list(capture['record_issues'].get(eid,[]))
        if kind=='SourceInventory':inventories.add(p['revision']);supported[eid]=not errors;continue
        if kind=='Task':supported[eid]=not errors;continue
        phase=p.get('phase','specification' if kind=='Specification' else None)
        if phase not in phases:
            issues.append(dict(code='UNKNOWN_PHASE',record=eid,message='Unknown phase'));supported[eid]=False;continue
        definition=next((d for d in definitions if d['id']==phase),{})
        if kind=='Operation':
            old=operations.get(p['operation_id'])
            if p['source'] not in inventories:errors.append('Operation source inventory is missing')
            if old:
                if not supported.get(old['entry_id']):errors.append('Operation origin or preceding update is unsupported')
                if old['payload']['status'] in TERMINAL:errors.append('Closed operation cannot change; use a new operation ID')
                if any(p.get(k)!=old['payload'].get(k) for k in ('phase','specification','source','connection','inputs','deadline')):
                    errors.append('Operation identity changed')
            elif p['status']!='INTENT':errors.append('Operation intent must precede dispatch')
            if p['status']=='INTENT':
                if old:errors.append('Operation ID already exists')
                if not prior_ok(phase,p.get('source')):errors.append('Earlier phases are unresolved or source evidence is stale')
                if unresolved():errors.append('Reconcile the previous operation before dispatch')
                capability={'pattern_review':'pattern_search','testing':'test'}.get(phase,phase)
                binding=capture['profile']['adapters'].get(capability,{})
                if binding.get('connection')!=p['connection'] or binding.get('status')!='COMPATIBLE':
                    errors.append('Operation connection is not a compatible captured adapter')
                if p['specification']!=(spec['entry_id'] if spec else None):errors.append('Operation specification differs')
            if p['status'] in TERMINAL:
                if not usable(p['evidence'],'EXECUTION'):errors.append('Terminal operation needs execution or reconciliation evidence')
                if p['status']=='COMPLETED' and p.get('outcome') not in ('PASS','FAIL','BLOCKED','UNKNOWN'):
                    errors.append('Completed operation needs an explicit outcome')
            stable=bool(old and all(p.get(k)==old['payload'].get(k) for k in ('phase','specification','source','connection','inputs','deadline')))
            if p['status'] in TERMINAL and stable and usable(p['evidence'],'EXECUTION'):
                known_closed[p['operation_id']]=True
            else:known_closed.setdefault(p['operation_id'],False)
            operations[p['operation_id']]=entry
        elif kind=='Specification':
            if not prior_ok(phase):errors.append('Resolve earlier phases before specification acceptance')
            if unresolved():errors.append('Reconcile live or uncertain operations before specification acceptance')
            if not usable([p['acceptance']['authority']]) or not p['acceptance']['review'].strip():errors.append('Specification acceptance needs actual authority evidence and review')
            if not usable([p['document']],'REVIEW'):errors.append('Specification document is unsupported')
            names=[c['id'] for c in p['criteria']]
            if len(names)!=len(set(names)) or not any(c['required'] for c in p['criteria']):errors.append('Specification needs distinct criteria and at least one required criterion')
            skips={v['record'] for v in phases.values() if v['status']=='USER_SKIPPED'}
            if set(p['reconcile_skips'])!=skips:errors.append('Explicitly reconcile every active skip with this specification')
            if not errors:
                spec=entry;accepted_skips=skips
                for name,row in phases.items():
                    if ids.index(name)>ids.index('specification') and row['status']!='USER_SKIPPED':
                        row.update(status='NOT_STARTED',record=None,evidence=[])
                phases['specification'].update(status='PASS',record=eid,evidence=[p['document'],p['acceptance']['authority']])
                criteria=[dict(id=c['id'],required=c['required'],status='NOT_STARTED',evidence=[]) for c in p['criteria']]
            else:phases['specification'].update(status='UNVERIFIED',record=eid,evidence=[p['document']])
        elif kind=='PhaseRecord':
            status=p['status']
            if phase=='specification':errors.append('Use specification acceptance; a phase record cannot accept or skip it')
            if p.get('source') and p['source'] not in inventories:errors.append('Missing preceding source inventory')
            if p['specification']!=(spec['entry_id'] if spec else None):errors.append('Phase specification differs from accepted specification')
            if ids.index(phase)>ids.index('specification') and spec is None:errors.append('Specification acceptance is required')
            if status in RESOLVED:
                if not prior_ok(phase,p.get('source')):errors.append('Earlier phases are unresolved or source evidence is stale')
                if unresolved():errors.append('Reconcile live or uncertain operations before advancing or skipping')
                if status=='USER_SKIPPED':
                    if definition.get('mandatory'):errors.append('Mandatory phase cannot be skipped')
                    if not approval(p.get('approval',{})):errors.append('Skip needs original explicit instruction and scope review')
                else:
                    if not usable(p['evidence']):errors.append('Phase success needs usable evidence')
                    if definition.get('proof','REVIEW')=='EXECUTION':
                        if not op_pass(p.get('operation'),p['source'],p['specification'],phase):errors.append('Execution phase needs a matching successful operation')
                    if definition.get('source_sensitive') and not p.get('source'):errors.append('Phase needs a captured source scope')
                    if phase=='specification_verification' and spec:
                        verdicts=p.get('criteria',[]);by_id={v['criterion_id']:v for v in verdicts}
                        expected={c['id'] for c in spec['payload']['criteria']}
                        if len(by_id)!=len(verdicts) or not set(by_id).issubset(expected):errors.append('Criterion IDs are duplicate or not accepted')
                        assessed=[]
                        for criterion in spec['payload']['criteria']:
                            v=by_id.get(criterion['id']);valid=bool(v and v['result']=='PASS' and v['method'] in criterion['methods'] and usable(v['evidence'],'EXECUTION' if v['method']=='EXECUTION' else None))
                            if valid and v['method']=='EXECUTION':valid=op_pass(v.get('operation'),p['source'],p['specification'])
                            assessed.append(dict(id=criterion['id'],required=criterion['required'],status='PASS' if valid else 'UNVERIFIED',evidence=v['evidence'] if v else []))
                            if criterion['required'] and not valid:errors.append('Required criterion lacks current supported evidence: '+criterion['id'])
                        criteria=assessed
            if phase in phases:
                evidence=list(p['evidence'])
                if status=='USER_SKIPPED' and p.get('approval'):evidence.insert(0,p['approval']['instruction'])
                phases[phase].update(status='UNVERIFIED' if errors else status,record=eid,evidence=evidence,source=p.get('source'),specification=p['specification'])
        supported[eid]=not errors
        history.append(dict(record=eid,kind=kind,phase=phase,status=p.get('status','ACCEPTED'),outcome=p.get('outcome'),evidence=p.get('evidence',[]),supported=not errors,actor=entry['actor'],timestamp=entry['timestamp']))
        for error in errors:issues.append(dict(code='UNSUPPORTED_RECORD',record=eid,message=error))
    # Source-sensitive judgments expire when current scoped bytes or membership change.
    for definition in definitions:
        row=phases[definition['id']]
        if row['status']=='PASS' and definition.get('source_sensitive') and row.get('source')!=capture['current_source']:
            row['status']='UNVERIFIED';issues.append(dict(code='SOURCE_CHANGED',record=row['record'],message=definition['label']+' needs current source evidence'))
            if definition['id']=='specification_verification':
                for criterion in criteria:criterion['status']='UNVERIFIED'
    if unresolved():issues.append(dict(code='UNRESOLVED_OPERATION',record=None,message='Reconcile: '+', '.join(unresolved())))
    if not supported.get(capture['entries'][0]['entry_id']):issues.append(dict(code='REQUEST_UNSUPPORTED',record=capture['entries'][0]['entry_id'],message='Original request evidence is unsupported'))
    integrity=bool(not capture['structural_issues'] and supported.get(capture['entries'][0]['entry_id']) and not any(i['code']=='UNKNOWN_PHASE' for i in issues))
    complete=bool(integrity and spec and capture['current_files'] and all(v['status'] in RESOLVED for v in phases.values())
                  and all(c['status']=='PASS' for c in criteria if c['required']) and not unresolved()
                  and supported.get(capture['entries'][0]['entry_id']) and not capture['structural_issues'])
    status='COMPLETE' if complete else 'UNVERIFIED' if any(v['status']=='UNVERIFIED' for v in phases.values()) or not integrity else 'BLOCKED' if unresolved() or any(v['status'] in ('FAIL','BLOCKED','UNKNOWN') for v in phases.values()) else 'IN_PROGRESS'
    report=dict(generated_at=datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),report_version='2.0.0',task_id=capture['task_id'],context_id=capture['context_id'],status=status,
        phases=list(phases.values()),criteria=criteria,issues=issues,history=history,open_operations=unresolved(),
        inputs=[dict(path=p,identity=h) for p,h in sorted(capture['inputs'].items())],
        limitations=['Local hashes check bytes, not authorship. Reviews and user attribution remain recorded judgments.'])
    report['generation_id']=content_identity(canonical_json(report))
    return report


def validate_candidate(capture,entries,payload):
    trial=deepcopy(capture);trial['entries']=entries
    def read(path,root):
        raw=read_bytes(path,root);capture['inputs'][str(path)]=content_identity(raw);return raw
    trial['evidence_checks'],trial['record_issues'],trial['evidence_contents']=inspect_evidence(entries,Path(capture['repo_root']),Path(capture['harness_root']),capture['task_id'],read)
    if payload['record_type']=='Specification':
        scope=payload['source_scope'];trial['source_scope']=scope
        trial['current_files']=collect_files(capture['repo_root'],capture['harness_root'],scope,allow_missing=True)
        trial['current_source']=inventory_identity(scope,trial['current_files'])
    report=derive_report(trial);eid=entries[-1]['entry_id']
    errors=[i['message'] for i in report['issues'] if i.get('record')==eid and i['code'] in ('UNSUPPORTED_RECORD','UNKNOWN_PHASE')]
    # Failed/blocked/uncertain observations remain recordable, including failures
    # found outside the intended sequence. They never count as progression.
    observation=payload['record_type']=='PhaseRecord' and payload['status'] in ('FAIL','BLOCKED','UNKNOWN') and payload['phase'] in {p['id'] for p in capture['workflow']['phases']}
    reconciliation=(payload['record_type']=='Operation' and payload['status'] in TERMINAL
                    and payload['operation_id'] not in report['open_operations']
                    and all(error=='Operation origin or preceding update is unsupported' for error in errors))
    if errors and not (observation or reconciliation):raise ValueError('; '.join(errors))
