#!/usr/bin/env python3
"""Record one semantic step; the writer supplies journal bookkeeping."""
import argparse
from pathlib import Path
import sys
sys.dont_write_bytecode=True


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root',required=True)
    parser.add_argument('--harness-root',default='.harness')
    parser.add_argument('--task-id',required=True)
    parser.add_argument('--actor',required=True)
    parser.add_argument('--step',required=True,type=Path)
    parser.add_argument('--context-id')
    args=parser.parse_args(argv)
    try:
        from harness_io.loader import parse_document,read_bytes
        from harness_io.journal import record_step,canonical_json
        step=parse_document(read_bytes(args.step.resolve(),args.step.resolve().parent),args.step)
        result=record_step(args.repo_root,args.harness_root,args.task_id,step,actor=args.actor,context_id=args.context_id)
        print(canonical_json(result).decode());return 0
    except (ImportError,ValueError,OSError,KeyError,TypeError) as exc:
        print('RECORD_UNAVAILABLE: '+str(exc),file=sys.stderr);return 2


if __name__=='__main__':raise SystemExit(main())
