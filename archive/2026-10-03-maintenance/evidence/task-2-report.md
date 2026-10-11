# Task 2 implementation report

## Implemented

- Added the target-side maintenance state machine with adapter, fact-correction, drift-review, no-change, rejected, pending, human-review, and promotion-failure routes.
- Added the installed maintenance guide with read-only inspection, smallest-scope staging, structural adapter compatibility checks, canonical shared-file updates, record keeping, and rollback rules.
- Added the append-only update-record template for `maintenance/updates/<update-id>.yaml`, using explicit `PENDING` values rather than blank claims.
- Routed harness-maintenance requests from `development/HARNESS.md` to the installed maintenance guide and workflow while retaining `workflow.yaml` for normal development tasks.

## Verification

No software tests were run, per task instructions.

- Parsed both maintenance YAML files with Ruby's YAML parser.
- Confirmed the workflow contains exactly the required maintenance lifecycle states; all transition endpoints are declared; the rejected-adapter route, failed-promotion route, no-change drift closeout, and active-binding rollback invariant are present.
- Confirmed the guide names the lifecycle states, canonical shared-file references, update-record path, development evidence path, limited adapter-verification boundary, and development-entry routing.
- Ran `git diff --check` before commit with no output.

## Files changed

- `agent_harness_builder_kit/templates/runtime/maintenance/maintenance-workflow.yaml`
- `agent_harness_builder_kit/templates/runtime/maintenance/harness-maintenance.md`
- `agent_harness_builder_kit/templates/runtime/maintenance/templates/harness-update-record.yaml`
- `agent_harness_builder_kit/templates/runtime/development/HARNESS.md`

## Self-review

The workflow keeps the ordinary development state machine out of the maintenance bundle. Rejected candidates preserve the current active binding, failed promotions require restoration of the recorded binding, and no-change drift reviews close through `STATUS_UPDATED` without promotion.

## Commit

`dd36192 Add runtime harness maintenance workflow`

## Concerns

None. The scratch-repo pre-commit hook warned that it could not write its external cache log, but the hook completed and Git created the commit successfully.

## Fix round 1

### Changes

- Added an explicit `STAGED` → `PENDING` route for absent or malformed adapter results. It records the adapter result as `UNKNOWN`, and `ADAPTER_COMPATIBLE` now requires a present, well-formed result with all required fields present and valid.
- Made automatic adapter promotion conditional on same-capability scope, a preserved supported interface, and no permission expansion. Interface, permission, and workflow changes route to `HUMAN_REQUIRED` and require recorded human approval before returning to planning.
- Defined `READY` as interface and policy integration readiness only, without any claim about adapter quality, correctness, or reliability.
- Stated that unknown commands, tool or adapter behavior, and unresolved policy facts remain `PENDING` and must not be guessed.
- Added update-record fields for adapter-result status and format.

### Verification

No software tests were run, per task instructions.

- Parsed the changed YAML files and checked the `UNKNOWN` route, `M-04` result-validity guard, `M-08` automatic-promotion guard, mandatory human-approval resumption, and new update-record fields.
- Checked guide wording for the `UNKNOWN`, promotion, `READY`, no-guess, and record-path requirements.
- Ran `git diff --check` with no output before commit.

### Commit

`ae7b75a Tighten maintenance workflow gates`

### Concerns

None. The scratch-repo pre-commit hook repeated its external cache-log warning, but Git created the commit successfully.
