# Task Specification and Evidence Matrix

Use this file as the starting record for one task. The task agent reads the installed harness entry point and profile before filling it in.

## Request

- Task ID:
- Request:
- User/problem:
- Why it matters:
- Scope:
- Non-goals:
- Constraints:
- Base revision:
- Task type:
- Verification profile:

## Repository evidence

| ID | Claim or observation | Classification (FACT / INFERENCE / PATTERN / UNKNOWN) | Evidence reference | Impact |
|---|---|---|---|---|
| R-01 |  |  |  |  |

## Acceptance criteria

Write observable behavior. Give each criterion a verification method before implementation.

| ID | Criterion | Priority | Applies? | Planned verifier | Implementation reference | Evidence reference | Status |
|---|---|---|---|---|---|---|---|
| AC-01 |  | Required | Yes |  |  |  | PENDING |

Allowed status: PENDING, PASS, FAIL, BLOCKED, NOT_APPLICABLE. A NOT_APPLICABLE result needs a reason and required approval.

## Verification scenarios

| ID | Scenario/input | Expected result | Verifies criteria | Execution stage/tool | Evidence |
|---|---|---|---|---|---|
| T-01 |  |  | AC-01 |  |  |

## Plan and expected scope

- Implementation tasks:
- Expected files/components:
- Unexpected changes that need review:
- Dependencies:
- Rollback or recovery:

## Stage evidence

| State transition | Required evidence | Verifier | Result | Evidence reference |
|---|---|---|---|---|
| NEW → BASELINED |  |  |  |  |
| BASELINED → RESEARCHED |  |  |  |  |
| RESEARCHED → PATTERN_VERIFIED |  |  |  |  |
| PATTERN_VERIFIED → SPEC_READY |  |  |  |  |
| SPEC_READY → TEST_READY |  |  |  |  |
| TEST_READY → PLAN_READY |  |  |  |  |
| PLAN_READY → IMPLEMENTED |  |  |  |  |
| IMPLEMENTED → PREFLIGHT → PREFLIGHT_PASSED |  |  |  |  |
| PREFLIGHT_PASSED → BUILDING |  |  |  |  |
| BUILDING → BUILD_PASSED / BUILD_FAILED |  |  |  |  |
| BUILD_PASSED → TESTING |  |  |  |  |
| TESTING → TEST_PASSED / TEST_FAILED |  |  |  |  |
| TEST_PASSED → SPEC_VERIFIED |  |  |  |  |
| SPEC_VERIFIED → READY_FOR_REVIEW |  |  |  |  |
| READY_FOR_REVIEW → COMPLETE |  |  |  |  |

Do not record PASS before the configured verifier runs and evidence is captured. If an enabled repair loop runs, append each attempt and preserve the failure evidence.

## Per-run adapter evidence

Record one row for every adapter result used at a stage gate. Copy the adapter-reported outcome; it is not independently certified by compatibility status. A missing or malformed result is recorded as `UNKNOWN` and routes the task to `BLOCKED`.

| Stage transition | Capability | Adapter identity/version | Run ID | Adapter-reported outcome | Revision or diff identity | Evidence reference |
|---|---|---|---|---|---|---|
|  |  |  |  | PASS / FAIL / BLOCKED / UNKNOWN |  |  |
