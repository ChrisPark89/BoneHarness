# BoneHarness implementation status

**Assessment enforcement implemented.** [Verification](verification.md): 81 tests passed on macOS/Python 3.14.

| Area | Current design |
|---|---|
| Adapter profile | 29 lines; connection, status, reason; optional instructions/evidence |
| Development | 12 phases with shared statuses; Task initialization replaces NEW/BASELINE |
| Progress | One phase record per attempt; no separate request/decision/event or mutable state file |
| Tools | COMPATIBLE requires a matching assessment; execution claims retain command, exit and output |
| Human review | Short specification, report and setup/update pages |
| Recovery | Retained failures, current-source checks and unresolved operation handling |
| Maintenance | Inspect, stage, check, publish, refresh status |

The package now includes a Python setup guide and local environment exclusions. Obsolete definitions and tests are preserved with their matching implementation in the [format 1 archive](../archive/2026-10-10-format-1.zip).

Existing installations are not automatically converted. The [demo](../tests/demo/README.md) was freshly installed with format 2; its old harness is archived. Automated checks also use disposable installations.

The independent [installation retest](reviews/2026-10-11-installation-retest.md) passed structural review. Native Windows/Linux and a development task through that installation remain pending.
