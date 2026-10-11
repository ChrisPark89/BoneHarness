"""Offline schemas; no arbitrary URI retrieval or schema-provided resource roots."""
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit
from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import SchemaError
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012
from referencing.exceptions import Unresolvable
from .loader import DocumentError, load_document, relative_path, scoped_path

FORMATS = FormatChecker()

@FORMATS.checks('date-time', raises=(ValueError, TypeError))
def valid_utc_timestamp(value):
    return not isinstance(value, str) or (value.endswith('Z') and datetime.fromisoformat(value).utcoffset() == timezone.utc.utcoffset(None))


def _walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk(child)


def local_validator(schema_path: Path, definition=None, *, scope_root: Path | None = None):
    root = (scope_root or schema_path.parent).resolve(strict=True)
    safe = scoped_path(schema_path, root)
    resources = {}
    pending = [safe]
    references = []
    documents = {}
    while pending:
        path = pending.pop()
        uri = path.as_uri()
        if uri in resources:
            continue
        schema = load_document(path, root)
        if not isinstance(schema, dict):
            raise DocumentError('SCHEMA_DEFINITION', path, 'Schema root must be an object')
        try:
            Draft202012Validator.check_schema(schema)
        except SchemaError as exc:
            raise DocumentError('SCHEMA_DEFINITION',path,exc.message) from exc
        documents[uri] = schema
        for node in _walk(schema):
            if '$id' in node:
                raise DocumentError('SCHEMA_RESOURCE_ID', path, 'Schema $id is not permitted; local filenames identify resources')
            if '$schema' in node and node['$schema'] != 'https://json-schema.org/draft/2020-12/schema':
                raise DocumentError('SCHEMA_DIALECT', path, 'Only the installed draft 2020-12 dialect is supported')
            for key in ('$ref', '$dynamicRef'):
                if key not in node:
                    continue
                ref = node[key]
                parts = urlsplit(ref)
                if parts.scheme or parts.netloc or parts.query or '%' in parts.path:
                    raise DocumentError('SCHEMA_REFERENCE', path, 'Only local relative schema references are permitted')
                target = scoped_path(relative_path(parts.path,path.parent),root) if parts.path else path
                if parts.path:
                    pending.append(target)
                references.append((target.as_uri(),parts.fragment))
        resources[uri] = Resource.from_contents(schema,default_specification=DRAFT202012)
    for uri,fragment in references:
        node = documents[uri]
        if fragment:
            if not fragment.startswith('/'):
                raise DocumentError('SCHEMA_REFERENCE',uri,'Only local JSON Pointer fragments are supported')
            try:
                for part in unquote(fragment)[1:].split('/'):
                    part = part.replace('~1','/').replace('~0','~')
                    node = node[int(part)] if isinstance(node,list) else node[part]
            except (KeyError,ValueError,TypeError,IndexError):
                raise DocumentError('SCHEMA_REFERENCE',uri,'Unresolved local schema fragment: '+fragment) from None
    def forbidden(uri):
        raise Unresolvable(ref=uri)
    registry = Registry(retrieve=forbidden).with_resources(resources.items())
    ref = safe.as_uri() + (f'#/$defs/{definition}' if definition else '')
    return Draft202012Validator({'$ref': ref}, registry=registry, format_checker=FORMATS)


def validate_document(value: object, schema_path: Path, definition: str | None = None) -> list[dict]:
    try:
        validator = local_validator(schema_path, definition)
        return [{'code':'SCHEMA_INVALID','path': '/' + '/'.join(str(p) for p in e.absolute_path),
                 'message':e.message} for e in sorted(validator.iter_errors(value),key=lambda e:str(e.path))]
    except DocumentError as exc:
        return [exc.diagnostic()]
    except (SchemaError, Unresolvable, ValueError, TypeError, KeyError) as exc:
        return [{'code':'SCHEMA_DEFINITION','path':str(schema_path),'message':str(exc)}]
