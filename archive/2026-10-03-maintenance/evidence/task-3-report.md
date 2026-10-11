# Task 3 Report: Compatibility and Status Runtime Wiring

## Completed changes

- Updated `shared/skill-contract.md` with the versioned common adapter-result envelope: `interface_version`, `capability`, `adapter`, `run_id`, `task_id`, `revision`, `status`, and `evidence.reference` / `evidence.summary`. It permits capability-specific extension fields and defines only `PASS`, `FAIL`, `BLOCKED`, and `UNKNOWN` as common result statuses.
- Defined `PASS` as adapter-reported. The contract states that compatibility checks validate result structure and routing, and do not establish report truth or adapter/tool-work accuracy or quality.
- Updated development build and test transitions to require configured adapter identities and parseable, revision-bound adapter results before passed or failed outcomes. An absent or malformed result is recorded as `UNKNOWN` and routes from `BUILDING` or `TESTING` to `BLOCKED`.
- Added per-capability active adapter identity, interface version, compatibility state, and last compatibility evidence to `shared/repo-profile.yaml`, plus watched repository sources for drift-prone facts.
- Renamed the installed readiness label to `Integration readiness`, retaining `NOT_ASSESSED | PARTIAL | READY | BLOCKED`; added per-capability adapter/version and compatibility-evidence columns; and constrained `READY` to interface and policy integration readiness.
- Added a per-run adapter-evidence table to the development task record with adapter identity/version, run ID, adapter-reported outcome, revision or diff identity, and evidence reference.

## Focused verification

- Parsed `development/workflow.yaml` and `shared/repo-profile.yaml` successfully with Ruby `YAML.load_file`.
- Ran `git diff --check` with no whitespace errors.
- Searched all runtime templates for the required interface fields, adapter-result gates, `UNKNOWN` / `BLOCKED` route, lifecycle fields, readiness wording, and compatibility-boundary wording. The search found the required additions and no `Operational readiness` or old `real_build_result` / `real_test_result` gate names.

## Self-review

- The common result envelope contains every required field and allows extension fields without changing the cross-workflow contract.
- A missing or malformed build/test result cannot satisfy either passed transition because each requires a parseable revision-bound adapter result; it has an explicit `UNKNOWN` to `BLOCKED` route.
- Compatibility remains limited to interface and routing checks across the shared contract, maintenance workflow, task record, and installed status report.
- No software tests were run, as directed for this documentation and schema task.

## Concerns

None.

## Fix round 1

- Changed the `BUILDING` to `BUILD_FAILED` and `TESTING` to `TEST_FAILED` gates to accept only adapter-reported `FAIL`.
- Added an explicit `adapter_reported_blocked` route from both `BUILDING` and `TESTING` to the `BLOCKED` stop state. The route requires a parseable, revision-bound adapter result with status `BLOCKED`; missing, malformed, and `UNKNOWN` results continue to use the existing blocked route.
- Defined compatibility as checking the structural interface, routing, and declared policy/permission fit, while retaining the explicit exclusion of result truth and adapter/tool-work correctness or quality.
- Replaced the remaining `operational readiness` wording with `integration readiness`.

### Fix round 1 verification

- Parsed `development/workflow.yaml` successfully with Ruby `YAML.load_file`.
- Searched runtime templates to confirm `BLOCKED` has a dedicated safe route, failed build/test gates require reported `FAIL`, compatibility includes policy/permission fit, and `operational readiness` is absent.
- Ran `git diff --check` with no whitespace errors.
