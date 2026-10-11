"""Small actual-byte format 2 fixtures; no retained demo mutations."""
from pathlib import Path
import shutil
import sys
import tempfile
import yaml

ROOT=Path(__file__).resolve().parents[1]
TOOLS=ROOT/'builder-kit/templates/runtime/framework/tools'
sys.dont_write_bytecode=True
sys.path.insert(0,str(TOOLS))
from harness_io.journal import record_step,canonical_json,make_entry
from reporting.evidence import capture_task
from reporting.summary import derive_report


class Task:
    def __init__(self):
        self.temporary=tempfile.TemporaryDirectory();self.repo=Path(self.temporary.name).resolve()
        self.harness=self.repo/'.harness'
        shutil.copytree(ROOT/'builder-kit/templates/runtime',self.harness,ignore=shutil.ignore_patterns('__pycache__'))
        (self.repo/'src').mkdir();(self.repo/'src/app.txt').write_text('accepted implementation\n')
        self.docs=self.harness/'docs/development/task';self.docs.mkdir(parents=True,exist_ok=True)
        (self.docs/'request.md').write_text('User Ada: implement the accepted requirement. Skip every optional phase. I accept the specification.\n')
        (self.docs/'spec.md').write_text('acceptance-1: implementation contains the accepted text.\n')
        (self.docs/'review.md').write_text('Reviewed actual source: accepted text is present.\n')
        self.log=self.harness/'artifacts/development/task/output.log';self.log.parent.mkdir(parents=True,exist_ok=True)
        self.log.write_text('Actual local check: expected source text found; exit 0.\n')
        profile=self.harness/'framework/config/repo-profile.yaml'
        value=yaml.safe_load(profile.read_text())
        for name,binding in value['adapters'].items():binding.update(connection='local:'+name,status='COMPATIBLE',reason='Checked local fixture interface.',evidence=['docs/development/task/review.md'])
        profile.write_text(yaml.safe_dump(value,sort_keys=False))
        self.write(dict(action='start',request=self.ev('request.md'),source_scope={'roots':['src'],'exclude':[]}))
    def cleanup(self):self.temporary.cleanup()
    def ev(self,file='review.md',provenance='REVIEW'):
        path='artifacts/development/task/output.log' if file=='output.log' else 'docs/development/task/'+file
        return dict(reference=dict(kind='LOCAL',scope='HARNESS',path=path),provenance=provenance,summary='Actual captured evidence.')
    def approval(self,quote='Skip every optional phase.'):
        return dict(instruction=self.ev('request.md'),user='Ada',quote=quote,review='Original explicit instruction applies to this phase, task and scope.')
    def capture(self):return capture_task(self.repo,self.harness,'task')
    def report(self):return derive_report(self.capture())
    def write(self,step):
        history=self.harness/'artifacts/development/task/history.jsonl'
        context=self.capture()['context_id'] if history.exists() else None
        return record_step(self.repo,self.harness,'task',step,actor='reviewer',context_id=context)
    def phase(self,name,status='PASS',**extra):
        return self.write(dict(action='phase',phase=name,status=status,summary='Reviewed phase outcome.',evidence=[self.ev()],**extra))
    def skip(self,name):return self.phase(name,'USER_SKIPPED',approval=self.approval())
    def accept(self,**extra):
        skips=[p['record'] for p in self.report()['phases'] if p['status']=='USER_SKIPPED']
        step=dict(action='specification',document=self.ev('spec.md'),acceptance=dict(authority=self.ev('request.md'),review='Reviewed and accepted under the actual request authority.'),criteria=[dict(id='acceptance-1',description='Accepted text exists.',required=True,methods=['REVIEW'])],source_scope={'roots':['src'],'exclude':[]},reconcile_skips=skips)
        step.update(extra);return self.write(step)
    def execute(self,phase,op=None,outcome='PASS'):
        op=op or phase+'-1';capability={'testing':'test','pattern_review':'pattern_search'}.get(phase,phase)
        self.write(dict(action='operation',operation_id=op,phase=phase,status='INTENT',connection='local:'+capability,evidence=[]))
        self.write(dict(action='operation',operation_id=op,status='COMPLETED',outcome=outcome,evidence=[self.ev('output.log','EXECUTION')]))
        return op
    def verify(self):
        return self.phase('specification_verification',criteria=[dict(criterion_id='acceptance-1',result='PASS',method='REVIEW',reason='Actual source reviewed.',evidence=[self.ev()])])
    def complete(self,skipped=False):
        for phase in self.capture()['workflow']['phases']:
            name=phase['id']
            if name=='specification':self.accept()
            elif name=='specification_verification':self.verify()
            elif skipped:self.skip(name)
            elif phase.get('proof')=='EXECUTION':self.phase(name,operation=self.execute(name))
            else:self.phase(name)
        return self.report()
    def append(self,payload):
        entries=self.capture()['entries'];row=make_entry(payload,'external-author',entries[-1])
        path=self.harness/'artifacts/development/task/history.jsonl'
        with path.open('ab') as stream:stream.write(canonical_json(row)+b'\n')
        return row
