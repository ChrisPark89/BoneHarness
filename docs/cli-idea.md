# Idea: a harness CLI

**Status:** future direction, not a requirement for daily use.

Humans normally open the profile, setup page or task report. A CLI could help with setup, maintenance and diagnosis:

| Possible command | Purpose |
|---|---|
| `harness install` | Install and check a harness |
| `harness configure` | Update repository settings |
| `harness adapter add` | Connect and assess a skill |
| `harness context` | Select records for an LLM |
| `harness logs` | Locate relevant evidence |

Keep current scripts simple: arguments → reusable functions → structured results → text or JSON. Parsing and validation should work without shell subprocesses or a CLI framework.

Add commands when concrete needs appear. Packaging and plugin discovery remain future decisions. See the [current plan](implementation-plan.md).
