# BoneHarness

A tool that builds a repository-specific development harness, with visible progress, replaceable tools, and evidence-backed completion.

Give an LLM the BoneHarness `builder-kit/` folder to install a harness adapted to your repository.

The harness guides work through visible phases, keeps supporting evidence, and produces short reports. Tools can be added or replaced later.

## Start here

| I want to… | Read |
|---|---|
| Try the kit | [Installation](builder-kit/README.md) |
| Understand what it creates | [Layout](docs/artifact-layout.md) |
| Understand why files exist | [Kit explained](docs/builder-kit-explained.md) |
| See a task report | [Report template](docs/task-report-template.md) |

Humans review specifications in `.harness/docs/` and recorded results in chat or CLI. The LLM follows `.harness/framework/`. Process records stay in `.harness/artifacts/`.

## Maintaining this project

| Material | Purpose |
|---|---|
| [Guidelines](AGENTS.md) | Keep changes simple and consistent |
| [Specification](docs/specification.md) / [plan](docs/implementation-plan.md) | Current design and work |
| [Status](docs/implementation-status.md) / [verification](docs/verification.md) | Implementation and checked behavior |
| [Tests](tests/README.md) | Project checks, separate from installation checks |
| [Research](docs/research/README.md) | Background references |
| [Archive](archive/README.md) | Earlier designs and matching implementations |

[MIT License](LICENSE) · [GitHub](https://github.com/ChrisPark89/BoneHarness). Only `builder-kit/` is distributed. The [JavaScript demo](tests/demo/README.md) exercises successful execution and failure–repair results.
