# What the BoneHarness kit contains

An LLM installs and adapts this kit, then follows the installed harness for work.

| File or directory | Why it exists |
|---|---|
| `builder-kit/README.md` | Starting point |
| `INSTALLER_SPEC.md` | Installation steps |
| `installer/bootstrap-prompt.md` | Prompt to give the LLM |
| `installer/install.py` | Creates a fresh scaffold |
| Installation checklist/reference | Shows what still needs discovery or verification |
| `templates/runtime/README.md` | Installed situation index |
| `framework/config/` | Human-readable adapter connections and compatibility |
| `framework/workflows/` | What the LLM does next, including recovery |
| `framework/adapters/` | How to interpret ordinary skill output with evidence |
| `framework/templates/` | Small record examples and machine-checked formats |
| `framework/tools/` | Saves progress, selects context and generates reports |
| `checker/` | Optional, recommended installation checks |
| `examples/` | Small configuration examples |

Paths beginning `framework/` are inside `templates/runtime/`.

After installation, open `.harness/docs/setup.md`. During work, read the task’s specification and report. Inspect process records when diagnosing issues.

Specification acceptance and final verification are mandatory. Other phases require explicit user approval to skip. Compatibility does not prove tool quality.

Project `docs/`, `tests/` and `archive/` are not distributed.
