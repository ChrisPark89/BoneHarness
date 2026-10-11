# BoneHarness verification — format 2

**2026-10-11: 67 tests passed** on macOS, Python 3.14.0, PyYAML 6.0.3 and jsonschema 4.26.0.

| Coverage | Checks |
|---|---:|
| Installation, maintenance and selected context | 26 |
| Development, skips, evidence and recovery | 23 |
| Parsing, paths and source inventory | 17 |
| Installed CLI with actual JavaScript build/test | 1 |

The CLI walkthrough reached completion in a temporary app and confirmed that changing packaged output invalidated it.

The visible [demo](../tests/demo/README.md) was freshly installed with format 2. Both controlled scenarios reached COMPLETE: normal build/test and intentional test failure followed by repair. Source was restored; failed output remains recorded. Setup structure passed and entry-point activation was reviewed.

Documentation checks passed: 32 current documents, 59 local links, 42 demo links and human-page word limits.

BoneHarness recheck: 67 tests and documentation checks passed after renaming. An earlier run failed because the folder moved during execution.

Commands:

```sh
python3 -B -m unittest discover -s tests -p 'test_v2_*.py' -q
python3 tests/check-documents.py
```

Native Windows/Linux execution, Python 3.11 execution of this revision, and a private-repository walkthrough remain unverified.

The [previous kit and tests](../archive/2026-10-10-format-1.zip) retain their own results; those are not evidence for format 2.
