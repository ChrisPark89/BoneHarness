# Harness builder kit: research and scenario review

Reviewed: 2026-10-04. Status: findings and proposed amendments, not a replacement approved specification.

Follow-up: the proposed [consolidated specification](../specification.md) and [48 acceptance scenarios](../acceptance-scenarios.md) now translate these findings into requirements. They have received document consistency checks and scoped independent review; no claim of runtime implementation or native three-platform validation follows from that review. The frozen candidate and original audit evidence below remain unchanged.

## Conclusion

Keep the installer/runtime boundary, the separate development and maintenance workflows, the shared definitions, and the preferred development state machine. They form a useful foundation for a repo-specific harness.

The present documents do **not yet establish a deterministic, general-purpose implementation**. The main path is coherent, but scenario traces expose missing exits, conflicting configuration ownership, and incomplete recovery rules. The kit also names verifiers without defining enough of their machine-checkable behavior for two independent installers to produce equivalent harnesses.

The recommended next version is a **language-independent specification with precise schemas, transition rules, and conformance scenarios**. Installation may execute scripts and must support Windows, macOS, and Linux. The user has chosen an **optional, highly recommended Python installation checker**: Python is a prerequisite only for that optional path. Installation verification criteria remain required and can be assessed through the checklist with evidence or equivalent approved tools. For runtime verification, use a tool/skill's own validation when available and require the coordinating LLM to separately assess stage-relevant evidence against the task's specification and design. Mechanical enforcement still depends on the installed capabilities; the two assessments do not imply that an enforcing runtime tool exists.

This is a design assessment, not proof that a harness works in the private repository. No LLM, real build, or real test system was exercised. Adapter compatibility continues to mean structural and policy fit; it does not certify tool-work accuracy, reliability, or truthful reporting.

## 1. What was reviewed

### Local references

- [Original harness design](../research/agent_development_harness_design.md): layered architecture, explicit state, revision-bound evidence, remote-build constraints, repair budgets, and progressive disclosure.
- [Master instruction](../research/agent_harness_master_instruction.md): evidence vocabulary, deterministic checks, state artifacts, scope control, and uncertainty handling.
- [Pilot proposal](../research/agent_harness_team_pilot_proposal.md), [brief proposal](../research/agent_harness_team_pilot_proposal-brief.md), and [quick start](../research/agent_harness_quick_start.md): incremental adoption and the risk of building an oversized platform.
- [Current builder kit](../../builder-kit/README.md), [approved maintenance design](../../archive/2026-10-03-maintenance/design.md), and [implementation plan](../../archive/2026-10-03-maintenance/implementation-plan.md).
- The newer, partially delivered candidate from the temporary worktree. A [frozen copy](../../archive/2026-10-04-design-audit/candidate) and [file hashes](../../archive/2026-10-04-design-audit/snapshot.json) preserve exactly what was reviewed.

The reference documents describe a particular mixed-language environment with remote builds and separate integration tests. Those are valuable scenario inputs, not requirements to impose on every target repository.

### Delivery state

The main workspace still has the flat runtime templates. The temporary worktree contains the development/maintenance/shared split and maintenance/result-schema work through commit `a280bd1`. Its last installer-document task was interrupted, with three uncommitted installer-document edits and an unfinished README update. These are delivery gaps, distinct from design defects below. Earlier task reviews did not cover the complete set of cross-workflow scenarios examined here.

### Verification performed

The [reproducible audit](../../archive/2026-10-04-design-audit/audit.rb) parses the four candidate YAML files, checks declared state endpoints and transition IDs, checks the main path, and traces selected guard cases. Run it from the workspace root with:

```sh
ruby archive/2026-10-04-design-audit/audit.rb
```

[Results](../../archive/2026-10-04-design-audit/audit-results.json): **4 checks passed, 6 exposed gaps, and 1 found unspecified behavior**. These are narrow static checks and explicit scenario traces, not a production success rate or a complete formal verification. Natural-language guard names were not treated as executable code. The scenario matrix below includes additional manual inspection.

## 2. Current primary-source research

These publications provide techniques and case studies, not a universal harness standard. The proposed applications in the last column are our design recommendations.

| Source | Relevant observation | Application to this kit |
|---|---|---|
| [OpenAI: Harness engineering](https://openai.com/index/harness-engineering/), February 2026 | Uses a short repository entry document, indexed knowledge, and mechanical checks for structural invariants. The article explicitly limits generalization from its repository. | Keep the small installed entry point; specify checks for links, schemas, configuration ownership, and state transitions. Keep large research documents as installer references. |
| [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), November 2025 | Separates initialization from subsequent work and persists structured progress and session handoffs. | Preserve the installer/runtime separation and add a defined resume record for installation and development. A checklist needs evidence and durable state behind it. |
| [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), December 2024 | Distinguishes predefined workflows from autonomous agents and recommends starting with simple, composable patterns. | Keep evidence gates explicit while allowing the LLM to choose how to investigate and implement within a stage. Avoid a mandatory multi-agent platform. |
| [Anthropic: Harness design for long-running applications](https://www.anthropic.com/engineering/harness-design-long-running-apps), March 2026 | Evaluates harness components and removes some scaffolding when it no longer improves results. | Treat repair automation and extra review passes as configurable features. Reassess them with scenario evidence rather than making every feature universal. |
| [Anthropic: Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents), April 2026 | Separates durable session records, orchestration, and execution behind stable interfaces. | Separate persisted harness state from the LLM conversation and from adapter implementation. Reuse the boundary principle without adopting a hosted service. |
| [OpenAI: Symphony](https://openai.com/index/open-source-codex-orchestration-symphony/) | Describes limitations of rigid agent-role transitions at broad ticket scope while still specifying orchestration state and a single state owner. | Keep this state machine scoped to a software-change workflow. Do not force research-only tasks or all repository activities through a build/test pipeline. |
| [GitHub: Spec Kit](https://github.com/github/spec-kit), current repository | Provides structured processes, reusable templates, and distinct entry points for feature work, bug fixing, and assessment. | Separate universal invariants from installed workflow profiles. Reuse explicit artifacts and agent integration boundaries; importing the whole tool is unnecessary. |
| [Agent Skills specification](https://agentskills.io/specification) | Defines skill packaging and progressive loading; the Markdown body has no mandated execution-result format. | A skill remains an implementation option. Add a harness adapter or normalizer for the required result format. A valid SKILL.md alone does not establish harness compatibility. |
| [MCP tools specification, 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) | Supports explicit output schemas and client validation of structured tool results. | Borrow schema validation at the adapter boundary. MCP itself remains optional; CLI, CI, skill, and manual-procedure adapters can expose the same harness interface. |
| [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), January 2026 | Distinguishes task outcomes from transcripts and describes deterministic, model, and human graders. | Evaluate the harness using controlled inputs and expected resulting state. Grade its transitions, records, and preservation of bindings, without evaluating an external tool's work quality. |

The apparent tension between rigid workflows and agent flexibility is manageable: **fix the evidence and authority boundaries; allow freedom inside each stage**. Neither OpenAI's ticket orchestration nor Anthropic's application experiments prove that this user's build-before-test workflow should be removed.

## 3. Preserve the two verification purposes

| Verification | Question answered | Evidence and output | Claim it does not make |
|---|---|---|---|
| Installation structure | Did the installer create the required artifacts and valid rules? | Manifest, schema/link/graph checks, criterion IDs with evidence; `INCOMPLETE` or `STRUCTURE_COMPLETE` | That every capability is configured or every tool works correctly |
| Capability integration, during installation or maintenance | Can the harness invoke/consume the declared adapter under the configured policy? | Interface checks, permission prerequisites, status-routing fixtures; readiness by capability/profile | That a representative `PASS`/`FAIL` report is truthful or that the tool performs good work |
| Runtime stage verification | May this task advance on the supplied evidence and approved requirements? | Tool/skill validation when available, expected invocation/adapter/revision/target identity, and a separate coordinating-LLM review against stage-relevant specification/design criteria | An LLM's assessment is not proof that an unexecuted check ran or a replacement for required build/test evidence |

The first two rows are related structural/integration checks. Maintenance reuses them; it does not introduce an external-tool quality assessment.

Runtime conformance review can inspect the actual implementation, supplied artifacts, and verification evidence against the approved task specification and design. This is broader than installation compatibility checking. Preserve the tool's reported outcome and the LLM's criterion verdicts separately; a tool-level PASS alone does not establish task conformance.

A compatible adapter may emit a well-formed `FAIL`, `BLOCKED`, or `UNKNOWN`. Its interface can still be compatible while the development task cannot advance. Missing required identity fields or malformed output are a different problem: those do not meet the result schema.

Likewise, synthetic compatibility fixtures must be identified as fixtures and can never satisfy a real development stage. A real invocation's evidence must match that invocation and the relevant source/configuration snapshot.

## 4. Findings that should change the design or candidate

### F-01 — State and verifier semantics remain underspecified

The workflows use strings such as `parseable_revision_bound_build_adapter_result`, `promotion_policy_passed`, and `same_capability_scope`. They identify intended checks but do not define their inputs, outputs, ownership, or complete failure behavior. YAML parsing cannot verify those meanings.

**Amendment:** Define a small transition-evaluation interface: expected current state/version, transition ID, evidence references, and pinned configuration. Return an explicit allow/deny/blocked decision with reasons. Unknown guards, unresolved verifier bindings, ambiguous applicable transitions, and invalid evidence cannot authorize progression. State mutation occurs only after the check succeeds. A repo-local implementation may use any suitable language.

This provides deterministic decisions for the defined data and rules. Preventing an agent from bypassing the checker additionally requires integration with the host or CI; a script plus instructions alone is not a security boundary.

### F-02 — Structural completion can be reported despite failed structural checks

The candidate checklist calculates structure completion from I-02–I-12, but the parse/link/transition check is I-13. The older checklist has the same inherited omission with different IDs. See [candidate checklist](../../archive/2026-10-04-design-audit/candidate/installer/installation-checklist.md), lines 40 and 59–61; audit V-10.

**Fix:** Classify each criterion as structural or integration-related, and calculate status from that classification. Every required structural check must pass, including schema parsing and transition consistency. An explicitly pending adapter can satisfy its structural representation check while integration remains partial. Render tick boxes from these records so a marked box always has criterion evidence.

### F-03 — An adapter swap has two competing configuration authorities

Both [development/workflow.yaml](../../archive/2026-10-04-design-audit/candidate/templates/runtime/development/workflow.yaml), lines 35–60, and [shared/repo-profile.yaml](../../archive/2026-10-04-design-audit/candidate/templates/runtime/shared/repo-profile.yaml), lines 35–91, contain mutable bindings. Maintenance updates shared profile/status only. The development copy can remain pending or point at the old adapter. Audit V-05.

**Fix:** The shared profile owns active capability bindings. Workflows contain capability references and gate rules. `harness-status.md` is a derived report with the assessed configuration revision. Shared definitions stay under `shared/`; both kinds of run evidence remain in their separate workflow directories.

### F-04 — Repair termination is not total

With loops enabled but no remaining attempts, the failed state cannot enter `REPAIRING`, and its escalation edge is guarded by loops being disabled. The exhaustion edge starts at `REPAIRING`, which is now unreachable. No-new-evidence has the same issue. See [development workflow](../../archive/2026-10-04-design-audit/candidate/templates/runtime/development/workflow.yaml), lines 132–181; audit V-06/V-07.

**Fix:** From each failed state, repair only when enabled, budget remains, scope permits it, and there is new evidence. Otherwise take a defined stop route with a reason. Specify what an attempt counts, when its counter increments, and that resuming a session does not reset the budget. Bound expensive remote invocations and waits as well as code-repair attempts. Keep loops disabled by default.

### F-05 — Compatibility status is still partly coupled to tool outcome

M-04 excludes all `UNKNOWN` results. The explicit pending route handles only absent/malformed results. A structurally complete fixture reporting `UNKNOWN` falls between these rules. See [maintenance workflow](../../archive/2026-10-04-design-audit/candidate/templates/runtime/maintenance/maintenance-workflow.yaml), lines 46–50 and 105–112; audit V-08.

**Fix:** Separate `result_shape_valid`, `status_route_valid`, and policy checks from `reported_outcome`. Use representative PASS/FAIL/BLOCKED/UNKNOWN fixtures to check routing. Well-formed UNKNOWN is compatible if its safe stop is defined; runtime UNKNOWN still cannot advance. Missing compatibility evidence stays pending; known structural incompatibility is rejected; policy decisions use the human route. Define that precedence explicitly.

### F-06 — Approved migrations can loop back into approval

Human approval resumes at `PLANNED`, but M-08 still requires no permission expansion and an unchanged interface. There is no post-approval promotion alternative for the approved change. See [maintenance workflow](../../archive/2026-10-04-design-audit/candidate/templates/runtime/maintenance/maintenance-workflow.yaml), lines 70–75 and 119–133; audit V-09.

**Fix:** Define two promotion paths: a compatible change allowed by existing policy, or an explicitly approved migration whose checks have completed. Bind approval to the candidate/configuration version and exact scope. Approval cannot make an unsupported interface parseable; its migration must actually supply the compatible validator/adapter changes. Workflow/structural migrations need the same explicit treatment.

### F-07 — Drift detection and mutation are insufficiently separated

No-change drift has a closeout. Changed or missing evidence has no findings-only closeout that marks affected capabilities `NEEDS_REVIEW` and readiness `PARTIAL`, as required by the approved design. M-10 also allows drift to reach promotion without naming the applicable adapter or source check. See [maintenance workflow](../../archive/2026-10-04-design-audit/candidate/templates/runtime/maintenance/maintenance-workflow.yaml), lines 81–102, and [approved design](../../archive/2026-10-03-maintenance/design.md), line 138.

**Fix:** Drift assessment records findings and affected readiness without changing active bindings. Any proposed reconciliation enters the appropriate adapter/fact/migration path and passes its checks before promotion. A completed review may report unresolved drift; review completion is not integration readiness.

### F-08 — Persistence, asynchronous work, and concurrent updates need explicit rules

[Development instructions](../../archive/2026-10-04-design-audit/candidate/templates/runtime/development/HARNESS.md), lines 9–10, create a task and start at NEW but do not define resumption. No development resume section exists. Invocation IDs are useful but insufficient to specify whether to reconnect or submit again. The [maintenance record](../../archive/2026-10-04-design-audit/candidate/templates/runtime/maintenance/templates/harness-update-record.yaml) is called append-only while containing a single changing lifecycle field.

**Amendment:** Persist current state, state version, source/diff identity, configuration revision, pending invocation handle, counters, stop reason, and the state from which work stopped. Preserve transition events and evidence references. On resume, reconcile the existing external invocation first; do not automatically submit another build. A running operation remains BUILDING/TESTING and has a separate invocation lifecycle until it has a terminal outcome or reaches a defined deadline. Unknown external status requires reconciliation, not blind retry.

Use immutable event entries with an explicitly derived current snapshot, rather than claiming mutable scalar fields are append-only. Pin each task to its configuration snapshot. Before maintenance promotion, compare affected active values with the captured before-values; on conflict, re-inspect. Rollback must not overwrite a newer accepted update. Full multi-user orchestration is unnecessary for this minimum rule.

### F-09 — Portability requires explicit applicability and target selection

The installer permits explicit stage exceptions, but the default workflow demands a build artifact and a tested build ID. Marking build `NOT_APPLICABLE` alone provides no usable route. Singular bindings can aggregate a monorepo, but required target coverage is not specified. See [installer specification](../../archive/2026-10-04-design-audit/candidate/INSTALLER_SPEC.md), lines 163–174, and [development workflow](../../archive/2026-10-04-design-audit/candidate/templates/runtime/development/workflow.yaml), lines 117–162.

**Amendment:** Preserve the current sequence as the default build-before-test profile. Supply an explicit adaptation example for source-only tests or documentation work: record applicability and its authority, configure the alternate transition, and never manufacture a build PASS. Keep task type distinct from component/target. For monorepos or separate test repositories, record target/environment identities, required target coverage, source revisions, consumed artifacts, and aggregate-result policy. A composite adapter is sufficient; a new scheduler is unnecessary.

### F-10 — Installation needs a recovery and ownership record

The procedure preserves existing instructions, but does not fully distinguish fresh install, interrupted scaffold, and an existing live harness. It has no persistent installation inventory or activation/resume rule.

**Amendment:** Keep an installer-side progress record with installation ID, kit version, target identity, discovered facts, owned/generated paths, checklist evidence, and pending decisions. Reinspect on resume and preserve user edits and existing run histories. Define how root and nested instructions interact and record unresolved conflicts. Activate the installed entry point after its structural checks pass; expose integration limitations clearly. Retain the installation result/provenance in the target without copying installer operating instructions into runtime.

## 5. Scenario walkthroughs

“Coherent” below means the documented path makes sense under its named prerequisites. It does not mean an executable implementation or private-repo integration has passed a test.

| Scenario | Current assessment | Required behavior / adjustment |
|---|---|---|
| Compiled project, all adapters configured | Main path coherent | Follow the preferred sequence; advance only on evidence matching the expected invocation and revision. |
| Unknown test skill during installation | Boundary is sound | Create the complete scaffold; test binding pending; structure complete only after structural checks; integration partial; stop at the test gate. Fix checklist calculation F-02. |
| Build/test failure, repair disabled | Coherent | Failed state → HUMAN_REQUIRED with diagnostics and a resolution request. |
| Failure, repair enabled, budget available | Coherent for an attempt | Failed state → REPAIRING → PREFLIGHT → build → test. Preserve old evidence. |
| Failure at exhausted budget or with no new evidence | Declared dead end | Add failed-state termination and counter semantics (F-04). |
| Valid BLOCKED development result | Explicit safe stop exists | Preserve evidence and return state; add the resume procedure (F-08). |
| Missing or malformed development result | Explicit safe stop exists | Record UNKNOWN diagnostic; no pass. Preserve the raw failure evidence. |
| Well-formed UNKNOWN result | Maintenance mismatch | Compatibility may accept its shape and safe route; development blocks. Separate verdicts (F-05). |
| Remote build runs for 30 minutes; LLM restarts | Underspecified | Restore BUILDING, reconnect to the recorded external run, check the input snapshot, then collect its result. Do not submit twice. |
| Source changes while a build is running | Partial support | Existing invalidation principle is sound; reject late stale evidence, record it, and explicitly restart from the required stage. |
| Build succeeded but evidence belongs to another target/test revision | Partially specified | Match task, invocation, target, source/configuration identity and required build lineage, not only the reported PASS field. |
| Add `new-build-tool` with structurally valid FAIL example | Correct compatibility principle | The fixture can establish interface fit; it is never task evidence. Promote only under the integration policy, using one canonical binding. |
| Candidate has unsupported status or unsafe failure mapping | Routes ambiguous | Reject demonstrated incompatibility; keep the current adapter. Missing evidence → pending; policy decision → human. |
| Approved permission/interface migration | Promotion path incomplete | Revalidate the approved exact change and migration support; then use a defined approved-promotion edge (F-06). |
| Correct a repository fact from an authoritative source | Ordinary path coherent | SOURCE_VERIFIED → promotion → status update; retain source, prior value, and rollback information. |
| Watched sources unchanged | Coherent | DRIFT_ASSESSED → STATUS_UPDATED → COMPLETE without promotion. |
| Watched source changed or disappeared | Closeout incomplete | Record findings and affected NEEDS_REVIEW/PARTIAL status; create a checked update if needed (F-07). |
| Development uses adapter A while maintenance promotes B | Underspecified | Existing invocation stays pinned to its captured configuration; new invocations use B under an explicit task migration policy. |
| Source-only or docs-only repository | Installer adaptation possible, example missing | Configure an evidence-backed applicability route; tests may consume source rather than a compiled artifact. No counterfeit build PASS. |
| Monorepo or separate integration-test repository | Extensible, not yet deterministic | Specify selected targets, required coverage and cross-repo lineage; block unresolved targets rather than silently excluding them. |
| Repeated/interrupted installation | Recovery contract missing | Resume using inventory and evidence; preserve existing files and histories; inspect instruction conflicts before activation. |
| Tool reports PASS but a planned scenario is missing | Runtime review rule required | Preserve the tool PASS, record the uncovered criterion, and withhold the affected transition. Request the missing evidence or use the declared remediation route. |
| A required tool check fails but the LLM thinks the change is correct | Runtime review rule required | Preserve the failure and follow the failed/blocked route. The LLM cannot replace a required tool result with its own approval. |
| Specification or design changes after verification | Review baseline must change explicitly | Record the newly accepted version and re-evaluate affected evidence and criteria before progressing. Do not rewrite requirements merely to justify an existing PASS. |

### An end-to-end usage example after these amendments

1. The LLM receives the builder kit and inspects the private repository. It discovers a remote build skill and cannot establish the test invocation. It generates the development, maintenance, and shared structures, with repair loops disabled. It records the test capability as pending instead of inventing a command.
2. Structural checks pass, so installation is `STRUCTURE_COMPLETE`; integration is `PARTIAL`. The report identifies the unresolved test capability. A development task may prepare research and its verification plan, but cannot pass the required test gate. The task should expose this known limitation before spending time on an expensive build.
3. A maintainer later provides the test skill, or asks to replace the build skill with `new-build-tool`. The installed maintenance workflow stages that specific binding. It checks the schema, identity fields, declared permissions, and the harness response to representative outcomes. It can do this with fixtures; it need not certify the underlying build/test work.
4. If the update fits the existing policy, maintenance promotes the binding in the single canonical profile, increments its configuration revision, writes its update history, and recomputes readiness. If it does not fit, the existing binding stays active and the record explains rejection, missing evidence, or the precise decision needed.
5. A new task uses the new configuration. A previously blocked task explicitly adopts the updated configuration after checking which evidence remains valid; it does not silently change adapters halfway through a run. The task follows the normal state sequence. If the LLM restarts during a remote build, it restores the recorded invocation and checks that job rather than submitting another one.
6. The coordinating LLM uses adapter-reported build/test results and any native validation as evidence, then separately reviews stage-relevant criteria against the task specification and design. Progression requires the applicable mandatory tool checks and the LLM's criterion review. A failed result either enters a permitted, bounded repair loop or a defined stop state; missing evidence does not become an assumed pass. `COMPLETE` follows the repository's recorded completion policy and can still require human review. The builder documents are never consulted during these operations.

## 6. Recommended architecture and alternatives

| Approach | Benefit | Limitation | Recommendation |
|---|---|---|---|
| Documents, schemas, and evidence-backed checklists | Installation can proceed without the optional Python checker | Review does not establish that an automated check ran or that runtime gates are enforced | Supported installation verification path; record method and limitations per criterion |
| Same portable specification plus the optional Python installation checker | Repeatable structural checks and generated installation reports | Requires a supported Python runtime and any declared checker dependencies | Highly recommended; must support Windows, macOS, and Linux |
| Universal orchestration service, scheduler, and tool platform | Centralized scheduling and many concurrent jobs | Much larger scope and deployment assumptions | Defer unless real repository requirements justify it |

The proposed responsibility split is:

```text
Builder kit                 Installed repository
------------                --------------------
Installer specification  →  repo-specific profile and adapter bindings
Templates + schemas      →  development/ and maintenance/ workflows
Conformance scenarios    →  optional cross-platform installation checker
Runtime gate rules       →  local checker, if runtime execution is available
Installation checklist   →  installation result and readiness report

During work:
Approved task specification/design + installed stage criteria
                         ↓
LLM requests work → configured adapter → result + native validation, if any
                         ↓
Coordinating LLM reviews implementation/evidence against applicable criteria
                         ↓
Transition request → installed gate/state tool, when configured
                   → otherwise LLM records through the defined state protocol
                         ↓
                 next allowed stage, or a recorded stop
```

Keep canonical profile/interface/schema definitions in `shared/`. Keep task state, events, logs, and evidence under `development/runs/<task-id>/`. Keep update state, checks, promotion history, and rollback evidence under `maintenance/updates/`. Human-readable checkboxes and status tables summarize those records; they are not an additional authority.

The result schema should define types, required fields, allowed status values, version compatibility, and fields conditional on the outcome. A failed build need not supply an artifact that it never produced. Tests that run against source need not invent a build ID. These variations belong in declared capability/profile extensions. Native skill output may be normalized by an adapter, preserving original evidence and unknowns.

“Any LLM, any repo” should be an adaptation goal with explicit prerequisites: the installer needs the ability to read relevant repository instructions and files, create the installed artifacts, and obtain evidence for its claims. Execution-based checks additionally require an approved execution surface. Missing access must remain an explicit blocker. Portability does not imply that every model can reliably install the kit or that every repository has a build stage.

## 7. Amend the implementation plan

The existing plan is chiefly an authoring/move plan. Complete it against clarified semantics rather than adding more prose around the gaps.

1. **Specify installation and runtime verification responsibilities.** The Python installation checker is optional and highly recommended on Windows, macOS, and Linux. Define its supported interpreter/dependency matrix and a checklist path using the same criteria with explicit evidence and verification methods. Python is not a prerequisite for the kit as a whole. At runtime, consume native validation when available and require a separate coordinating-LLM review against approved task criteria. Record the installed state-writing authority and which gate checks are actually automated.
2. **Revise the specification around F-01–F-10.** Define ownership, result/compatibility distinction, total stop and resume rules, approval handling, drift closeout, and applicability. Retain the approved default state order and optional loops.
3. **Specify conformance fixtures before further implementation.** Each scenario supplies initial state/configuration, input evidence, expected transition/status, and preserved records. Cover both accepted and rejected results, including a compatible adapter reporting FAIL or UNKNOWN. Fix the installation status formula.
4. **Finish the existing candidate.** Reuse Tasks 1–3's completed layout and artifacts; fix their cross-workflow defects. Complete Task 4's installer guidance and README against the corrected definitions. Do not restart the completed move work.
5. **Validate the kit on disposable examples.** Use a minimal compiled fixture, a no-build fixture, and a multi-target fixture. Use synthetic adapter output to evaluate harness behavior. A checkpoint is complete only with evidence of the expected states and records, including interrupted/resumed and rejected-update cases.
6. **Pilot internally.** Have the LLM install in one bounded area of the work repository. It reports structural criteria, integration prerequisites, pending items, and scenario results. Real task builds/tests remain the configured tools' responsibility. Private evidence can stay inside the repository.

Suggested acceptance gates for that revised plan:

- [ ] All structural requirements, including parsing/link/graph checks, contribute to structure completion.
- [ ] Every active binding has one canonical owner; both workflows resolve it consistently.
- [ ] Each supported result class and relevant failure context has a defined, non-contradictory route.
- [ ] Enabled repair always terminates or proceeds within a persisted budget.
- [ ] Resume reconciles existing invocations and does not reset counters or duplicate external work.
- [ ] Tool compatibility checks remain independent of reported work success.
- [ ] Runtime records distinguish the tool's reported result, its native validation when supplied, the coordinating LLM's criterion review, and the resulting transition decision.
- [ ] A tool PASS with uncovered requirements cannot authorize the affected transition; LLM approval cannot override a required failed or missing tool check.
- [ ] Each task identifies the specification/design versions used for review and exactly one authority for committing state transitions.
- [ ] Approved migrations can complete after their specific checks; changed approval scope cannot reuse old approval.
- [ ] Drift can be recorded without promotion; reconciliation cannot bypass its applicable checks.
- [ ] Source/configuration changes invalidate or isolate evidence using explicit identity rules.
- [ ] No-build and multi-target examples have complete applicability/coverage rules.
- [ ] Repeated installation preserves unrelated files, prior runtime records, and resolved decisions.
- [ ] Installation uses the same validation criteria and report semantics on supported Windows, macOS, and Linux environments, with recorded native-platform evidence.
- [ ] Skipping the optional checker is recorded without implying a pass or failure for individual criteria; review or equivalent tooling supplies their evidence, and unresolved checks remain explicit.
- [ ] The published package and installation entry point agree with the approved revision; background research is clearly identified as reference material.

## 8. Confirmed verification decisions

The user confirmed that installation may run scripts and that installation must support Windows, macOS, and Linux. The Python installation checker is **optional but highly recommended**. Its dependencies are required only when that checker is selected; the builder kit has no mandatory Python prerequisite.

Both installation verification paths use the same acceptance criteria. Record each criterion's result, evidence, and verification method: automated, LLM review, or human review. The report also records whether the optional checker ran and any coverage limitations. Skipping it alone does not block installation or lower integration readiness; an unresolved required criterion still prevents its corresponding completion claim. A criterion explicitly requiring execution must be satisfied by an actual run of the checker or equivalent approved tooling. Review alone cannot claim that execution occurred.

For runtime stages, the user selected both sources of verification: use the installed tool/skill's validation phase when available, and have the coordinating LLM separately verify the work against the specification/design created before implementation. These are two inputs within runtime stage verification, not additional installation checks. Section 10 defines the proposed recording and progression rules for this decision.

## 9. Proposed cross-platform installation requirements

These requirements translate the confirmed platform constraint into reviewable acceptance criteria. They are design proposals; no cross-platform installation checker has been implemented or validated yet.

| ID | Requirement | Acceptance evidence |
|---|---|---|
| P-01 | One set of structural criteria, result fields, and documented exit codes applies across all supported hosts. | Equivalent fixture contents produce equivalent semantic reports on native Windows, macOS, and Linux; platform path spellings and timestamps may differ. |
| P-02 | Declare supported host/runtime versions and dependency requirements for the optional checker. Detect an approved usable runtime without implicitly installing one. | Missing prerequisites leave the optional checker not run with a reason; the installer can use the checklist or equivalent approved tools. Unresolved required criteria remain unverified. |
| P-03 | Core installation checks use portable filesystem and process APIs. | They do not require Bash, PowerShell, WSL, Docker, or Unix utility commands. Any optional launcher delegates to the same validation behavior. |
| P-04 | Resolve file references from an explicit harness/repository root and use exact filename casing. | Cases cover a repository path with spaces and Unicode, platform path separators, case mismatch, and execution from another working directory. Preserve filesystem roots and do not resolve references outside permitted scope. |
| P-05 | Define text encoding and parsing behavior. | UTF-8 documents and both LF/CRLF input work consistently. YAML or schema-validation libraries, if used, are declared dependencies rather than assumed installed packages. |
| P-06 | Keep host command invocation explicit. | Invoke executables with separate arguments and explicit working directories; shell scripts and Windows batch commands are handled by declared platform-specific adapters when needed. No shell syntax is assumed portable. |
| P-07 | Structural verification does not depend on a network download, privileged setup, or running a production build/test. | Local structural and synthetic compatibility fixtures run with the declared prerequisites. An approved offline dependency supply can satisfy those prerequisites. |
| P-08 | Record platform coverage honestly. | Publish the OS/runtime matrix and its actual results. Testing on one host does not establish support on the other two; supported OS versions are explicitly scoped. |

A small Python 3 reference checker is a reasonable implementation for the optional path because its standard library provides [filesystem path handling](https://docs.python.org/3/library/pathlib.html), [process invocation](https://docs.python.org/3/library/subprocess.html), and [JSON handling](https://docs.python.org/3/library/json.html). Python availability must be a declared prerequisite for that checker: [Python's Windows documentation](https://docs.python.org/3/using/windows.html) explicitly says Windows does not include a system-supported Python installation. The design must not silently download an interpreter while probing availability. Python's built-in JSON parser does not itself implement JSON Schema validation, and a Python YAML implementation would need a declared parser dependency.

The specification, fixtures, and checklist remain usable without Python. An alternative checker in an available approved runtime may supply evidence, but it needs the same conformance checks; a shared document alone cannot establish equivalence among different implementations. Generating another checker is not required merely because the optional Python checker was skipped.

Installation-host support and tool support are separate: a Windows installation may configure a remote build service. Each build/test adapter declares its own execution environment and prerequisites. Supporting installation on three operating systems does not imply that every repository's production tools run locally on all three.

The saved `audit.rb` remains evidence for this design review. It does not establish a Ruby prerequisite for the builder kit or demonstrate its Windows/Linux installation behavior.

## 10. Runtime validation and coordinating-LLM review

### Responsibilities

1. **Before implementation:** record the accepted task specification/design versions, criterion IDs, and intended evidence/verification method. Changes to this baseline are explicit and require re-evaluating affected evidence.
2. **Tool or skill:** perform its configured work and supply its result and evidence. Use its native validation phase when available; record its actual coverage and outcome. Absence of an optional native validator is not a failed validation. Missing evidence for a mandatory check still blocks that check.
3. **Coordinating LLM:** separately inspect the work and available evidence against the applicable criteria. Check task scope, relevant design constraints, expected target/revision, and verification coverage. Explain each criterion verdict with references. Reading the adapter's summary and repeating PASS is insufficient.
4. **Transition recording:** preserve both assessments and apply the installed transition rules. The LLM requests progression. If an installed gate/state tool exists, it validates the request and is the sole writer for that task. Otherwise the LLM writes through the documented state protocol, with that mode recorded as not mechanically enforced. Work-performing skills do not independently change harness state.

The coordinating LLM can perform this review itself. “Independent” here means a separate assessment grounded in previously recorded requirements and evidence; it does not guarantee statistical independence or require a second agent. Additional checks are driven by the accepted verification plan or a concrete evidence gap, rather than an automatic duplicate build/test run.

### Progression rules

| Tool evidence / native validation | Coordinating-LLM criterion review | Result |
|---|---|---|
| Applicable required checks passed | Relevant criteria satisfied with evidence | Request progression; all remaining transition guards must still pass. |
| Tool reports PASS | Relevant criterion unmet or evidence insufficient | Preserve the tool PASS and the distinct criterion finding; do not advance the affected gate. Use its declared remediation or missing-evidence route. |
| A required check reports FAIL, BLOCKED, or UNKNOWN | LLM considers the work correct | Follow the required failure/stop route; LLM approval cannot upgrade that report. |
| No optional native validation phase exists | LLM reviews available work/evidence | Progress is possible only if every mandatory criterion and evidence requirement is satisfied. Record absent optional validation without fabricating its result. |

Review stage-relevant criteria at each gate. Before the task specification exists, use the request and installed criteria for baseline/research/specification stages. After SPEC_READY, use the accepted task specification/design as the review baseline. At SPEC_VERIFIED, reconcile the complete required acceptance matrix. A build-stage review need not demand evidence that is intentionally produced later during testing.

Each transition record should reference: task/stage identity, source and configuration identity, specification/design version, tool result and native-validation evidence if supplied, criterion-level LLM verdicts and evidence, unresolved findings, requested transition, final gate decision, and recording authority. These are separate record fields; a tool outcome, an LLM criterion verdict, and a workflow state must not be conflated.

Installation and maintenance compatibility checks remain limited to the harness interface and declared policy fit. Runtime review assesses whether this task's work meets its requirements; it does not certify the tool itself as accurate or reliable.
