# JavaScript harness demo

A small calculator with the current harness installed. Start with the [results](.harness/docs/trial.md) or the [adapter profile](.harness/framework/config/repo-profile.yaml).

| Path | Purpose |
|---|---|
| `.harness/docs/` | Human setup, specifications and reports |
| `.harness/framework/` | Installed instructions, configuration and tools |
| `.harness/artifacts/` | Machine history and supporting evidence; inspect when needed |
| `src/`, `test/` | Calculator and two addition assertions |
| `scripts/`, `package.json` | Build and test commands |
| `dist/` | Generated JavaScript |
| `run.py` | Install the kit and run two controlled scenarios |

The scenarios verify existing behavior and then demonstrate a deliberate test failure followed by repair. Commands really execute; workflow steps are scripted. This is not an independent LLM usability trial.

Run the app checks here with `npm run build` and `npm test`.

To retry installation, preserve `.harness/`, remove that directory, then run `python3 -B tests/demo/run.py` from the project root. Existing installations are never overwritten. Requires Node.js, Python 3.11+, PyYAML and jsonschema. The runner restores any intentional source defect and leaves setup activation for the reviewing LLM.
