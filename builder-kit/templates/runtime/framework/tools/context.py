#!/usr/bin/env python3
"""Read concise format 2 context; bounded excerpts, no adapter execution or state writes."""
import argparse
import json
import sys
sys.dont_write_bytecode = True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', required=True)
    parser.add_argument('--harness-root', default='.harness')
    parser.add_argument('--situation', choices=('development', 'recovery', 'setup', 'maintenance'), default='development')
    selected = parser.add_mutually_exclusive_group()
    selected.add_argument('--task-id')
    selected.add_argument('--update-id')
    parser.add_argument('--record', help='Read one specific task journal entry')
    parser.add_argument('--page', type=int, default=1)
    parser.add_argument('--context-id', help='Require the same task/view when continuing')
    parser.add_argument('--format', choices=('text', 'json'), default='text')
    args = parser.parse_args(argv)
    try:
        from context_reader import extract_context, context_page, render_text
        context = extract_context(args.repo_root, args.harness_root, situation=args.situation,
                                  task_id=args.task_id, update_id=args.update_id, record_id=args.record)
        page = context_page(context, args.page, expected_context_id=args.context_id)
        print(json.dumps(page, ensure_ascii=False, indent=2) if args.format == 'json' else render_text(page))
        return 1 if context['issues'] else 0
    except (ImportError, ValueError, OSError, RuntimeError, KeyError, TypeError) as exc:
        error = dict(code='CONTEXT_UNAVAILABLE', message=str(exc))
        print(json.dumps(error, ensure_ascii=False) if args.format == 'json' else error['code'] + ': ' + error['message'])
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
