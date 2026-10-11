# Update the harness

1. **Inspect.** Read repository instructions and the [profile](../../config/repo-profile.yaml). Record the request and current configuration ID in `artifacts/maintenance/<id>/update.yaml` using the [template](../../templates/maintenance/harness-update-record.yaml). Identify affected files and actual permission needs.
2. **Stage.** Preserve changed files' before bytes and hashes; prepare candidate bytes under `.harness/`. Assign a fresh configuration ID. Keep existing task captures unchanged.
3. **Check.** Check affected structure and connections. Retain actual evidence. Compatibility is not tool-quality proof. Mark changed adapters NEEDS_REVIEW until assessed. Missing information stays visible.
4. **Publish.** Compare current configuration and changed-file hashes with the inspected base immediately before writing. A mismatch stops publication. Record intent and write only reviewed candidates. Retain before/after evidence; never overwrite concurrent edits.
5. **Update status.** Confirm published bytes match the candidate, record PUBLISHED, and refresh `docs/setup.md`. Write `docs/maintenance/<id>.md` (under 200 words): status, changes, readiness impact, issues, next action and evidence. Existing tasks keep their captures.

After interruption, record recovery details, inspect actual files against before/candidate hashes and reconcile partial writes before continuing. Do not declare publication complete from intent alone. Never erase failures or silently migrate old histories. Use their original tools.
