# BoneHarness project tests

These checks verify the kit and are not installed into other repositories.

| Location | Purpose |
|---|---|
| `typescript/` | Installation, phases, evidence, reviews, CLI and update tests |
| `typescript/coverage-map.json` | Original Python cases mapped to TypeScript tests |
| `check-documents.ts` | Current documentation links and human-page limits |
| `demo/` | Calculator and two controlled harness scenarios |

From the project root:

```sh
npm ci
npm run typecheck
npm test
npm run check:docs
```

Requires Node.js 22+. Tests use disposable directories; packaging checks install outside the checkout. Installed harnesses use their own checker and repository tools.

The [conversion plan](../docs/typescript/implementation-plan.md) tracks behavior parity and additional regressions. Historical format-1 fixtures remain in [the archive](../archive/2026-10-10-format-1.zip).
