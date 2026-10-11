# Final review record — initial findings (historical)

This is the unchanged body of the independent final review at `d60d33a`, before correction `7db46b0`. Its I-1 finding is closed by the [current scoped re-review](final-rereview.md). Its initial “not ready” verdict is historical. M-1 remains nonblocking and deferred. [Decision record](review-decisions.md) preserves controller adjudications; [review digest](implementation-review.md) gives the current result.

---

# Final independent whole-kit review

Reviewer: Codex `/root/final_whole_kit_review`, 2026-10-05.

Reviewed base `7c04c5920d72f69135c089851562665acacdc9a4` through head `d60d33a2c11298613e3eeb5ec72cd70a782d031a` in `/private/tmp/harness-builder-20261004-efv7l2ai/work`. Applied the supplied `requesting-code-review/code-reviewer.md` instructions. No subagents, implementation/index/HEAD/branch changes, full-suite reruns, dependency installation or external service actions. This process report is the sole checkout write.

## Strengths

- The package delivers the requested installer kit, with short install/develop/maintain entry points. The installed guides refer to the installed profile, rules, schemas, criteria and record templates; the builder and authoring specification are not runtime dependencies. Development, maintenance and installation records have distinct homes. The canonical maintenance entry is consistently `maintenance/harness-maintenance.md`.
- Installation distinguishes a complete structural scaffold from integration readiness and actual tool outcomes. Unknown facts have typed pending values and explicit stop consequences. The activation contract resolves the bootstrap dependency honestly: staged pointer eligibility does not claim completed provenance, and final completeness follows actual activation, reread, prospective assessment publication and a final byte comparison. Resume and existing-harness guidance preserves user edits and history.
- Runtime definitions separate tool outcomes from criterion-level coordinating-LLM review and from state mutation. Safe-stop admission preserves the original cause without demanding that failed success guards pass merely to record a stop. The exact default sequence, explicit alternative profiles, bounded disabled-by-default repair, invocation intent/deadlines, replay and invalidation are coherent as a procedural protocol.
- Maintenance distinguishes interface compatibility from skill quality and real execution. Ordinary changes, approved migrations, fact correction and drift have distinct routes. Prospective IDs, before-value comparisons, immutable receipts, complete post-states, dependency revalidation and conditional restoration address the main lost-update and recovery risks. Captured task A, explicit adoption B and current configuration C are represented separately in the retained walkthrough.
- The optional checker has a clear read-only boundary: restricted parsing, local offline schemas, explicit scoped paths, no production command dispatch and no downloads. Reports separate coverage, whole-criterion assessments, supplied semantic reviews and readiness. Post-maintenance inventory stays wholly uncovered when receipt semantics require review, rather than awarding partial automated satisfaction.
- Evidence is unusually explicit about what actually happened. The retained ledger has 336 results (323 PASS, 13 PENDING); the installed catalogue has 132 cases / 163 mode parts (154 PASS, 9 PENDING). The native matrix has sixteen macOS runs across Python 3.11/3.14, four examples and LF/CRLF. Windows/Linux, optional TOOL cases, absent-interpreter execution and the private pilot remain visibly pending. Synthetic compatibility reports retain FIXTURE provenance.
- The private pilot is usable without reading this authoring history: install, small task, build-skill replacement, pinning/adoption/resume and safe-stop prompts are present, with a private report aid and no invented private results.

## Issues

### Critical (must fix)

None found within this review's scope.

### Important (should fix before reviewed transfer)

**I-1 — The checker treats disabled installation defaults as an immutable active repair policy, and still fails an explicitly uncovered adaptation.**

- Primary location: `builder-kit/checker/harness_check/checks.py:381` (the predicate and diagnostic at lines 383–384). Related location: `builder-kit/checker/harness_check/checks.py:647` (method/description eligibility is only applied after checks have emitted diagnostics).
- The active profile is required to have `enabled: false`, zero attempts and no shortcut every time `sequence()` runs. An evidenced bounded repair policy therefore emits `GRAPH_REPAIR`, exits 1 and forces structure INCOMPLETE. This conflicts with the promised optional loops: `builder-kit/INSTALLER_SPEC.md:9` permits an evidenced adaptation, and installed RULE-09 (`shared/verification-rules.md:126`) describes enabled positive budgets. Disabled-by-default is a property of the supplied initial configuration, not a permanent prohibition on the maintenance-managed active policy.
- The existing coverage escape cannot resolve this. Changing the installed IS-07.sequence description to identify an approved bounded adaptation and removing AUTOMATED from allowed methods leaves the criterion uncovered, but the earlier GRAPH_REPAIR diagnostic still forces exit 1. That also contradicts checker README's stated boundary that changed obligations remain uncovered for whole-obligation review. This same ordering can affect other valid reviewed obligation adaptations, so merely suppressing the checked assessment is insufficient.
- Why it matters: a central requested behavior becomes a checker failure after legitimate installation/maintenance adaptation. The LLM sees a mandatory structural failure and may refuse activation or later work, undo the valid policy, or discard an otherwise useful checker. The failure is not evidence that the enabled policy lacks permission; the predicate never examines that question.
- Focused evidence: using the existing native Python 3.14 venv with `-B`, generated only a disposable compiled example under `TemporaryDirectory` and invoked the real checker CLI. Baseline: exit 0, no diagnostics, IS-07.sequence PASS. Changed only build repair to `enabled: true, max_attempts: 2` and refreshed synthetic inventory: exit 1, sole diagnostic GRAPH_REPAIR / IS-07.sequence / "Default automatic repair must be disabled, zero budget, full preflight", sequence FAIL. Then appended a bounded-adaptation sentence to the criterion description, made its methods LLM_REVIEW/HUMAN_REVIEW and refreshed inventory: exit 1 with the same sole diagnostic, no sequence assessment and sequence listed uncovered. The probe does not claim a real approval/publication; it isolates the unconditional policy rejection and confirms that even the advertised review boundary cannot avoid it. All disposable files were removed.
- Smallest correction: retain tests that shipped defaults are disabled/zero, but distinguish those defaults from adapted current policy. Keep invalid policy shape/budgets and unsafe input diagnosed; an enabled or otherwise supported adaptation must require its actual applicability/authority review, not receive either an automatic permission PASS or a false disabled-default FAIL. Decide automated obligation eligibility before running obligation-specific predicates, or otherwise ensure predicates outside implemented coverage cannot generate a normative failure for that uncovered obligation. Clarify the catalogue's default-versus-adapted interpretation as needed, with the accepted version/identity and evidence updates. Add focused regressions for the unchanged default, enabled bounded policy pending review, properly supplied current review, and an adapted review-only criterion; preserve failures for genuinely invalid or unapproved behavior. No runtime engine is needed.

### Minor (nonblocking)

**M-1 — Some authoring fixtures remain difficult to scan.**

- Locations: `builder-kit/tests/test_contracts.py:252` and `builder-kit/tests/support.py:69`.
- The long amendment-consumer list and compressed fixture inventory make future contract changes harder to review. This is the already deferred Task 1 readability note, not a new functional defect.
- Smallest fix: reflow the list and fixture dictionaries when next touched. No release-blocking formatting sweep is recommended.

## Deferred-review triage

- **Task 1 compressed formatting:** remains the nonblocking M-1 above; accepted earlier behavioral fixes are not reopened.
- **Task 3 missing RECONCILED retained walkthrough:** closed by Task 6 evidence. Direct projection of `builder-kit/evidence/checks/installed-walkthrough.zip`, `compiled/.harness/maintenance/updates/replace-build.yaml`, shows accepted PROMOTED v6, PENDING v7, INSPECTED v8, PROMOTED with `accepted_trigger: RECONCILED` v9, STATUS_UPDATED v10 and COMPLETE v11. The recovered promotion payload equals the original accepted payload. `builder-kit/tests/test_conformance_records.py:47` checks the retained interrupted-status path; `builder-kit/tests/test_checker.py:324` checks that recovery is not counted as a second publication and rejects an altered candidate identity. `test_checker.py:213` also covers the two publication kinds' boundary. This meets the deferred concern without claiming a separate runtime engine or a second native publication.

## Review scope and evidence

Read the approved specification, implementation plan, acceptance scenarios, root/package README, release assessment, constraints/interfaces/progress rulings and Task 7 report. Read installed development/maintenance entry points, the installer specification/prompt/checklist, rules, maintenance graph, relevant development graph sections, optional checker guide/source, generator and synthetic adapter, pilot guide/report, and document-checker diff. Inspected the test inventory and relevant contract, parser, assessment, checker, development, maintenance and retained-conformance assertions, emphasizing cross-task relationships rather than repeating every earlier task seat.

The review package has 267 file patches and 7,857,372 bytes, SHA-256 `d103d0529516ca9a1bd82600533c9c55e6f43eb5c8fdc069018ac5826d3b0b1e`. Its filenames and all changed lines match the named Git range; package headers and wider context account for differences from plain `git diff`. HEAD was confirmed as the requested head and the tracked working tree was clean before this report. Source was read at that head. Repeated schemas/fixtures/logs were inspected through selected definitions, schema/record projections, counters, event ordering, hashes and retained relational tests; this report does not claim manual line-by-line review of all 158,396 added lines.

Direct compact projections confirmed the ledger/catalogue counts and exact pending categories, sixteen baseline native matrix rows, seven installed schema definition inventories, cfg-3 initial pin (16 captured definitions), explicit cfg-4 adoption (18 captured definitions), current cfg-5 and the two update paths. The corrected prospective adapter dossier regression compares exact staged module/procedure bytes, configuration/adapter identities and chronology before publication; legitimate initial A evidence remains separate.

Read retained suite summaries: Python 3.11 ran 111 tests in 146.547s, OK; Python 3.14 ran 111 tests in 186.560s, OK. These are prior actual runs, not reruns by this reviewer. Read the retained document result and release records for 49 documents / 182 links, and the later focused integrity record. The only new execution probe was the specific unanswered repair/checker doubt above. Its first setup attempt incorrectly parsed a YAML example definition as JSON and exited before producing a repository; the corrected probe used the existing YAML loader. A read-only package-comparison helper also had one corrected syntax typo. Neither is an implementation failure or passing validation claim.

## Recommendations

Fix I-1 in a bounded change, retain the new regression evidence, and perform a scoped independent re-review. Then controller closeout should update actual final-review/transfer wording and affected evidence identities only after those actions occur. Continue to retain the pending platform, TOOL, absent-interpreter and private-pilot obligations. No broad refactor, universal runtime engine, new approval layer or full evidence regeneration is warranted by this review.

## Declined to judge

Each item below was considered and set aside for the stated reason; the controller should adjudicate these boundaries explicitly.

- Universal runtime execution, state locking, exactly-once dispatch and bypass prevention: R-03/R-12 expressly supply a procedural default and optional TOOL interface, and no such engine or guarantee is claimed.
- Production build/test correctness or replacement skill quality: the kit checks compatibility and policy integration; fixtures and schema-valid outcomes cannot establish tool quality or actual task success.
- Native Windows/Linux success: unavailable hosts remain PENDING under the approved ruling; macOS path/line-ending evidence is not treated as substitute execution.
- An actual host without Python: missing-interpreter parts remain PENDING; the retained missing-dependency `-S` run is correctly a different observation.
- Optional TOOL conformance: no configured installed state tool is supplied; the three exact TOOL obligations remain PENDING and are not inferred from LLM_PROTOCOL traces.
- Actual private-repository pilot, private permissions and current external service access: outside available evidence and explicitly pending; the provided bounded pilot is the deliverable in this environment.
- Whether a future LLM will obey every procedural rule or find the full record workflow economical: requires the actual pilot; concise entry points exist, but documentation cannot guarantee future compliance or model performance.
- Replacing review semantics with more automatic inventory/receipt/adoption checks: the accepted design permits attributable whole-obligation reviews; the checker leaves maintenance receipt semantics wholly uncovered instead of promising a generic receipt engine.
- Machine validation of every cross-record truth or every profile/workflow semantic join (including whether a profile's workflow_id is the intended workflow): schema shape and the specifically scoped mechanical criteria are bounded, and routing/applicability/evidence review remains required. No new mechanical-enforcement claim is inferred from those shape passes.
- Adversarial concurrent filesystem replacement during read-only checks: current path/symlink checks precede reads, but hostile concurrent writers would require stronger operating-system isolation; that is not promised by the supported single-writer procedural model. This review establishes no TOCTOU-hardening guarantee.
- Fixed scratch paths in retained evidence helpers: these are authoring reproduction/history aids, not installed runtime dependencies; portable checker and example entry points are separately documented.
- Final-review/transfer status still marked pending in delivered navigation and audit inputs: intentional controller closeout state at this reviewed head, not a missing implementation feature. It must change only after actual review resolution and transfer.
- Full manual rescan of repeated fixture/log payloads and fresh whole-suite execution: earlier tasks already received separate reviews and the controller requested bounded final review plus fresh controller validation later. Relevant relationships and summaries were inspected; the sole specific runtime doubt received a focused probe.

## Assessment

**Ready for reviewed transfer: No — with fixes.**

The whole-kit architecture and evidence boundaries substantially meet the approved goal, and the earlier recovery-coverage concern is closed. I-1 is a concrete user-visible conflict with optional bounded repair and honest checker coverage; resolve it and re-review the focused change before final controller validation and transfer. The nonblocking formatting remainder and explicitly pending external obligations do not independently prevent reviewed delivery with truthful limitations.
