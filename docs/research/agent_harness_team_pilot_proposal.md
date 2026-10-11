# Agent Development Harness — Team Pilot Proposal

## Purpose

This proposal recommends a small, evidence-driven pilot to make the repository's existing development workflow more explicit, repeatable, and machine-verifiable for LLM-assisted development.

The proposal is intentionally **not** a request to build a large autonomous coding platform.

The first objective is to demonstrate that a lightweight harness can reduce expensive build/test iterations and make repository-specific engineering knowledge easier for an LLM to use safely.

---

## 1. Executive Summary

Our repository is large, heterogeneous, and expensive to validate:

- 1000+ files with substantial source files
- multiple languages and platform-specific technologies, including z/OS assembler, PL/X, C, and Java
- remote-only production builds
- production builds that can take roughly 5 minutes to more than 30 minutes
- an external Java-based test framework in a separate repository
- limited opportunity for conventional unit-test-driven development because production artifacts generally have to be built before meaningful integration testing can occur

At the same time, LLM-based coding assistants are becoming increasingly useful for research, code navigation, pattern discovery, implementation, and diagnostic analysis.

The main engineering constraint is therefore not simply code generation. It is **verification latency and repository knowledge**.

A useful harness should allow an LLM to follow a controlled workflow such as:

```text
Research
  ↓
Historical pattern discovery
  ↓
Specification
  ↓
Test/acceptance contract
  ↓
Implementation plan
  ↓
Implementation
  ↓
Cheap preflight validation
  ↓
Remote build
  ↓
Diagnostic analysis
  ↓
External test execution
  ↓
Test diagnosis / repair
  ↓
Specification verification
```

The proposal is to begin with a small pilot that makes this workflow explicit and records evidence at each stage.

If the pilot demonstrates measurable value, the capabilities can then be expanded into shared team infrastructure.

---

## 2. Problem Statement

### 2.1 The current workflow is expensive to validate

A typical change can involve several slow cycles:

```text
Implement
  ↓
Build
  ↓
Compiler failure
  ↓
Fix
  ↓
Build again
  ↓
Test
  ↓
Test failure
  ↓
Fix
  ↓
Build again
  ↓
Test again
```

Even when the source change is small, the feedback loop can be long.

### 2.2 Repository knowledge is distributed

The information required to implement a change correctly may be distributed across:

- source code
- internal documentation
- historical commits
- Git issues
- pull requests
- RTC history
- build scripts
- test repositories
- implementation conventions
- support knowledge from previous releases

An LLM that only sees the current source files is therefore missing a large portion of the engineering context.

### 2.3 Conventional TDD does not map cleanly to the environment

The environment does not provide a conventional fast unit-test loop for much of the production code.

This does not prevent a specification-driven and test-driven development model, but it changes the shape of the loop:

```text
Specification
  ↓
Acceptance/test contract
  ↓
Implementation
  ↓
Preflight validation
  ↓
Production build
  ↓
Integration/functional test
```

The important opportunity is to move as much verification as possible **before** the expensive build.

### 2.4 A fully autonomous agent would introduce unnecessary risk

A large autonomous system would need to understand:

- repository architecture
- build infrastructure
- test infrastructure
- permissions
- failure modes
- historical conventions
- safety/security boundaries
- human escalation conditions

Attempting to solve all of these simultaneously would create a large engineering project before value has been demonstrated.

---

## 3. Proposal

Build a small **Agent Development Harness** that provides four capabilities:

### A. Explicit workflow state

Represent development as a state machine rather than as an informal sequence of prompts.

### B. Machine-readable evidence

Each state transition requires evidence from a tool, repository artifact, build result, test result, or explicit human decision.

### C. Modular skills

Wrap existing repository capabilities such as Git, documentation search, build, diagnostics, and testing behind simple machine-readable interfaces.

### D. Controlled repair loops

Allow the LLM to diagnose and repair build/test failures, but impose bounded retries and escalation conditions.

---

## 4. Target State Machine

The state machine is the core of the proposed design.

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

At any stage the harness may enter:

```text
HUMAN_REQUIRED
```

when evidence is contradictory, requirements are ambiguous, or bounded automated repair has failed.

### 4.1 State transition principle

The LLM must not be the sole authority for moving between states.

For example:

```text
"I think the build is ready"
```

is not evidence.

An actual build result is evidence:

```text
BUILD_PASSED
build_id = ...
commit = ...
profile = ...
artifact = ...
```

Likewise, the LLM cannot declare a test passed without an actual test result.

---

## 5. Evidence as the Core Harness Concept

The harness should treat **evidence as the currency of progress**.

A state should contain something similar to:

```yaml
state: BUILD_PASSED

commit_sha: "..."
build_id: "..."

 evidence:
  - type: build-result
    source: remote-build
    result: PASS

artifacts:
  - ...

remaining_risks:
  - ...

next_action: TESTING
```

This creates a distinction between:

```text
LLM reasoning
```

and

```text
engineering evidence
```

The LLM interprets evidence; it should not manufacture it.

---

## 6. What the Pilot Should and Should Not Do

### 6.1 Pilot should

The initial pilot should demonstrate a complete but narrow workflow:

```text
Research
→ Pattern discovery
→ Specification
→ Test/acceptance contract
→ Implementation
→ Preflight
→ Build
→ Diagnostic parsing
→ Test
→ Final verification
```

The pilot should use a real repository change rather than a toy example.

### 6.2 Pilot should not

The first phase should not attempt to build all of the following:

- a general-purpose autonomous coding platform
- a new CI/CD system
- a replacement for Git
- a replacement for the existing test framework
- a universal compiler emulator
- a company-wide knowledge graph
- fully autonomous production changes
- a custom LLM model

Those may become future capabilities, but they are outside the initial proof of value.

---

## 7. Recommended Pilot Scope

The smallest useful pilot should wrap existing capabilities rather than replace them.

### Candidate components

```text
Repository/documentation search
Git/history inspection
Build adapter
Build-log parser
Test adapter
State/evidence store
LLM orchestration prompt
```

Conceptually:

```text
                ┌─────────────────────┐
                │     LLM Agent       │
                └──────────┬──────────┘
                           │
                    ┌──────▼──────┐
                    │   Harness    │
                    │ State + Gate │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      Repository         Build            Test
      / History          System           System
```

The first pilot does not need sophisticated autonomous repair. It can begin by allowing the LLM to recommend the next action while the harness records and validates state transitions.

---

## 8. Progressive Disclosure and Documentation Structure

The repository serves multiple roles, including developers, testers, support engineers, and documentation contributors.

The recommended documentation model is:

> **Organize canonical knowledge by subject; organize navigation by role.**

Avoid maintaining separate copies of the same engineering knowledge in developer/tester/support documents.

### Canonical knowledge

```text
docs/ai/
  architecture/
  components/
  languages/
  build/
  testing/
  patterns/
  history/
  quality/
```

### Role entry points

```text
docs/roles/
  developer.md
  tester.md
  support.md
  documenter.md
```

A role document should answer:

- What does this role need to know?
- Which canonical documents should be read first?
- Which workflows apply?
- Which tools/skills are relevant?
- What evidence should the role produce?

It should not duplicate the underlying technical knowledge.

This gives the LLM progressive disclosure while keeping the repository maintainable.

---

## 9. Skills / Tool Interfaces

The pilot should create thin adapters around existing systems.

Potential skills include:

| Skill | Purpose |
|---|---|
| Repository Search | Locate relevant source and documentation |
| History Search | Find historical implementations and fixes |
| Pattern Search | Identify similar previous changes |
| Git | Inspect diff, branch, commit, push state |
| Build | Trigger remote build |
| Build Status | Poll build status |
| Build Log | Retrieve relevant logs |
| Diagnostics | Normalize compiler/build failures |
| Preflight | Perform cheap checks before build |
| Test | Invoke external test CLI |
| Test Result | Normalize test results |
| Spec Validation | Check acceptance criteria and traceability |
| Diff Review | Compare actual change with planned scope |

Each skill should return structured data where practical.

For example:

```json
{
  "status": "FAILED",
  "diagnostics": [
    {
      "severity": "ERROR",
      "file": "...",
      "line": 123,
      "code": "...",
      "message": "...",
      "category": "..."
    }
  ]
}
```

---

## 10. Preflight Strategy

Because the production build can be expensive, preflight validation is one of the highest-value areas for experimentation.

However, an LLM should not initially be treated as a compiler emulator.

Use a layered approach:

```text
Deterministic checks
       ↓
Repository-specific static checks
       ↓
Dependency/reference checks
       ↓
Historical pattern checks
       ↓
LLM semantic review
       ↓
Real compiler/build
```

The most promising initial investments are likely to be deterministic or repository-specific checks and structured historical build-failure analysis.

An LLM-based "mock compiler" can be evaluated later, but its output should be classified as:

```text
PREDICTION
```

rather than:

```text
PROOF
```

---

## 11. Build Failure Knowledge Base

Every remote build is expensive feedback.

The pilot should investigate whether build failures can be normalized into a reusable dataset:

```yaml
failure:
  language: PLX
  component: ...
  phase: compile
  diagnostic_code: ...
  category: symbol-resolution
  file: ...
  line: ...

resolution:
  ...

successful_fix_commit:
  ...
```

Over time, this could support:

- recurring-error detection
- pre-build warnings
- better LLM diagnosis
- identification of missing repository rules
- prioritization of deterministic linting rules

This is a longer-term opportunity, not a prerequisite for the first pilot.

---

## 12. Success Criteria

The pilot should be measured with real engineering data.

Suggested metrics include:

### Build efficiency

- average remote builds per successful change
- percentage of failures caught before remote build
- average number of repair builds
- percentage of repeated compiler failures

### Test efficiency

- test retries per successful change
- percentage of failures classified correctly
- percentage of acceptance criteria with explicit tests

### Agent quality

- percentage of state transitions backed by evidence
- percentage of implementation decisions supported by repository examples
- number of unexpected file changes
- human intervention rate
- repair-loop termination rate

### Developer experience

- time spent searching for repository patterns
- time spent interpreting build logs
- time spent locating relevant historical changes
- total elapsed time per representative change

The primary value metric should be tied to the cost of the current bottleneck:

> **How many expensive build/test cycles does the harness eliminate or shorten?**

---

## 13. Definition of a Successful Pilot

The pilot does not need to make the LLM fully autonomous.

It is successful if it demonstrates that, for a representative real change, the harness can:

1. discover the relevant repository knowledge
2. identify historical implementation patterns
3. express the work as a specification with acceptance criteria
4. track the change through explicit states
5. perform useful pre-build checks
6. invoke the existing remote build
7. normalize and present build failures effectively
8. invoke the existing external tests
9. maintain traceability from specification to validation
10. produce a final evidence-backed result

A measurable reduction in unnecessary remote builds would strengthen the business case for expanding the harness.

---

## 14. Team / Department Ownership

The long-term version is likely to require more than one developer because the harness crosses several boundaries:

```text
Repository knowledge
Build infrastructure
Test infrastructure
Developer workflow
LLM/agent tooling
Security and permissions
Documentation
Support/release knowledge
```

Potential ownership areas include:

### Development representatives

Provide coding patterns, architecture knowledge, and implementation workflows.

### Test representatives

Provide test conventions, CLI interfaces, scenario models, and test-result semantics.

### Build/infrastructure representatives

Provide remote-build integration, authentication, build IDs, logs, and artifact handling.

### Support/release representatives

Provide historical failure knowledge and release/support workflows.

### Documentation representatives

Maintain canonical knowledge and role navigation.

### Agent/harness maintainers

Maintain the orchestration layer, skill contracts, state model, diagnostics, and observability.

The pilot should identify these ownership needs rather than attempting to establish all of them upfront.

---

## 15. Governance and Safety Boundaries

Before expanding beyond a developer-controlled pilot, define:

- repository access boundaries
- branch restrictions
- push permissions
- credential handling
- build/test environment permissions
- sensitive data exposure
- logging and audit requirements
- human approval points
- handling of security-sensitive changes
- escalation behaviour

A useful principle is:

> **Automation should increase verification, not remove accountability.**

---

## 16. Suggested Expansion Path

The capability can grow incrementally:

### Stage 1 — Observable workflow

Record the existing workflow and state transitions.

### Stage 2 — Evidence gates

Require evidence for state transitions.

### Stage 3 — Preflight

Add cheap deterministic and repository-specific checks.

### Stage 4 — Diagnostic intelligence

Normalize build/test failures and improve automated diagnosis.

### Stage 5 — Controlled repair loops

Allow bounded autonomous repair and retry.

### Stage 6 — Shared team service

Standardize skills, documentation, metrics, permissions and ownership.

### Stage 7 — Broader workflow coverage

Extend beyond the initial developer path to testing, support and release workflows.

Each stage should provide usable value before the next stage is started.

---

## 17. Risks

### Risk: The project becomes a generic AI platform

Mitigation:

Keep the pilot focused on the repository's actual workflow and existing tools.

### Risk: The LLM invents repository conventions

Mitigation:

Require evidence and explicitly distinguish FACT, INFERENCE and UNKNOWN.

### Risk: Agent retries waste more time than they save

Mitigation:

Use bounded retry policies and measure remote builds per successful change.

### Risk: Documentation becomes stale

Mitigation:

Keep canonical documentation close to the repository and prefer generated/validated information for machine interfaces.

### Risk: The state machine becomes bureaucracy

Mitigation:

Only introduce states that correspond to meaningful engineering evidence or decisions.

### Risk: A mock compiler creates false confidence

Mitigation:

Treat LLM predictions as advisory and retain the real compiler as the authority for build validity.

### Risk: Harness maintenance becomes another major platform

Mitigation:

Start with thin wrappers around existing tools and promote only high-value capabilities into shared infrastructure.

---

## 18. Recommended Immediate Pilot

A practical first pilot should select one representative change that:

- touches a manageable number of files
- uses established repository patterns
- requires the real production build
- has an available integration/functional test
- has enough historical precedent to research
- is valuable enough to justify measurement

The pilot should avoid a change whose primary difficulty is itself a major architectural redesign.

The objective is to exercise the workflow rather than to solve the hardest possible feature.

---

## 19. What We Are Asking For

The initial request should be intentionally small:

1. agreement to run a controlled pilot
2. access to the existing build and test interfaces needed by the pilot
3. permission to create lightweight repository-local harness documentation/scripts where appropriate
4. one representative real change for evaluation
5. agreement on a small set of success metrics

No commitment to a large-scale autonomous coding platform is required at the start.

Expansion should be based on measured pilot results.

---

## 20. Decision Proposal

Proceed with a small pilot of the Agent Development Harness focused on:

```text
Research
→ Pattern discovery
→ Specification
→ Preflight
→ Build
→ Diagnostic normalization
→ Test
→ Evidence-backed final verification
```

The pilot should be implemented with existing tools wherever possible and should prioritize measurable reduction in expensive feedback cycles.

The outcome should be one of:

```text
Expand
```

if measurable value is demonstrated,

```text
Refine
```

if the approach is promising but the workflow or scope needs adjustment,

or

```text
Stop
```

if the measured cost exceeds the value delivered.

This keeps the initiative evidence-driven rather than committing the organization to a large up-front platform project.

---

# Appendix A — Minimal Pilot Architecture

```text
                    Human
                      │
                      ▼
              ┌───────────────┐
              │     LLM       │
              │   reasoning   │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │    Harness    │
              │ state + gates │
              └───────┬───────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
   Repository       Build           Test
   knowledge        adapter         adapter
        │             │              │
        ▼             ▼              ▼
   Evidence        Evidence        Evidence
        └─────────────┼──────────────┘
                      ▼
                State update
```

---

# Appendix B — Guiding Principles

1. **Evidence over assertion.**
2. **Repository knowledge over generic assumptions.**
3. **Deterministic validation over LLM self-evaluation.**
4. **Small pilot before platform investment.**
5. **Stateful and resumable workflows over one-shot prompts.**
6. **Canonical knowledge plus role-specific navigation.**
7. **Bounded repair loops rather than uncontrolled retries.**
8. **Real compiler and test results remain authoritative.**
9. **Measure expensive feedback cycles.**
10. **Expand only where the pilot demonstrates value.**
