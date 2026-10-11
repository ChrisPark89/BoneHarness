# BoneHarness layout

```text
.harness/
  README.md
  docs/                        # HUMAN READING
    setup.md
    development/<task>/        # spec.md, report.md
    maintenance/<update>.md
  framework/                   # INSTALLED DEFINITIONS
    config/                    # readable adapter profile
    workflows/                 # guides and phase definitions
    adapters/                  # how skills fit
    templates/                 # records and schemas
    tools/                     # recording, parsing and checks
  artifacts/                   # PROCESS RECORDS
    installation/
    configurations/
    development/<task>/        # history, report data, evidence
    maintenance/<update>/      # update records and evidence
```

## What to read

| File | Question answered |
|---|---|
| `README.md` | Where do I start? |
| `docs/setup.md` | Can I begin? Which phase will wait? What must I do? |
| `framework/config/repo-profile.yaml` | Which adapters are connected and compatible? |
| Task `spec.md` | What must this task achieve? |
| Task `report.md` | What passed, failed or was skipped? |
| Maintenance summary | What changed, and what remains unresolved? |

Human pages stay within 200 words and support a decision. Python setup and pinned dependencies live in `framework/tools/`; a local environment stays in `.harness/.venv/`. Follow evidence links only when investigating.

The LLM uses the framework and parsed records. Avoid placeholder documents and routine reporter console logs. There is no separate mutable `state.json`: progress is derived from history.
