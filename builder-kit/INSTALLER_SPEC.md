# Install BoneHarness

1. **Inspect.** Read repository instructions and commands. Preserve application files. For an existing `.harness/`, resume setup or use its tools/settings or Update BoneHarness guide; never overwrite it.
2. **Create.** Run `bh init --repo <absolute-repository> --kit <built-kit-path>`. From a built checkout, use `node <kit-path>/dist/bh.cjs init --repo <absolute-repository>`.
3. **Prepare Node.js.** Follow the installed [tool guide](harness/framework/tools/README.md). Record runtime availability. Missing prerequisites remain visible.
4. **Ask, connect and assess.** Follow the installed [setup guide](harness/framework/workflows/setup/setup.md): ask first about tools/skills/rules per phase; for “no”, ask about skipping. Mandatory phases remain; confirm skip scope. Follow the [adapter guide](harness/framework/workflows/shared/adapter-interface.md). Save assessments in existing installation checks; connected OK entries must reference matching assessments. Retain default review settings unless the user requests changes. Execution-phase gaps require connection or explicit user skip.
5. **Check and activate.** Follow the [checklist](installer/installation-checklist.md), retain findings, and explicitly load installed README and development guide. Record activation only after loading.
6. **Hand off.** Run `bh doctor` and present recorded findings in chat: can work begin, affected phases, actions and evidence. Without `bh`, use installed `view.cjs` with Node.js. Say “No known setup blockers” only when supported. Link README/profile and provide the task-start prompt. Do not generate a separate setup page.

Installation checks establish setup facts. Task completion needs its own specification and evidence.
