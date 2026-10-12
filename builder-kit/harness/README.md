# Your repository harness

Give the LLM a task: **“Follow `.harness/README.md` and its development guide for this task: …”**

| Question | View |
|---|---|
| Can I start? What needs attention? | `bh status`; `bh doctor` for fresh checks |
| Which tools and reviews are configured? | `bh config` or [profile](framework/config/repo-profile.yaml) |
| What must my task achieve? | `docs/development/<task-id>/spec.md` |
| What passed, failed or was skipped? | `bh status --task <task-id>` |
| Did an update succeed? | `bh status --update <update-id>` |

Prefer chat? Ask the LLM for recorded results. Daily CLI use is optional. Exports are historical snapshots.

## LLM entry points

- [Develop or continue](framework/workflows/development/HARNESS.md)
- [Recover interrupted work](framework/workflows/shared/recovery.md)
- [Change repository tools or settings](framework/workflows/maintenance/harness-maintenance.md)
- [Update BoneHarness](framework/workflows/updates/update-boneharness.md)
- [Finish setup](framework/workflows/setup/setup.md) · [Node.js setup](framework/tools/README.md)

Without `bh`, run `node .harness/framework/tools/view.cjs --repo-root <absolute-repository>`; add `--task-id <id>` for task results.

`docs/` holds specifications and requested exports. `framework/` holds instructions/tools. `artifacts/` holds records and evidence for investigation. Setup readiness and task completion are separate.
