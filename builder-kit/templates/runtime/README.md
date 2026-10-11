# Your repository harness

**Start with [setup status](docs/setup.md): it tells you whether you can begin, what needs attention and the next action.**

| What you want to decide | Read |
|---|---|
| Can I start using the harness? | [Setup status](docs/setup.md) |
| Which tools are connected? | [Adapter profile](framework/config/repo-profile.yaml) |
| Did my task meet its specification? | `docs/development/<task-id>/report.md` |
| Did a harness update succeed? | `docs/maintenance/<update-id>.md` |

To start work, tell the LLM: **“Follow `.harness/README.md` and its development guide for this task: …”**

## LLM entry points

- [Develop or continue a task](framework/workflows/development/HARNESS.md)
- [Recover interrupted work](framework/workflows/recovery.md)
- [Update tools or configuration](framework/workflows/maintenance/harness-maintenance.md)
- [Finish setup](framework/workflows/setup.md) · [Python dependencies](framework/tools/README.md)

`docs/` contains short human summaries. `framework/` contains operating instructions and tools. `artifacts/` contains records and evidence; open it when investigating a report.

Daily human review needs no command line. Setup readiness and individual task results are separate.
