# SDD ledger — plan: docs/superpowers/plans/2026-10-03-harness-maintenance.md

## Workspace and baseline

- Working tree: `/private/tmp/harness-maintenance-sdd-20261003/work`
- Original user workspace has no Git metadata. This scratch repository/worktree is a snapshot for isolation and review; approved changes will be transferred back as a patch after review.
- Baseline: `7146d47f7a81940a8b030826e807da6a4cc167f6`
- No application tests are defined or requested for this documentation-only change; use document and path consistency checks from the plan.

Ruling: Use an isolated temporary Git snapshot/worktree and export only reviewed changes to the user workspace — the source folder has no `.git`, so native Git worktrees and review-package tooling cannot run there; cost if wrong: scratch commits are not user-repository history and would need to be replayed, while the original stays untouched until transfer.

## Plan preflight scan

| Tasks | Shared file or interface | Result |
|---|---|---|
| 1 ↔ 2 | Task 1 moves `HARNESS.md` to `development/HARNESS.md`; Task 2 edits it to route maintenance requests. | Consistent: Task 1 establishes the destination before Task 2 changes it. |
| 1 ↔ 3 | Task 1 relocates development and shared templates; Task 3 edits those exact destinations. | Consistent: Task 3 consumes the paths Task 1 produces. |
| 1 ↔ 4 | Task 1 establishes `development/`, `maintenance/`, and `shared/`; Task 4 documents installer output. | Consistent: installer guidance follows the canonical layout. |
| 2 ↔ 3 | Task 2 maintenance guide consumes shared profile/status/interface; Task 3 defines adapter result and status fields. | Consistent: Task 2 uses the shared definitions by path; Task 3 provides their exact fields before final documentation review. |
| 2 ↔ 4 | Task 2 adds maintenance runtime files and separate update records; Task 4 adds installer generation/checklist coverage. | Consistent: Task 4 documents artifacts produced in Task 2. |
| 3 ↔ 4 | Task 3 defines `integration readiness`, adapter statuses, and result fields; Task 4 mirrors them in installer documents. | Consistent: installer status vocabulary follows runtime definitions. |

## Per-task self-consistency

| Task | Check | Result |
|---|---|---|
| 1 | Existing flat runtime files are moved once to the planned destinations; no new runtime behavior is specified here. | Consistent. |
| 2 | Maintenance guide/workflow/update-record template are created, and the development entry point is the only existing runtime file modified. | Consistent. |
| 3 | Runtime interface/status fields are added to the moved templates; no path is also owned by Task 2. | Consistent. |
| 4 | Installer specification, prompt, checklist, and README document artifacts and vocabulary from Tasks 1–3. | Consistent. |

## Tasks

- Task 1: complete (commits `7146d47`..`df15524`, review clean)
- Task 2: fix round 1/5 required; review found unknown-result gating, promotion guard, and readiness/unknown wording gaps. Base for fix: `dd36192`.
- Task 3: pending
- Task 4: pending
- Task 2: complete (commits `df15524`..`ae7b75a`, scoped fix review clean; report at `task-2-review-round1.md`)
- Task 3: implementation dispatched from base `ae7b75a`
- Task 3: fix round 1/5 required; review found BLOCKED adapter-result routing, policy fit missing from canonical compatibility wording, and stale readiness wording. Fix base: `fa1ebd2`.
- Task 3: complete (commits `ae7b75a`..`a280bd1`, fix-round review clean; report at `task-3-review-round1.md`; prior out-of-scope observation resolved by Task 2 review)
- Task 4: implementation dispatched from base `a280bd1`
