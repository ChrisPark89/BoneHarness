# Check harness setup

1. **Read.** Inspect repository instructions, [profile](../config/repo-profile.yaml) and [setup status](../../docs/setup.md). Format 2 is required; older histories use their original tools.
2. **Check structure.** Confirm required definitions, guides and local references. Optionally run `python3 .harness/framework/tools/check.py --repo-root /absolute/repository`. Record its report as evidence. A structural PASS proves only the listed checks.
3. **Review connections.** For each needed adapter, inspect its invocation and evidence interpretation. Save compatibility evidence and update connection/status/reason. Unknown stays NOT_ASSESSED; a known mismatch is INCOMPATIBLE. Compatibility does not establish quality, permission or completed work.
4. **Activate.** Explicitly load `.harness/README.md` and follow its development guide from the repository. Record that observation before setting installation activation to CONFIRMED. Never add a root instruction pointer automatically.
5. **Summarize.** Update `docs/setup.md` with structure, activation, issues, next action and evidence. Show the current configuration ID; adapter details remain in the profile. Use [maintenance](maintenance/harness-maintenance.md) for later changes.

No adapter command runs as part of structural checking. No missing adapter prevents inspecting the installed harness.
