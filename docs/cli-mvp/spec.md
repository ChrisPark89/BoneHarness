# CLI MVP specification

[Verification](../verification.md) · [Layout](../artifact-layout.md)

**Goal:** initialize, see gaps, start work.

| Command | Required result |
|---|---|
| `bh init` | Install `harness/` into `.harness/`; show the setup prompt. |
| `bh status` | Readiness/task IDs; `--task ID` shows phases, outcomes, reviews and evidence. |
| `bh doctor` | Check setup; unfinished setup gets the configuration prompt. |
| `bh config` | Show tools/settings. |
| `bh update` | Apply a newer kit; identify affected tasks. |

## Acceptance

- [x] Ask 11 questions; save/resume adapter entries. Status: OK or ACTION_NEEDED with next action. Initialization is internal.
- [x] Missing optional adapters allow eligible work. Skips need user authorization; specification acceptance and final verification remain mandatory.
- [x] New installations default to HUMAN review except initialization; existing preferences remain unchanged.
- [x] Show recorded results through CLI or LLM; export only on request. Retain specifications, logs and evidence.
- [x] Updates preserve customization/history, detect conflicts, support dry runs and recover interrupted writes. Unsupported or unknown compatibility blocks changes.
- [ ] Node.js 22+; Windows, macOS and Linux; readable help/errors and JSON output.

Native Windows/Linux verification pending.

Deferred: migrations, configuration editing and plugins.
