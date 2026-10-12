# BoneHarness builder kit

**Node.js 22+** · [MIT License](LICENSE). No environment activation.

Build and install from source:

```sh
npm ci
npm run build
npm install -g ./builder-kit
```

Inside your repository:

```sh
bh init
```

`bh init` prints a prompt for your LLM to configure adapters. Follow it, then run `bh doctor` to see readiness and gaps. Alternatively, use the [installation prompt](installer/bootstrap-prompt.md).

| Command | Purpose |
|---|---|
| `bh status` | Readiness and task IDs |
| `bh status --task ID` | Phases, reviews, results and evidence |
| `bh doctor` | Fresh setup checks and remedies |
| `bh config` | Connections and review settings |
| `bh update --dry-run` | Preview applying your newer BoneHarness kit |
| `bh update --yes` | Apply kit changes; preserve settings/history |

[Change tools/settings](harness/framework/workflows/maintenance/harness-maintenance.md) · [Update BoneHarness](harness/framework/workflows/updates/update-boneharness.md). Get the newer kit before running `bh update`.

Use `--repo PATH`, `--help` or `--json` as needed. From a built checkout, `node builder-kit/dist/bh.cjs` also works.

Missing optional adapters affect their phases only. Users authorize skips; specification acceptance and final verification remain mandatory.

Unsupported updates stop unchanged; Python installations need a separate migration. Daily CLI use is optional: ask the LLM for recorded results.
