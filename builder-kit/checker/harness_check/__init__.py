"""Optional, read-only installation checker. No runtime transition engine."""
from importlib import util as _import_util
from pathlib import Path as _Path
import sys as _sys


# Bind compatibility exports to the package's runtime template, never a search
# through repository ancestors or an unrelated harness_io on sys.path.
_installed_support = _Path(__file__).resolve().parent.parent / 'harness_io'
_support_directory = (_installed_support if _installed_support.is_dir() else
                      _Path(__file__).resolve().parents[2] /
                      'templates/runtime/framework/tools/harness_io')
_support_init = _support_directory / '__init__.py'
_support_package = _sys.modules.get('harness_io')
if _support_package is not None:
    if (_Path(getattr(_support_package, '__file__', '') or '').resolve() != _support_init or
            list(getattr(_support_package, '__path__', ()) or ()) != [str(_support_directory)]):
        raise ImportError('harness_io must come from the checker colocated installed utilities or runtime template')
else:
    _support_spec = _import_util.spec_from_file_location(
        'harness_io', _support_init,
        submodule_search_locations=[str(_support_directory)])
    if _support_spec is None or _support_spec.loader is None:
        raise ImportError('Cannot load harness_io from the checker colocated installed utilities or runtime template')
    _support_package = _import_util.module_from_spec(_support_spec)
    _sys.modules['harness_io'] = _support_package
    try:
        _support_spec.loader.exec_module(_support_package)
    except BaseException:
        _sys.modules.pop('harness_io', None)
        raise


__version__ = '2.0.0'
