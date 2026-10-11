"""Read-only task reporting from captured, configuration-pinned evidence.

Library hosts must disable bytecode writes before importing installed modules
(python -B, PYTHONDONTWRITEBYTECODE, or sys.dont_write_bytecode = True). The
framework/tools/report.py CLI handles this before its local imports; a package
cannot suppress the cache write for its own initial import from inside itself.
"""

__version__ = '2.0.0'
