# Subtraction walkthrough review

**The feature works; the harness was mostly followed, with gaps.**

Reviewed all 255 messages chronologically. Findings were saved during the review in the [detailed trace](2026-10-11-subtraction-trace.md).

| Area | Finding |
|---|---|
| Phase sequence | All 12 phases resolved in order; acceptance preceded implementation |
| Actual verification | Preflight, build and tests succeeded; two tests passed |
| Reporting | Generated report matches the journal and saved evidence |
| Evidence scope | **Important:** changing packaged output or build inputs can leave a fresh report at COMPLETE |
| Context reading | 13 continuation pages skipped |
| Execution evidence | Empty preflight output replaced with a written success statement |
| Final handoff | An extra test ran after the report without a recorded operation |
| Usability | Many optional notes and step files; unnecessary schema reading |

**First improvement:** include build inputs in the accepted scope and retain the tested program's identity. Then clarify context continuation and command-result capture.

The scope weakness was reproduced in a disposable copy. The original demo and builder kit were unchanged. This review did not rerun application tests or exercise failure/repair scenarios.
