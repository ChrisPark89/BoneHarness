# Acceptance scenarios — format 2

These are project checks, not extra records required in installed harnesses.

| Scenario | Expected result |
|---|---|
| Fresh installation | Only `.harness/` created; incomplete discovery visible. |
| Missing adapter | Its phase waits; other eligible work remains usable. |
| Replace adapter | Compatibility evidence and reason recorded; old task configuration preserved. |
| Ordinary task | One attempt per phase; concise evidence-linked report. |
| Failure then repair | Earlier failure retained; next attempt can resolve it. |
| User skips testing | Original instruction linked; test requirements remain enforceable. |
| Skip specification or final verification | Rejected. |
| Evidence missing or source changed | Completion unsupported. |
| Interrupted tool operation | Resume by checking its outcome; uncertainty blocks completion. |
| Harness configuration changes | Existing task continues against its captured configuration. |
| Large history | Context command returns selected records rather than the entire file. |
| Old-format records | Clear rejection; originals remain usable with matching tools. |

See [verification](verification.md) for checks actually run. A scenario listed here is an expectation, not a passing result.
