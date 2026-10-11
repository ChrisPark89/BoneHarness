# Agent Development Harness for a Large Mixed-Language Repository

## Purpose

This document proposes a practical architecture for applying Spec-Driven Development (SDD), acceptance-test-driven development, and coding agents to a very large legacy/mixed-language repository.

The target environment has:

- 1,000+ source files, with many files thousands of lines long.
- Mixed z/OS-oriented languages and technologies including assembler, PL/X, C, and Java.
- Git Enterprise as SCM.
- A remote-only production build environment.
- A build time ranging from roughly 5 minutes to more than 30 minutes.
- A separate Java-based integration/system test repository and CLI.
- No conventional unit-test cycle for most production changes; the production build must generally happen before meaningful tests can run.
- A development workflow that relies heavily on internal documentation and historical Git/issue/PR/RTC patterns.

The goal is **not** to make an LLM autonomously modify the entire repository. The goal is to make the engineering workflow observable, resumable, evidence-driven, and increasingly automatable.

---

# 1. Core design principle

The central architectural principle is:

> **Skills perform actions. The harness controls progression. The LLM provides reasoning. Deterministic tools provide evidence.**

A useful mental model is:

```text
Human intent
     |
     v
Specification
     |
     v
Research + historical patterns
     |
     v
Test contract
     |
     v
Implementation plan
     |
     v
Implementation
     |
     v
Cheap preflight validation
     |
     v
Remote build
     |
     v
Normalized diagnostics
     |
     +---- failure ----> Repair loop
     |
     v
Integration/system tests
     |
     +---- failure ----> Repair loop
     |
     v
Specification conformance
     |
     v
Human review / completion
```

The LLM should not be allowed to decide that a phase succeeded merely because it believes it succeeded. Each transition should have explicit evidence.

---

# 2. Why a harness is more important than a large prompt

A large repository creates several problems for a coding agent:

- The repository is too large to fit usefully into every context window.
- Legacy languages have repository-specific conventions that are more important than generic language knowledge.
- Historical changes contain useful implementation patterns, but they are distributed across code, Git history, issues, PRs, and old SCM records.
- The real compiler and integration test framework are relatively expensive to invoke.
- Long-running work may cross several LLM context windows.
- An LLM can easily mistake an inference for a repository rule.

Recent industry work points toward a different design: a small root instruction file acts as a map into a structured repository knowledge base, while workflows maintain explicit state and verification artifacts. OpenAI describes this explicitly as treating `AGENTS.md` as a table of contents rather than an encyclopedia. GitHub Spec Kit has also moved toward multi-step, resumable workflows with gates and convergence loops, while Anthropic's long-running-agent work emphasizes persistent progress artifacts and incremental completion across context windows. [1][2][3]

The repository therefore needs **discoverable knowledge and executable workflow**, not merely more instructions.

---

# 3. The four-layer architecture

Separate the system into four conceptual layers.

| Layer | Responsibility | Examples |
|---|---|---|
| Knowledge | What the repository knows | architecture, language rules, patterns, constraints, history |
| Skills | How the agent interacts with systems | Git, issue search, PR search, build, test, diagnostics |
| Harness | What happens next | state machine, gates, retry policy, budgets |
| LLM | Reasoning and transformation | research, planning, implementation, diagnosis, review |

This prevents the prompts themselves from becoming the software architecture.

---

# 4. Recommended workflow

A practical target workflow is:

```text
BASELINE
  |
  v
RESEARCH
  |
  v
PATTERN VERIFIED
  |
  v
SPEC READY
  |
  v
TEST READY
  |
  v
PLAN READY
  |
  v
IMPLEMENT
  |
  v
PREFLIGHT
  |
  v
REMOTE BUILD
  |
  +---- failure ----> DIAGNOSE -> REPAIR -> PREFLIGHT
  |
  v
TEST
  |
  +---- failure ----> DIAGNOSE -> REPAIR -> PREFLIGHT/BUILD/TEST
  |
  v
SPEC CONFORMANCE
  |
  v
READY FOR REVIEW
```

The key is that each phase produces an artifact that can be consumed by the next phase.

---

# 5. Final state model: the core of the harness

This is the most important part of the design.

The complete change should be represented as a persisted state machine:

```text
NEW
  |
  v
BASELINED
  |
  v
RESEARCHED
  |
  v
PATTERN_VERIFIED
  |
  v
SPEC_READY
  |
  v
TEST_READY
  |
  v
PLAN_READY
  |
  v
IMPLEMENTED
  |
  v
PREFLIGHT_PASSED
  |
  v
BUILDING
  |
  +------ BUILD_FAILED ------+
  |                          |
  |                          v
  |                      REPAIRING
  |                          |
  +---------- <--------------+
  |
  v
BUILD_PASSED
  |
  v
TESTING
  |
  +------ TEST_FAILED -------+
  |                          |
  |                          v
  |                      REPAIRING
  |                          |
  +---------- <--------------+
  |
  v
SPEC_VERIFIED
  |
  v
READY_FOR_REVIEW
  |
  v
COMPLETE
```

Possible terminal/side states:

```text
BLOCKED
HUMAN_REQUIRED
FAILED
CANCELLED
```

## 5.1 Transition rule

A transition must require evidence.

Instead of:

```text
LLM: "The implementation looks good. Let's build."
```

use:

```text
state = PREFLIGHT_PASSED

Evidence:
  - expected files changed only
  - required symbols/references found
  - repository-specific static checks passed
  - test contract exists
  - relevant historical patterns were verified
  - no known blocking diagnostic remains
```

## 5.2 Suggested state record

```yaml
change_id: CHANGE-123
state: PREFLIGHT_PASSED
updated_at: 2026-09-27T14:20:00Z

spec:
  path: ...
  version: 3

plan:
  path: ...

implementation:
  commit: abc123

validation:
  preflight:
    status: PASS
    evidence:
      - check-001
      - check-002

next_action: BUILD
blockers: []
```

The state should survive context-window changes and agent restarts.

---

# 6. Evidence should be the currency of the harness

For each phase, classify information explicitly as:

```text
FACT
INFERENCE
PATTERN
UNKNOWN
```

For example:

```text
FACT
A similar change exists in commit abc123.

PATTERN
Three historical changes use mechanism X.

INFERENCE
Mechanism X is likely the preferred extension point.

UNKNOWN
Whether X is still required for the current release branch.
```

This is particularly important in mature enterprise repositories, where old workarounds and historical exceptions can otherwise become accidental "rules" in the model's reasoning.

---

# 7. Research phase

The current workflow of:

```text
internal documentation
        -> Git issues
        -> Git PRs
        -> historical RTC/SCM records
        -> analogous implementation
```

is valuable and should become a formal skill.

The research skill should return structured evidence rather than free-form notes.

Example:

```yaml
research:
  topic: "..."

  concepts:
    - name: "..."
      source: "internal-doc/..."
      conclusion: "..."

  historical_changes:
    - issue: "..."
      pr: "..."
      commit: "..."
      relevance: "..."

  constraints:
    - "..."

  unresolved_questions:
    - "..."
```

---

# 8. Pattern mining

For a mature codebase, pattern discovery is arguably more important than generic code generation.

The agent should look for at least two or three relevant historical examples where practical.

A pattern record can look like:

```yaml
pattern: P-001

examples:
  - commit: ...
    files: [...]
  - commit: ...
    files: [...]
  - commit: ...
    files: [...]

invariants:
  - ...

variable_details:
  - ...

applicability:
  - ...

exceptions:
  - ...

anti_patterns:
  - ...
```

A single old implementation should not automatically be treated as a repository standard.

---

# 9. Spec-driven development in this environment

A useful change specification is small enough to maintain but structured enough to drive validation.

```text
Change
Problem
Goal
Non-goals
Behaviour
Constraints
Affected components
Relevant historical patterns
Acceptance criteria
Test scenarios
Build impact
Risks
```

## 9.1 Acceptance criteria

Each acceptance criterion should ultimately trace to implementation and validation:

```text
AC-01
  |
  +--> implementation area
  |
  +--> test scenario T01
  |
  +--> validation result
```

This creates a traceability matrix:

| Acceptance criterion | Implementation | Test | Result |
|---|---|---|---|
| AC-01 | component/file | T01 | pending |
| AC-02 | component/file | T02 | pending |
| AC-03 | regression area | T03 | pending |

---

# 10. TDD adaptation

Classical unit-test TDD is not a perfect fit when the production system must be built remotely before meaningful tests can execute.

The more realistic model is:

```text
Specification
     |
     v
Acceptance/integration test design
     |
     v
Test implementation
     |
     v
Production implementation
     |
     v
Preflight
     |
     v
Production build
     |
     v
Test execution
     |
     v
Repair / regression verification
```

The important TDD-like property is retained: **the expected behaviour and test scenarios are established before the implementation is considered complete.**

Do not force a unit-test model onto an environment that cannot support it.

---

# 11. Preflight validation and the mock-compiler idea

An LLM mock compiler is an interesting idea, but it should not be the first implementation.

Use a layered model:

```text
Level 1  deterministic checks
Level 2  repository-specific static checks
Level 3  dependency/reference checks
Level 4  structural/pattern validation
Level 5  LLM semantic preflight
Level 6  real compiler/build
```

The LLM can say:

```text
LIKELY BUILD RISK
```

but should not say:

```text
COMPILATION SUCCESS
```

Only the real compiler can establish that.

## 11.1 Approaches to evaluate

| Approach | Value | Risk | Suggested order |
|---|---|---|---|
| LLM mock compiler | Can catch semantic-looking mistakes | Can hallucinate compiler behaviour | Later |
| Deterministic static analysis | High confidence | Requires tooling | First |
| Repository-specific linter | High value for tribal rules | Initial engineering effort | First/second |
| Historical failure classifier | Potentially high value after enough data exists | Needs build history | Later |
| Compiler diagnostic prediction | Useful for prioritising risks | Not authoritative | Later |
| Partial/incremental remote build | Potentially enormous value | Depends on infrastructure | Investigate early |
| Combined approach | Strongest | Higher complexity | Eventually |

---

# 12. Build diagnostics should be normalized

Do not repeatedly give the entire raw build log to the LLM.

Create an adapter:

```text
remote build
     |
     v
raw build log
     |
     v
diagnostic parser
     |
     v
build-result.json
```

Example:

```json
{
  "status": "FAILED",
  "commit": "abc123",
  "build_id": "BUILD-456",
  "duration_seconds": 1382,
  "profile": "...",
  "artifacts": [],
  "diagnostics": [
    {
      "severity": "ERROR",
      "language": "PLX",
      "file": "...",
      "line": 1842,
      "code": "...",
      "message": "...",
      "phase": "compile",
      "category": "symbol-resolution"
    }
  ]
}
```

The repair agent can then consume:

```text
Specification
Relevant source files
Current diff
Historical patterns
Normalized diagnostics
Previous repair attempts
```

instead of tens of thousands of lines of log output.

---

# 13. Build-failure knowledge base

Because builds are expensive, every build failure should become reusable knowledge.

Conceptually:

```yaml
failure:
  language: PLX
  component: XYZ
  phase: compile
  diagnostic_code: ABC123
  file: ...
  line: ...
  category: symbol-resolution

  likely_cause: ...
  successful_fix: ...
  successful_fix_commit: ...
```

After enough history accumulates, the repository may reveal that a large fraction of failures belong to a relatively small set of recurring categories.

That creates a much more practical path toward "mock compiler" behaviour:

```text
new diff
  |
  v
historical failure similarity
  |
  v
"This resembles 14 previous failures"
  |
  v
likely risk / suggested preflight
```

This should be based on actual repository data rather than a generic model pretending to be the compiler.

---

# 14. Progressive disclosure for a huge repository

## 14.1 The important question: roles or categories?

The recommended answer is:

> **Use domain/category as the canonical documentation structure, and use roles as navigation layers on top of it.**

Do **not** maintain completely separate knowledge bases for developers, testers, support, documenters, etc. That will inevitably duplicate information and cause divergence.

Instead:

```text
Canonical knowledge
        |
        +-- architecture
        +-- components
        +-- languages
        +-- build
        +-- testing
        +-- release
        +-- support
        +-- historical patterns
        +-- policies / invariants
        |
        +-----------------------------+
                                      |
                              role-based indexes
                                      |
                    +---------+------+--------+---------+
                    |         |               |         |
                 Developer  Tester         Support  Documenter
```

The role documents should mainly answer:

> "Where do I start, what is relevant to my job, and in what order do I read/use it?"

They should **link to canonical knowledge rather than duplicate it**.

This is also consistent with the idea of using a short agent-facing map that points into structured source-of-truth documentation. [1]

---

# 15. Proposed documentation structure

A suitable starting point is:

```text
AGENTS.md
README.md

ARCHITECTURE.md

docs/
├── overview/
│   ├── repository-map.md
│   ├── terminology.md
│   └── getting-started.md
│
├── architecture/
│   ├── overview.md
│   ├── component-map.md
│   ├── dependency-map.md
│   └── runtime-model.md
│
├── components/
│   ├── index.md
│   ├── component-a.md
│   ├── component-b.md
│   └── ...
│
├── languages/
│   ├── assembler.md
│   ├── plx.md
│   ├── c.md
│   ├── java.md
│   └── mixed-language-boundaries.md
│
├── build/
│   ├── overview.md
│   ├── commands.md
│   ├── profiles.md
│   ├── artifacts.md
│   └── diagnostics.md
│
├── testing/
│   ├── overview.md
│   ├── framework.md
│   ├── cli.md
│   ├── scenarios.md
│   └── result-format.md
│
├── workflows/
│   ├── development.md
│   ├── bug-fix.md
│   ├── release.md
│   └── support.md
│
├── patterns/
│   ├── index.md
│   ├── pattern-001.md
│   ├── pattern-002.md
│   └── ...
│
├── history/
│   ├── index.md
│   ├── major-releases.md
│   └── known-regressions.md
│
├── quality/
│   ├── invariants.md
│   ├── anti-patterns.md
│   ├── security.md
│   └── compatibility.md
│
├── roles/
│   ├── developer.md
│   ├── tester.md
│   ├── support.md
│   └── documenter.md
│
└── ai/
    ├── agent-workflow.md
    ├── skills.md
    ├── state-model.md
    ├── artifact-schemas.md
    └── troubleshooting.md
```

This is a starting point, not a requirement to create every file.

## 15.1 The role documents should be maps

For example, `docs/roles/developer.md` should look conceptually like:

```text
Developer workflow

1. Start here: repository-map.md
2. Identify component: components/foo.md
3. Understand language rules: languages/plx.md
4. Research prior changes: patterns/index.md
5. Create specification
6. Design tests: testing/framework.md
7. Implement
8. Run preflight
9. Build
10. Test
```

The detailed rules remain in canonical documents.

Likewise, `support.md` can emphasize:

```text
release history
compatibility matrix
known regressions
previous fixes
issue history
troubleshooting
```

without copying those documents.

---

# 16. Progressive disclosure rules

The agent should read the smallest useful amount of documentation first.

A recommended hierarchy is:

```text
Level 0: root map
    |
    v
Level 1: relevant domain/component index
    |
    v
Level 2: relevant component/language/workflow guide
    |
    v
Level 3: exact historical examples / source files
    |
    v
Level 4: exact issue / PR / commit / test evidence
```

The agent should only descend further when the current level does not answer the question.

This avoids putting the entire repository knowledge base into every context window.

---

# 17. Skills/tool contracts

The minimum useful skills are likely:

```text
research
repository_search
issue_search
pr_search
pattern_search
git
preflight
build
build_status
build_log
diagnostics
test
test_result
diff_review
spec_validation
```

Every skill should have:

- Inputs
- Outputs
- Side effects
- Permission requirements
- Failure modes
- Machine-readable result format

A good skill does not merely print a human-oriented log. It returns structured state that the harness can evaluate.

---

# 18. Repair loops

## 18.1 Build loop

```text
IMPLEMENTED
   |
   v
PREFLIGHT
   |
   v
BUILD
   |
   +--> FAIL
          |
          v
       DIAGNOSE
          |
          v
        REPAIR
          |
          v
       PREFLIGHT
          |
          v
        BUILD
```

## 18.2 Test loop

```text
BUILD_PASSED
   |
   v
TEST
   |
   +--> FAIL
          |
          v
       DIAGNOSE
          |
          v
        REPAIR
          |
          v
       PREFLIGHT
          |
          v
        BUILD
          |
          v
        TEST
```

The harness needs explicit loop termination.

Example policy:

```yaml
repair_policy:
  max_build_attempts: 5
  max_same_diagnostic_attempts: 2
  max_test_attempts: 5
  require_new_evidence: true
  stop_on_no_progress: true
  stop_on_unexpected_scope_growth: true
```

A repeated failure should produce `HUMAN_REQUIRED`, not infinite retries.

---

# 19. Scope control

Before implementation, the plan should state expected scope:

```text
Expected files:
  A
  B
  C

Expected components:
  X

Not expected:
  D
  E
```

After implementation, compare the actual Git diff with the expected scope.

Unexpected changes should be a gate failure.

This is particularly important for autonomous agents operating in large repositories.

---

# 20. Human gates

Not every decision should be automated.

Reasonable `HUMAN_REQUIRED` conditions include:

- ambiguous requirements
- conflicting historical patterns
- architecture-level changes
- security-sensitive changes
- unexpected file changes
- repeated identical failures
- external test-framework ambiguity
- unsupported build/test infrastructure situations
- agent confidence based only on inference rather than evidence

The purpose of the harness is not to remove humans. It is to make human intervention occur at the decisions where it has the most value.

---

# 21. What to build first

A full implementation can become a very large cross-team project. That is a real risk.

The recommended strategy is therefore **two-track**:

```text
Track A: small personal proof-of-value
Track B: eventual team/department capability
```

Do not start by attempting to document the entire repository or automate the entire lifecycle.

---

# 22. Small MVP / proof of value

The smallest useful personal implementation should target **one representative change type** and one component.

Do not attempt:

```text
all languages
all components
all roles
all build profiles
all tests
full autonomous repair
```

Instead implement only:

```text
1. Research result
2. Pattern result
3. Spec
4. Git diff check
5. Preflight
6. Remote build adapter
7. Build-result parser
8. Test adapter
9. Persisted state file
```

The first version can still be human-driven.

For example:

```text
human runs research
      |
      v
harness records RESEARCHED
      |
      v
human implements
      |
      v
harness performs PREFLIGHT
      |
      v
human/build skill runs remote build
      |
      v
harness records BUILD_PASSED/FAILED
      |
      v
human/test skill runs test
      |
      v
harness records TEST_PASSED/FAILED
```

This is a **shadow-mode harness**: it observes and validates the workflow before it attempts to control it.

That is an excellent first experiment because it produces measurable evidence without requiring a department-wide commitment.

---

# 23. The first pilot should optimize build avoidance

Given a 5–30+ minute build, the first success metric should not be "how many lines the agent wrote."

A better metric is:

> **How many unnecessary remote builds did we prevent?**

Example:

### Current

```text
Implement
  -> build
  -> compiler failure
  -> fix
  -> build
  -> compiler failure
  -> fix
  -> build
  -> test
  -> failure
  -> build
  -> test

4+ builds
```

### Target

```text
Research
  -> pattern verification
  -> test contract
  -> implementation
  -> preflight
  -> build
  -> test

1 build
```

Even modest reductions in build count can make the harness valuable.

---

# 24. Department/team proposal

The larger version should be treated as a shared engineering capability, not as one developer's side project.

A useful division of responsibility is:

```text
Repository domain owners
    |
    +-- architecture knowledge
    +-- coding invariants
    +-- historical patterns

Build/tooling owners
    |
    +-- build adapter
    +-- diagnostics
    +-- incremental-build investigation

Test owners
    |
    +-- test adapter
    +-- test metadata
    +-- result normalization

AI/harness owners
    |
    +-- state machine
    +-- orchestration
    +-- skills
    +-- schemas
    +-- metrics

Developers/support/testers/documenters
    |
    +-- consume and improve the knowledge base
```

The AI harness should not become the only source of truth. Repository knowledge should remain owned by the teams that understand the system.

---

# 25. Suggested department rollout

## Phase 0 — Pilot

One component and one representative change family.

Deliver:

- build adapter
- test adapter
- diagnostic parser
- state model
- small knowledge map
- one preflight check

Success criteria:

- reproducible workflow
- measurable build reduction or faster diagnosis
- no dangerous autonomous changes

## Phase 1 — Standardize interfaces

Define common result schemas for:

- research
- preflight
- build
- diagnostics
- test

## Phase 2 — Expand repository knowledge

Add component/language/pattern documentation based on actual usage.

## Phase 3 — Introduce automation

Allow the harness to automatically progress through low-risk gates.

## Phase 4 — Introduce repair loops

Start with build diagnostics, then tests.

## Phase 5 — Optimize

Use historical build/test data to reduce expensive feedback cycles.

---

# 26. Metrics

Useful metrics include:

- remote builds per successful change
- percentage of known build failures caught before remote build
- time to first successful build
- average build repair iterations
- repeated-failure rate
- integration test repair iterations
- percentage of acceptance criteria with explicit tests
- percentage of implementation decisions supported by repository evidence
- human intervention rate
- preflight false-positive rate
- unexpected-scope rate
- total elapsed engineering time

For this repository, remote build reduction should be a primary KPI.

---

# 27. Why the documentation should not be purely role-based

A role-only structure appears attractive:

```text
developer/
tester/
support/
documenter/
```

but it creates predictable problems:

- duplicated architecture information
- duplicated build rules
- duplicated component knowledge
- inconsistent updates
- unclear source of truth

A category/domain-only structure has the opposite problem: users must navigate too much information to understand their actual workflow.

The hybrid design resolves both:

```text
Canonical knowledge = domain/category

Role workflow = curated navigation through canonical knowledge
```

In other words:

> **Structure knowledge by what it is. Structure entry points by who needs it.**

That is the recommended approach.

---

# 28. LLM reconnaissance prompt

Use the following prompt against the real repository. The internal model should fill in repository-specific facts.

```text
You are designing an agentic software-development harness for this repository.

Your job is NOT to modify production code.

Your job is to inspect the repository, its documentation, Git history, issues/PRs/RTC history available through the provided tools, build system, and test framework, and produce a concrete design for a specification-driven, acceptance-test-driven development harness that an LLM coding agent can execute reliably.

The repository is large (1000+ files) and contains mixed/legacy languages including z/OS assembler, PL/X, C, and Java. The production build can only be executed remotely and may take 5–30+ minutes. The external test framework is in a separate repository, uses Java tests, and tests generally require newly built production artifacts. Therefore, reducing unnecessary remote builds is a primary design objective.

## Operating principles

1. Never assume a repository convention without evidence.
2. Prefer repository-local evidence over general programming knowledge.
3. Distinguish clearly between FACT, INFERENCE, PATTERN, and UNKNOWN.
4. When describing a pattern, provide concrete examples from Git history or source code.
5. Do not treat one historical implementation as a universal pattern.
6. Do not invent build commands, test commands, paths, APIs, naming conventions, or architecture.
7. Do not modify production source files.
8. Proposed harness files must be clearly distinguished from existing files.
9. Optimize for agents working across multiple context windows.
10. Treat deterministic validation as stronger evidence than an LLM's self-assessment.

## Investigate

1. Repository structure and architecture
2. Language/tooling inventory
3. Exact remote build interface
4. Full vs incremental build capabilities
5. Build logs and diagnostic formats
6. Historical build failures
7. External test framework CLI and result formats
8. Ways tests can be prepared before a production build
9. Historical implementation patterns from Git/PR/issues/RTC
10. Negative examples: reverts, failed changes, recurring bugs
11. Repository documentation structure
12. Existing coding/test/build rules
13. Possible deterministic preflight checks
14. Possible repository-specific lint rules
15. Build optimization opportunities

## Produce

A. Current workflow
B. Proposed target workflow
C. Repository map
D. Documentation architecture
E. Role-based navigation model
F. State machine with explicit gates
G. Skill/tool contracts
H. Machine-readable artifact schemas
I. Spec/acceptance-test traceability model
J. Preflight strategy
K. Build diagnostic normalization strategy
L. Build-failure knowledge base strategy
M. Build/test repair-loop strategy
N. Human gates
O. Metrics
P. Small MVP suitable for one developer
Q. Team/department-scale roadmap
R. One realistic pilot change
S. Unknowns requiring human input

## Important design question

Evaluate whether the documentation should be structured by role or by general technical category.

Prefer a canonical domain/category knowledge base with role-specific navigation documents unless repository evidence strongly suggests another architecture.

The role documents should point to canonical sources rather than duplicate them.

## Important optimization question

The production build takes 5–30+ minutes. Determine exactly what can be validated before triggering that build.

Evaluate:

- deterministic static analysis
- repository-specific linting
- dependency/reference checking
- pattern conformance
- LLM semantic preflight
- historical build-failure similarity
- partial/incremental build
- compiler diagnostic prediction
- LLM mock compiler

Rank these using evidence from the repository.

## Important harness question

Design the workflow as a persisted state machine. Every transition must have evidence.

At minimum consider:

NEW
BASELINED
RESEARCHED
PATTERN_VERIFIED
SPEC_READY
TEST_READY
PLAN_READY
IMPLEMENTED
PREFLIGHT_PASSED
BUILDING
BUILD_FAILED
BUILD_PASSED
TESTING
TEST_FAILED
SPEC_VERIFIED
READY_FOR_REVIEW
COMPLETE
BLOCKED
HUMAN_REQUIRED
FAILED

Do not declare a phase complete solely because the LLM says it is complete.
```

---

# 29. Recommended first action

Do not begin by documenting the whole repository.

Do this instead:

```text
Choose ONE representative change type
        |
        v
Map the current human workflow
        |
        v
Build 5-7 minimal skills/adapters
        |
        v
Persist the state machine
        |
        v
Run one real change in shadow mode
        |
        v
Measure build/test savings
        |
        v
Use the results to justify team investment
```

The first deliverable should be small enough that one developer can finish it, but representative enough that it exercises the real build and test loop.

The resulting evidence is more persuasive than a proposal for an abstract "AI development platform."

---

# 30. References

[1] OpenAI, **Harness engineering: leveraging Codex in an agent-first world** — repository knowledge as a structured documentation system, with a short `AGENTS.md` acting as a map into deeper sources of truth.
https://openai.com/index/harness-engineering/

[2] GitHub, **Spec Kit** — specification, planning, tasks, implementation, convergence, and resumable workflows with gates and loops.
https://github.com/github/spec-kit

[3] Anthropic, **Effective harnesses for long-running agents** — persistent progress artifacts, initialization, incremental work, and explicit verification across context windows.
https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

---

# Summary

The recommended design is not "an LLM that knows the repository."

It is:

```text
Structured repository knowledge
          +
Specialized executable skills
          +
Persistent state machine
          +
Evidence-based gates
          +
Cheap preflight validation
          +
Expensive authoritative feedback
          +
Bounded repair loops
```

For this environment, the most valuable optimization is likely to be **reducing unnecessary remote build/test cycles** rather than maximizing autonomous code generation.

The safest path is to prove this with one small, representative pilot and use the resulting measurements to justify a broader team/department-level investment.
