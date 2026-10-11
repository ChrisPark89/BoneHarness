# Installed Stage Skill / Adapter Contract

This file describes the contract used by skills in the installed harness. The workflow refers to capability names, not specific vendor products. Keep this contract stable when replacing an implementation.

## Identity

- Capability:
- Adapter name and version:
- Owner:
- Implementation type: script / CLI / CI service / MCP tool / LLM procedure / human-run step
- Applicable task types:
- Configuration status: CONFIGURED / PENDING_DISCOVERY / UNAVAILABLE / NOT_APPLICABLE

## Inputs and prerequisites

List exact input fields, required artifacts, revision identity, credentials/access requirements, and preconditions. State what happens when a required input is absent.

## Output contract

Return a structured result that can be stored with task evidence. Every adapter result uses this versioned common envelope. Capability-specific fields are allowed in addition to these fields.

~~~yaml
interface_version: 1
capability: "<capability name>"
adapter: "<adapter name and version>"
run_id: "<adapter invocation or external run ID>"
task_id: "<task record ID>"
revision: "<revision or diff identity>"
status: PASS # PASS | FAIL | BLOCKED | UNKNOWN
evidence:
  reference: "<durable output reference>"
  summary: "<short factual summary>"
~~~

`PASS` is adapter-reported. Do not fabricate fields. Use `UNKNOWN` when the tool does not expose a value. A missing, malformed, or unreadable result is recorded as `UNKNOWN` and is never `PASS`.

## Side effects and permissions

- Files or services read:
- Files or services written:
- External actions:
- Required permissions:
- Secret handling:
- Output redaction:

## Failure behavior

Define how the adapter reports non-zero exit or service failure, timeout, cancellation, partial output, warnings, retryability, stale/mismatched revision or artifact, and unavailable credentials/access.

A retry must be authorized by the installed workflow and bounded by its attempt limit.

## Evidence validation

Specify a separate validator or review procedure. It must check the common required fields, allowed status values, identity/revision match, and durable readable evidence reference. Compatibility checks validate the structural interface, routing, and declared policy/permission fit only; they do not prove the truth of an adapter report or the accuracy or quality of adapter or tool work.

An LLM may interpret diagnostics but cannot upgrade a failed build/test result to pass.

## Swap acceptance

When replacing this adapter, confirm that the new implementation accepts the same inputs, returns the same output contract, and is accepted by the existing transition validator. No transition should depend on the old vendor-specific adapter name.
