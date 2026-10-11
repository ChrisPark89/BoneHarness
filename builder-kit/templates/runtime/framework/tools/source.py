#!/usr/bin/env python3
"""Print a source-inventory record for the existing journal writer; no files changed."""
import argparse
from pathlib import Path
import sys
sys.dont_write_bytecode = True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', type=Path, required=True)
    parser.add_argument('--harness-root', type=Path, default=Path('.harness'))
    parser.add_argument('--task-id', required=True)
    parser.add_argument('--root', action='append', required=True, help='Source file/directory; repeat as needed')
    parser.add_argument('--exclude', action='append', default=[], help='Literal excluded subtree/file; repeat as needed')
    args = parser.parse_args(argv)
    try:
        from harness_io.source_inventory import capture_inventory
        from harness_io.journal import canonical_json
        if not args.repo_root.is_absolute():
            raise ValueError('repo-root must be absolute')
        record = capture_inventory(args.repo_root, args.harness_root, args.task_id,
                                   dict(roots=args.root, exclude=args.exclude))
        print(canonical_json(record).decode('utf-8'))
        return 0
    except (ImportError, ValueError, OSError, RuntimeError) as exc:
        print('SOURCE_INVENTORY_UNAVAILABLE: ' + str(exc), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
