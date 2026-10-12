# Recover interrupted work

For interrupted setup, follow [setup](../setup/setup.md): read adapter instructions/reasons and resume the first ACTION_NEEDED entry.

1. Read task [context](context.md), repository instructions, or the relevant guide: [tools/settings](../maintenance/harness-maintenance.md) or [Update BoneHarness](../updates/update-boneharness.md).
2. Check evidence, source, permissions and operation identity.
3. Resolve the unfinished action:

| Observation | Action |
|---|---|
| Intent; submission uncertain | Inspect evidence or query the saved handle before retrying |
| Running | Reconnect to the same operation; retain deadline and inputs |
| Command timeout/crash | Inspect processes, descendants and remote work; never rerun automatically |
| Output saved without registration | Preserve it; establish termination, record CANCELLED with reconciliation evidence, then retry with a new ID if needed |
| Terminal result recorded | Preserve it; retries use new IDs |
| Partial harness update | Compare before/candidate/current bytes; reconcile each write |
| Torn journal or held lock | Preserve bytes; establish writer termination before manual recovery |

4. Re-read context and record the observation. Add evidence; never rewrite failures or backfill success with later evidence.

Never remove a lock while its owner may run. Missing completion evidence does not prove an action never ran. Recovery grants no new permission, success or specification waiver.
