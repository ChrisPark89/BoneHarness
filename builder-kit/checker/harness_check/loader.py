"""Compatibility exports for the installed strict document utilities."""
from harness_io.loader import (
    DocumentError,
    RestrictedLoader,
    load_document,
    parse_document,
    read_bytes,
    relative_path,
    scoped_path,
)

__all__ = [
    'DocumentError', 'RestrictedLoader', 'load_document', 'parse_document',
    'read_bytes', 'relative_path', 'scoped_path',
]
