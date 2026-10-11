# Check harness setup

1. **Inspect.** Read repository instructions, [profile](../config/repo-profile.yaml), workflow and [setup summary](../../docs/setup.md).
2. **Prepare helpers.** Follow [Python setup](../tools/README.md). Retain executable/version, installed dependency versions and `pip check` results; missing prerequisites need action.
3. **Check structure.** With that Python, run `.harness/framework/tools/check.py --repo-root /absolute/repository`, or follow the installation checklist manually. Save command, exit status and output (or manual observations) in a setup log under `artifacts/installation/`; link it from existing checks. Definitions alone are not execution evidence. The checker does not execute adapters.
4. **Assess connections.** Follow the [adapter guide](../adapters/adapter-interface.md). Save matching assessments before claiming COMPATIBLE, then rerun the checker. Execution claims need captured results. Research/reviews can inspect files without adapters. Execution-phase gaps need connections or explicit user skips; report their effect.
5. **Activate.** Explicitly load `.harness/README.md` and its development guide, then record the observation. Do not add repository-root instructions automatically.
6. **Hand off.** Refresh `docs/setup.md`: can work begin, which phase will wait, action needed, evidence links and next task prompt. Keep under 200 words. Link setup and profile in chat. When clear, say “No known setup blockers”; future tasks can still encounter blockers. Compatibility does not prove tool quality.

After updates, use [maintenance](maintenance/harness-maintenance.md). Preserve original installation evidence and existing task captures.
