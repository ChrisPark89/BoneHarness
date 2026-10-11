# Connect and assess an adapter

1. Set its connection in the [profile](../config/repo-profile.yaml), initially NOT_ASSESSED. NOT_CONNECTED means none selected; NEEDS_REVIEW means changed; INCOMPATIBLE means a known mismatch.
2. Inspect invocation and output interpretation, or run an authorized probe. Compatibility means the interface fits; command success is unnecessary.
3. Add an assessment to `checks` in the existing installation record or maintenance `update.yaml`:

```yaml
name: build-interface
adapter: build
connection: npm run build
method: REVIEW
observations: Inspected package.json and build script; exit status and output identify the outcome.
result: PASS
reason: The harness can interpret this interface.
```

Use the exact profile connection. For EXECUTION, also record:

```yaml
execution:
  command: npm run build
  exit_code: 0
  output: "<actual captured output; empty is allowed>"
```

4. Point the profile's `evidence` at that record. One record can assess multiple adapters; keep one current assessment per adapter. Extra evidence files are optional. Never cite the profile itself as proof.
5. Set COMPATIBLE only with a matching PASS assessment. Run the installation checker before handoff. Missing support stays NOT_ASSESSED.

REVIEW records inspection, not claimed execution. The checker validates structure and matching connections, not truthfulness. Later changes use [maintenance](../workflows/maintenance/harness-maintenance.md).
