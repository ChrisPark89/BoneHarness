# BoneHarness specification — format 2

**Design:** one ordered phase list, shared statuses and evidence-backed progress. [Implementation plan](implementation-plan.md).

## Required behavior

| Area | Requirement |
|---|---|
| Installation | Create `.harness/`; distinguish structure from tool readiness. |
| Profile | Show adapter connection, compatibility and reason; optional instructions/evidence. |
| Progress | Start with Task initialization; keep Pattern review visible. Record attempts using common statuses. |
| Skips | Require explicit user instructions. Specification acceptance and final verification cannot be skipped; requirements survive every skip. |
| Completion | Derive from accepted criteria, current source evidence, resolved phases and no uncertain operation. |
| Recovery | Preserve failures and unfinished work. Inspect uncertain tool activity before retrying. |
| Maintenance | Check compatibility, retain previous configuration, publish changes and refresh setup status. |
| Reading | Human pages ≤200 words. LLM guides are sequential; parsers select relevant structured records. |

## Minimal records

Task, accepted specification, source inventory, phase attempts and conditional tool operations. Writer-supplied bookkeeping replaces transition requests, gate decisions and mutable state snapshots.

## Boundary

Format 2 tools refuse format 1 records. Existing installations keep matching tools. Compatibility does not prove tool quality. Reviews remain attributed judgments.
