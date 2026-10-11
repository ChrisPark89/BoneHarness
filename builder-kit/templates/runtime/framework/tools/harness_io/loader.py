"""Strict JSON/YAML and scoped, exact-case file access."""
import json
import math
from pathlib import Path, PureWindowsPath
import re
import yaml


class DocumentError(ValueError):
    def __init__(self, code, path, message, exit_code=1):
        super().__init__(message)
        self.code, self.path, self.exit_code = code, str(path), exit_code

    def diagnostic(self, criterion_id=None):
        result = {'code': self.code, 'path': self.path, 'message': str(self)}
        if criterion_id:
            result['criterion_id'] = criterion_id
        return result


def scoped_path(path: Path, scope_root: Path, *, directory=False) -> Path:
    """Validate lexical spelling and resolved containment BEFORE opening content."""
    root = scope_root.resolve(strict=True)
    candidate = path if path.is_absolute() else root / path
    try:
        relative = candidate.relative_to(root)
    except ValueError:
        raise DocumentError('PATH_SCOPE', path, 'Path is outside its declared root') from None
    if not relative.parts or any(p in ('..', '.') or '\\' in p or ':' in p for p in relative.parts):
        if directory and candidate == root:
            return root
        raise DocumentError('PATH_TRAVERSAL', path, 'Require a canonical root-relative path using /')
    current = root
    try:
        for part in relative.parts:
            names = {p.name for p in current.iterdir()}
            if part not in names:
                code = 'PATH_CASE' if any(n.casefold() == part.casefold() for n in names) else 'PATH_MISSING'
                raise DocumentError(code, path, 'Exact-case path component not present')
            current = current / part
            resolved = current.resolve(strict=True)
            if not resolved.is_relative_to(root):
                raise DocumentError('PATH_SYMLINK', path, 'Symlink escapes declared root')
        if not (current.is_dir() if directory else current.is_file()):
            raise DocumentError('PATH_TYPE', path, 'Expected a regular directory' if directory else 'Expected a regular file')
        return current
    except DocumentError:
        raise
    except (OSError, RuntimeError) as exc:
        raise DocumentError('PATH_UNREADABLE', path, str(exc), 2) from exc


def relative_path(value: str, root: Path, *, directory=False) -> Path:
    if (not isinstance(value, str) or not value or '\\' in value or
            value.startswith('/') or PureWindowsPath(value).drive or
            any(p in ('', '.', '..') for p in value.split('/'))):
        raise DocumentError('PATH_TRAVERSAL', str(value), 'Require a canonical relative path using /')
    return scoped_path(root / value, root, directory=directory)


def read_bytes(path: Path, scope_root: Path) -> bytes:
    safe = scoped_path(path, scope_root)
    try:
        return safe.read_bytes()
    except OSError as exc:
        raise DocumentError('PATH_UNREADABLE', path, str(exc), 2) from exc


_NUMBER = re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\Z')
_AMBIGUOUS = re.compile(r'(?:yes|no|on|off|true|false|null|~)', re.I)


class RestrictedLoader(yaml.SafeLoader):
    def compose_node(self, parent, index):
        event = self.peek_event()
        if getattr(event, 'tag', None) is not None:
            raise ValueError('Explicit YAML tags are forbidden')
        return super().compose_node(parent, index)

    def construct_mapping(self, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            if key_node.value == '<<':
                raise ValueError('Merge keys are forbidden')
            key = self.construct_object(key_node, deep=deep)
            if not isinstance(key, str):
                raise ValueError('Mapping keys must be strings')
            if key in result:
                raise ValueError('Duplicate mapping key: ' + key)
            result[key] = self.construct_object(value_node, deep=deep)
        return result

    def construct_scalar(self, node):
        if node.tag.endswith(':timestamp'):
            raise ValueError('Dates and timestamps must be quoted strings')
        if node.style is None:
            text = node.value
            if text == '' or (_AMBIGUOUS.fullmatch(text) and text not in ('true', 'false', 'null')):
                raise ValueError('Ambiguous YAML scalar; quote strings, use true/false/null explicitly')
            if node.tag.endswith((':int', ':float')) and not _NUMBER.fullmatch(text):
                raise ValueError('Use JSON-compatible decimal number spelling')
        return super().construct_scalar(node)


def _json_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key: ' + key)
        result[key] = value
    return result


def _compatible(value, ancestors=None):
    ancestors = set() if ancestors is None else ancestors
    if isinstance(value, (dict, list)):
        if id(value) in ancestors:
            raise ValueError('Cyclic aliases are forbidden')
        ancestors.add(id(value))
        if isinstance(value, dict) and not all(isinstance(k, str) for k in value):
            raise ValueError('Mapping keys must be strings')
        for child in value.values() if isinstance(value, dict) else value:
            _compatible(child, ancestors)
        ancestors.remove(id(value))
    elif type(value) not in (str, int, float, bool, type(None)) or (isinstance(value, float) and not math.isfinite(value)):
        raise ValueError('Only finite JSON-compatible scalar values are permitted')


def load_document(path: Path, scope_root: Path) -> dict | list:
    return parse_document(read_bytes(path, scope_root), path)


def parse_document(content: bytes, source: Path) -> dict | list:
    """Parse captured bytes using the source suffix; perform no file access."""
    try:
        text = content.decode('utf-8')
        if source.suffix.lower() == '.json':
            value = json.loads(text, object_pairs_hook=_json_pairs,
                               parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Non-finite JSON value')))
        else:
            value = yaml.load(text, Loader=RestrictedLoader)
        _compatible(value)
        if not isinstance(value, (dict, list)):
            raise ValueError('Document root must be an object or array')
        return value
    except (ValueError, TypeError, yaml.YAMLError, RecursionError) as exc:
        raise DocumentError('PARSE_INVALID', source, str(exc)) from exc
