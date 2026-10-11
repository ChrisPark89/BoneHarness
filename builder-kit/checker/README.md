# Installation checker

Use during setup, maintenance or diagnosis. First prepare [Python dependencies](../templates/runtime/framework/tools/README.md).

With the selected environment's Python:

```sh
python .harness/framework/tools/check.py --repo-root /absolute/repository
```

The equivalent kit command is `python <kit-path>/checker/check.py --repo-root /absolute/repository`.

Add `--format json` to save evidence, or `--update artifacts/maintenance/<id>/update.yaml` to inspect an update.

| Result | What to do |
|---|---|
| Exit 0: structure passed | Review setup decisions and connection gaps before starting work. |
| Exit 1: invalid/incomplete files or records | Resolve the listed diagnostics. |
| Exit 2: command/dependency problem | Check Python setup and arguments. |

The checker reads schemas, required files, references and matching adapter assessments. Execution assessments require command, exit status and captured output; review assessments require observations. It changes no files and runs no adapters. Adapter compatibility and activation are recorded claims; structural success cannot establish their meaning or task completion.

For task progress, read its report. For setup readiness and next action, read `.harness/docs/setup.md`.
