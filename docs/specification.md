# BoneHarness specification — format 2

**Design:** ordered phases and evidence-backed progress. [Plan](implementation-plan.md).

## Required behavior

| Area | Requirement |
|---|---|
| Installation | Create `.harness/`; retain observed results. Handoff names known blockers/actions. Context reads records. |
| Python | Document Python 3.11+, pinned dependencies and isolated Windows/macOS/Linux setup. |
| Profile | Keep connection/status/reason; COMPATIBLE requires matching REVIEW/EXECUTION assessment. Execution claims retain command, exit and output. |
| Progress | Start with Task initialization; keep Pattern review visible. Record attempts using common statuses. |
| Skips | Require explicit user instructions. Specification acceptance and final verification remain mandatory; requirements survive skips. |
| Completion | Derive from accepted criteria, current source evidence, resolved phases and no uncertain operation. |
| Recovery | Preserve failures and unfinished work. Inspect uncertain tool activity before retrying. |
| Maintenance | Check compatibility, retain previous configuration, publish changes and refresh setup status. |
| Reading | Human pages ≤200 words and support a decision. LLM guides are sequential; parsers select relevant structured records. |

## Minimal records

Existing setup/update checks hold adapter assessments. Task records remain unchanged.

## Boundary

Older records retain matching tools. Compatibility does not prove quality. Reviews remain judgments.
