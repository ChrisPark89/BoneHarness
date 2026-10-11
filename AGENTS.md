# Project working guidelines

These instructions govern BoneHarness development. Only `builder-kit/` is distributed.

Read this file at startup and after context condensation. Share with delegated agents. Check files before resuming.

## Before changing the design

1. Ask: **Who uses this information, when, and what becomes harder or unreliable without it?** Consider mistakes prevented, recovery enabled and decisions supported.
2. Classify fields/records: required, conditional, or removable/derivable. Trace consumers before deleting. Clarify consequential ambiguity.
3. Prefer fewer concepts, shared rules and existing files. Reduce complexity itself; moving it elsewhere is insufficient. Avoid speculative features.
4. Keep human pages within 200 words, using tables or bullets. Show progress, issues, next action and evidence. Adapter profiles show connection, status and reason. Reserve human CLI use for setup, updates or diagnosis.
5. Give LLMs short sequential guides and an index. Parse lengthy JSON/YAML; load relevant excerpts.
6. Update affected design/spec/plan documents together. Distinguish proposals, implementation and verified behavior. Run proportionate checks.

## Preserve

Specification acceptance and final verification are mandatory. Other phase skips need explicit user instruction; specification requirements survive. Retain relevant evidence, failures and recovery information.

Task initialization replaces NEW/BASELINE; Pattern review stays visible. Use phases with shared statuses. Older histories retain matching tools.
