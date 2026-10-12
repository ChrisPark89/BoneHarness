# Adapter assessment example

The [connected profile](connected-profile.yaml) starts ACTION_NEEDED. To establish compatibility, follow the installed [adapter guide](../harness/framework/workflows/shared/adapter-interface.md).

Append this **example shape**, filled with actual findings, to the existing installation record's `checks`:

```yaml
name: test-interface
adapter: test
connection: python3 -m unittest discover -s tests
method: REVIEW
observations: Inspected test invocation; the runner exposes exit status and text output.
result: PASS
reason: Outcome and diagnostics can be interpreted.
```

Then the profile's test entry can reference:

```yaml
status: OK
evidence:
  - artifacts/installation/installation-record.yaml
```

The checker requires the adapter and connection to match. Definitions or the profile itself are not assessment records.

For an actual probe, use `method: EXECUTION` and include `execution.command`, `execution.exit_code` and `execution.output`. Capture native output; do not invent it. A nonzero exit can still demonstrate a compatible interface. Never claim execution in a REVIEW assessment.

One installation record can hold all adapter assessments. Maintenance uses its existing update record. No new record files or native tool-result format are required.

These examples are instructions, not evidence that checks occurred.
