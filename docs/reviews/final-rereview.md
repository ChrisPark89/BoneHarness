# Final review record — scoped correction accepted

Reviewer: Codex `/root/final_scoped_rereview`, 2026-10-05. Source: scoped independent re-review of `d60d33a..7db46b0`; the body below is unchanged. I-1 is ADDRESSED with no new breakage; M-1 remains nonblocking and deferred. Its last controller-pending sentence records the historical moment of that review. The first reviewed transfer subsequently completed; [release assessment](../../archive/verification/history.zip#evidence/release-assessment.md) and [implementation status](../implementation-status.md) record current facts.

---

- **I-1 — Disabled installation defaults were treated as immutable active repair policy, including uncovered adaptations — ADDRESSED.** `builder-kit/checker/harness_check/checks.py:112` decides method/text eligibility before predicate dispatch at line 126. Nondefault repair makes the entire IS-07.sequence obligation uncovered; `default_repair_policy()` at line 389 distinguishes the shipped disabled/zero/PREFLIGHT/no-shortcut policy from adaptations. The unconditional disabled-default failure is removed. `builder-kit/tests/test_checker.py:168`, `:199`, `:226` and `:266` cover unchanged defaults, bounded enabled policy, review-only sequence adaptation, and changed persistence obligations respectively.
- **I-1 — Whole-obligation review and authority boundary — ADDRESSED.** `builder-kit/checker/harness_check/checks.py:646` validates supplied claims before aggregation; lines 656–661 prevent adapted-policy AUTOMATED or non-REVIEW satisfaction. Existing current-configuration, actor, permitted-method, evidence-byte and dependency-revalidation requirements remain. FAIL/BLOCKED claims are preserved at lines 717–720. `builder-kit/tests/test_checker.py:177`, `:210` and `:240` cover denied review, attributable current review, automatic claim refusal and invalid/unapproved claims. `builder-kit/checker/README.md:55` explains review scope and distinguishes criterion satisfaction from per-invocation repair authority.
- **I-1 — Independent malformed/unsafe input diagnosis — ADDRESSED.** `builder-kit/checker/harness_check/checks.py:402` enforces the existing RULE-09 repair input contract independently of sequence coverage, including explicit boolean, nonnegative integer budget, PREFLIGHT route and declared shortcut rule. Input-safety dispatch at line 746 preserves schema/reference/template inspection. Template schema validation remains at line 385; inventory path containment/casing runs at line 271 even when inventory and local-reference obligations are uncovered. `builder-kit/tests/test_checker.py:240`, `:287` and `:303` cover malformed budgets, unapproved claims, inventory symlinks, schemas, parser errors and unsafe paths; line 177 preserves genuine missing default-guard failure.

## New Breakage in the Fix Diff

- **None.** No new Critical, Important or Minor finding in `d60d33a2c11298613e3eeb5ec72cd70a782d031a..7db46b062085a50b048dee7232c484a8505561e1`.

## Checks

- **Checked scope:** supplied re-review instructions, Task 5 brief, constraints, final-review I-1 and final-fix report against the supplied 33-file diff and relevant current source. No subagents, Git commands, implementation/index/HEAD edits, suite reruns or execution probes. This process report is the sole write.
- **Checked retained final execution evidence:** `builder-kit/evidence/checks/final-fix-final-full-python311.txt:123` records 120 tests in 200.961s, OK; `final-fix-final-full-python314.txt:123` records 120 tests in 255.635s, OK. Each log contains 120 successful named tests. Corresponding JSON records identify native macOS arm64 Python 3.11.16/3.14.0, exact command, exit 0 and timestamps. Read-only SHA-256 comparison confirmed both output identities and both checker/test source identities match current bytes. These are inspected implementer runs, not reviewer reruns.
- **Checked correction evidence:** retained RED/GREEN outputs and regression source cover the defect and input-safety follow-up; earlier 119-test runs and fixture setup errors remain historical. `builder-kit/evidence/checks/final-fix-documents.txt:1` records 49 documents / 186 local links, with no runtime execution claim.
- **Checked evidence preservation:** the supplied patch changes no runtime template, installed schema/catalogue/version, historical native report/matrix, installed walkthrough archive, archive or research file. Current audit inspected-input, inventory-reference and final-fix reinspection hashes all match referenced bytes (`builder-kit/evidence/checks/task7-release-review.json:148`).
- **Checked bounded S48 update:** reconstructed prior ledger content from the supplied patch and compared parsed records. Exactly four S48 rows change attribution, observations, evidence references and limitations (`builder-kit/evidence/scenario-results.yaml:7409`, `:16346`, `:16445`, `:16494`). All 336 actual verdicts remain 323 PASS / 13 PENDING; every extension/mode join is preserved. All changed local evidence references match current hashes. Other result rows are unchanged.
- **Checked closeout boundary:** `builder-kit/evidence/release-assessment.md:29` and `docs/reviews/implementation-review.md:3` accurately distinguish correction evidence from pending independent re-review/controller validation/transfer. Final status and transfer closure remain controller-owned; this report supplies the scoped re-review result without claiming those later actions occurred.

## Out-of-Scope Observations

- **M-1 — NOT ADDRESSED; explicitly deferred and nonblocking.** Prior fixture-readability finding at `builder-kit/tests/test_contracts.py:252` and `builder-kit/tests/support.py:69` remains outside this fix. No formatting sweep requested.
- **No additional out-of-scope observations.** Existing native Windows/Linux, absent-interpreter host, optional TOOL and private-pilot obligations remain pending; their completion is not inferred from this review.

## Verdict

- **Fix round: All findings in scope addressed, no new Critical/Important breakage.** I-1 is closed. M-1 remains the explicitly deferred nonblocking observation. Controller final validation, status closure and transfer remain pending.
