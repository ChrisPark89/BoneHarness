# Independent layout review

Reviewed the current implementation under `/private/tmp/harness-layout-nosx6q02/work` against the original `b048f78` files retained in `baseline`, specification sections 2/13/14, and A-01 through A-10. Scope: installer/checker boundaries, journal integrity and projections, split reporting, and the two-scenario demo. Read-only review of implementation; fixes were made by the owning agents.

## Findings

No outstanding blocking finding in the reviewed implementation. Two P2 regressions were reproduced, reported, fixed, and independently rechecked:

1. **P2, resolved — append accepted a malformed typed prefix.** `builder-kit/templates/runtime/framework/tools/harness_io/journal.py:200` previously used only `parse_history` before append or idempotent retry. Starting with the journal test fixture, change the last Event's `post_state.writer` to a string, rebuild that envelope with `make_entry`, and write its canonical bytes. `read_history` rejected the malformed Event, but appending a valid CriterionReview succeeded and added 749 bytes. The fix calls `read_history` before either append or retry; the regression asserts both paths refuse and preserve history/state. Maps to section 14 consolidated records, A-05 history integrity, and A-06 derived views. This requires typed shape validation, not semantic gate approval.

2. **P2, resolved — legacy inventory schemas escaped validation.** `builder-kit/checker/harness_check/checks.py:232` previously matched the literal modern schema-directory prefix in `--legacy-layout` mode. In an actual baseline CheckerTests fixture, add an inventoried `shared/schemas/extra.schema.json` containing `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":42}`. The baseline checker returned exit 1 / IS-01.schemas FAIL; the initial migrated checker returned exit 0 / PASS without diagnostics. The fix selects the prefix via `self.name`. Repeating that exact baseline probe now returns exit 1 / FAIL with SCHEMA_DEFINITION, matching baseline. Maps to A-08 preservation of old meaning and unchanged schema guards.

The legacy reporter compatibility statement was also clarified: its internal capture API can read legacy records; the new CLI explicitly refuses legacy publication and directs users to the preserved reporter or approved migration. It does not silently rewrite histories or claim full automatic migration.

## Independent validation

- Journal/reporting suite: **17 passed, 29.310s**, including malformed-prefix refusal, immutable source bytes, five default files, bounded phase reporting, hash-chain/reference failures, invocation revisions, state projection, capture-change diagnostics and split-publication rollback.
- Added legacy capture/publication boundary: **1 passed, 1.751s**; CLI refusal preserves legacy bytes.
- Original-baseline legacy schema probe: before fix demonstrated PASS weakening; after fix returns FAIL with the original diagnostics.
- `git diff --check`: passed.
- Reviewed installer refusal of an existing `.harness`, target-only writes, generated inventory/ledger exception, installed checker discovery, and honest pending activation; no additional blocker found.
- Reviewed demo real Node preflight/build/test calls, retained failed test then repair/rebuild/retest, persisted pre-dispatch intent, explicit FIXTURE lifecycle and absent COMPLETE approval; no additional blocker found.

## Boundaries

This review does not certify semantic gate decisions or activation. Source inventory, scoped applicability, user-skip authority, positive completion support, and in-task configuration adoption remain explicitly unsupported by the reference reporter. Automatic existing-install migration is not supplied; legacy bytes and tools remain the compatibility route. Parent owns final documentation status and retained demo refresh after source freeze. Their pending status text and stale retained outputs were deliberately excluded from defect findings. No original root evidence/archive was modified by this review.
