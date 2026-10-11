# Recording work

The LLM uses `tools/journal.py`; humans need no daily CLI. Python 3.11+, PyYAML and jsonschema are required for these shipped helpers, or a conforming replacement must be provisioned.

Copy a relevant template from `templates/development/`, replace its values, and save one semantic step. Evidence paths identify existing local files; the writer computes hashes. Supply judgments and real evidence, never invented results.

```sh
python3 -B .harness/framework/tools/journal.py --repo-root /absolute/repository --task-id TASK --actor ACTOR --step /absolute/step.yaml
```

Only `action: start` omits `--context-id`. For subsequent steps, use the current context digest returned by `tools/context.py`.

The writer supplies sequence, timestamps, IDs, previous hash, pinned configuration, current specification and source inventory. The journal is append-only. Do not edit retained entries or create separate gate/state/event files.

Operations record intent before dispatch, then actual outcome or reconciliation evidence. Unknown/live operations block advancement. Closed operations never change; retry with a new operation ID. Failed attempts remain visible.

Format 1 is refused. Use its matching preserved tools; there is no automatic conversion. Hashes establish byte consistency, not authenticated authorship.
