# Independent runtime and test review

Reviewed the original and converted development, review, command and I/O suites: 66 named tests. Their substantive success, refusal, evidence and preservation assertions are present. One exception-type assertion should be tightened: an existing command result must fail with `EEXIST`.

## Findings sent to the implementation owner

| Priority | Finding | Required action |
|---|---|---|
| High | `1.0` and `1e0` normalize to integer identities; Python preserved float spelling. | Reject unsupported numeric tokens before parsing loses their identity; test JSON and YAML. |
| High | Command-result `exit_code: 0.0` becomes integer zero; Python refused it. | Apply strict numeric parsing to captured results. |
| Medium | YAML exponent spellings such as `1e2` become numbers; Python treated them as strings. | Preserve the old interpretation or explicitly reject ambiguity. |
| Low | JSON key `<<` is rejected by YAML-only checks. | Keep literal JSON keys valid. |
| Platform check | Windows npm/batch commands require deliberate invocation with Node subprocess APIs. | Add a native Windows case or provide explicit compatible adapter arguments. |

Numeric and scalar differences were reproduced against the preserved Python baseline. Windows behavior remains a portability review item, not a locally verified failure. No further reducer, approval or source-inventory divergence was found in this review.
