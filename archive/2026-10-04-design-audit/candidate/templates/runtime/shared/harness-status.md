# Installed Harness Status

This target-side report describes the generated harness installation and its current integration readiness. It is distinct from any task's current workflow state.

- Target repository/revision: <fill after installation>
- Generated harness root: <path>
- Runtime entry point: <path>
- Structure status: INCOMPLETE | STRUCTURE_COMPLETE
- Integration readiness: NOT_ASSESSED | PARTIAL | READY | BLOCKED
- Last assessed by/tool and version: <fill after assessment>
- Assessment evidence: <path or report ID>

`READY` means interface and policy integration readiness only: required capability bindings are present, interface-compatible, and have safe gate behavior. It does not certify adapter correctness, reliability, or the accuracy or quality of adapter or tool work.

## Capability status

Use CONFIGURED, PENDING_DISCOVERY, UNAVAILABLE, or NOT_APPLICABLE. For pending/unavailable items, state the consequence at the task gate and what evidence or decision resolves it.

| Capability | Status | Active adapter/version | Compatibility evidence | Runtime behavior if needed | Evidence / next step |
|---|---|---|---|---|---|
| Research | PENDING_DISCOVERY |  |  | BLOCKED or HUMAN_REQUIRED | |
| Pattern search | PENDING_DISCOVERY |  |  | BLOCKED or HUMAN_REQUIRED | |
| Preflight | PENDING_DISCOVERY |  |  | BLOCKED or HUMAN_REQUIRED | |
| Build | PENDING_DISCOVERY |  |  | BLOCKED or HUMAN_REQUIRED | |
| Test | PENDING_DISCOVERY |  |  | BLOCKED or HUMAN_REQUIRED | |

## Optional repair loops

- Build loop: available / not available; enabled / disabled; policy reference:
- Test loop: available / not available; enabled / disabled; policy reference:

## Unresolved repo questions

| Question | Impact | Evidence/decision needed | Owner/status |
|---|---|---|---|
|  |  |  |  |

## Last readiness report

- Required capabilities passing:
- Required capabilities pending:
- Blockers:
- Not-applicable decisions:
- Validator/pilot evidence:
