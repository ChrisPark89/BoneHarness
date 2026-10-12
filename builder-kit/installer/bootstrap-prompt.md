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
Node.js runtime using the supplied setup instructions if needed.
Follow .harness/framework/workflows/setup/setup.md to finish setting up this repository.

Finish with a short handoff:
- Can I start? Name any phase that will wait and what resolves it.
- Show recorded readiness in chat; link .harness/README.md and the profile.
- Do not generate duplicate setup/report pages.
- Give me the next prompt to start a task through .harness/README.md.

Stop after installation. Subsequent work uses the installed harness.
```
