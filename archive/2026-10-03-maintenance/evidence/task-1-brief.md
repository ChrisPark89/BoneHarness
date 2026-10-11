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

