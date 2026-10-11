# Installer Specification: Build a Repo-Specific Agent Harness

## Audience and purpose

This document is for the LLM performing a one-time installation in a target repository. It belongs to the builder package, not the target runtime harness.

Your task is to inspect the target repository and create a repo-specific harness skeleton there. The repo may not expose every detail or tool needed for a fully operational harness. In that case, still create the structure, record verified facts, mark unresolved configuration as pending, and make runtime behavior stop safely when it reaches an unconfigured capability.

Do not copy this specification, the installer prompt, the installer checklist, or the research references into the target repository. Adapt only the runtime templates. After installation, ordinary task agents use the generated target-repo harness and do not consult this builder package.

## Separate installation structure from integration readiness

Record two independent installation results:

### Structure status

- **INCOMPLETE:** a required generated artifact, state, transition, contract, or status record is missing or malformed.
- **STRUCTURE_COMPLETE:** all required runtime artifacts exist; active configuration fields are verified or explicitly marked pending, unavailable, or not applicable; and the generated entry point refers only to generated runtime artifacts.

### Integration readiness

- **NOT_ASSESSED:** no readiness assessment has been made.
- **PARTIAL:** the structure exists, but a required repo-specific tool, rule, or validator is pending or unverified.
- **READY:** required capability bindings are interface-compatible and have declared policy/permission fit and safe gate behavior. READY does not certify adapter-reported results or tool-work accuracy, quality, correctness, or reliability.
- **BLOCKED:** an access, policy, or unresolved decision prevents safe use of a required capability.

A target repo can be STRUCTURE_COMPLETE and PARTIAL at the same time. This is the expected result when the harness skeleton is installed but repo details are not yet known. Do not turn missing evidence into an invented command or a false READY result. Structure completeness, integration readiness, and the outcomes of individual development runs are separate records.

## Builder package and generated harness

Follow this one-time process:

1. Read the builder README, this specification, and the bootstrap prompt.
2. Inspect the target repository and adapt the files under templates/runtime.
3. Write the generated harness inside the target repo using existing repo conventions.
4. Use the installer checklist to inspect the generated output.
5. Put a target-side readiness snapshot in the generated harness-status.md.
6. Report the target-side runtime entry point to the user.

The builder README, installer specification, bootstrap prompt, and installer checklist are for the installer only. They are not runtime instructions. Do not link to them from the generated entry point. No future task agent should need the builder package.

## Target-side output

Choose the harness location from the target repo's existing structure. Do not assume a fixed path or overwrite an existing instruction file. A typical generated layout is:

~~~text
<target-repo>/
  <platform-entrypoint>             # short pointer; integrate existing file safely
  <harness-root>/
    development/
      HARNESS.md                    # task-agent operating instructions
      workflow.yaml                 # development state machine and transition rules
      task-spec.md                  # copied to begin each development task
      runs/
        <task-id>/                  # task-state.yaml and evidence records
      skills/
        <configured-capability>/    # actual repo-specific development adapter
    maintenance/
      harness-maintenance.md        # installed guide for harness-update requests
      maintenance-workflow.yaml     # maintenance lifecycle and routing
      templates/
        harness-update-record.yaml  # copied to maintenance/updates/<update-id>.yaml
      updates/
        <update-id>.yaml            # append-only maintenance update record
    shared/
      harness-status.md             # canonical structure and integration snapshot
      repo-profile.yaml             # canonical discovered facts and task types
      skill-contract.md             # canonical adapter contract
    validators/                     # only when justified and implemented
~~~

Generate all three runtime areas above. Templates are starting points: adapt them, replace integration placeholders with evidence-backed values or explicit status markers, and remove builder-only material. The generated runtime files must be self-contained. `shared/` is canonical: do not create parallel status, profile, or adapter-contract files in `development/` or `maintenance/`.

The installer checklist and bootstrap prompt remain in the builder package. Do not copy them into the target repo. The target-side `development/HARNESS.md` is used by task agents during normal work and routes harness-update requests to the installed `maintenance/harness-maintenance.md`; it must never route them back to this builder package.

## What the generated harness does

The generated runtime entry point directs a task agent to:

1. Read `shared/harness-status.md`, `shared/repo-profile.yaml`, `development/workflow.yaml`, and the relevant configured skill.
2. Classify the request using repo-specific task types.
3. Create a task record at NEW and capture the base revision and working-tree state.
4. Follow the workflow state machine, recording evidence for each transition.
5. Stop at BLOCKED or HUMAN_REQUIRED when required configuration or a decision is unavailable. Store each development record under `development/runs/<task-id>/`.
6. Report the final state and evidence without claiming unrun builds or tests passed.

The generated runtime entry point is the operating contract. It must not include installation instructions or mention this builder package.

## Default task state machine

Use the agreed state machine as the default for code changes. This workflow tracks an individual development task; it does not track harness installation.

~~~text
NEW
 ↓
BASELINED
 ↓
RESEARCHED
 ↓
PATTERN_VERIFIED
 ↓
SPEC_READY
 ↓
TEST_READY
 ↓
PLAN_READY
 ↓
IMPLEMENTED
 ↓
PREFLIGHT_PASSED
 ↓
BUILDING ───────────────────────────────┐
 ├──→ BUILD_FAILED                      │
 │       ↓                              │
 │    REPAIRING                         │
 │       ↓                              │
 │    PREFLIGHT                         │
 │       ↓                              │
 │       └──────────────────────────────┘
 ↓
BUILD_PASSED
 ↓
TESTING
 ├──→ TEST_FAILED
 │       ↓
 │    REPAIRING
 │       ↓
 │    PREFLIGHT
 │       ↓
 │    PREFLIGHT_PASSED
 │       ↓
 │    BUILDING → BUILD_PASSED → TESTING
 ↓
TEST_PASSED
 ↓
SPEC_VERIFIED
 ↓
READY_FOR_REVIEW
 ↓
COMPLETE
~~~

The compact diagram treats PREFLIGHT as the check that produces PREFLIGHT_PASSED. A runtime workflow may represent preflight as an in-progress state as well.

The repair loops are available in the workflow definition, but are not required for installation or ordinary operation. The generated harness must record BUILD_FAILED and TEST_FAILED even when repair is disabled. When a loop is disabled, route its failure to HUMAN_REQUIRED or BLOCKED. Never retry implicitly.

When enabled, the default repair route returns through preflight and a real build before testing again. A test-only shortcut may be configured only when a repo-specific check proves the relevant build artifact remains valid. Bound every loop with attempt limits and stop conditions.

Every transition defines:

- source and destination state
- required evidence
- verifier and expected result
- failure/unknown route
- revision or artifact identity that evidence applies to

A later relevant change invalidates downstream evidence. A task agent must not advance based on its own assertion.

## Repo profile and task types

The generated repo profile records verified repo facts, available capabilities, permissions, unresolved questions, and supported task types.

A task type is a category of incoming work, such as a feature, defect fix, or documentation change. It is not a source component or workflow stage. Task types can select extra acceptance criteria or checks. They do not change or skip the core state machine by default.

Start with a small set supported by repository evidence. If task categories do not meaningfully change the checks, use one default task type. If the target repo requires a stage exception, encode the alternate transition and its verifier explicitly in workflow.yaml. Never let the task agent decide to skip a stage ad hoc.

## Incomplete repository knowledge

Do not stop scaffolding because some repository details are unavailable. For each capability, use one explicit status:

- **CONFIGURED:** a verified repository binding and evidence exist.
- **PENDING_DISCOVERY:** evidence is not yet sufficient; state what evidence or decision is needed.
- **UNAVAILABLE:** the capability is confirmed absent or inaccessible.
- **NOT_APPLICABLE:** the capability is unnecessary for a declared task type, with a reason.

For pending or unavailable build/test adapters, the workflow must specify safe behavior at that state: stop as BLOCKED or HUMAN_REQUIRED, preserve the current state, and identify what would unblock it. Never synthesize a command or mark the stage passed.

The skeleton can be complete and useful while operational details remain pending. This allows later maintainers to fill gaps without rebuilding the structure.

## Modular stage skills

Bind stages to capability names such as research, pattern search, spec review, preflight, build, test, and final review. Each configured capability gets a repo-specific skill/adapter with a stable contract. Every adapter result uses this common envelope, with capability-specific fields added only when necessary:

~~~yaml
interface_version: 1
capability: "<capability name>"
adapter: "<adapter name and version>"
run_id: "<adapter invocation or external run ID>"
task_id: "<task record ID>"
revision: "<revision or diff identity>"
status: PASS # PASS | FAIL | BLOCKED | UNKNOWN
evidence:
  reference: "<durable output reference>"
  summary: "<short factual summary>"
~~~

The required fields are `interface_version`, `capability`, `adapter`, `run_id`, `task_id`, `revision`, `status`, `evidence.reference`, and `evidence.summary`. Missing, malformed, unreadable, or `UNKNOWN` results are never PASS. An adapter-reported `BLOCKED` routes the development task to its BLOCKED stop state; `FAIL` routes to the relevant failed state. Compatibility checks evaluate only the declared interface, routing, and declared policy/permission fit. They do not determine result truth or tool-work accuracy or quality.

The stable contract also records:

- inputs and prerequisites
- exact tool, command, or procedure
- output schema
- side effects and permissions
- failure and unknown-result behavior
- evidence location and revision/artifact lineage
- timeout and bounded retry policy
- independent validator

To replace a build or test tool, replace the adapter binding and keep its contract. Workflow transitions refer to the capability and output contract, not a vendor-specific implementation.

If a stage has no executable tool, an LLM procedure may still prepare analysis or a test plan. It must not claim a result that requires an actual tool. An unconfigured capability remains visible in the status report and stops a task when its gate is reached.

## Verification methods

### Installer verification

Use the installer-only checklist at installer/installation-checklist.md. It checks that the skeleton is structurally complete even when details are pending, and separately assesses integration readiness.

The installer checklist is not part of the target runtime. Copy the resulting status values and capability summary into the target harness-status.md; do not copy the checklist itself.

### Runtime task verification

Each task uses the generated task-spec template. Each acceptance criterion records its verifier, result, evidence, and status.

Prefer deterministic checks such as an actual build, test runner, schema validator, repository script, or CI result. LLM review can provide structured risk analysis but cannot stand in for a build or test. Human decisions are appropriate for ambiguous requirements, policy conflicts, and high-impact choices.

The generated workflow makes the state gates explicit. The generated harness-status report identifies which adapters are configured and which remain pending.

## Installation procedure

1. **Inspect read-only first.** Read target repo instructions, file structure, project manifests, build/test/CI scripts, and relevant history. Capture the working-tree state. Do not edit product code.
2. **Fill the repo profile.** Attach evidence to consequential claims. Separate FACT, INFERENCE, PATTERN, and UNKNOWN.
3. **Select task types.** Add only categories supported by evidence. Do not use task types to bypass the core state machine.
4. **Instantiate runtime templates.** Create the target entry point, profile, workflow, status report, task template, and configured skills/adapters. Replace config placeholders with verified values or explicit status markers. Do not leave a placeholder that could be mistaken for a real path or command.
5. **Preserve the state machine.** Configure each transition's required evidence, verifier, and stop behavior. Keep repair disabled unless target policy and adapters justify enabling it.
6. **Validate structure.** Check generated artifact presence, state/transition consistency, evidence schema, internal links, and absence of builder-package references in the generated runtime files.
7. **Assess integration separately.** Exercise interface, routing, and declared policy/permission validators when available. Record capabilities that remain pending and their consequences. Do not treat a compatibility check as proof that an adapter result is true or its tool work is accurate or high quality.
8. **Report both results.** Mark STRUCTURE_COMPLETE or INCOMPLETE and independently mark integration readiness as NOT_ASSESSED, PARTIAL, READY, or BLOCKED. Give the exact generated runtime entry point.

## Install-to-use scenario

Assume the target repo has clear source instructions and a build command, but its test invocation is undocumented and the installer cannot verify it.

1. The installer LLM reads this builder specification and prompt, then inspects the target repo read-only.
2. It adapts the runtime templates into the repo's existing agent-documentation area. It creates a repo-specific entry point, profile, state machine, status report, task-spec template, and configured build skill.
3. It records the test capability as PENDING_DISCOVERY, without a guessed command, and states what evidence is needed to configure it. The state machine still includes TESTING and TEST_FAILED. If a task reaches TESTING without a verified test adapter, its transition is BLOCKED.
4. The installer checklist confirms the development, maintenance, and canonical shared files and their transition definitions exist, so structure is STRUCTURE_COMPLETE. Integration readiness is PARTIAL because test execution is not verified. Repair-loop settings are present and remain disabled.
5. The installer reports the generated runtime entry point. Builder instructions, prompt, checklist, and source templates remain outside the target harness.
6. On a later task, the task agent reads only the target repo's generated entry point and referenced runtime files. It follows the state machine through research, specification, planning, implementation, preflight, and build. At the unconfigured test gate it records BLOCKED; it does not reread this builder package or claim testing passed.
7. After a maintainer identifies and verifies the test command, they submit a target-side maintenance update, record it at `maintenance/updates/<update-id>.yaml`, and update the canonical shared profile or status only after the maintenance workflow permits promotion. A future task can then enter TESTING. The optional repair loop can be enabled later if its policy and evidence checks are ready.

## Research references for the installer

These examples inform the installer design but are not runtime instructions:

- OpenAI describes repository-local knowledge maps and mechanically enforced invariants: [Harness engineering](https://openai.com/index/harness-engineering/).
- OpenAI's Symphony account reports moving away from rigid state machines for broader ticket-level objectives. This specification scopes the state machine to a defined software-change workflow: [Symphony](https://openai.com/index/open-source-codex-orchestration-symphony/).
- Anthropic describes persistent progress artifacts across sessions and careful feature verification: [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).
- Anthropic's later harness work discusses evaluator criteria, structured handoffs, and simplifying components that add overhead: [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps).
- GitHub's Spec Kit shows a staged specification, plan, task, implementation workflow across coding agents: [Spec-driven development with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/).
