# Harness tools

**Requires Node.js 22+.** The installed `.cjs` files include their library dependencies. No Python, environment activation or repository dependency changes are needed.

Check once:

```sh
node --version
node .harness/framework/tools/check.cjs --repo-root /absolute/repository
```

| Tool | Purpose |
|---|---|
| `check.cjs` | Verify installed structure and references |
| `view.cjs` | Show readiness, task results or updates |
| `context.cjs` | Read the next relevant step |
| `journal.cjs` | Record a verified semantic step |
| `command.cjs` | Capture original command output and exit status |
| `source.cjs` | Capture the declared source inventory |
| `report.cjs` | Derive and save a task report |

Use `node <tool> --help` for arguments. The LLM normally runs these tools; humans can use `bh` or ask for the same results in chat.

If Node.js or a bundle is missing, show the setup gap. Do not claim checks ran. Install the required runtime or restore the matching kit release before retrying.

Bundled dependencies retain their own [license notices](THIRD_PARTY_NOTICES.txt).
