# TypeScript conversion specification

Goal: one Node.js toolchain, familiar installation, unchanged harness decisions.

- [x] `bh init/status/doctor/config/update` preserve options, results and exit codes.
- [x] Installed helpers require Node.js, with no Python or environment activation.
- [x] Preserve phase order, mandatory specification checks, explicit skips, human approvals and failure history.
- [x] Preserve strict parsing, local schema validation, evidence integrity, command capture and interrupted-write recovery.
- [x] Existing format-2 records remain readable. Refuse unproven upgrade compatibility without modifying installations.
- [x] Every existing test has a traceable TypeScript equivalent; add serialization, packaged-install, concurrency and platform cases.
- [x] Strict TypeScript, focused modules, explicit public types, minimal dependencies and no Python subprocess bridge.
- [x] Package installs outside this checkout; CI checks supported Node versions on Windows, macOS and Linux.

Conversion scope: preserve Markdown, YAML, schemas, commands and layout. The subsequent [layout reorganization](../artifact-layout.md) changes directories with historical-reader compatibility. Historical archives remain untouched.

[Design](design.md) · [Implementation plan](implementation-plan.md)

Local checks passed on Node.js 22/24. Native Windows/Linux runs remain pending; see [verification](../verification.md).
