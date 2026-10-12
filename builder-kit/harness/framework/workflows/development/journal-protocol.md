# Recording work

The LLM uses `tools/journal.cjs`; humans need no daily CLI. Node.js 22+ is required for these bundled helpers; no separate dependency installation is needed.

Copy a relevant template from `templates/development/`, replace its values, and save one semantic step. Evidence paths identify existing local files; the writer computes hashes. Supply judgments and real evidence. [Human-review gates](human-review.md) can keep proposed results BLOCKED.

```sh
node .harness/framework/tools/journal.cjs --repo-root /absolute/repository --task-id TASK --actor ACTOR --step /absolute/step.yaml
```

Only `action: start` omits `--context-id`. For subsequent steps, use the current context digest returned by `tools/context.cjs`.

The writer supplies sequence, timestamps, IDs, previous hash, pinned configuration, current specification and source inventory. The journal is append-only. Do not edit retained entries or create separate gate/state/event files.

Operations record intent before dispatch. For commands, declare `command` and use [command capture](command-capture.md); the helper records the outcome. Other tools retain their original response and execution metadata. Unknown/live operations block advancement. Closed operations never change; retry with a new operation ID. Failed attempts remain visible.

Old formats require matching preserved tools. Hashes establish byte consistency, not authenticated authorship.
