# Harness setup

Configuration: `cfg-1`. Kit: `2.0.0`.

| Check | Status |
|---|---|
| Installed structure | NOT_CHECKED |
| Entry-point activation | PENDING |
| Adapter compatibility | See [profile](../config/repo-profile.yaml) |

Next: inspect repository instructions, check the installed files, then explicitly load `.harness/README.md` and its development guide. Record actual checks and evidence in `artifacts/installation/installation-record.yaml`. Mark activation CONFIRMED only after successful loading.

The optional checker examines structure and declared local references. It neither executes adapters nor confirms compatibility meaning, activation or task completion. Missing dependencies remain visible; do not install them implicitly.

Refresh this summary after setup or maintenance. It describes the named configuration, not a task's progress. Keep it under 200 words.
