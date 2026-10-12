# Human review checkpoints

1. Read the task's captured `reviews` settings. `default` applies unless `phases` overrides it. New installations default to HUMAN review except initialization, which uses LLM review. Only an explicit user request may change these settings through setup/maintenance. Existing tasks keep their captured settings.
2. Prepare the phase result with evidence. Submit the specification or proposed phase PASS through the journal. For HUMAN review, it remains BLOCKED; this submission is not acceptance.
3. Collect the task view (`bh status --task ID` or installed `view.cjs --task-id ID`). Show the human a short summary, the relevant document/evidence links and the review reference returned by context. For specification, present `docs/development/<task>/spec.md`, with research findings, scope and criteria, within 200 words. Ask for approval or corrections, then stop. Do not treat the original task request or silence as approval.
4. Preserve the original exchange containing the presented reference and explicit reply. Submit [review.yaml](../../templates/development/review.yaml) through the journal with fresh context. The writer reuses the exact pending result; changed results need new submissions and approval.
5. Re-read context and continue only after approval. Corrections require revised evidence; missing checks still block progression.

Explicit phase skips use existing user authorization. Specification acceptance and final verification cannot be skipped. Local evidence cannot authenticate who supplied a reply.
