# What the BoneHarness kit contains

An LLM installs this kit, then follows the installed harness.

| File or directory | Why it exists |
|---|---|
| `builder-kit/README.md` | Starting point |
| `INSTALLER_SPEC.md` | Installation steps |
| `installer/bootstrap-prompt.md` | Prompt to give the LLM |
| `src/installer/install.ts` | Creates a scaffold |
| `src/cli/`, `package.json`, `release.json` | Commands, packaging and upgrade ownership |
| Installation checklist/reference | Shows what still needs discovery or verification |
| `harness/README.md` | Installed situation index |
| `framework/config/` | Human-readable adapter connections and compatibility |
| `framework/workflows/` | What the LLM does next, including recovery |
| `framework/templates/` | Blank specifications and records |
| `framework/schemas/` | Machine validation definitions |
| `dist/helpers/` | Bundled tools installed into `framework/tools/` |
| `src/checker/` | Installation checks |
| `examples/` | Small configuration examples |

`framework/` lives inside `harness/`.

Use chat or `bh status` for results. Review specifications; export reports when needed. Inspect records when diagnosing.

Specification acceptance and final verification are mandatory. Other skips require user approval. Compatibility does not prove tool quality.

Project `docs/`, `tests/` and `archive/` are not distributed.
