> Historical Python implementation notes. Current runtime conversion: [TypeScript plan](../typescript/implementation-plan.md).

# CLI MVP implementation plan

> For agentic workers: use `superpowers:executing-plans` after spec approval; retain the existing working-tree changes. Steps use checkboxes for tracking. User review is limited to the spec; this file is the execution record.

**Goal:** expose the existing harness through five commands and add safe compatible updates.

**Architecture:** a thin Python CLI, shared read-only views and one staged updater. Reuse the current checker/reducer and maintenance records. Preserve existing harness/task layouts.

**Tech stack:** Python 3.11+, argparse, setuptools packaging, existing pinned PyYAML/jsonschema, unittest.

**Spec:** [spec.md](spec.md). Technical decisions: [design.md](design.md).

**Status:** implemented and locally verified; native Windows/Linux execution pending.

## Global constraints

- All installed/generated repository files stay under `.harness/`; only `builder-kit/` is distributed.
- Windows, macOS and Linux; Python 3.11+; no new runtime dependencies.
- HUMAN reviews except initialization by default; preserve configured policies and task captures.
- Specification acceptance and final verification remain mandatory; other skips require explicit authorization.
- No automatic migration, adapter execution during diagnostics, or dependency installation during updates.
- Preserve independent `/Users/jp/Documents/Codex/demo`; use disposable copies for exercises.
- Existing uncommitted command-capture/review changes are inputs, not disposable work.

## File responsibilities

Planned new paths under `builder-kit/`:

| Path | Responsibility |
|---|---|
| `pyproject.toml`, `__init__.py`, `__main__.py` | Package/entry point; map existing kit root to import package `boneharness`. |
| `cli/__init__.py`, `cli/main.py` | Argument parsing and command dispatch. |
| `cli/views.py` | Shared setup/task/update result collection and text rendering. |
| `cli/releases.py` | Release identities, ownership hashes and compatibility decisions. |
| `cli/update.py` | Stage, publish and reconcile updates using existing maintenance records. |
| `release.json` | Supported formats/release identity; generated managed-file inventory is derived from packaged assets. |

Keep installer/checker/runtime assets in their existing source locations. Include them in the wheel as package data. Installed shared view code must be copied from the same source used by the CLI, not maintained separately. Existing helper entry points remain usable without `bh` on PATH.

Installed additions: `artifacts/installation/kit-receipt.json` for current release/managed hashes. Update candidates/backups and progress stay in `artifacts/maintenance/<id>/`; extend the current Update schema only for necessary release/recovery data.

Modify existing `report.py` to expose `collect(repo_root, harness_root, task_id) -> dict`; keep explicit persistence/export separate. `views.inspect(repo, *, task_id=None, update_id=None, fresh_checks=False) -> dict` returns facts, observation time, issues and next actions. `releases.plan_update(repo, kit, *, baseline=None) -> dict` is read-only. `update.apply_update(repo, plan) -> dict` rechecks its inputs and returns the recorded outcome. `main(argv=None) -> int` handles presentation and exit codes.

## Review focus

1. Missing optional connections must not make an otherwise usable installation fail (Task 2).
2. A completed task must not become unfinished solely because unrelated later work changed repository files (Task 4).
3. Unknown/customized old installations must never be treated as safe replacement targets (Task 4).
4. Interruption, disk failure or concurrent writes must not produce a false successful update (Task 5).
5. Packaging must work outside this checkout, including Windows paths and missing environments (Tasks 1 and 6).

## Task 1 — Package the command and initialize

Files: new package/CLI entry files above; existing `installer/install.py`, kit README/bootstrap prompt; new `tests/test_cli_init.py`.

- [x] Add regressions for installed-wheel `bh --help`, `--version`, `python -m boneharness`, and paths containing spaces/non-ASCII characters. Assert the wheel includes the full runtime/checker resources and excludes project tests, research and caches.
- [x] Run those checks and record the expected missing-entry failures.
- [x] Add packaging and argparse dispatch. Use existing dependency pins; `bh init [--repo PATH] [--kit PATH]` wraps the installer, then reports findings. Repeated init must preserve every existing byte and suggest status/update.
- [x] Record release ownership at installation, excluding repository configuration and user/generated areas. Keep initialization safe when setup is incomplete; show the next LLM prompt.
- [x] Run `python -m unittest discover -s tests -p 'test_cli_init.py' -v`; record results and inspect the built wheel in a disposable environment.

## Task 2 — Shared status, doctor and config

Files: `cli/views.py`, `cli/main.py`, runtime `report.py`, checker checks/report modules, new `tests/test_cli_views.py`.

- [x] Add checks for clean/incomplete/broken setup; PASS/WARN/FAIL distinctions; unavailable Python/dependencies; malformed profile; zero, one and several tasks; no implicit current-task/branch selection; pending HUMAN review; failed/skipped phases; unknown task ID. Assert no adapter execution or mutation for status/config.
- [x] Refactor report collection without changing reducer semantics. Allow the checker to inspect an explicit harness root for candidate validation. Render setup/tasks/update outcomes from existing records. Show full phase details for `bh status --task ID`; show a compact task index otherwise. `--update ID` uses existing maintenance records.
- [x] Make `doctor` run current structural/environment checks and retain one latest diagnostic result for status. Show task-specific connection gaps as warnings, never as implicit skips. A failed attempt may retain its diagnostic record; it cannot alter task/configuration history.
- [x] Implement read-only `config`. Use shared views for plain text/JSON and optional `status --task ID --export PATH` (destination inside `.harness/`). Mark cached observations with their check time. Reading status does not claim fresh diagnostic execution.
- [x] Assert exit behavior from design: inspection 0, doctor blocker/update refusal 1, invalid invocation/unreadable data 2; JSON stdout stays parseable.
- [x] Run `python -m unittest discover -s tests -p 'test_cli_views.py' -v`; compare terminal, JSON and export facts.

## Task 3 — Remove redundant summary generation

Files: setup/task-report templates; installed README, setup/development/human-review/maintenance guides; checker required paths; installer; context/report helpers; `tests/test_v2_installation.py`, `tests/test_v2_walkthrough.py`, `tests/demo/run.py`; new `tests/test_cli_documents.py`.

- [x] Add checks that a new installation has no setup/report/maintenance Markdown summaries, keeps README/spec templates, and exposes an LLM fallback without requiring `bh` on PATH.
- [x] Replace each mandatory summary-file consumer with shared view/context instructions. Preserve the recorded report JSON at handoff; do not create a second mutable state store.
- [x] Make Markdown exports explicit; stop creating summary pages by default. Existing summary files remain untouched and are not consulted for live status.
- [x] Align examples and installed guides with the already selected HUMAN default except initialization. Update review tests that previously assumed specification-only HUMAN defaults; retain explicit all-LLM scripted fixtures.
- [x] Run focused documentation/installation/walkthrough checks; scan references to removed summary requirements, including checker REQUIRED and installation inventory.

## Task 4 — Preview upgrades and assess tasks

Files: `cli/releases.py`, `release.json`, installed receipt schema/reader, Update schema as needed; new `tests/test_cli_update_plan.py`.

- [x] Add fixtures for an initial release, compatible next release and unsupported candidate. Cover customized profile, adapter additions, edited managed files, unknown files and missing ownership receipts.
- [x] Implement `plan_update`: verify candidate resources and baseline ownership, preserve settings, calculate managed changes, validate retained record formats and replay eligible pending tasks with candidate readers without writes. Do not infer compatibility from matching version labels; distinguish existing task failures from new reader incompatibilities.
- [x] Recognize a finished run only from a valid retained COMPLETE report whose recorded journal hash matches. Current repository source drift does not erase that historical outcome. Missing/inconsistent reports or unsupported formats produce UNKNOWN with an action.
- [x] Report each unfinished task's phase, compatible/incompatible/unknown impact and action. Open operations, unknown/incompatible tasks or unsupported completed-history formats block publication. No forced migration or automatic task rebase.
- [x] Implement `bh update [--kit PATH] --dry-run`; absence of `--kit` means packaged kit. `--baseline PATH` is explicit legacy adoption using verified managed bytes. Missing proof stops unchanged with a concrete diagnostic.
- [x] Run `python -m unittest discover -s tests -p 'test_cli_update_plan.py' -v`. Assert dry-run byte equality and same-release no-op behavior.

## Task 5 — Apply and recover updates

Files: `cli/update.py`, existing maintenance schema/checker, helper write locks in journal/command/report paths; new `tests/test_cli_update.py`.

- [x] Add failure injection for concurrent edits, interruption before/after replacement, validation failure, disk write failure and repeated invocation. Assert no overwritten local edits or lost histories.
- [x] Stage reviewed candidate bytes and before bytes under the existing maintenance record. Use one shared publication guard observed by current helper writes; require quiescent operations for legacy entry points that cannot honor it. Recheck hashes immediately before publication.
- [x] Preview and request confirmation; `--yes` may confirm a valid plan but never bypass compatibility/conflict checks. Apply explicit file changes and a fresh configuration ID (preserving all settings), verify them, then publish receipt and PUBLISHED outcome.
- [x] Restore only files whose bytes still match this update's candidate; preserve later edits and report unresolved recovery. Rerunning update reconciles pending work before starting again. Doctor reports interrupted state and affected files.
- [x] Verify active tasks retain configuration and pending review references; completed histories, evidence and old Markdown files remain readable/unchanged. Do not change Python environments during update.
- [x] Run `python -m unittest discover -s tests -p 'test_cli_update.py' -v`; inspect before/after inventories and recovery records.

## Task 6 — MVP acceptance and handoff

Files: CLI tests, `tests/demo/run.py`, existing project checks/docs, packaging metadata and optional CI matrix.

- [x] Run the full existing suite plus CLI suites. Extend documentation checking to include these current CLI docs while excluding historical research/reviews; apply the 200-word limit to the review spec, not internal design/plan notes.
- [x] Run two disposable scenarios: init with missing adapters then a small authorized task; compatible update preserving settings/history, plus injected interruption and recovery in the same update exercise. Use clearly labelled simulated approvals where needed.
- [ ] Exercise installed wheels on Windows, macOS and Linux with Python 3.11 and 3.14. Record unavailable environments honestly; grammar-only checks do not prove portability.
- [x] Review the complete diff and update implementation status/verification with actual results. Keep existing independent demo untouched; do not commit or push unrelated work.

## Self-review

- [x] Every spec row maps to a task; human review defaults and existing histories are covered.
- [x] Status/doctor behavior, live versus recorded findings, and normal versus critical gaps are distinct.
- [x] Removed-summary consumers are included; Markdown is an optional export.
- [x] Legacy ownership, task completion identity, compatibility and interruption have explicit refusal/recovery behavior.
- [x] No registry, config editor, automatic migration or parallel runtime management added.
- [x] Spec approved; begin implementation in task order.

## Execution ledger — 2026-10-12

- Policy reread; isolated worktree includes all current changes. Independent demo is excluded.
- Preflight: Tasks 1/2 share installed resources; Task 3 removes summary consumers; Tasks 4/5 share ownership plans and write guards.
- Ruling: keep this ledger in the existing plan, avoiding another tracking directory.
- Ruling: native Windows/Linux execution depends on available runners; add the platform matrix and report actual local coverage honestly.

- Baseline: 107 tests ran; seven review fixtures failed because the user changed defaults to HUMAN for all phases except initialization. Fixtures now explicitly approve research/pattern results; the policy is preserved.
- Task 1 RED: CLI init/help tests failed because no entry point existed. First GREEN pass exposed a schema tying kit version to record format; separate those version meanings.

- Task 1/2: initial eight CLI tests passed; wheel built and installed outside the checkout, including entry point/assets.
- Task 3: removed automatic summary generation and updated consumers; retained JSON handoff and explicit Markdown export. Updated HUMAN-default fixtures.
- Task 4/5 RED: seven updater tests initially failed on missing modules. Tests then caught candidate-path canonicalization and an invalid maintenance-check record; corrected both.
- Task 4/5: compatible publication, dry-run equality, settings/history preservation, baseline adoption, conflicts and interruption recovery passed targeted tests.
- Ruling: preserve comments when replacing only the profile configuration ID; do not reserialize user settings.
- Ruling: baseline adoption requires release-aware ownership metadata. Pre-CLI ownership is unknown and requires separately reviewed migration; guessing would risk replacing custom definitions.
- Ruling: use one stdlib OS file lock for shipped helper writers and publication. External editors remain outside the lock; hash comparisons refuse detected conflicts.
- Full review: reproduced missing historical completion after source drift, doctor diagnostic loss for unavailable dependencies/requirements, and terminal recovery status written too early. Added regressions and corrected these paths.
- First full run: 128 tests, one failure (setup guide exceeded 200 words by one); shortened the guide. Re-running after review fixes.

- Follow-up review: all four findings addressed; no remaining findings within that review scope.
- Disposable JavaScript exercise: success COMPLETE; failure/repair COMPLETE with two retained failure records; compatible upgrade PUBLISHED preserving both tasks. Independent demo untouched.
- Final guide checks: development 185 words, maintenance 181 words, setup 198 words.
- Release receipt canonical JSON now agrees with the shared reader for Unicode asset paths; added a regression.
- Ruling: return only task-changed files to the original working tree after comparing its baseline hashes. Preserve uncommitted user work; no merge, commit or push is requested.

- Tasks 1–5 complete. Task 6 local checks complete; native Windows/Linux remain pending external runners.
- Final checks from the original BoneHarness path: 137/137 passed on macOS/Python 3.11.16 and 137/137 on macOS/Python 3.14.0. Includes wheel build/install outside the checkout.
- Required-helper regression: doctor now detects missing view/guard scripts after a configuration publication. Failure evidence remains directly linked after repair.
- Documentation checker: current links and human-page limits pass. Added six-job Windows/macOS/Linux × Python 3.11/3.14 CI matrix; no remote run claimed.
- Reviewed changes copied back only after original-file hash comparison. Unrelated uncommitted work preserved. No commit/push; independent demo untouched.

## Setup handoff correction

1. Derive setup completion from the existing installation record and checker findings.
2. Show unfinished setup and a copyable adapter-configuration prompt in the shared view.
3. Keep optional adapter gaps separate; retain the task-start prompt for completed setup.
4. Align the quickstart and specification. No record migration or adapter execution.

Implemented in TypeScript views/types. Test suite not rerun for this wording and handoff change.

## Interactive setup preferences

1. Embed the introduction and all 11 configurable phase blocks in setup.md. Each block contains an exact one-sentence description and question. First response: introduction plus research; stop for the answer. Present remaining blocks individually without discovery commands or rephrasing; profile reads/writes preserve answers. Keep the static sequence aligned when the workflow changes. Each displayed message stays under 200 words. Save selected connections after each answer; assess and verify after choices.
2. For each “no”, ask whether to skip the optional phase or find a way to perform it; confirm scope. Mandatory specification phases remain.
3. Keep the complete instructions in setup.md; CLI/bootstrap prompts reference that guide with one sentence. Preserve supplied rules in installed guidance; task skips retain existing authorization requirements.

The initial guide/prompt change added no configuration fields. The incremental-save extension below adds the optional setup answers. Automated tests were not run for these changes.

## Save setup progress after each reply (superseded below)

1. Add optional `setup_answers` to the profile schema/type and an empty map to new profiles. Each entry has the user's `answer` and `resolved`; no separate progress counter.
2. Save and read back every answer before the next question, including unresolved follow-ups. Update concrete adapter selections as NOT_ASSESSED; preserve other fields and prior choices.
3. Resume from the first missing/unresolved phase; preserve supplied rules and existing review settings. Add the setup recovery link.

Implemented. Existing installations are unchanged; no task-skip or compatibility semantics changed. Automated tests not run for this change.

## Adapters for every customizable phase

Goal: support 11 optional phase adapters; initialization stays internal with LLM review by default. Scope: [spec.md](spec.md), [design.md](design.md).

- [x] Extend profile and assessment schemas with specification, verification_plan, implementation_plan, implementation and specification_verification. Keep added keys optional for older profiles; retain existing pattern_search/test names.
- [x] Add the five entries to new profile templates and context extraction. Preserve generic operation matching, evidence validation and human-review gates. Missing optional bindings now report ACTION_NEEDED; see the status simplification below.
- [x] Rewrite setup as 11 fixed questions, starting with research. Save each reply/adapter together; ignore legacy initialization answers for interview progress. Keep specification questions mandatory.
- [x] Align development/adapter guidance and current design/spec docs. Build bundles and inspect affected call sites. No test additions or execution requested for this change.

No installed demos or captured task configurations are edited.

Outcome: added five optional schema entries and assessment names, template defaults and context mappings. Existing operation matching already uses phase IDs for these entries. Build succeeded; automated tests were not run.

## Two actionable adapter statuses

- [x] New profiles use OK/ACTION_NEEDED plus a clear reason; remove the separate setup_answers map from new output. Read older statuses/answers without rewriting histories.
- [x] Preserve matching assessment requirements for connected OK adapters and reject null connections for execution operations. Update checker, context, reporter and CLI readers together.
- [x] Save setup replies directly in adapter entries, resume ACTION_NEEDED entries, and align setup/maintenance/examples/design/specification.
- [x] Build and type-check passed. Automated tests were not run for this change.

Setup presentation wording shortened: retained exact display/wait order, per-reply save/readback, recovery, scoped skips and evidence requirements. Removed the repeated YAML example and explanations. Documentation only; no runtime behavior changed.

## Distinguish configuration changes from BoneHarness updates

- Retitle the existing maintenance guide “Change repository tools or settings”; preserve its path and records.
- Add a short “Update BoneHarness” guide: obtain the newer kit, then preview/apply its changes per repository.
- Link both explicitly from setup/README and related guides. `bh update` does not download a release.

Documentation only; no runtime behavior or installed demo changes. No build or tests needed for these wording/link changes.

## Framework layout reorganization

Goal: install from `builder-kit/harness/`; group workflow guides, keep blank forms in `framework/templates/`, and put validation definitions in `framework/schemas/`.

Preserve Node.js 22+, all phase/review/evidence rules, user configuration, and immutable task captures. No demo edits or record migration. Existing Node.js installations must remain inspectable and update safely; Python upgrades stay unsupported.

1. [x] Establish the existing suite baseline. Add installation/navigation, packaged-install, legacy task continuation, compatible update, conflict and rollback regression tests before moving files; observe the new-path assertions fail.
2. [x] Move the source bundle, workflow guides and schemas. Update packaging, consumers and Markdown links. Use one small layout resolver for historical framework paths; reject incomplete/mixed layouts rather than concealing missing files.
3. [x] Update the design, specification and directory overview. Keep task captures and historical fixtures byte-identical.
4. [x] Run the targeted tests, full suite, typecheck, document checker and package install test. Report pre-existing failures separately and record any remaining platform limits.

Review focus: published package contains the bundle; old task context/report/journal remain usable; pending human review stays pending; updates preserve profile/history and reject edited or colliding files; rollback restores the old layout.

Verification (macOS arm64, Node.js 24.10.0): six layout tests failed before the move, then passed; two additional failure-path tests cover mixed schemas and missing current guides. Full suite: 165 cases, 164 passed, one Windows-only skip. Typecheck, formatting, 46-document/101-link checks and whitespace checks passed. Package installation outside the checkout and the temporary JavaScript build/test walkthrough passed.

A separate smoke check installed the actual saved pre-change kit binaries, then updated to the new kit: the pending-review task stayed BLOCKED, the completed task stayed COMPLETE, and captured configuration/history bytes stayed unchanged. This also exercised the old source-kit layout through --baseline after removing its receipt.

Baseline cleanup: three pre-existing failing tests exposed old six-adapter/status, single-page setup and whole-questionnaire length assumptions. Tests now cover the existing eleven adapters, bounded pagination and each displayed setup message; profile hints were shortened. Human-review wording now matches the existing HUMAN default except initialization. No phase, review or evidence policy changed. Independent demo, historical fixtures and prior uncommitted work were preserved. Native Windows/Linux runs remain pending.
