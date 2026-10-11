# Review decisions and boundaries

Updated: 2026-10-05. This records every controller ruling (18) and every final-review boundary adjudication (13) from the execution ledger. These are decisions about the approved scope and available evidence, not additional runtime guarantees. The [initial final review](final-review.md) and [scoped re-review](final-rereview.md) retain the independent findings. Runtime authority remains the approved specification and installed definitions.

## Controller rulings

1. Proceed from plan review directly to subagent implementation — user's latest instruction explicitly authorizes that sequence — no new plan approval round is needed.
2. Use a new temporary Git snapshot/worktree, then transfer reviewed delivery changes to original — original is not a Git repo and earlier scratch uses obsolete layout — original edits must be checked before transfer; scratch commits are not original history.
3. Keep all process artifacts under this scratch worktree only — user removed the superpowers/work layers from their workspace — publish only meaningful release evidence under builder-kit/evidence and docs/reviews.
4. Reuse the earlier live candidate by explicit file/content comparison — frozen archive is evidence and must remain unchanged — adaptations are reviewed by each owning task.
5. Native macOS Python3.11 and3.14 will be verified; unavailable Windows/Linux and private-repo pilot remain PENDING — no tool here provides those hosts/repo — portable implementation is not a claim of unperformed validation.
6. Resumption may restore an already earned stop-origin state with still-valid evidence, but cannot award new success — resolves ambiguous blanket wording against explicit recorded-stage resumption — require a focused example.
7. Add repair_allowed and repair_denied to the canonical finite transition trigger enum in Task2 — the approved spec and task explicitly require those labels, but Task1 omitted them — the amendment adds no runtime behavior beyond the already approved repair policy; all consumers and tests must agree.
8. Maintenance transition profiles select request types through explicit extensions.request_type_profiles mapping, while development profiles remain owned by repo-profile — the shared workflow schema needs a deterministic selector for each workflow — checker and rules must enforce the separate namespace or routing could be ambiguous.
9. Reconcile an unaccepted partial publication separately from restoring accepted values; accepted restoration uses a linked fresh configuration revision and new assessments — every accepted canonical mutation must advance identity — restoring an old identity would corrupt freshness and history.
10. Encode every integration criterion tuple component as x plus lowercase UTF-8 hex, with original identifiers retained — raw hyphen concatenation is ambiguous across components — IDs become longer but deterministic and collision-free by construction.
11. Inventory installation/installation-record.yaml as generated/owned with null self-hashes and explicit MUTABLE_LEDGER reason — a mutable record cannot contain its own final byte hash — verify its shape/ownership/history separately; other definition hashes remain mandatory and historical hashes retain resume value.
12. Correct catalogue default_sequence to include PREFLIGHT in Task5 — approved R13 and Task2 workflow/tests include it but Task4 list omitted it — leaving the omission could reject valid workflows or authorize a skip; correction changes no approved behavior and receives Task5 review.
13. Add optional path and criterion_id fields to shared Diagnostic while retaining its existing required fields — planned checker diagnostics require these but shared schema rejected them — additive compatibility avoids breaking runtime consumers; unnecessary fields would be minor schema surface and regression-tested.
14. CheckerReport may use null configuration identity only for failure exits1/2 — parsing/prerequisite failures can occur before a real identity exists — explicit conditional schema preserves honest machine-readable failures; exit0 retains a valid identity and regressions cover the boundary.
15. Fix checker reconciliation and generated-path addition handling in Task6 with regressions — actual maintenance walkthrough exposed RECONCILED counted twice and legitimate new owned paths rejected — scope/lineage/absence/ownership checks remain mandatory; an overly broad fix could hide conflicts so Task6 review must inspect negative cases.
16. Correct active repair adaptation and obligation eligibility in one final fix wave — the whole-kit probe exposed disabled defaults treated as permanent policy and uncovered checks still failing — retain shipped defaults and unresolved authority review, or an overbroad correction could create false PASS.
17. Defer existing compressed authoring fixture formatting M1 — no functional defect and reviewer recommends no release-blocking sweep — future contract edits will be less convenient until reflowed.
18. Accept the final review's explicit evidence and implementation boundaries — they match the approved procedural kit and available environment — remaining native, tool, pilot and semantic guarantees stay unverified rather than implied by delivery.

## Final-review boundary adjudications

All items the final reviewer declined to judge were considered by the controller and resolved as follows. “Accepted” here preserves the stated scope; it does not turn unavailable execution into PASS.

1. Universal engine/locking/exactly-once/bypass: accepted explicit non-goal; no enforcement claim.
2. Production tool correctness/skill quality: compatibility scope only; runtime task success still needs actual evidence.
3. Native Windows/Linux: unavailable, retain PENDING and native commands.
4. Host without Python: not observed, retain separate PENDING; dependency absence is not substitute.
5. Optional TOOL cases: no implementation configured, retain three PENDING parts.
6. Private pilot/permissions/services: unavailable, retain PENDING and internal pilot handoff.
7. Future LLM compliance/economy: actual pilot required; no model performance guarantee.
8. Generic automatic receipt/adoption engine: accepted whole-obligation semantic review; no partial automated PASS.
9. Every semantic join including intended profile workflow identity: bounded mechanical coverage plus mandatory routing/applicability review, not a new broad machine-enforcement promise.
10. Hostile concurrent filesystem replacement: operating-system isolation not supplied; current scoped checks/single-writer protocol do not establish TOCTOU-hardening.
11. Fixed paths in retained authoring helpers: historical aids, not installation/runtime dependencies; portable public entry points distinct.
12. Final review/transfer PENDING: correct at reviewed head; update only after actual closure/transfer.
13. Full raw-payload manual rescan/fresh reviewer suites: bounded projections and prior evidence appropriate; controller still performs fresh final validation.

## Current outcome

All seven task reviews are accepted. Final-review I-1 was corrected in `7db46b062085a50b048dee7232c484a8505561e1`; independent scoped re-review found it addressed with no new breakage. Task 3's deferred recovery gap is closed by Task 6's actual retained trace and regression. M-1 compressed authoring fixture formatting is explicitly deferred, nonblocking, for future touched-contract cleanup. No functional fix wave is authorized by this reporting closeout.

The first reviewed transfer to the original workspace completed: 284 writes, six obsolete flat templates removed, one identical plan-review file retained, 44 archive/research files byte-preserved, no collisions. The original remains without Git. [Transfer receipt](../../tests/fixtures/checks/first-transfer-7db46b0.json) retains the actual record. Fresh controller suites from the delivered original workspace subsequently passed 120 tests on each interpreter, exit 0; [Python 3.14 record](../../archive/verification/history.zip#evidence/checks/final-controller/python314.json) and [Python 3.11 record](../../archive/verification/history.zip#evidence/checks/final-controller/python311.json) retain exact commands, runtime, source/output identities. These are separate from the retained scratch runs.
