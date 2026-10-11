# BoneHarness installation reference

The profile is `framework/config/repo-profile.yaml`: version, repository, configuration ID and six adapters with connection/status/reason. Optional instructions explain usage; evidence paths identify retained checks. COMPATIBLE requires connection and evidence. It does not certify quality or task success.

Installed structure, activation and adapter compatibility are distinct. The checker validates structure without executing adapters. Installation starts pending; only observed entry-point loading supports activation CONFIRMED.

`docs/setup.md` is a short human summary. `artifacts/installation/installation-record.yaml` retains installation facts and actual checks. An update records base/candidate configuration, changed paths, checks and evidence. Add recovery details only after interruption. Preserve before/after bytes for changes, compare the current base immediately before publication and verify candidate bytes afterward.

New tasks capture the accepted configuration. Never mutate old task captures. Format 1 runs require their original tools. A format change needs an explicit migration design; this kit supplies none.


Without Python: copy `templates/runtime/` into a fresh `.harness/`; copy `checker/check.py` and `checker/harness_check/` into `framework/tools/`. Create `docs/` and `artifacts/installation/`. Copy the setup and installation templates to their generated paths, fix the setup profile link, and record repository name, timestamp and copied-file inventory. Follow the checklist manually; mark automated checks unavailable. Never overwrite an existing harness.
