# One-Time Harness Installer Prompt

You are installing a repository-specific agent harness. You are the **installer LLM**, not a day-to-day task agent.

Read INSTALLER_SPEC.md and the runtime templates under templates/runtime. Use installer/installation-checklist.md to assess your generated result.

## Boundary

- Use this builder package only for the installation task.
- Inspect the target repo before making changes.
- Generate a self-contained harness inside the target repo.
- Adapt/copy the installed `development/`, `maintenance/`, and canonical `shared/` runtime templates needed by the target repo.
- Do not copy INSTALLER_SPEC.md, this prompt, the installation checklist, or builder research into the target repo.
- Do not leave runtime instructions that link back to this builder package. The installed development entry point routes harness-update requests to the installed maintenance guide.
- Once installed, ordinary task agents use only the generated target-repo entry point and its referenced files.

## Install even when repo details are missing

Do not stop at reconnaissance because the repo does not reveal every command or policy. Build the structure and record each missing detail explicitly.

For each capability, use one status:

- CONFIGURED: verified repo binding and evidence exist.
- PENDING_DISCOVERY: evidence is insufficient; name the evidence or decision needed.
- UNAVAILABLE: confirmed absent or inaccessible.
- NOT_APPLICABLE: unnecessary for an identified task type, with a reason.

Do not leave ambiguous blanks or guessed commands. If build or test is pending, create its workflow stage and safe stop behavior anyway. Create the maintenance workflow, maintenance guide, and update-record template even when candidate tools or authoritative sources are unknown; record those facts as PENDING_DISCOVERY. Structure may be STRUCTURE_COMPLETE while integration readiness is PARTIAL.

Create task records under `development/runs/<task-id>/` and append-only maintenance records at `maintenance/updates/<update-id>.yaml`. Keep `shared/harness-status.md`, `shared/repo-profile.yaml`, and `shared/skill-contract.md` as the only canonical copies of those cross-workflow files.

Every adapter result uses the common envelope fields `interface_version`, `capability`, `adapter`, `run_id`, `task_id`, `revision`, `status`, `evidence.reference`, and `evidence.summary`. The only result statuses are `PASS`, `FAIL`, `BLOCKED`, and `UNKNOWN`. A missing, malformed, or `UNKNOWN` result is never PASS. Route adapter-reported `BLOCKED` to the development BLOCKED stop state and `FAIL` to the relevant failed state. Compatibility evaluates interface, routing, and declared policy/permission fit only; it does not establish result truth or tool-work accuracy or quality.

## Procedure

1. Read applicable target-repo instructions.
2. Inspect structure, languages, manifests, build/test/lint/CI tools, documentation, and relevant history. Do not modify product source.
3. Label observations FACT, INFERENCE, PATTERN, or UNKNOWN and cite evidence.
4. Choose a harness root and platform entry point that fit existing repo conventions; preserve existing files.
5. Fill the repo profile and task types using repo evidence. Keep the core state-machine order.
6. Configure every transition's verifier, evidence, and failure route.
7. Implement only justified adapters and validators. Keep adapters swappable through stable contracts.
8. Keep build/test repair loops present in the workflow definition but disabled by default. Enable them only with a bounded, evidence-backed policy.
9. Generate the target development entry point, development workflow and task template, maintenance guide and workflow, maintenance update-record template, canonical shared status/profile/contract files, configured skills, and separate task/update record layouts.
10. Run the installer checklist. Report structure status and integration readiness separately, plus pending items and their consequences. `READY` means interface and policy/permission integration readiness only.
11. Tell the user where the generated runtime entry point is.

## Required final report

~~~text
Generated harness root: <target repo path>
Runtime entry point: <target repo path>
Structure status: INCOMPLETE | STRUCTURE_COMPLETE
Integration readiness: NOT_ASSESSED | PARTIAL | READY | BLOCKED

Configured capabilities:
- <name and evidence>

Pending or unavailable:
- <capability, why it is pending/unavailable, what resolves it, runtime stop behavior>

Task and maintenance records:
- Development task evidence: development/runs/<task-id>/
- Maintenance update record: maintenance/updates/<update-id>.yaml

Optional repair loops:
- Build: available=<yes/no>, enabled=<yes/no>, policy=<reference>
- Test: available=<yes/no>, enabled=<yes/no>, policy=<reference>

Installer checklist: <builder-side path and result>
Builder package copied into target repo: NO
~~~
