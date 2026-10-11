# Read relevant context

Task context:

```sh
python3 .harness/framework/tools/context.py --repo-root /absolute/repository --task-id task-id
```

Read the next unresolved phase, current source/specification, open operations, issues and relevant contract. Pass its `context_id` to the semantic writer. A stale digest requires another read; it never grants permission.

| Need | Arguments |
|---|---|
| Begin a task | Omit task ID |
| Recover | `--situation recovery --task-id task-id` |
| Inspect setup checks, activation and connection gaps | `--situation setup` |
| Inspect maintenance | `--situation maintenance --update-id update-id` |
| Read a specific journal entry | `--task-id task-id --record e000001` |
| Structured output | `--format json` |

Read every numbered excerpt. Continue with `--page N --context-id DIGEST` and the same selection; changed input requires restarting. Excerpts omit nothing. There are no transition IDs or repeated state snapshots. The helper reads pinned task definitions and performs no writes or adapter calls. Ordinary read-only inspection cites evidence directly; operation records cover execution claims or interruption recovery.

Requires Python 3.11+ and supplied dependencies. If unavailable, use an equivalent strict local parser or record the limitation; withhold dependent claims. Exit 0 means context was read, 1 means issues remain, and 2 means unavailable. 
