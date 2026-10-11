# BoneHarness verification

**2026-10-11: 81 tests passed** on macOS / Python 3.14.

| Coverage | Tests |
|---|---:|
| Installation, assessments, maintenance and context | 40 |
| Development, skips, evidence and recovery | 23 |
| Parsing, paths and source inventory | 17 |
| Installed CLI with real JavaScript build/test | 1 |

The captured user installation passed the old checker and fails the improved assessment checks. Valid inspections and execution records pass; nonzero command exits do not imply incompatibility. Missing, mismatched and circular assessments fail.

Documentation links and human-page limits passed. The independent demo stayed unchanged: 1,187 file hashes matched. Regression scenarios used temporary repositories.

```sh
python3 -B -m unittest discover -s tests -p 'test_v2_*.py' -q
python3 -B tests/check-documents.py
```

The checker validates assessment structure and association, not truthfulness or tool quality. Native Windows/Linux execution and Python 3.11 remain unverified. The [installation retest](reviews/2026-10-11-installation-retest.md) passed structural review; subsequent edits clarify guidance only.

[User-test findings](reviews/2026-10-11-installation-user-test.md) retain the failure example.
