# Conversion test coverage

The [mapping](../../tests/typescript/coverage-map.json) tracks all **137 original test methods** to their Node test equivalents. Behavioral assertions remain; conversion regressions have separate names.

| Area | What stays covered |
|---|---|
| Parsing and schemas | Duplicate keys, unsafe paths, ambiguous YAML, local references, source hashes |
| Setup | Missing files, honest compatibility evidence, concise context, activation |
| Development | Phase ordering, explicit skips, mandatory specs, failures, stale evidence |
| Reviews | Human gates, approval identity, changed candidates, captured settings |
| Commands | Raw/binary output, timeouts, launch errors, replay prevention |
| CLI/update | Read-only views, preserved settings/history, conflicts, rollback and recovery |
| Distribution | npm package installed outside checkout; no Python runtime |

Adaptations: the wheel test becomes npm packaging; missing Python dependencies becomes missing bundled runtime helpers. Interruption tests terminate a real child process. Release-version assertions follow version 3.0.0.

Additional cases compare Python-generated canonical bytes and journal hashes, Unicode ordering, prototype keys, lossy-number rejection and concurrent writers. Existing integer-valued records retain their hashes; unsupported numeric values fail clearly.

Golden fixtures were generated once from the preserved Python baseline. Test runs never invoke Python.

Final execution results are recorded in [verification](../verification.md).
