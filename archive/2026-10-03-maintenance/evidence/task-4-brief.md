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

