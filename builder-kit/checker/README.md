# Installation checker

Use during setup, maintenance or diagnosis. Requires [Node.js 22+](../harness/framework/tools/README.md).

```sh
node .harness/framework/tools/check.cjs --repo-root /absolute/repository
```

The equivalent kit command uses `builder-kit/dist/helpers/check.cjs` after building.

| Result | Meaning |
|---|---|
| Exit 0 | Structure checks passed; inspect recorded setup gaps |
| Exit 1 | Structure or evidence references need attention |
| Exit 2 | Check arguments, Node.js availability or file access |

The checker verifies structure, schemas and retained references. It does not execute adapters, authenticate human approvals or certify tool quality. `bh doctor` includes these checks and presents next actions.
