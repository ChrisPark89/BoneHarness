# Subtraction task: chronological audit

**Complete.** Reviewed all 255 messages (JSON lines 1–9925), checked retained artifacts, and reproduced the scope gap in a disposable copy. [Short summary](2026-10-11-subtraction-walkthrough.md).

Source: local export `bob-task-0ab6930acc5197b62f76c1d82aeed504-2026-10-11.json` (not included in this repository). SHA-256: `aab18adf329bffe84117968df200f34a8fbd5173d35c3451c4f06363704b469f`.

The export contains 255 messages. Message numbers below are one-based; line ranges refer to the original JSON, including tool results. Nested text is decoded before review. Repeated tool signatures are metadata, not repeated execution. Export status/timestamps alone cannot establish task completion.

This detailed audit intentionally exceeds the short human-page limit; a separate summary will remain under 200 words. Findings are assessed against the instructions actually installed/read during this run, not later kit changes. No demo files or task records are changed.

## 1. Locate and read instructions — messages 1–42

| Messages | JSON lines | Observation | Assessment |
|---|---|---|---|
| Metadata, 1–2 | 1–358 | Workspace is the parent `Codex/`; active file is `demo/README.md`. User asks for subtraction, tests and build verification. System/project rules are context, not execution evidence. | The intended target is the independent demo. “Active” export status is not a harness status. |
| 3–4 | 359–418 | Reads `.harness/README.md` relative to parent workspace; file absent. | Recoverable location error. Start from the active repository instead. |
| 5–10 | 419–599 | Broad globs include BoneHarness Git objects and demo virtual-environment files before locating the harness. | Inefficient discovery; no evidence of changing the wrong repository. Excluding `.git/` and `.venv/` would reduce noise. |
| 11–22 | 600–971 | Reads installed README, development guide, setup, profile, journal and context guides. | Correct entry path. Learns phase order, evidence requirements, context pagination and append-only writing. Setup's overconfident readiness wording predates our documentation correction. |
| 23–26 | 972–1093 | Another broad harness glob includes dependencies, followed by a targeted framework glob. | More avoidable discovery noise; framework discovery itself is appropriate. |
| 27–36 | 1094–1403 | Reads package scripts, calculator, tests, build script and project README. Tests import `dist/calculator.js`; build validates then copies source. | Correctly investigates repository behavior and build-before-test dependency before edits. |
| 37–42 | 1404–1589 | Reads workflow, verification rules and source-evidence guide. | Correct. Explicitly encounters intent-before-dispatch, evidence-before-claim, source invalidation and “no extra review file required.” Later actions must satisfy these. |

**Checkpoint:** no task edits yet. Entry instructions are loaded correctly after a small location detour. Remaining review must establish actual phase sequencing, specification acceptance, source scope, operations and final evidence.

## 2. Prepare and initialize — messages 43–98

| Messages | JSON lines | Observation | Assessment |
|---|---|---|---|
| 43–54 | 1590–1961 | Reads six semantic-step templates, including acceptance, operation and verification. | Correct template use; no fabricated state transitions. |
| 55–58 | 1962–2087 | Reads 150 schema lines directly, then Python helper instructions. | Small schema excerpt, not a complete schema dump. Avoidable implementation detail during normal use, but not a validity failure. |
| 59–62 | 2088–2255 | Runs context and reads both pages with the matching digest. | Correct pagination and environment selection. Tool metadata reports a long first-call duration; the export does not separate process execution from permission/tool overhead. |
| 63–66 | 2256–2377 | First artifact glob returns no files; narrower follow-up finds installation record. | Recovers correctly from a discovery mismatch. |
| 67–74 | 2378–2713 | Structure checker passes; reads journal/report/source help. | Valid setup check, not task verification. No execution-operation record is required merely to read helper context/help. |
| 75–78 | 2714–2875 | Preserves the actual request and prepares `start` with source roots `[src, test]`. | Request attribution is supported by message 2. **Scope concern to revisit:** package/build inputs and `dist` are absent despite tests consuming packaged output. |
| 79–80 | 2876–2959 | Journal command uses `--step artifacts/...` from repository root; missing path causes exit 2. | Invocation error, not a task phase failure. Guide showed an absolute step path. No successful task record is claimed. |
| 81–90 | 2960–3276 | Searches and reads helper implementation to diagnose the path error. | Correct diagnosis, excessive work for a missing `.harness/` prefix. A concrete repository-relative CLI example would help. |
| 91–94 | 3277–3444 | Corrected start succeeds and context reports initialization next. | Writer creates task/source entries; returning `e000002` is expected, not a missing first entry. Export records ~55 minutes for this call; cause cannot be determined from duration metadata. |
| 95–98 | 3445–3609 | Records initialization PASS through the writer using current context. | Correct first phase and evidence attribution. |

**Checkpoint:** initialization is recorded. No source implementation yet. The failed helper invocation was recovered without bypassing validation; source-scope adequacy remains unresolved.

## 3. Research, acceptance and implementation — messages 99–156

| Messages | JSON lines | Observation | Assessment |
|---|---|---|---|
| 99–106 | 3610–3939 | Context says page 1/2; LLM writes research notes and records research PASS without page 2. | **F2: first explicit pagination violation.** The writer accepts a digest without proving all excerpts were read. Research itself matches files already inspected. |
| 107–114 | 3940–4269 | Repeats page 1/2-only reading for Pattern review; records existing ES-module and test patterns. | Pattern review is substantive and ordered, but the same context-reading instruction is missed. |
| 115–122 | 4270–4599 | Reads full single-page context, creates human spec and accepts five required criteria under the original request. Scope remains only `src` and `test`. | Acceptance authority is permitted by the template; no separate user confirmation was required. **F1: inadequate verification scope is now accepted:** `package.json`, `scripts/build.mjs` and packaged `dist/calculator.js` are not tracked. The human build criterion names both exports; machine criterion is shortened to command success. |
| 123–130 | 4600–4929 | Records verification plan before implementation plan. Plan mentions positive, negative and zero cases. | Correct order. Zero coverage must be checked later; it is an added plan promise, not an explicit original user requirement. |
| 131–138 | 4930–5259 | Records exact source/test edits and three subtraction assertions in implementation plan. | Appropriate, small plan; zero case has already disappeared without explanation. |
| 139–144 | 5260–5501 | Reads implementation context, adds `subtract(a,b) { return a-b; }`, adds three assertions against packaged output; retains addition tests. | Correct minimal code change. No harness definition change. Planned zero test is absent. |
| 145–152 | 5502–5831 | Refreshes context after source edits; source digest changes; writer snapshots current source and records implementation PASS. | Correct source-change handling. Extra `implementation.md` repeats the phase summary; direct source references could avoid this file. |
| 153–156 | 5832–5979 | Preflight context is page 1/2; reads another schema excerpt instead of continuation. | Pagination concern continues; check following operations before concluding impact. |

**Checkpoint:** phases through implementation are recorded in order, with mandatory acceptance before edits. Two real concerns are established: incomplete context reading and a source scope that omits relevant build inputs/output. The arithmetic implementation itself matches the request. Additional review-note files are optional overhead, not required by the kit.

## 4. Preflight, build and test dispatch — messages 157–216

| Messages | JSON lines | Observation | Assessment |
|---|---|---|---|
| 157–160 | 5980–6107 | Reads another 180 schema lines, reaching operation fields. | Across the run, reads schema lines 1–420 directly. This is unnecessary context loading for a normal task; templates should suffice. |
| 161–166 | 6108–6356 | Writes and journals preflight INTENT before running `node --check`; tool metadata records exit 0. | Correct ordering and successful real execution. No RUNNING record is necessary for a synchronous completed call. |
| 167–170 | 6357–6499 | Reads empty native output, then overwrites `preflight-1.log` with “Syntax check completed successfully with exit status 0.” | **F3: mixes interpretation with raw evidence.** Success is independently supported by tool metadata, so this is not an invented successful run. But the saved EXECUTION evidence is now LLM-written prose rather than unchanged native output. Retain empty output and captured command/exit metadata explicitly. |
| 171–176 | 6500–6748 | Context reports BLOCKED for unresolved preflight INTENT; completion is recorded for that same operation. | Expected operation bookkeeping, not a preflight failure. Correct reconciliation; again reads only page 1/2. |
| 177–182 | 6749–6997 | Records preflight PASS with the completed operation and evidence. | Correct phase transition; evidence has the F3 provenance weakness. |
| 183–190 | 6998–7330 | Reads build context, journals build INTENT, then executes `npm run build`; exit 0 recorded. | Correct operation-before-dispatch and phase order. Context continuation omitted. |
| 191–194 | 7331–7454 | Reads native build log and actual generated module containing `add` and `subtract`. | Real build output is checked. This directly supports the human spec's export requirement, despite the shorter machine criterion. |
| 195–206 | 7455–7952 | Reconciles build INTENT, records COMPLETED/PASS then build phase PASS. Retains native log. | Correct lifecycle. **F1 remains:** neither generated module identity nor build-script/package bytes are included in task evidence/inventory. |
| 207–216 | 7953–8347 | Journals test INTENT, runs `npm test`, reads output: two tests passed, zero failed. Tool metadata records exit 0. | Tests really run against built output; no mocked/fixture result. Context continuation omitted again. |

**Checkpoint:** all three requested execution checks actually ran successfully. The workflow correctly blocks unresolved operations and resumes after recording outcomes. Weaknesses concern what is retained and bound to the result, not whether commands executed in this transcript.

## 5. Verification and handoff — messages 217–255

| Messages | JSON lines | Observation | Assessment |
|---|---|---|---|
| 217–228 | 8348–8845 | Reconciles test INTENT, records COMPLETED/PASS then testing phase PASS. | Correct lifecycle; page 2 is again omitted before each write. |
| 229–236 | 8846–9175 | Reads final-verification context page 1/2, records five criterion results with matching operation IDs for execution criteria. | Mandatory verification is present. Review claims match the small edits, except `verification.md` says “mixed numbers” although tests use same-sign operands; planned zeros are also absent. These are wording/plan discrepancies, not missing explicit user requirements. |
| 237–244 | 9176–9505 | Records final review using a newly written note. | Correct final phase; current context digest supplied. No new independent code inspection appears here; assessment uses earlier observed edits, logs and output. This is allowed review judgment, not independent tool proof. |
| 245–250 | 9506–9735 | Context derives COMPLETE; reporter generates short Markdown/JSON results; LLM reads the human report. | Intended evidence-derived reporting path. All 12 phases resolved, five required criteria recorded, three operations closed. “Prior failure/uncertainty records: 0” describes task history, not the earlier path error. |
| 251–252 | 9736–9819 | Runs `npm test` again after report publication; two tests pass. No new intent, operation outcome or refreshed report follows. | **F4: task execution bypasses recording after COMPLETE.** This successful extra run does not negate the first run, but is outside the retained task history. A rerun should be recorded and reported, or omitted. |
| 253–254 | 9820–9903 | Reruns the installation checker; structure passes. | Read-only setup diagnosis, not proof that the development run followed every rule. |
| 255, closing metadata | 9904–9925 | Final response says all phases passed and links generated report. | Matches recorded phase statuses and real commands. It omits procedural/evidence weaknesses identified by this audit. Export ends here. |

**Checkpoint:** all 255 messages are traversed. The feature and first verification sequence succeeded. The run is not fully compliant: incomplete context reads, incomplete verification scope, rewritten preflight output and an unrecorded final test rerun remain. Next audit step: correlate transcript with saved records and quantify these findings without changing the demo.

## 6. Cross-checks and confirmed findings

### Saved artifacts agree with the transcript

- All 31 file contents captured by write/edit tool results match the current demo files.
- All 19 returned writer records exactly match the saved 21-entry journal. The other two entries are automatically generated task/source records.
- Journal parsing, evidence hashes, pinned configuration and report derivation succeed. The saved JSON/Markdown generation identities match.
- All 12 phases resolve through 11 phase records plus specification acceptance; five criteria pass. Three recorded operations each have INTENT before execution and COMPLETED afterward.
- Actual preflight/build/test results are exit 0 at messages 166, 190 and 214. The extra unrecorded test at 252 also passes. Source and generated calculator bytes currently match.
- The only direct application edits are calculator source and its test. No installed framework/profile edits appear. Framework output and records stay under `.harness/`.

### Findings, priority and smallest useful follow-up

| ID | Priority | Finding and evidence | Suggested kit improvement |
|---|---|---|---|
| F1 | High | Accepted scope covers only `src`/`test` (117–122); build inputs and packaged program are absent from hashed evidence. Disposable-copy checks below confirm false freshness after changes. | Have acceptance name relevant package/build inputs; retain generated output identity as build/test evidence using existing fields. Generated output need not become a source input that invalidates its own build. |
| F2 | Medium | Only the first of 14 multipage context reads is completed; 13 continuation pages are omitted. First violation: 99–106. | Make the continuation instruction the immediate next action until the final page; reduce repeated rule text. Do not add a claim that a digest proves reading. |
| F3 | Medium | Preflight native output is replaced by written prose (167–176). Build/test logs omit explicit command-exit metadata; full export retains it. | Show one capture example preserving command, cwd, exit status and unchanged stdout/stderr, including empty output. Keep interpretation in the existing summary. |
| F4 | Medium | A fourth execution occurs after publication with no intent/outcome/report update (251–255). | End after report handoff; if another verification is needed, use a new operation ID and regenerate the report. |
| F5 | Low | Plan promises zero coverage; tests omit it. Review says mixed numbers, but operands are both positive or both negative (125, 143, 231). | Reconcile plan and actual assertions during review. Do not describe coverage that is absent. |
| F6 | Usability | 126 tool calls, 19 step-input files and seven extra review/plan notes for a small feature; 420 raw schema lines read. | Give a concrete `--step .harness/...` example. Reuse an unreferenced step-input file and existing source/log evidence; keep only notes with distinct value. |

F2 violates explicit instructions but does not establish that a unique requirement was missed: omitted tails principally contain previously read rules and the next-action field. F3 is a provenance problem, not a fabricated execution: the transcript proves the command ran successfully. F4 does not invalidate the earlier successful test; it exposes activity outside the recorded process.

### Scope probe: actual observed behavior

Using a disposable copy, call the installed `capture_task()` and `derive_report()`; change one file, derive again, then restore that file. No journal or evidence is rewritten. The original demo's 1,270 regular-file hashes remain unchanged during these probes. No application build/test is rerun by this audit.

| Temporary change | Freshly derived status | Assessment |
|---|---|---|
| None | COMPLETE | Baseline reproduces saved outcome |
| Remove `subtract` from `dist/calculator.js` | COMPLETE | Packaged program changed unnoticed |
| Replace `scripts/build.mjs` with a throwing script | COMPLETE | Build implementation changed unnoticed |
| Change package build/test commands to nonexistent commands | COMPLETE | Command definitions changed unnoticed |
| Remove `subtract` from tracked `src/calculator.js` | UNVERIFIED | Control: six source-sensitive phases invalidate correctly |

These are fresh derived results, not merely an old Markdown report left on disk. Root cause: `reporting/evidence.py::capture_task` reads the accepted source scope plus referenced evidence. `reporting/summary.py::derive_report` invalidates proof when those identities change. The omitted paths belong to neither set. The engine works on declared inputs; it cannot infer that the declaration is complete.

To reproduce: copy the demo without `.git`, `.venv` or caches; use an existing environment with the pinned dependencies; import the copied `.harness/framework/tools/reporting` modules. Call `derive_report(capture_task(copy_root, '.harness', 'add-subtraction'))` before/after each listed edit. Do not run this experiment in the original repository.

### What this walkthrough establishes

The successful development path works: ordered phases, mandatory acceptance, source refresh, recorded execution intent/outcomes and generated human report. It does **not** establish strict end-to-end compliance, complete evidence coverage, failure/repair behavior, user skips, interrupted recovery or portability to other operating systems.

**Overall:** the feature succeeds and most workflow mechanics work. Fix F1 first; then improve context use and execution-evidence guidance. A new state machine or extra layers of records are not needed to address the observed problems.
