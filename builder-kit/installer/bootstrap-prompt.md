# Installation prompt

Replace both paths, then paste this into an LLM conversation with access to the kit and target repository.

```text
Install a repository-specific harness in:
<absolute target repository path>

Use the builder kit at:
<absolute BoneHarness path>/builder-kit

Follow INSTALLER_SPEC.md step by step. Inspect repository instructions
and existing commands. Keep harness-owned files under .harness/ and
preserve application files. Do not modify the builder kit or use a
scripted demo runner. If .harness/ exists, inspect it and discuss updating
it before replacing anything.

You may run installation and verification commands. Prepare an isolated
Python environment using the supplied dependency instructions if needed.
Ask me about unresolved decisions; do not invent tools or silently skip
phases. A direct command can be a connection; no dedicated skill is needed.

Finish with a short handoff:
- Can I start? Name any phase that will wait and what resolves it.
- Link .harness/docs/setup.md and the adapter profile.
- Give me the next prompt to start a task through .harness/README.md.

Stop after installation. Subsequent work uses the installed harness.
```
