# BoneHarness optional checker — format 2

Run during setup, updates or diagnosis:

```sh
python3 builder-kit/checker/check.py --repo-root /absolute/repository
```

Installed equivalent: `.harness/framework/tools/check.py`. Add `--format json` for saved evidence or `--update artifacts/maintenance/<id>/update.yaml` to inspect a maintenance record.

The checker reads required files, validates local schemas, checks the profile and evidence references, and reports recorded activation separately. It executes no adapter, downloads nothing and changes no files. A structure PASS neither establishes compatibility meaning nor confirms activation or task completion.

Exit codes: `0` covered structural checks passed, `1` invalid/incomplete structure or record, `2` invocation/dependency problem. Adapter status/reason are displayed as recorded claims. Missing adapters are not structural failures.

Use the supplied dependency lock with an already provisioned Python 3.11+ environment. Missing dependencies are reported. New tools reject format 1; use the original tools retained with older installations. No legacy switch or automatic migration is provided.
