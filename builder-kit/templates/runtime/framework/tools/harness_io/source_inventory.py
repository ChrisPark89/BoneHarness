"""Content snapshots of an explicitly selected local source scope; no writes or Git."""
import hashlib
import json
from pathlib import Path, PureWindowsPath

from .loader import DocumentError, read_bytes, scoped_path


def _fail(message):
    raise DocumentError('SOURCE_INVENTORY_INVALID', 'source inventory', message)


def _path(value, *, root=False):
    if root and value == '.':
        return value
    if (not isinstance(value, str) or not value or PureWindowsPath(value).drive
            or any(c in value for c in '\\:*?<>"|')
            or any(ord(c) < 32 for c in value)
            or any(p in ('', '.', '..') or p.endswith((' ', '.')) for p in value.split('/'))):
        _fail('Use exact repository-relative paths; only a root may be .')
    return value


def _within(path, parent):
    return parent == '.' or path == parent or path.startswith(parent + '/')


def source_scope(value):
    """Normalize literal roots/exclusions; no globs, Git ignore rules or guessed scope."""
    if not isinstance(value, dict) or set(value) != {'roots', 'exclude'}:
        _fail('Scope requires roots and exclude lists')
    result = {}
    for key in ('roots', 'exclude'):
        items = value[key]
        if not isinstance(items, list) or (key == 'roots' and not items):
            _fail('Scope needs nonempty roots and an explicit exclusion list')
        items = [_path(p, root=key == 'roots') for p in items]
        if len(set(items)) != len(items):
            _fail('Duplicate scope paths')
        if any(a != b and _within(a, b) for a in items for b in items):
            _fail('Overlapping roots or exclusions')
        result[key] = sorted(items)
    for excluded in result['exclude']:
        if not any(_within(excluded, root) and excluded != root for root in result['roots']):
            _fail('Exclusions must be inside a selected directory root')
    return result


def inventory_identity(scope, files):
    raw = json.dumps(dict(scope=source_scope(scope), files=files), sort_keys=True,
                     ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')
    return 'sha256:' + hashlib.sha256(raw).hexdigest()


def collect_files(repo_root, harness_root, scope, *, allow_missing=False):
    """Enumerate and hash regular files, including untracked files inside selected roots."""
    repo = Path(repo_root).resolve(strict=True)
    harness = Path(harness_root)
    harness = harness if harness.is_absolute() else repo / harness
    harness = harness.resolve(strict=True)
    if not harness.is_relative_to(repo):
        _fail('Harness must be inside the repository')
    scope = source_scope(scope)
    files = []

    def visit(relative):
        if any(_within(relative, excluded) for excluded in scope['exclude']):
            return
        candidate = repo if relative == '.' else repo / relative
        # Reject links before resolution, including links in a selected root's parents.
        for node in (candidate, *candidate.parents):
            if node == repo:
                break
            if node.is_symlink():
                _fail('Source scope contains a symlink: ' + relative)
        if candidate == harness or candidate.is_relative_to(harness):
            _fail('Exclude the harness directory from source scope')
        if allow_missing and not candidate.exists():
            return
        if candidate.is_dir():
            directory = scoped_path(candidate, repo, directory=True)
            for child in sorted(directory.iterdir(), key=lambda p: p.name):
                visit(child.relative_to(repo).as_posix())
        else:
            _path(relative)
            safe = scoped_path(candidate, repo)
            raw = read_bytes(safe, repo)
            files.append(dict(path=relative, identity='sha256:' + hashlib.sha256(raw).hexdigest()))

    for root in scope['roots']:
        visit(root)
    if not files and not allow_missing:
        _fail('Source scope contains no regular files')
    return sorted(files, key=lambda row: row['path'])


def capture_inventory(repo_root, harness_root, task_id, scope):
    """Generate a record to append before execution; never infer or approve task scope."""
    if not isinstance(task_id, str) or not task_id:
        _fail('A task ID is required')
    scope = source_scope(scope)
    files = collect_files(repo_root, harness_root, scope)
    if collect_files(repo_root, harness_root, scope) != files:
        _fail('Source changed during capture; retry after changes stop')
    return dict(schema_version='2.0.0', record_type='SourceInventory', task_id=task_id,
                revision=inventory_identity(scope, files), scope=scope, files=files)


def validate_inventory(value):
    """Validate hash/order/path invariants in addition to the pinned record schema."""
    scope = source_scope(value['scope'])
    files = value['files']
    paths = [row['path'] for row in files]
    if not files or paths != sorted(set(paths)):
        _fail('Source files must be nonempty, unique and sorted by path')
    for path in paths:
        _path(path)
        if (not any(_within(path, root) for root in scope['roots'])
                or any(_within(path, excluded) for excluded in scope['exclude'])):
            _fail('Recorded file is outside the declared scope')
    if value['revision'] != inventory_identity(scope, files):
        _fail('Source revision does not match the inventory contents')
    return scope
