# CLI roadmap

**MVP implemented:** [CLI MVP spec](../cli-mvp/spec.md). [Design](../cli-mvp/design.md) and [implementation notes](../cli-mvp/implementation.md) track decisions and verification.

## MVP

- [x] `bh init`, `bh status`, `bh doctor`, read-only `bh config`, compatible `bh update`.
- [x] Clear setup gaps, task outcomes, pending reviews and next actions.
- [x] Shared CLI/chat views; optional Markdown exports.
- [x] Updates preserve settings/history and identify affected unfinished tasks.

Start with HUMAN reviews except initialization. Users can gradually delegate selected reviews to LLM through maintenance. Existing tasks retain captured settings.

## Later

- [ ] Configuration editing through the CLI.
- [ ] Adapter-management commands.
- [ ] Dedicated context/log navigation commands if needed.
- [ ] Broader migrations only when a concrete compatibility need appears.

Avoid a plugin system, daemon or automatic runtime switching in the MVP. Packaging stays inside the distributed builder kit.
