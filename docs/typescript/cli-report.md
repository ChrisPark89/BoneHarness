# CLI conversion implementation review

Implemented: installer, setup checker, shared views, five commands, release preview, compatible publication and interrupted-update recovery. Public records have explicit TypeScript interfaces. Installed helpers are bundled and need only Node.js.

Preserved: adapter assessment checks, optional gaps, HUMAN review defaults, task selection, evidence links, read-only views, profile comments, recorded completions, ownership hashes, retained history and rollback protection for later edits.

Compatibility boundary: runtime API 2 accepts format-2 records; Python runtime API 1 updates are refused unchanged.

Local checks (Node.js 24.10.0, macOS):

- Strict product typecheck passed.
- Fresh init/status/doctor/config and unchanged upgrade preview passed.
- Changed release preview, publication and post-update doctor passed.
- npm pack and offline npm installation outside the checkout passed. Installed launcher version/init/doctor passed without repository dependencies.
- Independent review compared all original CLI test assertions with the TypeScript ports. Assertions retained; interruption tests now terminate real processes.
- Focused baseline ownership test and all six task-view tests passed. Fixed a nonexistent report-field comparison. npm-safe ignore template preserves installed `.gitignore`.

Full-suite and native Windows/Linux results are recorded centrally by the coordinating agent.
