# Recover interrupted work

1. Read task [context](context.md), repository instructions, or the [maintenance update](maintenance/harness-maintenance.md).
2. Check saved evidence, current source, permissions and operation identity. Ordinary reads need evidence references, not operation records.
3. Resolve the unfinished action before advancing:

| Observation | Action |
|---|---|
| Intent; submission uncertain | Query by saved request/handle or inspect evidence before retrying |
| Running | Reconnect to the same operation; retain its deadline and inputs |
| Output saved | Review it against matching source, specification and operation |
| Terminal result recorded | Preserve it; a retry gets a new operation ID |
| Partial harness update | Compare before/candidate/current bytes and reconcile each write |
| Torn journal or held lock | Preserve original bytes; establish writer termination before manual recovery |

4. Re-read context and record the resolved observation. Never backfill a prior success or skip with later evidence. A failure or unknown result stays in history; recovery adds evidence rather than rewriting it.

Do not remove a lock while its owner may still run. Missing completion evidence does not prove an action never ran. Recovery grants no new permission, success or specification waiver.
