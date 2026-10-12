# BoneHarness implementation plan

Scope: [specification](specification.md).

[CLI MVP](cli-mvp/spec.md) · [TypeScript plan](typescript/implementation-plan.md) · [Execution notes](cli-mvp/implementation.md)

## Completed foundation

- [x] Compact profiles, ordered phases, explicit skips and short human reports.
- [x] Installation assessments, maintenance and recovery.
- [x] Original command capture; reject rewritten/replayed evidence.
- [x] Context stays together up to 8,000 characters, then paginates.

## Configurable human review

- [x] Add profile defaults and per-phase review overrides.
- [x] Derive BLOCKED while a valid result awaits approval; preserve existing phases.
- [x] Bind approval to the unchanged presented record and retained human exchange.
- [x] Distinguish pending specifications from accepted specifications.
- [x] Require fresh evidence after source/result changes; retain explicit skip rules.
- [x] Expose review status through context and short reports.
- [x] Clarify verification preparation and update installed guides/templates.
- [x] Run the full suite and independent review; resolve findings.
- [x] Exercise the installed instructions with a development LLM.

Scripted scenarios use LLM review. Existing demos remain untouched.

## Phase adapters

- [x] Support 11 optional adapters; keep initialization internal. See [implementation steps](cli-mvp/implementation.md#adapters-for-every-customizable-phase).

## Framework organization

- [x] Reorganize the bundle/workflows/schemas with regression tests, historical readers and rollback. [Steps](cli-mvp/implementation.md#framework-layout-reorganization).
