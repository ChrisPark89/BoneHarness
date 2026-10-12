# BoneHarness implementation status

**TypeScript conversion implemented; 156 tests passed on Node.js 22 and 24.** See [conversion spec](typescript/spec.md), [plan](typescript/implementation-plan.md) and [quick start](../builder-kit/README.md).

| Area | Current implementation |
|---|---|
| Commands | `init`, `status`, `doctor`, read-only `config`, compatible `update` |
| First use | Create `.harness/`, show gaps, begin eligible work |
| Task selection | List IDs; use `status --task ID` |
| Human review | HUMAN except initialization; configurable per phase |
| Results | Shared recorded facts for CLI/chat; export only on request |
| Updates | Preview, ownership checks, preserved settings/history |
| Recovery | Restore interrupted writes; preserve later edits |
| Packaging | npm package; Node.js 22+; self-contained installed helpers |

Specifications, README, logs and histories remain. No duplicate summary pages are generated.

Python installations use a different writer protocol. Automatic conversion of an installed Python harness is unsupported; updates stop unchanged. Historical records retain their matching tools.

Native Windows/Linux execution remains pending. CI covers Windows/macOS/Linux with Node.js 22/24. The independent demo installation remains untouched.
