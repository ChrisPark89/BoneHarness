"""Explicit repository, stdout only, no dependency installation or legacy fallback."""
import argparse
from pathlib import Path
import sys
from .report import emit, new_report


class InvocationError(ValueError):
    pass


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise InvocationError(message)


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    output_format = 'json' if '--format' in argv and argv[argv.index('--format')+1:][:1] == ['json'] else 'text'
    report = new_report()
    try:
        parser = Parser(description='Optional read-only format 2 harness checker')
        parser.add_argument('--repo-root', required=True)
        parser.add_argument('--format', choices=('json', 'text'), default='text')
        parser.add_argument('--update', help='Maintenance record path relative to .harness')
        args = parser.parse_args(argv)
        output_format = args.format
        if sys.version_info < (3, 11):
            raise InvocationError('Python 3.11 or later is required')
        repo = Path(args.repo_root)
        if not repo.is_absolute() or not repo.is_dir():
            raise InvocationError('--repo-root must be an existing absolute directory')
        from .checks import check_installation
        report = check_installation(repo.resolve(strict=True), update=args.update)
    except (InvocationError, ImportError, OSError) as exc:
        report['exit_code'] = 2
        report['diagnostics'].append(dict(code='PREREQUISITE', path='checker', message=str(exc)))
    emit(report, output_format)
    return report['exit_code']
