# Installed Harness Maintenance Guide

Use this target-side guide for a request to add or replace a stage adapter, correct a repository fact used by the harness, or reconcile the harness after relevant repository changes. For normal software work, use `../development/HARNESS.md` and `../development/workflow.yaml`.

## Start an update

1. Read `../shared/harness-status.md`, `../shared/repo-profile.yaml`, and `../shared/skill-contract.md`. These are the canonical cross-workflow files; do not create parallel status, profile, or adapter-contract copies.
2. Read `maintenance-workflow.yaml`, the active binding or fact, `../development/workflow.yaml` where a status mapping is relevant, and the requested candidate or authoritative source.
3. Create one append-only attempt record from `templates/harness-update-record.yaml` at `maintenance/updates/<update-id>.yaml`. Do this before leaving `REQUESTED`; do not store update records in `../development/runs/`.
4. Classify the request as `adapter_add_or_swap`, `repository_fact_correction`, or `repository_drift_review`. Structural or workflow changes are migrations and require `HUMAN_REQUIRED` review.

Follow the lifecycle `REQUESTED` → `INSPECTED` → `PLANNED` → `STAGED`. From `STAGED`, an adapter change reaches `ADAPTER_COMPATIBLE`, a fact correction reaches `SOURCE_VERIFIED`, and a drift review reaches `DRIFT_ASSESSED`. Accepted changes reach `PROMOTED` → `STATUS_UPDATED` → `COMPLETE`; a no-change drift review goes directly from `DRIFT_ASSESSED` to `STATUS_UPDATED`.

## Inspect and plan

Inspect read-only before proposing a change. Capture the base revision and working-tree identity, affected capability or fact, current active binding, relevant canonical status/profile fields, applicable development-workflow status mapping, source evidence, and declared permissions or side effects.

Plan the smallest change that resolves the request. Record the candidate source, files in scope, before and proposed bindings or fact values, applicable checks, permissions and side effects, promotion conditions, and the reference that restores the active binding or prior fact. Stage the candidate without replacing the active binding.

If required evidence can be gathered later, record `PENDING` with the missing evidence and resolution needed. Unknown commands, tool or adapter behavior, and unresolved policy facts remain `PENDING` and must not be guessed. If a policy or authorization decision is needed, record `HUMAN_REQUIRED`.

## Check the staged update

For an adapter add or swap, reach `ADAPTER_COMPATIBLE` only after checking the declared capability and adapter identity, supported interface version or documented migration, capability-required result fields, explicit status mapping, evidence reference, failure and unknown-result behavior, and permissions or side effects. A representative result or schema check may show that the harness can parse and route the result.

`ADAPTER_COMPATIBLE` does not establish that the adapter selected the right operation, that its build or test work was correct, or that its reported result is truthful. Do not independently rerun a tool to judge its underlying work.

Record an absent or malformed adapter result as `UNKNOWN` and route it to `PENDING` with the evidence needed to resolve it. It cannot advance to `ADAPTER_COMPATIBLE`: that state requires a present, well-formed result whose required fields are present and valid.

For a fact correction, reach `SOURCE_VERIFIED` only with an authoritative source reference for the corrected value. For a drift review, reach `DRIFT_ASSESSED` after comparing the configured watched sources and recording changed, missing, or unchanged evidence. A drift review must not silently change a capability binding or turn an unknown fact into a verified fact.

If an adapter fails compatibility, record `REJECTED` and retain the previous active binding unchanged. An absent or malformed result is `UNKNOWN` and routes to `PENDING`; an unsupported status, unsafe failure route, permission expansion, or workflow transition change routes to `PENDING` or `HUMAN_REQUIRED` as applicable.

## Promote and close

Automatically promote an adapter add or same-capability replacement only when it passes the compatibility checks, has same-capability scope, preserves the supported interface, and does not expand permissions. Interface, permission, structural, or workflow changes route to `HUMAN_REQUIRED` and may return to planning only after recorded human approval. Promote a verified fact correction under the same policy.

After promotion, update only the applicable canonical fields in `../shared/harness-status.md` or `../shared/repo-profile.yaml`, including active binding, corrected fact, watched-source result, integration readiness, and verification evidence. Then record `STATUS_UPDATED` and `COMPLETE` in the update record.

`READY` reports interface and policy integration readiness only: required capability bindings are present, interface-compatible, and have safe gate behavior. It does not claim adapter quality, correctness, or reliability.

A no-change drift review goes from `DRIFT_ASSESSED` directly to `STATUS_UPDATED`, with its audit record and no promotion. If promotion fails, restore the recorded prior active binding, mark the attempt `FAILED`, and retain the candidate, evidence, and rollback reference. Do not change active configuration for a rejected or failed candidate.

## Record and rollback rules

Every attempt record must state its request type, base revision, affected capability or fact, inspected evidence, candidate source, before and after binding, applicable compatibility, source, or drift checks, permissions and side effects, promotion result, resulting status, and rollback reference. Use explicit values or `UNKNOWN` or `PENDING`; never leave a claim blank.

Keep records append-only. A correction creates a new record that supersedes an earlier assertion rather than erasing history. Keep task evidence under `../development/runs/<task-id>/` and harness update records under `maintenance/updates/<update-id>.yaml`.
