# BoneHarness implementation status

**Format 2 cleanup implemented.** [Verification](verification.md): 67 tests passed on macOS/Python 3.14.

| Area | Current design |
|---|---|
| Adapter profile | 29 lines; connection, status, reason; optional instructions/evidence |
| Development | 12 phases with shared statuses; Task initialization replaces NEW/BASELINE |
| Progress | One phase record per attempt; no separate request/decision/event or mutable state file |
| Tools | Ordinary output interpreted with evidence; operations recorded when needed |
| Human review | Short specification, report and setup/update pages |
| Recovery | Retained failures, current-source checks and unresolved operation handling |
| Maintenance | Inspect, stage, check, publish, refresh status |

The package contains 59 files, down from 76. Obsolete definitions and tests are preserved with their matching implementation in the [format 1 archive](../archive/2026-10-10-format-1.zip).

Existing installations are not automatically converted. The [demo](../tests/demo/README.md) was freshly installed with format 2; its old harness is archived. Automated checks also use disposable installations.

Native Windows/Linux checks and a private-repository trial remain pending.
