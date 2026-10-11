# Installer Acceptance Checklist

**Installer-only artifact. Do not copy this checklist into the target repository.**

Use it once to inspect the files produced by the installer LLM. It has two independent status outputs: whether the runtime skeleton is structurally complete and whether its interface and policy/permission integration is ready. Per-run adapter outcomes are separate records.

## Status record

- Target repository and revision:
- Generated harness root:
- Generated runtime entry point:
- Structure status: **INCOMPLETE / STRUCTURE_COMPLETE**
- Integration readiness: **NOT_ASSESSED / PARTIAL / READY / BLOCKED**
- Assessed by/tool and version:
- Assessment time:
- Evidence report:

Structure is **STRUCTURE_COMPLETE** when all required runtime artifacts exist, all state transitions and evidence contracts are represented, and active configuration fields are verified or explicitly marked pending, unavailable, or not applicable. It does not mean all tools have been connected.

Integration readiness is **READY** only when every required capability for the declared task types has interface-compatible bindings with declared policy/permission fit and safe gate behavior. It does not establish the truth of adapter results or tool-work accuracy or quality. Unknown build/test details normally make integration readiness **PARTIAL**; they do not require omitting the skeleton.

## Checklist

Mark a criterion PASS only with evidence. For an item that is pending, record what blocks it. Do not copy this checklist to the target repo.

| ID | Acceptance criterion | Status | Evidence / notes |
|---|---|---|---|
| I-01 | The target repo was inspected read-only first; existing instructions, paths, tools, and working-tree state are recorded. | PENDING | |
| I-02 | A target-side development entry point exists and points to `development/` and canonical `shared/` files. Existing instruction files were integrated without overwriting unrelated content. | PENDING | |
| I-03 | `development/HARNESS.md` explains normal task use, routes harness-update requests to installed `maintenance/harness-maintenance.md`, and includes no installation steps or builder-package reference. | PENDING | |
| I-04 | Canonical `shared/harness-status.md`, `shared/repo-profile.yaml`, and `shared/skill-contract.md` exist with no parallel status/profile/contract copies. The profile records facts with evidence and keeps unknowns explicit. | PENDING | |
| I-05 | The installed development workflow includes the agreed state machine, transition gates, evidence requirements, result routing, and failure/stop routes. Development records use `development/runs/<task-id>/`. | PENDING | |
| I-06 | The installed maintenance guide, workflow, and update-record template exist. Each update record is append-only at `maintenance/updates/<update-id>.yaml` and includes request, base revision, affected item, evidence, candidate source, before/proposed/resulting binding, checks, permissions/side effects, promotion, resulting status, and rollback reference. | PENDING | |
| I-07 | Every enabled skill/adapter has a contract and actual binding. The common envelope has `interface_version`, `capability`, `adapter`, `run_id`, `task_id`, `revision`, `status`, `evidence.reference`, and `evidence.summary`; accepted statuses are `PASS`, `FAIL`, `BLOCKED`, and `UNKNOWN`. Missing, malformed, or `UNKNOWN` results are never PASS; BLOCKED and FAIL route safely. | PENDING | |
| I-08 | Compatibility scope is restricted to declared interface, routing, and declared policy/permission fit. A compatibility result does not claim adapter-result truth or tool-work accuracy or quality. Rejected or failed promotion leaves or restores the active binding. | PENDING | |
| I-09 | The target-side harness-status report separates structure status from integration readiness and per-run outcomes, lists configured, pending, unavailable, and not-applicable capabilities, and defines READY as interface and policy/permission integration readiness only. | PENDING | |
| I-10 | Runtime task-spec and evidence templates exist and are referenced by the generated entry point. | PENDING | |
| I-11 | No generated runtime artifact refers to this builder package, installer checklist, or bootstrap prompt. | PENDING | |
| I-12 | Optional build/test repair loops are represented but disabled unless a bounded, evidence-backed policy is configured. | PENDING | |
| I-13 | Structural checks confirm generated config parses, state names/transitions are consistent, record paths are separate, and target-internal links resolve. | PENDING | |
| I-14 | Integration checks were run where capabilities exist; unknown or inaccessible checks remain PARTIAL/BLOCKED instead of being marked as passing. | PENDING | |
| I-15 | The user receives the exact generated runtime entry point and both status results. | PENDING | |

## Evidence per checklist item

~~~yaml
criterion_id: I-01
status: PENDING # PASS | FAIL | BLOCKED | NOT_APPLICABLE
verifier: "<command or review procedure>"
expected: "<observable result>"
evidence:
  path: "<report, command output, or file reference>"
  target_revision: "<revision checked>"
notes: "<limitation or follow-up>"
~~~

## Status calculation

- Structure status is **INCOMPLETE** if any required structural criterion I-02 through I-12 fails or remains pending.
- Structure status is **STRUCTURE_COMPLETE** when I-02 through I-12 pass. A capability explicitly marked pending is compatible with structural completion.
- Integration readiness is **READY** only when the capabilities required for supported task types are interface-compatible, have declared policy/permission fit and safe gate behavior, and I-13/I-14 pass. It does not attest to per-run result truth or tool-work accuracy or quality.
- Integration readiness is **PARTIAL** when some needed details or capabilities remain pending.
- Integration readiness is **BLOCKED** when the target repo cannot safely integrate an essential capability due to access or policy.
- Disabled optional repair loops do not lower either status.
