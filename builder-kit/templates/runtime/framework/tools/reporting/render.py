"""A compact human view; JSON retains full attempts, judgments, and diagnostics."""
import os
import html
import re
from pathlib import Path
from urllib.parse import quote


def render_markdown(report,*,repo_root,harness_root,report_root):
    def text(value,limit=5):
        value=' '.join(str(value).split()[:limit])
        return html.escape(value).replace('|','&#124;').replace('[','&#91;').replace(']','&#93;').replace('*','&#42;').replace('`','&#96;')
    def link(evidence,label='evidence'):
        ref=evidence['reference'];root=Path(harness_root if ref['scope']=='HARNESS' else repo_root)
        target=quote(os.path.relpath(root/ref['path'],report_root),safe='/.-_')
        if ref.get('entry_id'):target+='#'+quote(ref['entry_id'],safe='')
        return '['+label+']('+target+')'
    lines=['# Task report','', '**'+report['status']+'**','Snapshot: '+text(report['generated_at'],1)+'.','', '| Phase | Status | Evidence |','|---|---|---|']
    for row in report['phases']:
        label='approval' if row['status']=='USER_SKIPPED' else 'evidence'
        links=link(row['evidence'][0],label) if row['evidence'] else '—'
        lines.append('| '+text(row['label'],3)+' | '+row['status']+' | '+links+' |')
    required=[c for c in report['criteria'] if c['required']]
    failures=sum(r['status'] in ('FAIL','UNKNOWN','BLOCKED') or r.get('outcome') in ('FAIL','UNKNOWN','BLOCKED') for r in report['history'])
    pending=next((p['label'] for p in report['phases'] if p['status'] not in ('PASS','USER_SKIPPED')),None)
    lines+=['',f"Accepted criteria: {sum(c['status']=='PASS' for c in required)}/{len(required)} supported. Prior failure/uncertainty records: {failures}.", '',
            'Next: '+(text(pending,3)+'; inspect unresolved evidence.' if pending else 'Review the completed task and retained evidence.'), '',
            'Local hashes check bytes; user attribution and semantic review remain recorded judgments.', '',
            '[Full evidence, attempts and issues]('+quote(os.path.relpath(Path(harness_root)/'artifacts/development'/report['task_id']/'report.json',report_root),safe='/.-_')+')']
    return '\n'.join(lines)+'\n'
