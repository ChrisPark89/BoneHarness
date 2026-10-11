# BoneHarness project tests

These checks verify the distributed kit. They are not installed into other repositories.

| Location | Purpose |
|---|---|
| `test_v2_*.py` | Current profile, installation, development and installed CLI checks |
| `check-documents.py` | Current documentation links and size checks |
| `demo/` | Current format 2 installation and two controlled JavaScript scenarios |

Run current tests from the project root with Python 3.11+ and the kit’s declared dependencies:

```sh
python -m unittest discover -s tests -p 'test_v2_*.py' -v
python tests/check-documents.py
```

Installed harnesses use their installation checker and the repository’s normal tools. They do not need this project’s test suite.

The old suite, fixtures, conformance catalogue and matching kit are preserved in [the format 1 archive](../archive/2026-10-10-format-1.zip). They were retired because they assert the replaced record format and transition graph. Historical results are not reused as evidence for format 2.

The demo runner installs the current kit only into an empty `.harness/`. Preserve previous installations before replacing them; historical records need their matching tools.
