# JavaScript harness demo

A small calculator for two controlled harness scenarios. After running, use `bh status --task success` or `bh status --task failure-repair` from this directory.

| Path | Purpose |
|---|---|
| `.harness/docs/` | Specifications and requested exports |
| `.harness/framework/` | Installed instructions, configuration and tools |
| `.harness/artifacts/` | Machine history and supporting evidence; inspect when needed |
| `src/`, `test/` | Calculator and two addition assertions |
| `scripts/`, `package.json` | Build and test commands |
| `dist/` | Generated JavaScript |
| `run.ts` | Install the kit and run two controlled scenarios |

The scenarios verify existing behavior and then demonstrate a deliberate test failure followed by repair. Commands really execute; workflow steps are scripted. This is not an independent LLM usability trial.

Run the app checks here with `npm run build` and `npm test`.

To retry installation, preserve `.harness/`, remove that directory, then run `node .test-dist/tests/demo/run.js` after `npm test` from the project root. Existing installations are never overwritten. Requires Node.js 22+. The runner restores any intentional source defect and leaves setup activation for the reviewing LLM.
