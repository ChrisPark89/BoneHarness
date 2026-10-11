# Adapter connections

Open the [profile](../config/repo-profile.yaml) to see each connection, status and reason.

| Status | Meaning |
|---|---|
| NOT_CONNECTED | No adapter selected |
| NOT_ASSESSED | Connected; compatibility evidence missing |
| COMPATIBLE | Recorded checks support this interface use |
| NEEDS_REVIEW | Connection or assumptions changed |
| INCOMPATIBLE | Known mismatch; reason explains it |

A connection names the command, tool or skill. Add `instructions` only when running or interpreting it needs explanation. Add `evidence` as paths relative to `.harness/`; COMPATIBLE requires retained evidence. Missing evidence is not incompatibility. Compatibility does not certify quality, permissions or task success.

Use normal tool output. Record the actual operation, inputs, relevant source/target/environment, outcome and evidence. Explain any LLM interpretation. A real failure stays a failure. Fixture checks demonstrate interface behavior, never completed production work.

Before acting, check repository instructions and current permissions. If submission is uncertain, preserve its handle and reconcile before retrying. Add deadlines, artifact identities or cancellation details to operations only when relevant.

Change connections through [maintenance](../workflows/maintenance/harness-maintenance.md). Existing tasks retain their captured configuration. Format 1 histories require their original tools.
