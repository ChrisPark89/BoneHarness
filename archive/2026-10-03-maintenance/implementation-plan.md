# Installed Harness Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the builder kit so its installer creates a self-contained, verifiable maintenance flow in the target repository’s installed harness.

**Architecture:** Add a dedicated runtime maintenance workflow for adapter changes, fact corrections, and drift reviews. Define a small adapter result interface, but leave tool implementation and work quality outside the compatibility check. Update the existing runtime templates and installer guidance so structure completeness, integration readiness, and per-run reported outcomes stay distinct.

**Tech Stack:** Markdown documentation and YAML templates; no application code or dependencies.

**Spec:** [2026-10-03-harness-maintenance-design.md](design.md)

**Revision notice, 2026-10-04:** This task list records the earlier partial implementation and does not cover the full current requirements. The next execution plan must be based on the approved revision of the [consolidated design](../../docs/specification.md) and [acceptance scenarios](../../docs/acceptance-scenarios.md). Reuse completed candidate work, but do not resume this old list as if its completion would satisfy the newer specification. Progress is tracked in the [revision ledger](../../docs/implementation-status.md).

**Installation verification clarification, 2026-10-04:** A Python installation checker is optional and highly recommended, with Windows/macOS/Linux support required when provided. The installation checklist remains usable with evidence-backed review or equivalent approved tools; record verification methods and unresolved criteria. Python is not a dependency of the builder kit as a whole. Implementing that checker belongs in the revised plan described by the [design review](../../docs/reviews/2026-10-04-design-review.md); it is not added to this existing documentation-only task list.

**Runtime verification clarification, 2026-10-04:** Use a tool/skill's native validation when available and require a separate coordinating-LLM review of work/evidence against the stage-relevant accepted task specification/design. The revised plan must carry separate tool outcomes, criterion verdicts, and transition decisions; disagreement handling; specification/design version references; and one state-writing authority per task. A configured gate/state tool records validated transition requests; otherwise the LLM follows the documented state protocol with its enforcement mode explicit. This decision is recorded in the specification and design review; the earlier task implementation has not yet been updated to satisfy it.

## Global Constraints

- The builder kit is used only during one-time installation; target-side maintenance uses generated runtime files only.
- Keep runtime templates in separate `development/` and `maintenance/` bundles; place canonical files used by both under `shared/` rather than duplicating them.
- Preserve the existing development task state machine and its optional build/test repair loops.
- `ADAPTER_COMPATIBLE` checks the harness-facing interface and policy, not the quality or correctness of tool work.
- `READY` integration status does not claim adapter quality or reliability.
- Runtime tool validation and the coordinating LLM's specification/design review provide separate evidence. Tool PASS does not waive unmet criteria; LLM approval does not override a required failed or missing tool check.
- A malformed or absent required adapter result is `UNKNOWN` and cannot advance a stage as `PASS`.
- Same-capability adapter changes that preserve the interface and do not expand permissions may auto-promote after compatibility passes; interface, permission, or workflow changes require a human decision.
- Keep unknown repository information explicit and pending; do not guess commands, tool behavior, or policy.
- The workspace has no Git metadata, so the plan contains no commit steps.

## Review Focus

- **The two runtime workflows or their runtime records could be mixed, or shared configuration duplicated.** Ensure development task evidence and maintenance update records have separate locations, while profile/status/interface files remain canonical. Check in Tasks 1 and 2.
- **A failed candidate could replace a working adapter.** Ensure staging preserves the active binding until promotion and rejection retains it. Check in Task 2.
- **Fact correction and drift review could be forced through an adapter-only gate.** Ensure the maintenance flow provides source-verification and drift-assessment routes. Check in Task 2.
- **Adapter compatibility could be mistaken for tool-quality verification, or malformed output treated as success.** Ensure runtime status language limits the claim and malformed/absent results route safely. Check in Task 3.
- **Installer guidance could copy builder-only instructions into the target harness or block on unknown repo details.** Ensure both runtime bundles and shared files remain self-contained and pending details do not prevent scaffold generation. Check in Task 4.

---

## File Structure

- `agent_harness_builder_kit/templates/runtime/development/HARNESS.md`: ordinary task entry point; routes harness-maintenance requests to the maintenance bundle.
- `agent_harness_builder_kit/templates/runtime/development/workflow.yaml`: ordinary task transitions consuming explicit adapter-reported outcomes.
- `agent_harness_builder_kit/templates/runtime/development/task-spec.md`: per-run adapter identity, reported status, and evidence references.
- `agent_harness_builder_kit/templates/runtime/maintenance/harness-maintenance.md`: target-side instructions for classifying and performing maintenance requests.
- `agent_harness_builder_kit/templates/runtime/maintenance/maintenance-workflow.yaml`: target-side maintenance states, gates, promotion policy, and failure routes.
- `agent_harness_builder_kit/templates/runtime/maintenance/templates/harness-update-record.yaml`: target-side record template for each update attempt, materialized under the installed harness’s `maintenance/templates/` directory.
- `agent_harness_builder_kit/templates/runtime/shared/skill-contract.md`: canonical adapter result envelope and compatibility boundary used by both workflows.
- `agent_harness_builder_kit/templates/runtime/shared/repo-profile.yaml`: active adapter, interface version, compatibility status, and watched-source metadata.
- `agent_harness_builder_kit/templates/runtime/shared/harness-status.md`: structure status, integration readiness, and per-capability update/evidence summary.
- Installed development run records: `<harness-root>/development/runs/<task-id>/`.
- Installed maintenance update records: `<harness-root>/maintenance/updates/<update-id>.yaml`.
- `agent_harness_builder_kit/INSTALLER_SPEC.md`: installer responsibilities, generated files, and separate status definitions.
- `agent_harness_builder_kit/installer/bootstrap-prompt.md`: one-time installation prompt for generating the maintenance skeleton, including when repo details are pending.
- `agent_harness_builder_kit/installer/installation-checklist.md`: installer-only acceptance checks for maintenance files and integration status.
- `agent_harness_builder_kit/README.md`: builder/runtime boundary and updated install-to-use flow.

## Implementation Tasks

### Task 1: Separate development, maintenance, and shared runtime templates

**Files:**
- Move: `agent_harness_builder_kit/templates/runtime/HARNESS.md` → `agent_harness_builder_kit/templates/runtime/development/HARNESS.md`
- Move: `agent_harness_builder_kit/templates/runtime/workflow.yaml` → `agent_harness_builder_kit/templates/runtime/development/workflow.yaml`
- Move: `agent_harness_builder_kit/templates/runtime/task-spec.md` → `agent_harness_builder_kit/templates/runtime/development/task-spec.md`
- Move: `agent_harness_builder_kit/templates/runtime/skill-contract.md` → `agent_harness_builder_kit/templates/runtime/shared/skill-contract.md`
- Move: `agent_harness_builder_kit/templates/runtime/repo-profile.yaml` → `agent_harness_builder_kit/templates/runtime/shared/repo-profile.yaml`
- Move: `agent_harness_builder_kit/templates/runtime/harness-status.md` → `agent_harness_builder_kit/templates/runtime/shared/harness-status.md`

**Interfaces:**
- Consumes: current flat runtime template directory.
- Produces: `development/` for normal task instructions/workflow and task evidence, `maintenance/` for harness update instructions and update records, and `shared/` for only the canonical profile/status/adapter-interface definitions used by both.

- [ ] **Step 1: Move normal development templates** into `development/`: `HARNESS.md`, `workflow.yaml`, and `task-spec.md`.
- [ ] **Step 2: Move canonical shared templates** into `shared/`: `skill-contract.md`, `repo-profile.yaml`, and `harness-status.md`.
- [ ] **Step 3: Update paths and links** in moved Markdown/YAML comments to use the new relative locations; do not duplicate a moved template at its old path.
- [ ] **Step 4: Check the split.** Confirm each existing runtime template exists once, normal task files/evidence are in `development/`, maintenance instructions/update records are in `maintenance/`, shared contains only canonical cross-workflow definitions, and no maintenance-only instructions have been added to the development state machine.

### Task 2: Add the target-side maintenance workflow

**Files:**
- Create: `agent_harness_builder_kit/templates/runtime/maintenance/harness-maintenance.md`
- Create: `agent_harness_builder_kit/templates/runtime/maintenance/maintenance-workflow.yaml`
- Create: `agent_harness_builder_kit/templates/runtime/maintenance/templates/harness-update-record.yaml`
- Modify: `agent_harness_builder_kit/templates/runtime/development/HARNESS.md`

**Interfaces:**
- Consumes: `development/HARNESS.md` and canonical files under `shared/`.
- Produces: maintenance states `REQUESTED`, `INSPECTED`, `PLANNED`, `STAGED`, `ADAPTER_COMPATIBLE`, `SOURCE_VERIFIED`, `DRIFT_ASSESSED`, `PROMOTED`, `STATUS_UPDATED`, `COMPLETE`, with `REJECTED`, `PENDING`, `HUMAN_REQUIRED`, and `FAILED` routes.
- Produces: one update record per attempt under installed `maintenance/updates/<update-id>.yaml`, with request type, base revision, affected capability/fact, inspected evidence, candidate source, before/after binding, applicable compatibility or source/drift checks, permissions/side effects, promotion result, and rollback reference.

- [ ] **Step 1: Define maintenance workflow transitions** in `maintenance/maintenance-workflow.yaml`. Include adapter, fact-correction, drift-review, no-change, failure, and human-review routes. Keep the ordinary development state machine out of this file.
- [ ] **Step 2: Write maintenance instructions** in `maintenance/harness-maintenance.md`. Cover request classification, read-only inspection, smallest-scope planning, candidate staging, type-specific checks, promotion, status update, record keeping, and rollback; reference canonical profile/status/interface files under `../shared/`.
- [ ] **Step 3: Define the update record template** in `maintenance/templates/harness-update-record.yaml`. Use the fields listed in the Interfaces block and require explicit values or explicit `UNKNOWN`/`PENDING` markers rather than blank claims. Direct the installed maintenance guide to create each attempt record under `maintenance/updates/`, separate from task evidence under `development/runs/`.
- [ ] **Step 4: Route harness changes** in `development/HARNESS.md` to `../maintenance/harness-maintenance.md` and `../maintenance/maintenance-workflow.yaml`; normal development tasks continue to use `workflow.yaml`.
- [ ] **Step 5: Check lifecycle consistency.** Confirm the YAML and guide use the same state names and routes; failed candidates leave the previous active binding unchanged; a no-change drift review can close without promotion.
- [ ] **Step 6: Check verification scope.** Confirm `ADAPTER_COMPATIBLE` only checks declared interface, required fields, status mapping, evidence reference, failure behavior, and permissions—not whether the tool’s build/test work is correct.

### Task 3: Wire compatibility and status into runtime templates

**Files:**
- Modify: `agent_harness_builder_kit/templates/runtime/development/workflow.yaml`
- Modify: `agent_harness_builder_kit/templates/runtime/development/task-spec.md`
- Modify: `agent_harness_builder_kit/templates/runtime/shared/skill-contract.md`
- Modify: `agent_harness_builder_kit/templates/runtime/shared/repo-profile.yaml`
- Modify: `agent_harness_builder_kit/templates/runtime/shared/harness-status.md`

**Interfaces:**
- Consumes: Task 1’s relocated templates and Task 2’s maintenance guide, workflow, and record template; both workflows reference canonical state and interface files under `shared/`.
- Produces: a versioned common adapter result envelope with `interface_version`, `capability`, `adapter`, `run_id`, `task_id`, `revision`, `status`, and `evidence.reference`/`evidence.summary`; optional capability-specific fields remain allowed.
- Produces: separate structure status, integration readiness, and per-run adapter-reported outcome.

- [ ] **Step 1: Update the adapter result schema** in `shared/skill-contract.md` with the exact common fields above and `PASS | FAIL | BLOCKED | UNKNOWN`. State that `PASS` is adapter-reported and that compatibility checks validate structure/routing, not truth or work quality.
- [ ] **Step 2: Update ordinary workflow gates** in `development/workflow.yaml` so build/test transitions require a configured adapter and a parseable, revision-bound adapter result. Missing or malformed output is recorded as result status `UNKNOWN` and routes the task to `BLOCKED`; do not add `UNKNOWN` as a task state or label an adapter report as independently certified.
- [ ] **Step 3: Add adapter lifecycle fields** in `shared/repo-profile.yaml`: active adapter identity, interface version, compatibility state, last compatibility evidence, and watched repository sources for facts that can drift.
- [ ] **Step 4: Clarify installed status** in `shared/harness-status.md`. Keep `INCOMPLETE | STRUCTURE_COMPLETE`; rename the readiness label to `integration readiness` with existing values; add per-capability active adapter/version and compatibility evidence. Define `READY` as interface/policy readiness only.
- [ ] **Step 5: Record per-run adapter evidence** in `development/task-spec.md`, including adapter identity/version, reported outcome, revision or diff identity, and evidence reference.
- [ ] **Step 6: Check runtime terminology and gates.** Confirm no runtime file implies that compatibility status proves tool correctness, and that an invalid/missing result cannot advance build or test as passed.

### Task 4: Update installer guidance and acceptance checks

**Files:**
- Modify: `agent_harness_builder_kit/INSTALLER_SPEC.md`
- Modify: `agent_harness_builder_kit/installer/bootstrap-prompt.md`
- Modify: `agent_harness_builder_kit/installer/installation-checklist.md`
- Modify: `agent_harness_builder_kit/README.md`

**Interfaces:**
- Consumes: target-side artifacts and status vocabulary from Tasks 1–3.
- Produces: installer instructions that generate separate `development/` and `maintenance/` bundles plus canonical `shared/` files, even if adapters or authoritative repo sources are pending; the installer-only checklist distinguishes structure completeness from integration readiness.

- [ ] **Step 1: Extend generated-artifact requirements** in `INSTALLER_SPEC.md` to include the separate development and maintenance bundles, canonical shared files, separate `development/runs/` and `maintenance/updates/` record paths, runtime routing, adapter interface fields, and update-status fields.
- [ ] **Step 2: Extend the bootstrap procedure** so the installer creates all maintenance artifacts even when tool details are unknown; record unknown bindings/sources as pending and ensure no runtime reference points back to the builder package.
- [ ] **Step 3: Extend the installer checklist** with criteria for both bundles and shared files, separate task/update record paths, state consistency, update record fields, adapter compatibility scope, safe rejection/rollback, and separate structure/integration statuses.
- [ ] **Step 4: Update the README install/use scenario** to explain how a target-side request such as adding `new-build-tool` is handled after installation and how failed compatibility leaves the active adapter in place.
- [ ] **Step 5: Review the documentation set together.** Search for stale “operational readiness” claims and clarify them as “integration readiness” where they imply tool quality. Confirm builder-only instructions stay outside the runtime templates.
- [ ] **Step 6: Run documentation consistency checks.** Confirm state names, result fields, and status values match across templates and installer files; confirm internal links resolve and target runtime files contain no builder-package references. Use an available YAML parser only if one is already present; do not add a dependency solely for these documents.

## Plan Self-Review

- **Spec coverage:** Runtime bundle and record separation, update lifecycle, adapter compatibility boundary, common output format, separate status dimensions, update history/rollback, drift review, easy add-build-skill scenario, installer generation, and incomplete-repo handling are mapped to Tasks 1–4.
- **Step scan:** Each task has file-scoped authoring actions followed by concrete consistency checks; no product-code signatures or dependencies are introduced.
- **Type/state consistency:** Adapter result values, maintenance states, readiness values, and evidence keys are named in Task 1 or Task 2 and are reused verbatim by Task 3.
- **Review Focus:** All five failure modes are assigned to checks in their owning task above.
- **Proportion:** The plan is limited to the two runtime bundles, shared templates, and installer guidance required by the revised spec; it does not introduce an update service, scheduler, or tool-quality evaluation.
