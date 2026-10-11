#!/usr/bin/env python3
"""Create a fresh format 2 scaffold; no activation or adapter execution."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import sys

sys.dont_write_bytecode = True
KIT = Path(__file__).resolve().parents[1]
KIT_VERSION = '2.0.0'


def install(repo):
    if sys.version_info < (3, 11):
        raise ValueError('Python 3.11 or later is required; use a newer interpreter or the manual installation guide')
    repo = Path(repo)
    if not repo.is_absolute() or not repo.is_dir():
        raise ValueError('--repo-root must be an existing absolute directory')
    repo = repo.resolve(strict=True)
    harness = repo / '.harness'
    if harness.exists() or harness.is_symlink():
        raise ValueError('.harness already exists; inspect it with its matching tools, never overwrite or auto-migrate')
    source = KIT / 'templates/runtime'
    profile_template = (source / 'framework/config/repo-profile.yaml').read_text(encoding='utf-8')
    marker = 'repository: example-repository'
    if profile_template.count(marker) != 1 or 'schema_version: "2.0.0"' not in profile_template:
        raise ValueError('Installer requires the format 2 profile template')
    setup_template = (source / 'framework/templates/setup.md').read_text(encoding='utf-8')
    # Copy failure leaves a visible incomplete directory for inspection; never erase user files.
    shutil.copytree(source, harness, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    for directory in ('docs/development', 'docs/maintenance', 'artifacts/installation',
                      'artifacts/configurations', 'artifacts/development', 'artifacts/maintenance'):
        (harness / directory).mkdir(parents=True, exist_ok=True)
    shutil.copyfile(KIT / 'checker/check.py', harness / 'framework/tools/check.py')
    shutil.copytree(KIT / 'checker/harness_check', harness / 'framework/tools/harness_check',
                    ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    (harness / 'framework/config/repo-profile.yaml').write_text(
        profile_template.replace(marker, 'repository: ' + json.dumps(repo.name, ensure_ascii=False)), encoding='utf-8')
    # Template links are relative to framework/templates; installed summary links are relative to docs.
    (harness / 'docs/setup.md').write_text(setup_template.replace('../config/repo-profile.yaml',
        '../framework/config/repo-profile.yaml'), encoding='utf-8')
    ledger = harness / 'artifacts/installation/installation-record.yaml'
    files = sorted(p.relative_to(harness).as_posix() for p in harness.rglob('*') if p.is_file())
    files.append(ledger.relative_to(harness).as_posix())
    record = dict(schema_version='2.0.0', record_type='Installation', kit_version=KIT_VERSION,
                  configuration_id='cfg-1', status='PENDING', activation='PENDING',
                  created_at=datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                  files=sorted(files), checks=[])
    ledger.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return dict(harness_root=str(harness), kit_version=KIT_VERSION, structure='NOT_CHECKED',
                activation='PENDING', entry_point=str(harness / 'README.md'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', required=True, type=Path)
    args = parser.parse_args()
    try:
        result = install(args.repo_root)
    except (ValueError, OSError) as exc:
        parser.exit(2, str(exc) + '\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
