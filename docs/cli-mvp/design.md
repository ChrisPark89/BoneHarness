# CLI MVP design

Status: implemented; native Windows/Linux checks pending. Only [spec.md](spec.md) needs user review. [Implementation notes](implementation.md) track execution after approval.

## Intent

Start with `init`, see gaps, and try eligible work. Keep outcomes visible and add adapters gradually. Preserve the existing phase machine, evidence rules, human approvals and configuration captures. The CLI does not discover repository semantics or replace the LLM's specification review.

## Architecture

Use Node.js 22+ and strict TypeScript. All distributed assets remain inside `builder-kit/`. Bundle CLI and helper entries with their YAML/schema libraries; keep source modules focused by responsibility. See the [conversion design](../typescript/design.md).

A thin CLI calls existing installer, checker and reporting functions. Extract a read-only report collector from `report.py`; retain explicit report persistence for handoffs. One view model feeds terminal output, JSON and optional Markdown export. The LLM may present the generated summary in chat. No second state machine, plugin registry, daemon or new mutable task-status file.

`bh` uses Node.js. Installed `.cjs` helpers include their dependencies; no per-repository environment or package installation is required. Existing environments remain untouched. No automatic dependency download during repository commands.

## Commands

- `init`: use bundled kit; optionally select a local kit. Create an empty harness safely, check it, show gaps and the next LLM prompt. Existing installations are never overwritten. The LLM still discovers and configures repository connections.
- `status`: show setup findings and task summaries; `--task ID` shows every phase, criteria, review requests, failures/skips and evidence references. `--update ID` shows maintenance results. With no selector, show readiness plus task IDs and current phases (or “No tasks yet”). Do not infer a current task from Git branches, recency or stored selection. Reading never advances a task or executes an adapter.
- `doctor`: fresh structure, configuration, Node.js/bundle and interrupted-update checks. Separate blockers from later-phase gaps. Report PASS/WARN/FAIL, observation time and remedy. Do not claim tool quality or that an LLM understood instructions.
- `config`: display effective adapters and review policy. Editing stays in the existing maintenance flow.
- `update`: apply the bundled or explicitly selected local kit. Preview first; `--dry-run` changes nothing. Updating the CLI package itself remains a separate package-install operation.

Support `--help`, `--version`, `--repo PATH` and applicable `--json`. Default repository is the current directory; do not search unrelated parent repositories. Text starts with outcome and next action. Successful inspection returns 0 even if a task failed; doctor blockers/update refusal return 1; invalid input or inability to inspect returns 2. Warnings alone return 0. JSON never mixes with explanatory stdout text.

## Setup handoff

Readiness comes from the existing installation record (CHECKED, CONFIRMED activation) and current diagnostics. Unfinished setup receives a one-sentence prompt pointing to setup.md. Missing optional adapters do not block unrelated work.

Setup has 11 explicit question blocks, starting with research. Initialization remains an internal recorded step: create task records, retain the request/scope and starting state; no adapter, no setup question, LLM review by default. New installations retain HUMAN review for the remaining phases. Existing task captures and explicit review policies are preserved.

Each question block supplies a phase number, one-sentence description and exact question. Copy the introduction plus the first block; wait after each question. Save each reply directly in its adapter entry: instructions retain the user's choice/rules; reason says what happens next. New profiles use only OK (setup resolved) or ACTION_NEEDED (reason identifies the actor and action). Resume the first ACTION_NEEDED entry and read its saved instructions before asking; finish pending technical checks without repeating answered questions. No separate setup_answers map, setup flag or progress counter is generated. Old maps/statuses remain readable to preserve existing profiles and histories; changes use maintenance. These choices are neither review approvals nor task skips.

All 11 phases accept optional adapters. Add `specification`, `verification_plan`, `implementation_plan`, `implementation` and `specification_verification`; retain `pattern_search` and `test` for existing profiles. The five new entries are optional in the schema so older profiles remain readable. The context helper exposes the selected adapter and instructions for each phase; an absent new binding means ACTION_NEEDED with an explicit next action. Connected OK adapters require the same matching PASS assessments as legacy COMPATIBLE entries. Null connections cannot dispatch execution operations. Direct LLM work may be OK without an adapter; it still needs phase evidence. Operation validation applies identically to all bindings. Only existing execution-proof phases require execution evidence; adding adapters does not create new phase gates or waive specification criteria.

Ask about tools, skills and rules; users may delegate selection or explicitly request optional-phase skips. Specification acceptance and final verification remain mandatory. Tool choice never grants human-review approval. Keep each user-facing message under 200 words and maintain the fixed phase list when the workflow changes. Configuration assessment and verification follow the saved choices.

## Information ownership

Keep README, task specifications, configuration and all evidence/history. Stop automatically generating setup, task-report and maintenance-summary Markdown pages only after their consumers use the CLI/shared view. Keep existing pages on upgrades and identify them as historical snapshots in CLI output. Explicit exports are snapshots, not inputs to state decisions. Existing report JSON remains the recorded handoff outcome.

## Naming and entry points

Use “Change repository tools or settings” for LLM-guided profile/adapter/rule/review changes. Its existing maintenance guide and records remain in place. Use “Update BoneHarness” for adopting a newer builder-kit release: obtain/build/install the new kit first, then preview/apply it to each repository with `bh update`. The command does not fetch a release. README links to both guides; setup focuses on the initial configuration. Commands and record formats stay unchanged.

## Compatible updates

Add one release manifest and one installed receipt: release identity, supported record/profile formats and managed-file hashes. The identity includes a content digest for unreleased builds. Repository configuration, custom adapters, specifications, artifacts, environments and unknown files are not replaceable kit defaults. Detect edited managed files and report conflicts rather than merging silently.

1. Read the receipt, candidate manifest and existing records. A version label alone never establishes compatibility.
2. List unfinished tasks, phase, compatibility and next action. Use a valid saved COMPLETE report bound to its journal to recognize a finished run; later repository changes alone do not reopen it. Missing or inconsistent completion records mean UNKNOWN. Candidate readers must preserve supported histories and unresolved approvals. An incompatible/unknown unfinished task blocks publication; finishing a task does not solve an unsupported record format.
3. Block while an operation or another update is unresolved. Preserve task captures. Do not implement multiple active runtime versions in this MVP.
4. Stage candidates and retain before bytes in the existing maintenance area. Run checks against the staged installation. No record/schema conversion, adapter execution or dependency installation.
5. Coordinate publication with helper writes, recheck base hashes, record intent, then replace managed files. Publish a fresh configuration ID while preserving user settings; tasks retain their captures. Record the new receipt only after verification. Repeating the same release is a no-op.
6. On failure, restore files still matching this update's writes. Never overwrite a later edit. On interruption, `doctor` identifies the update; rerunning `update` reconciles it before another attempt. Retain evidence and report manual action if safe restoration is impossible.

Legacy installations without a receipt require a verified original kit baseline. An explicit `--baseline PATH` can establish ownership only where managed bytes match that kit; otherwise list conflicts and stop unchanged. No delete-and-reinstall fallback. Earlier completed histories must remain readable, even when there are no unfinished tasks.

## Scope decisions

Reuse existing records; add only ownership/release information needed to avoid destructive updates. Defer config editing, automatic migrations, registry downloads, plugins, automatic adapter discovery and automatic runtime switching. Use the [approved directory layout](../artifact-layout.md).

## Implementation references

TypeScript modules live under `builder-kit/src`: installer, checker, CLI, I/O and reporting. Entry points in `src/entries` build into `dist/bh.cjs` and `dist/helpers/*.cjs`.

The writer guard uses exclusive PID/token ownership. Proven dead owners can be reclaimed; ambiguous ownership blocks writes. Python runtime API 1 cannot safely share that protocol, so upgrades to runtime API 2 are refused until a migration is separately verified. Format-2 record parsing remains supported subject to exact identity validation.

## Framework directory organization

Distribute installable files from `builder-kit/harness/`. Keep repository settings in `framework/config/`, blank installation/development/maintenance forms in `framework/templates/`, and validation definitions in `framework/schemas/`. Group workflow guides into setup, development, maintenance, updates and shared. Generated records stay outside framework.

The layout reader selects the current or historical schema directory for an entire framework/capture; it does not fall back file by file. Mixed schemas or missing required files fail checks. Task readers resolve old paths inside the original immutable capture; no history or captured bytes are rewritten. The updater retains its existing ownership, candidate validation and rollback checks. Original kits using `templates/runtime/` remain usable as ownership baselines.
