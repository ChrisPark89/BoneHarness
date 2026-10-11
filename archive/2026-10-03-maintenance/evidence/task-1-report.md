# Task 1 Report: Separate runtime templates

## Implemented

Moved the three normal development templates into `templates/runtime/development/` and the three canonical shared definitions into `templates/runtime/shared/`. Updated `development/HARNESS.md` references to point at the shared definitions and same-folder development templates using the new relative layout. No maintenance templates or maintenance-only workflow states were introduced.

## Checks

- File/path consistency script: PASS. Each of the six templates exists exactly once at its requested destination; the shared folder contains only its three canonical definitions; the old flat paths are absent; the development workflow contains no maintenance-only instructions; entry-point references use the new paths.
- `git diff --cached --check`: PASS.
- Software tests: not applicable; this is a documentation-only move and the task brief calls for path consistency checks only.

## Files changed

- Renamed `HARNESS.md`, `workflow.yaml`, and `task-spec.md` into `development/`.
- Renamed `skill-contract.md`, `repo-profile.yaml`, and `harness-status.md` into `shared/`.
- Updated relative references in `development/HARNESS.md`.

## Self-review / concerns

The relative shared references resolve from the moved development entry point. Git recognizes all six moves, with content preserved apart from the three intended path changes. No concerns.
