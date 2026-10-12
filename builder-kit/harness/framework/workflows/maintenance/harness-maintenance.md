# Change repository tools or settings

Use this guide to change adapters, rules or review settings after setup. For a newer builder-kit release, follow [Update BoneHarness](../updates/update-boneharness.md).

1. **Inspect.** Read repository instructions and [profile](../../config/repo-profile.yaml). Record the request, current configuration, affected files and permissions in `artifacts/maintenance/<id>/update.yaml` using the [template](../../templates/maintenance/harness-update-record.yaml).
2. **Stage.** Preserve before bytes/hashes; prepare candidates under `.harness/`. Assign a fresh configuration ID. Keep task captures unchanged.
3. **Check.** Follow the [adapter guide](../shared/adapter-interface.md). Record assessments in `checks`; mark changed adapters ACTION_NEEDED and name the required check until assessed. Check structure and Node.js availability. Retain evidence and unresolved gaps. Compatibility does not prove tool quality.
4. **Publish.** Pause task writers. Compare configuration and file hashes with the inspected base immediately before writing. Stop on mismatch. Record intent; publish reviewed candidates and retain before/after evidence. Never overwrite concurrent edits.
5. **Show results.** Confirm candidate bytes, record PUBLISHED, and present `bh status --update ID` or installed `view.cjs --update-id ID`: changes, gaps, actions and evidence. No duplicate summary page.

After interruption, compare files with before/candidate hashes and reconcile partial writes. Intent alone never proves publication. Preserve failures and original histories/tools. Existing tasks keep captured settings.
