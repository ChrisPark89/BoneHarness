# Agent Development Harness — Brainstorming Idea

## The core idea

Instead of thinking about the agent as:

```text
"Here is a task. Write the code and make it work."
```

I am thinking about:

```text
Research
   ↓
Patterns / previous implementations
   ↓
Specification
   ↓
Test / acceptance contract
   ↓
Plan
   ↓
Implementation
   ↓
Preflight
   ↓
Build
   ↓
Test
   ↓
Verify against specification
```

The important part is that this is represented as a **state machine**.

---

## The state machine

```text
NEW
 ↓
BASELINED
 ↓
RESEARCHED
 ↓
PATTERN_VERIFIED
 ↓
SPEC_READY
 ↓
TEST_READY
 ↓
PLAN_READY
 ↓
IMPLEMENTED
 ↓
PREFLIGHT_PASSED
 ↓
BUILDING ───────────────────────────────┐
 ├──────────────→ BUILD_FAILED          │
 │                     ↓                │
 │                  REPAIRING           │
 │                     ↓                │
 │                  PREFLIGHT           │
 │                     ↓                │
 │                     └───────────────→│
 │                                      │
 ↓                                      │
BUILD_PASSED                            │
 ↓                                      │
TESTING                                 │
 ├──────────────→ TEST_FAILED           │
 │                     ↓                │
 │                  REPAIRING           │
 │                     ↓                │
 │                  PREFLIGHT           │
 │                     ↓                │
 │                     └───────────────→│
 │
TEST_PASSED
 ↓
SPEC_VERIFIED
 ↓
READY_FOR_REVIEW
 ↓
COMPLETE
```

---

## Why a state machine?

An LLM can say:

> "I think this is ready to build."

But that is not very useful as a control mechanism.

Instead, each state should have **evidence** attached to it.

For example:

```text
SPEC_READY
    → specification exists
    → acceptance criteria defined
    → relevant research recorded

PATTERN_VERIFIED
    → historical examples found
    → proposed implementation is consistent with them

PREFLIGHT_PASSED
    → deterministic checks passed
    → repository-specific checks passed
    → no known blocking issues found

BUILD_PASSED
    → actual remote build passed
    → build ID / commit / artifact recorded

TEST_PASSED
    → actual test framework returned success
    → test result recorded
```

The LLM can **interpret the evidence**, but it should not be able to manufacture it.

That is probably the most important design principle in the whole idea:

> **The harness tracks reality; the LLM interprets reality.**

---

## Evidence becomes the connection between the states

I imagine each stage leaving a small machine-readable record rather than just conversation history.

For example:

```yaml
state: BUILD_PASSED
commit: abc123
build_id: 456789
result: PASS
artifacts:
  - ...
evidence:
  - remote build result
  - build log
```

Then a later agent/session does not have to infer what happened from an old conversation.

It can simply inspect the current state and its evidence.

This also makes the workflow more deterministic and resumable.

---

## The LLM is not the only validator

I would split validation into layers:

```text
Cheap deterministic checks
        ↓
Repository-specific checks
        ↓
Pattern / dependency checks
        ↓
LLM semantic review
        ↓
Actual compiler / build
        ↓
Actual integration tests
```

The LLM should help with reasoning, but the strongest gates should come from systems that can produce objective results.

This is especially important for our environment because a pretend "LLM compiler" could easily create false confidence.

A more interesting direction may be to learn from our **historical build failures** and catch recurring problems before paying the cost of a remote build.

---

## Progressive disclosure for a large repository

Another part of the idea is how we expose repository knowledge to the agent.

Instead, I would separate:

```text
Canonical knowledge
├── Architecture
├── Components
├── Languages / platform conventions
├── Build
├── Testing
├── Patterns
├── History
└── Quality / invariants
```

from:

```text
Role entry points
├── Developer
├── Tester
├── Support
└── Documenter
```

The role-specific documents should mostly answer:

> "What information do I need, where is it, and what workflow do I follow?"

They should point to canonical knowledge rather than duplicating it.

So the repository is structured by **what the knowledge is**, while the entry points are structured by **who is using it**.

---

## What could become a skill?

The harness does not need to know how to do everything itself. It can call small skills that already understand one system.

For example:

```text
Research skill
Git / history skill
Pattern-search skill
Build skill
Build-log / diagnostic skill
Test skill
Preflight skill
Diff / specification review skill
```

Each skill ideally returns structured information rather than a large block of text.

For example:

```text
build()
    → status
    → build ID
    → commit
    → artifacts
    → diagnostics
```

That gives the state machine something concrete to work with.

---

## What I would NOT try to build immediately

I don't think the first version should attempt to:

- understand the whole repository automatically
- autonomously develop arbitrary features
- replace the compiler
- replace the test framework
- build a company-wide AI platform
- automatically repair every failure

Those are possible future directions, but they are not necessary to test the core idea.

---

## A very small first experiment

I think we could test the idea with one real change and only a few capabilities:

```text
Research
   ↓
Historical pattern search
   ↓
Simple specification
   ↓
Implementation
   ↓
Preflight
   ↓
Remote build
   ↓
Diagnostic parsing
   ↓
External test
   ↓
Final verification
```

The first objective would not be full autonomy.

It would be to see whether explicitly tracking the workflow and evidence helps us:

- avoid unnecessary builds
- diagnose failures faster
- preserve useful repository knowledge
- make LLM work more repeatable
- resume work without losing context

If this is useful, then we can decide what deserves to become shared infrastructure.

---

## Questions I would like us to brainstorm

1. **What should the actual states be for our repository?**

2. **What evidence should be required before moving from one state to another?**

3. **Which checks can we perform before the expensive remote build?**

4. **Can we reuse existing build/test CLI tooling instead of building new infrastructure?**

5. **What repository knowledge should become canonical documentation for agents?**

6. **What would be a good first change to use as a pilot?**

7. **Which parts are useful as an individual developer tool, and which genuinely need team ownership?**

---

## The basic proposition

I am not suggesting that we make the LLM smarter.

I am suggesting that we make the **development environment more legible and verifiable to the LLM**.

The state machine is one way of doing that:

```text
LLM reasoning
      +
repository knowledge
      +
small executable skills
      +
evidence from real systems
      ↓
controlled development loop
```

That is the idea I would like to explore together.
