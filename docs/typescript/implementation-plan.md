# TypeScript conversion implementation plan

Execution: subagent-driven implementation with independent final review; authorized by the user to plan, convert and verify.

Goal: replace all active Python tooling without changing harness decisions.
Spec: [spec.md](spec.md). Architecture: [design.md](design.md).

## Global constraints

Node.js 22+, strict TypeScript, only builder-kit distributed, no Python runtime dependency. Preserve schema 2.0.0, explicit skips and mandatory specification checks. Default human reviews remain. Never modify the independent demo. Preserve the existing uncommitted work. Keep human pages short. No commit/push requested.

## Steps

- [x] 1. Preserve baseline; inventory every original test and record baseline test results.
- [x] 2. Implement package/build configuration, strict document/schema utilities, source inventory and canonical serialization. Check malformed input and Python hash fixtures.
- [x] 3. Port journal, evidence capture/report and context/command helpers; test phase/review/recovery behavior.
- [x] 4. Port installation/checker, views and compatible updater; test refusal, conflicts and interrupted publication.
- [x] 5. Port all original tests with explicit mapping, document checker and demo runner. Add regression cases for conversion risks.
- [x] 6. Update current design/spec/plan/guides and CI; remove active Python only after equivalent coverage passes.
- [x] 7. Build, typecheck, run full suite, npm-pack/install into a clean directory, and run both demo scenarios.
- [x] 8. Independently review behavior and maintainability; fix findings, rerun relevant checks, publish exact results and platform limits.

## Review focus

Canonical JSON must preserve Unicode ordering and historical hashes. Strict loaders reject duplicate keys and aliases. Installed bundles work outside the source repository. Writer locking and interruption never corrupt history. Updates reject incompatible runtime APIs without mutation. Avoid tests that weaken old assertions merely to pass.

## Progress

Baseline: /private/tmp/boneharness-python-baseline. Working copy: /private/tmp/boneharness-ts-work. Copy back only reviewed task changes after checking the original has not changed concurrently.

Verified: 137 baseline cases preserved; 20 additional cases. Both Node versions: 156 pass, one Windows-only skip. Both disposable demo scenarios COMPLETE. Independent review found no blocking issues. Final repository-location checks passed: typecheck, 156 passing tests, one Windows-only skip, formatting, documentation and reviewed-source byte comparison. Native Windows/Linux remains pending.
