# Installed Harness Maintenance Design

**Status:** Draft for review  
**Audience:** Maintainers of the builder kit and the installer LLM

**Revision notice, 2026-10-04:** The proposed [consolidated builder design](../../docs/specification.md) incorporates this design, the subsequent verification decisions, and fixes from the broader review. Its [acceptance scenarios](../../docs/acceptance-scenarios.md) define the next implementation's expected behavior. This older document is retained as design history; the consolidated specification becomes authoritative on approval.

## Purpose and boundary

The builder kit is used once to create a repo-specific harness. The generated harness must then support ongoing maintenance without referring back to the builder kit. A task agent in the target repository uses the installed maintenance guide when asked to correct harness facts, add or replace a stage adapter, or reconcile the harness after relevant repository changes.

The maintenance flow verifies that a skill or tool is integrated in a form the harness can consume. It does not certify that the tool selected the right operation, did high-quality work, or reported a truthful result. A run outcome means the configured adapter reported that outcome and supplied the required evidence fields.

## Goals

- Make a plain request such as “Add the `new-build-tool` skill as the build adapter” sufficient to start a scoped update.
- Preserve the installed harness as the only source of runtime instructions.
- Keep adapter implementations replaceable while making their outputs predictable to the workflow.
- Verify interface compatibility and update harness status only after a candidate is accepted and promoted.
- Keep installation structure status separate from integration readiness and individual run outcomes.
- Support incomplete or evolving repositories: unknown details stay pending rather than blocking installation or being guessed.

## Non-goals

- Evaluating the quality, correctness, or reliability of an adapter’s work.
- Mandatory duplicate tool runs solely to certify the tool's own reported result; runtime checks required by the task specification and verification plan remain in scope.
- Automatically discovering or installing arbitrary external tools.
- Running a daemon or requiring scheduled maintenance. A bounded, manually invoked drift review is sufficient.
- Replacing the ordinary development task state machine.

## Architecture

### Installation verification choice — confirmed 2026-10-04

The builder kit may provide a Python installation checker. It is optional and highly recommended, and must support Windows, macOS, and Linux. Python and any checker dependencies are prerequisites only for this optional path.

The installation acceptance criteria remain required. An installer can assess them using the checklist with evidence or equivalent approved tools. Record each criterion's result, evidence, verification method, and limitations, together with whether the optional checker ran. Skipping the checker alone does not block installation or lower integration readiness. Unresolved required criteria still prevent the corresponding completion claim; review cannot substitute for execution where a criterion explicitly requires a run.

This checker belongs to the installer package. Its checks concern harness structure and declared adapter compatibility. They do not certify the correctness or quality of tool work. Optional installation automation does not make runtime stage evidence optional; the runtime review model is described below.

### Runtime review model — confirmed 2026-10-04

Use an installed tool/skill's native validation phase when available. The coordinating LLM must also separately review the work and evidence against the stage-relevant task specification/design created before implementation. Preserve the tool's reported result and the LLM's criterion verdicts as separate evidence; a tool-level PASS alone does not establish task conformance.

Record the accepted specification/design versions, criterion IDs, and verification methods. The LLM's review examines the relevant implementation, artifacts, scope, target/revision identity, design constraints, and criterion coverage, with evidence references for its conclusions. Before SPEC_READY, review the request and installed stage criteria. At SPEC_VERIFIED, reconcile the complete required acceptance matrix. Updating the accepted specification/design requires re-evaluating affected evidence.

Advance only when applicable mandatory tool checks, the coordinating LLM's criterion review, and the remaining transition guards permit it. Preserve disagreements: a tool PASS with an unmet criterion cannot authorize that gate, while LLM approval cannot upgrade a required FAIL, BLOCKED, UNKNOWN, or missing tool result. Use the declared remediation or stop route. An absent optional native validation phase is recorded as absent, without fabricating a validation outcome or waiving mandatory evidence.

Use one state-writing authority per task. The LLM requests progression; a configured runtime gate/state tool validates and records it. If none is installed, the LLM records through the same documented state protocol and identifies that mode as not mechanically enforced. Work-performing skills supply evidence and do not separately mutate harness state. The record retains both assessments, the gate decision, and the recording authority.

Independent review means a separate assessment against previously accepted requirements and observable evidence. It does not require a second agent or an automatic duplicate build/test run. Runtime task conformance review is distinct from installation/maintenance compatibility checking, which continues to assess interface and policy fit rather than certify tool-work accuracy or reliability.

### Runtime organization

Add a small maintenance workflow to the generated runtime harness. It is separate from the development task state machine because harness updates have different gates and need not run a product build or test. Both workflows use the installed status report, adapter definitions, and evidence conventions.

The installer keeps the two runtime workflows in separate template bundles and stores the files both workflows use only once:

~~~text
templates/runtime/
  development/
    HARNESS.md
    workflow.yaml
    task-spec.md
  maintenance/
    harness-maintenance.md
    maintenance-workflow.yaml
    templates/harness-update-record.yaml
  shared/
    harness-status.md
    repo-profile.yaml
    skill-contract.md
~~~

The development bundle contains ordinary task instructions and state. The maintenance bundle contains harness update instructions and state. Shared files are canonical: maintenance updates them, while both workflows read them. The generated repository entry point points to `development/HARNESS.md`; that entry point routes harness-maintenance requests to `../maintenance/harness-maintenance.md`.

Runtime records are separated by purpose. Development task state and evidence are written under `development/runs/<task-id>/`. Harness update records are written under `maintenance/updates/<update-id>.yaml`. The `shared/` directory is not a place for either workflow’s run records; it contains only the one canonical copy of cross-workflow status, repo profile, and adapter interface definitions.

The installer maps these bundles into a target-side harness root, preserving the `development/`, `maintenance/`, and `shared/` separation. These are target-side runtime files. The installer prompt and installation checklist remain builder-only and are not copied into the target repository.

## Maintenance lifecycle

```text
REQUESTED
  ↓
INSPECTED
  ↓
PLANNED
  ↓
STAGED
  ├─ adapter change ─────→ ADAPTER_COMPATIBLE ─┐
  ├─ fact correction ────→ SOURCE_VERIFIED ─────┤
  └─ drift review ───────→ DRIFT_ASSESSED ──────┘
                                               ↓
PROMOTED
  ↓
STATUS_UPDATED
  ↓
COMPLETE
```

`ADAPTER_COMPATIBLE` means a staged adapter satisfies the harness-facing interface and repository policy for that capability. It does not mean the tool’s work has been independently validated. `SOURCE_VERIFIED` means a corrected repo fact has an authoritative source reference. `DRIFT_ASSESSED` means watched sources were checked and the result was recorded; a no-change review can proceed directly to `STATUS_UPDATED`.

Failure or escalation routes:

- Compatibility checks fail: `REJECTED`; keep the active binding unchanged.
- Evidence that can be gathered later is unavailable: `PENDING`; do not promote until it is supplied.
- A policy or authorization decision is needed: `HUMAN_REQUIRED`; do not promote until it is resolved.
- A change breaks the supported result format, changes a state transition, expands permissions, or cannot be checked safely: `HUMAN_REQUIRED` before promotion.
- Promotion fails: restore the recorded active binding and mark the attempt `FAILED`; retain both the attempted change and its evidence.

### Update steps

1. **Classify the request.** Supported types are adapter add/swap, repository fact correction, and repository drift reconciliation. Structural or workflow changes are treated as migrations and require explicit review.
2. **Inspect current state.** Read the installed status, profile, workflow, current adapter, and relevant source evidence. Capture the current binding and working-tree/revision identity.
3. **Plan the smallest change.** Identify the capability, candidate skill or authoritative source, files to change, compatibility criteria, permissions, and rollback reference.
4. **Stage without replacing the active binding.** Keep the current adapter usable while preparing its replacement or corrected configuration.
5. **Check compatibility.** Verify the candidate’s declared interface, status mapping, evidence fields, failure behavior, and permissions against the installed harness. Use a schema check or representative output only to check that the harness can parse and route the result. Do not evaluate whether the tool performed the underlying work correctly.
6. **Promote under policy.** By default, same-capability additions or replacements that pass `ADAPTER_COMPATIBLE`, preserve the supported interface, and do not expand permissions are promoted automatically. Interface, permission, or workflow changes require a human decision. A repository may require stricter approval, but it must not silently weaken this gate.
7. **Update status and record.** After promotion, update the active binding, corrected fact, or watched-source fields and their verification evidence in the profile/status. Append an update record with before/after values, change scope, result, and rollback reference. Do not update active configuration for a rejected candidate. A no-change drift review goes directly to `STATUS_UPDATED` with its audit record and no promotion.

## Adapter interface

Restrict the harness-facing interface, not how an adapter is implemented. An adapter can be a skill, script, CLI, CI service, MCP tool, or human-run procedure. If its native result differs, a small adapter or normalizer may translate it.

Every adapter must declare a supported result format and produce a parseable result with the fields required by that capability. The common result envelope is:

```yaml
interface_version: 1
capability: build
adapter: new-build-tool
run_id: "<run identifier>"
task_id: "<task identifier>"
revision: "<repository revision or diff identity>"
status: PASS # PASS | FAIL | BLOCKED | UNKNOWN
evidence:
  reference: "<log, report, or artifact location>"
  summary: "<factual summary>"
```

Capability-specific fields are declared by the installed workflow. For example, a later test stage may require the `artifact_id` produced by a build adapter. Optional fields such as diagnostics and limitations are allowed. Unknown or missing required values must not be fabricated; a malformed or absent result is `UNKNOWN` and cannot advance the stage.

The compatibility check verifies that:

- the capability and adapter identity are explicit;
- the interface version is supported or has a documented migration;
- all capability-required result fields are present and parseable;
- statuses map explicitly to existing workflow outcomes;
- the adapter explains what evidence reference it supplies and what side effects or permissions it needs;
- missing results, failures, timeouts, and unknown outcomes have safe routes.

The check does not inspect whether a build is genuinely successful, whether tests are adequate, whether the skill chose the correct command, or whether its conclusion is truthful. Runtime state should be described as an adapter-reported outcome tied to the supplied revision and evidence reference.

## Status model

Keep three facts separate:

1. **Structure status:** `INCOMPLETE` or `STRUCTURE_COMPLETE`; indicates the generated harness artifacts and rules are present and internally consistent.
2. **Integration readiness:** `NOT_ASSESSED`, `PARTIAL`, `READY`, or `BLOCKED`; indicates required capability bindings are present, interface-compatible, and have safe gate behavior. `READY` does not claim adapter quality or reliability.
3. **Per-run outcome:** `PASS`, `FAIL`, `BLOCKED`, or `UNKNOWN`, as reported by the configured adapter and accepted or rejected by the harness’s structural result checks.

The capability table should identify the active adapter and interface version, integration state, last compatibility-check evidence, and any relevant repository sources to watch. A drift finding marks only affected capabilities `NEEDS_REVIEW`; integration readiness becomes `PARTIAL` until reconciled. A failed candidate update leaves the prior active adapter and its status in place, while the update record shows the failed attempt.

Rename or clarify existing “operational readiness” descriptions as “integration readiness” where they could imply that the builder or updater validated tool quality.

## Update record

Each attempt records at least:

- update ID, timestamp, request type, and summary;
- base revision and affected capability or fact;
- evidence inspected and candidate source (including skill path/version when applicable);
- previous and proposed active bindings;
- compatibility criteria and their results;
- permissions/side effects reviewed;
- promotion outcome, resulting status, and rollback reference.

The log is append-only in normal operation. Corrections should add a new record that supersedes an earlier assertion rather than erasing the history.

Store update records in `maintenance/updates/`, separate from task evidence under `development/runs/`. Keep both workflows’ pointers to the same canonical status and profile in `shared/`; do not create parallel status/profile copies per workflow.

## Repository drift review

The installer records authoritative files or settings that support important harness facts, such as build scripts, test configuration, CI workflows, or repository instructions. A drift review compares only those watched sources and reports changed or missing evidence. It may propose a harness update, but it must not silently change capability bindings or turn an unknown fact into a verified one.

This is intentionally a bounded manual workflow; no scheduled job is required. The approach is consistent with OpenAI’s description of recurring documentation checks and doc-gardening, and Anthropic’s emphasis on stable component interfaces as agent assumptions evolve ([OpenAI Harness Engineering](https://openai.com/index/harness-engineering/); [Anthropic Managed Agents](https://www.anthropic.com/engineering/managed-agents?lid=8orHBY9s2fwFg2gZ)).

## Example: add a build skill

Given the request “Add the `new-build-tool` skill as the build adapter,” the installed harness:

1. Reads the current build binding and the named skill; it does not consult the builder kit.
2. Checks that the skill declares the build capability, gives a parseable status and evidence reference, handles non-pass/unknown outcomes, and declares permissions and side effects.
3. If the skill’s native output differs, stages a normalizer that maps it to the installed result format.
4. Validates a sample or safe invocation only for the output shape, required identity/evidence fields, and status mapping. It does not judge whether the build itself was correct.
5. Promotes the adapter if the interface and policy checks pass, updates the active build binding and integration status, and appends the update record. Otherwise, it leaves the old binding active and records why the candidate was rejected or needs a decision.

## Acceptance criteria for the implementation plan

- The builder kit tells the installer to generate a self-contained runtime maintenance flow even when some repository tools are unknown.
- The installer checklist checks for both runtime bundles and their shared files, and verifies that the runtime entry point references only target-side files.
- The development entry point routes maintenance requests to the installed maintenance guide without making the builder kit a runtime dependency.
- Development task records are stored under `development/runs/`; harness update records are stored under `maintenance/updates/`; `shared/` contains no per-run records or duplicated workflow state.
- A candidate adapter can be staged and rejected without replacing the active adapter.
- Compatibility checks are limited to the declared harness interface, required evidence fields, status mapping, failure behavior, and policy/permissions.
- No installation or adapter compatibility status is presented as proof of tool quality or correctness.
- The profile/status distinguishes structure completeness, integration readiness, and per-run tool-reported outcomes.
- Every promotion has an update record and a previous-binding rollback reference.
- Drift review is optional, bounded, evidence-based, and does not auto-promote changes.
