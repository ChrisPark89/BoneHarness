# TypeScript conversion design

## Scope and boundaries

Convert the current working tree, including uncommitted CLI work. The Python baseline is preserved outside the working tree for comparison. Product source lives in `builder-kit/src/`, tests in `tests/typescript/`. Only builder-kit is distributed. The conversion preserved schema/template locations; the subsequent [layout reorganization](../artifact-layout.md) groups them. Generated bundles are build output.

Node.js 22+; compile strict TypeScript to JavaScript. One npm package exposes `bh`. Bundle installed helper entry points as `.cjs` under `.harness/framework/tools` so target repositories need no node_modules or package.json edits. Ship package templates plus generated CLI and helper bundles. Keep libraries small: YAML parsing, Ajv 2020 validation and formats; TypeScript/esbuild build dependencies. Use Node's built-in test runner.

## Internal interfaces

Modules accept resolved path strings, use synchronous filesystem reads for deterministic validation, and return plain typed records. Keep existing persisted snake_case fields and function names during the conversion. I/O errors become structured diagnostics at command boundaries. Runtime input is unknown until strict parsing/schema checks; do not use TypeScript casts as validation. Source modules have one responsibility: I/O, journal, capture/report, checker, installer, CLI views and updater. No framework or service container.

Entry bundles: check.cjs, report.cjs, journal.cjs, command.cjs, context.cjs, source.cjs and view.cjs. Keep helper argument semantics; replace Python executable/script references in active guides. No dynamic eval or Python bridge. Keep development/test-only tooling out of distributed assets.

## Compatibility and failure behavior

Preserve schema version 2.0.0 and canonical journal bytes for supported historical values. Compare hashes, Unicode, numbers and serialized fixtures with Python; reject floating-point spellings, unsafe integers and unpaired surrogates rather than silently change identity. Runtime release API increments to 2: legacy Python runtime update is unsupported unless proven separately. Refusal is unchanged and actionable; history readers still handle supported format-2 records.

Coordinate all shipped writers with one exclusive lock protocol. Interrupted writers must not allow overlapping publication; stale lock recovery must prove its owner is gone. Do not use timeout alone as proof. Atomic replacement, before/after hashes and recovery receipts preserve external edits. Existing Python processes cannot participate in the new lock protocol, hence the explicit upgrade boundary.

## Verification

Map all original unittest cases to named Node tests; tests must assert behavior, not merely count names. Add malformed YAML/JSON, numeric/hash fidelity, path traversal/symlinks, command binary output, competing writers, missing bundle, npm pack/install outside checkout and read-only views. Retain a small baseline fixture set without retaining a second implementation. Cross-platform CI verifies native behavior; local results alone never claim all-OS support.

References: https://nodejs.org/api/test.html ; https://ajv.js.org/json-schema.html ; https://eemeli.org/yaml/

## Verification outcome

All 137 baseline cases mapped and reviewed. Twenty additional cases cover conversion risks. Local Node.js 22.20.0 and 24.10.0 each pass 156 cases with one Windows-only skip. Native Windows/Linux runs remain pending. The npm archive installs offline without runtime dependencies; source dependency versions are pinned in the workspace lockfile.
