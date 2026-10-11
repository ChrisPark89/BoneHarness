# BoneHarness repository harness

| Need | Open |
|---|---|
| See adapter connections and issues | [Repository profile](framework/config/repo-profile.yaml) |
| Start or continue a task | [Development](framework/workflows/development/HARNESS.md) |
| Resume interrupted work | [Recovery](framework/workflows/recovery.md) |
| Check installation | [Setup status](docs/setup.md), then [setup guide](framework/workflows/setup.md) |
| Change an adapter or configuration | [Maintenance](framework/workflows/maintenance/harness-maintenance.md) |
| Read task results | `docs/development/<task-id>/report.md` |

Read the relevant guide directly. Optional tools help with setup, updates and diagnosis; daily human use does not require a CLI. LLMs use the installed parser and writer helpers for structured records.

Human summaries live in `docs/`, definitions in `framework/`, and retained records/evidence in `artifacts/`. Respect repository instructions and permissions. Keep harness-owned changes under `.harness/`.

This installation uses format 2. Preserve older installations and histories with their matching tools; no automatic migration is provided.
