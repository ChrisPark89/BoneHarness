# Read relevant context

Task context:

```sh
node .harness/framework/tools/context.cjs --repo-root /absolute/repository --task-id task-id
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

Ordinary context stays together up to 8,000 characters. Read every page of larger views using `--page N --context-id DIGEST` and the same selection. Changed input requires restarting. The helper reads pinned definitions without writes or adapter calls. Ordinary inspection cites files directly; operations cover execution or interruption recovery.

Requires Node.js 22+. If unavailable, use an equivalent strict local parser or record the limitation; withhold dependent claims. Exit 0 means context was read, 1 means issues remain, and 2 means unavailable.
