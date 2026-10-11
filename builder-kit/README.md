# BoneHarness builder kit

Give this kit to an LLM to install a harness in your repository.

1. Copy the [installation prompt](installer/bootstrap-prompt.md); fill in the repository and kit paths.
2. Let the LLM follow the [installation guide](INSTALLER_SPEC.md). Python 3.11+ creates the scaffold; [dependency instructions](templates/runtime/framework/tools/README.md) prepare its helpers.
3. Read the generated `.harness/docs/setup.md`: can you begin, what needs attention, and what comes next?
4. Give the LLM a task and point it to `.harness/README.md`. Review the resulting short task report.

| Installed location | Purpose |
|---|---|
| `.harness/docs/` | Human setup, task and update summaries |
| `.harness/framework/` | Instructions, connections and tools |
| `.harness/artifacts/` | Supporting records and evidence |

Missing tools may delay particular phases; the setup summary must name them. Users may explicitly skip phases except specification acceptance and final verification. Compatibility does not prove tool quality.

Only `builder-kit/` is distributed. Keep an existing installation and use its maintenance guide for updates.
