# Agent Harness Builder Kit

## Purpose and boundary

This package is for a **one-time installer LLM** that has access to a target repository and creates a repo-specific agent harness there.

The package is not the harness used for everyday development. After installation, task agents use only the generated harness inside the target repository. The installer guide, installer prompt, and installer checklist stay outside the target harness and are not copied into it.

## Install once, use the generated harness

1. Give the installer LLM this package and access to the target repo.
2. Ask it to follow [INSTALLER_SPEC.md](INSTALLER_SPEC.md) and [the bootstrap prompt](installer/bootstrap-prompt.md).
3. The installer inspects the repo, then adapts only the files in [templates/runtime](templates/runtime/) into a suitable location in that repo.
4. It fills in verified repo-specific details. If a command, rule, or capability is unknown, it records that item as pending instead of stopping the scaffold or guessing.
5. It runs [the installer checklist](installer/installation-checklist.md) and records both structure completeness and operational readiness.
6. From then on, task agents follow the generated repository entry point, typically a short AGENTS.md, CLAUDE.md, or equivalent, that points to the generated harness.

The installer must not leave runtime instructions that depend on this builder package being present.

## What belongs where

| Builder package: installer only | Target repository: used during normal work |
|---|---|
| INSTALLER_SPEC.md | Generated harness entry point |
| installer/bootstrap-prompt.md | Repo profile and installed workflow |
| installer/installation-checklist.md | Per-task spec and evidence records |
| Research references and builder notes | Repo-specific stage skills and adapters |
| Source templates under templates/runtime | Generated readiness report and run state |

The installer checklist is used to inspect the installer's result. The generated harness-status.md is kept in the target repo and tells task agents what is configured, pending, or unavailable.

## Example use

See [the install-to-use scenario](INSTALLER_SPEC.md#install-to-use-scenario). It shows a complete install where the target repo lacks a verified test command: the runtime structure can still be complete, while operational readiness remains partial and tasks stop safely at the unconfigured test gate.

