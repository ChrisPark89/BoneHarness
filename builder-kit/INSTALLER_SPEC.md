# Install BoneHarness

1. **Inspect.** Read target repository instructions and existing commands. Preserve application files. An existing `.harness/` uses maintenance; never overwrite it.
2. **Create.** Run `python3 <kit-path>/installer/install.py --repo-root <absolute-repository>`. On Windows use a Python 3.11+ executable. Without Python, use the [manual reference](installer/installation-reference.md).
3. **Prepare Python.** Follow the installed [dependency guide](templates/runtime/framework/tools/README.md). Record the executable and dependency availability. Missing prerequisites remain visible.
4. **Connect and assess.** Follow the [adapter guide](templates/runtime/framework/adapters/adapter-interface.md). Save assessments in existing installation checks; COMPATIBLE must reference a matching assessment. Direct commands qualify. Research/reviews may use inspection. Execution-phase gaps require connection or explicit user skip.
5. **Check and activate.** Follow the [checklist](installer/installation-checklist.md), retain findings, and explicitly load installed README and development guide. Record activation only after loading.
6. **Hand off.** Complete `docs/setup.md` under 200 words: can work begin, which phase will wait, required action, Python executable, evidence links. When supported, say “No known setup blockers”; do not promise future phases cannot wait. In the chat response link setup and profile, then provide a task-start prompt using `.harness/README.md`.

Installation checks establish setup facts. Task completion needs its own specification and evidence.
