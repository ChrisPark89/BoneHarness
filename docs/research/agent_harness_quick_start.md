# Agent Development Harness — Quick Start

Give the LLM these two files first:

1. `agent_harness_master_instruction.md`
2. This file

Then say:

```text
Read and learn the Agent Development Harness Master Instruction and Quick Start.

Do not implement anything yet.

Start with Phase 0: repository reconnaissance.

Use actual repository evidence to produce the Repository-specific Harness Assessment.

Do not invent commands, paths, build behaviour, test behaviour, or conventions.

Clearly distinguish FACT, INFERENCE, PATTERN, and UNKNOWN.

Do not modify production code.
```

## After the assessment

Ask:

```text
Now perform the skeptical architecture review described in the master instruction.

Challenge your own assessment.

Identify unnecessary complexity, unsupported assumptions, state transitions without evidence, and capabilities that are too large for an individual pilot.

Then propose the smallest useful pilot.
```

## After agreeing on the pilot

Ask:

```text
Implement only the approved individual pilot.

Use the implementation-authorization prompt from the master instruction.

Do not expand scope.
```

## When the pilot works

Ask:

```text
Evaluate the pilot using the measurable success criteria from the master instruction.

Show:
- what became easier
- what became safer
- what remote-build time was saved, if measurable
- which failures were caught earlier
- what remains manual
- what should be the next smallest improvement

Do not recommend department-wide infrastructure unless the pilot evidence justifies it.
```
