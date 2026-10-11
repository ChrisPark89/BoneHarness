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

