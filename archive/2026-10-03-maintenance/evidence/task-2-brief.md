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

