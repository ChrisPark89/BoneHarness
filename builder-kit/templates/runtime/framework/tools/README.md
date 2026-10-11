# Python helpers: setup once

**Requires Python 3.11+.** The installer uses only Python's standard library. Installed helpers also need:

| Package | Purpose |
|---|---|
| PyYAML | Read YAML records |
| jsonschema | Validate records and schemas |

[requirements.lock](requirements.lock) is a pip requirements file: exact versions of these packages and their dependencies. Use it unchanged. Pins make dependency selection repeatable; they do not prove platform compatibility.

Run from the target repository after creating `.harness/`.

**macOS / Linux**

```sh
python3 -m venv .harness/.venv
.harness/.venv/bin/python -m pip install -r .harness/framework/tools/requirements.lock
.harness/.venv/bin/python -m pip check
```

**Windows (PowerShell)**

```powershell
py -3 -m venv .harness/.venv
.harness\.venv\Scripts\python.exe -m pip install -r .harness/framework/tools/requirements.lock
.harness\.venv\Scripts\python.exe -m pip check
```

Confirm the selected Python version first. Use that environment's executable for all harness commands; record it in setup status. An existing compatible environment is also acceptable. Missing dependencies require setup action; do not claim readiness.

[Python environment guidance](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/) · [Version pinning guidance](https://pip.pypa.io/en/stable/topics/repeatable-installs/)
