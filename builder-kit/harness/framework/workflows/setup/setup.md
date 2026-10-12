# Harness setup

## How to present this guide

1. **Resume.** Read only [profile](../../config/repo-profile.yaml). Continue the first `ACTION_NEEDED` entry using its saved instructions/reason; do not repeat answered questions. If all are `OK`, continue at “After all phase choices”.
2. **Ask.** Fresh setup: show introduction + phase 1. Copy every displayed block verbatim, preserving Markdown without fences. Present one phase at a time; stop and wait.
3. **Save.** After each reply, save choice/rules in `instructions`, selected `connection`, and next action/explanation in `reason`. Preserve other data. Read back before continuing; stop if saving fails.
4. **Clarify “no”.** Ask: **“Should the LLM choose, or should we skip this phase?”** For mandatory questions 3 and 10: **“Should the LLM choose how to perform this required phase?”** Wait, then save. Skips require explicit scope; never infer approval or silently change review settings.
5. **Resolve.** `ACTION_NEEDED`: name who must do what. Connected tools become `OK` only after [assessment](../shared/adapter-interface.md); retain evidence. Direct LLM work may use null connection + `OK`. Delegated tool selection stays pending until chosen and assessed. Deferrals retain their next action.

## Introduction

```markdown
The harness organizes development work into phases, such as research, implementation, build and testing. Each phase can use your existing tools or skills, which we call **adapters**.

We’ll ask about each phase **one at a time**. Tell us:

- Which tools, skills or rules to use.
- Whether the LLM should choose.
- Whether to skip the phase. *(Specification acceptance and final specification verification cannot be skipped.)*

The harness uses adaptors' results as evidence but does not verify the adaptors' accuracy.

Task initialization is automatic: the LLM creates task records and captures the starting state without asking for an adapter or human approval.

We’ll configure these **11 phases**:

1. Research
2. Pattern review
3. Specification acceptance
4. Verification preparation
5. Implementation plan
6. Implementation
7. Preflight
8. Build
9. Testing
10. Final specification verification
11. Final review
```

## 1. Research

Save each reply and connection choice directly in `adapters.research`.

```markdown
**1/11 — Research**

Gather the repository information needed to understand the task.

For research, do you have any tools, skills or rules?
```

## 2. Pattern review

Save each reply and connection choice directly in `adapters.pattern_search`.

```markdown
**2/11 — Pattern review**

Find existing examples and conventions to follow for this task.

For pattern review, do you have any tools, skills or rules?
```

## 3. Specification acceptance

Save each reply and connection choice directly in `adapters.specification`.

```markdown
**3/11 — Specification acceptance**

Write and agree what the task must achieve and how success will be checked.

For specification acceptance, do you have any tools, skills or rules?
```

## 4. Verification preparation

Save each reply and connection choice directly in `adapters.verification_plan`.

```markdown
**4/11 — Verification preparation**

Prepare the tests, checks or manual steps needed to verify the specification.

For verification preparation, do you have any tools, skills or rules?
```

## 5. Implementation plan

Save each reply and connection choice directly in `adapters.implementation_plan`.

```markdown
**5/11 — Implementation plan**

Decide which changes to make and in what order.

For implementation planning, do you have any tools, skills or rules?
```

## 6. Implementation

Save each reply and connection choice directly in `adapters.implementation`.

```markdown
**6/11 — Implementation**

Make the changes described in the plan.

For implementation, do you have any tools, skills or rules?
```

## 7. Preflight

Save each reply and connection choice directly in `adapters.preflight`.

```markdown
**7/11 — Preflight**

Run quick checks to catch issues before building or testing.

For preflight checks, do you have any tools, skills or rules?
```

## 8. Build

Save each reply and connection choice directly in `adapters.build`.

```markdown
**8/11 — Build**

Compile or package the project into a runnable or distributable form.

For building, do you have any tools, skills or rules?
```

## 9. Testing

Save each reply and connection choice directly in `adapters.test`.

```markdown
**9/11 — Testing**

Run the prepared tests and checks, and record their results.

For testing, do you have any tools, skills or rules?
```

## 10. Final specification verification

Save each reply and connection choice directly in `adapters.specification_verification`.

```markdown
**10/11 — Final specification verification**

Check the recorded evidence against every required specification criterion.

For final specification verification, do you have any tools, skills or rules?
```

## 11. Final review

Save each reply and connection choice directly in `adapters.final_review`.

```markdown
**11/11 — Final review**

Review the finished work and its evidence before handing it over.

For final review, do you have any tools, skills or rules?
```

## After all phase choices

1. **Configure.** Check the 11 adapter entries; address remaining actions or explain what is deferred. Inspect repository instructions and apply saved instructions/rules. Preserve configuration/history. Follow [Node.js setup](../../tools/README.md) and [adapter guide](../shared/adapter-interface.md); assess agreed adapters and retain compatibility evidence. Leave optional connections unset when no tool is selected. Keep initialization review set to LLM; other reviews default to HUMAN unless explicitly changed. Apply task skips only through the [development guide](../development/HARNESS.md).
2. **Verify.** Run `bh doctor` or installed `check.cjs`; retain command/exit/output evidence. Load README/development guide and record activation.
3. **Hand off.** Show readiness, gaps, affected phases, next action and evidence; link README/profile. **Stop after setup.**
