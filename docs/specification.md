# BoneHarness specification

[Plan](implementation-plan.md) · [CLI requirements](cli-mvp/spec.md) · [Layout](artifact-layout.md)

| Area | Required behavior |
|---|---|
| Installation | Create `.harness/`; retain checks and name blockers/actions. |
| Layout | Install from `builder-kit/harness/`; group workflows; separate templates and schemas. |
| Runtime | Node.js 22+, bundled helpers; Windows/macOS/Linux. |
| Profile | 11 adapters; OK/ACTION_NEEDED, next action, choices and review settings. |
| Progress | Task initialization, Pattern review and shared statuses. |
| Reviews | HUMAN except initialization by default; configurable per phase. Await explicit approval of the unchanged result. |
| Verification planning | Map criteria to checks, expectations, prerequisites and gaps. |
| Skips | Explicit user instruction. Specification acceptance and final verification remain mandatory. |
| Commands | Preserve output/exit and hash. Reject rewritten evidence; judge phases separately. |
| Completion | Accepted criteria, resolved phases/reviews, current evidence and no uncertain operation. |
| Recovery | Preserve failures; refresh stale evidence before retry. |
| Changes | Separate tools/settings changes from BoneHarness updates; preserve settings, task captures and history. |
| Reading | Human summaries ≤200 words; parsed context paginates beyond 8,000 characters. |

Hashes cannot authenticate human replies. Captures retain original paths/schemas.
