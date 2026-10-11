#!/usr/bin/env python3
"""Publish a captured format 2 report without changing task history."""
import argparse
import os
from pathlib import Path
import sys
import tempfile
sys.dont_write_bytecode=True


def generate(repo_root,harness_root,task_id):
    from harness_io.journal import roots,ordinary,safe_mkdir,locked,canonical_json,content_identity
    from harness_io.schemas import local_validator
    from reporting.evidence import capture_task,check_unchanged
    from reporting.summary import derive_report
    from reporting.render import render_markdown
    repo,harness,run=roots(repo_root,harness_root,task_id)
    with locked(run):
        capture=capture_task(repo,harness,task_id);report=derive_report(capture)
        error=next(local_validator(Path(capture['configuration_root'])/'templates/schemas/task-report.schema.json').iter_errors(report),None)
        if error:raise ValueError('Invalid derived report: '+error.message)
        report_root=safe_mkdir(harness/'docs/development'/task_id,harness)
        raw=canonical_json(report)+b'\n'
        markdown=render_markdown(report,repo_root=repo,harness_root=harness,report_root=report_root)
        markdown+='\n<!-- generation: '+report['generation_id']+' json: '+content_identity(raw)+' -->\n'
        outputs=[(run/'report.json',raw),(report_root/'report.md',markdown.encode())]
        staged=[]
        try:
            for destination,content in outputs:
                ordinary(destination,harness,missing=True)
                fd,temporary=tempfile.mkstemp(prefix='.report-',dir=destination.parent)
                staged.append((Path(temporary),destination))
                with os.fdopen(fd,'wb') as stream:stream.write(content);stream.flush();os.fsync(stream.fileno())
            if check_unchanged(capture):raise ValueError('Inputs changed during report capture; previous report may be stale')
            for temporary,destination in staged:
                ordinary(destination,harness,missing=True);ordinary(temporary,harness)
                os.replace(temporary,destination)
        finally:
            for temporary,_ in staged:
                if temporary.exists():ordinary(temporary,harness).unlink()
        return report,report_root/'report.md'


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root',required=True)
    parser.add_argument('--harness-root',default='.harness')
    parser.add_argument('--task-id',required=True)
    args=parser.parse_args(argv)
    try:
        report,path=generate(args.repo_root,args.harness_root,args.task_id)
        print(str(path));print(report['status']);return 1 if report['status']=='UNVERIFIED' else 0
    except (ImportError,ValueError,OSError,KeyError,TypeError) as exc:
        print('REPORT_UNAVAILABLE: '+str(exc)+'. Prior reports may be stale.',file=sys.stderr);return 2


if __name__=='__main__':raise SystemExit(main())
