# Installed Repository Harness

This is the task agent's entry point for software work in this repository. Use this generated harness for normal development tasks. Route harness-maintenance requests to `../maintenance/harness-maintenance.md` and `../maintenance/maintenance-workflow.yaml`.

## Start a task

1. Read ../shared/harness-status.md and ../shared/repo-profile.yaml.
2. Read workflow.yaml and the relevant configured skill.
3. Create a task record from task-spec.md under the configured run/evidence location.
4. Start at NEW, record the base revision and working-tree state, then follow the configured transitions in order.
5. Before advancing, attach the required evidence and use the transition's named verifier.

## Operating rules

- This harness is repo-specific. Treat ../shared/repo-profile.yaml and workflow.yaml as the source of truth for local commands, task types, stage guards, and capability status.
- Follow the state machine. Do not skip, reorder, or invent transitions.
- If a capability is PENDING_DISCOVERY or UNAVAILABLE, stop at its gate as BLOCKED or HUMAN_REQUIRED and record what would resolve it.
- A missing command result is UNKNOWN, never PASS. An LLM review is not a build or test result.
- Tie build/test evidence to the revision and artifact actually checked. Relevant edits invalidate downstream evidence.
- A build/test repair loop may run only when workflow.yaml enables it and its retry policy permits another attempt.
- Preserve evidence from failed attempts. Stop when the policy limit is reached or there is no new evidence.
- For a harness fact correction, stage-adapter update, or repository drift reconciliation, use `../maintenance/harness-maintenance.md` and `../maintenance/maintenance-workflow.yaml`. Continue to use `workflow.yaml` for normal development tasks.
- Use this generated repo-specific harness as the task workflow source.

## Finish

Report the final task state, changed scope, configured checks run, evidence references, pending risks, and any human decision required. COMPLETE is reached only under the repo-specific completion condition in workflow.yaml.
