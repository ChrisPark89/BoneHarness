# BoneHarness installation reference

The profile shows repository, configuration ID and adapters with connection/status/reason. Optional instructions explain usage; evidence paths identify retained checks. COMPATIBLE requires a matching assessment in an installation or maintenance record; see the adapter guide. This does not certify quality or task success.

Installed structure, activation and adapter compatibility are distinct. The checker validates structure without executing adapters. Installation starts pending; only observed entry-point loading supports activation CONFIRMED.

`docs/setup.md` is a short human summary. `artifacts/installation/installation-record.yaml` retains installation facts and actual checks. An update records base/candidate configuration, changed paths, checks and evidence. Add recovery details only after interruption. Preserve before/after bytes for changes, compare the current base immediately before publication and verify candidate bytes afterward.

New tasks capture the accepted configuration. Never mutate old task captures. If tools report an unsupported record version, retain that history and use its original tools; do not rewrite it.


Without Python: copy `templates/runtime/` into a fresh `.harness/`; copy `checker/check.py` and `checker/harness_check/` into `framework/tools/`. Create `docs/` and `artifacts/installation/`. Copy the setup and installation templates to their generated paths, fix the setup profile link, and record repository name, timestamp and copied-file inventory. Follow the checklist manually; mark automated checks unavailable. Never overwrite an existing harness.
