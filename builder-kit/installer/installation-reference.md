# BoneHarness installation reference

The profile shows repository, configuration ID and adapters with connection/status/reason. Optional instructions explain usage; evidence paths identify retained checks. OK means no setup action remains; ACTION_NEEDED names the next action in reason. A connected OK entry requires a matching assessment in an installation or maintenance record; see the adapter guide. This does not certify quality or task success.

Installed structure, activation and adapter compatibility are distinct. The checker validates structure without executing adapters. Installation starts pending; only observed entry-point loading supports activation CONFIRMED.

CLI/shared views present recorded readiness without a duplicate setup page. `artifacts/installation/installation-record.yaml` retains installation facts and actual checks. An update records base/candidate configuration, changed paths, checks and evidence. Add recovery details only after interruption. Preserve before/after bytes for changes, compare the current base immediately before publication and verify candidate bytes afterward.

New tasks capture the accepted configuration. Never mutate old task captures. If tools report an unsupported record version, retain that history and use its original tools; do not rewrite it.


Without a globally installed CLI, run the built kit's `dist/bh.cjs` with Node.js. If Node.js is unavailable, record that limitation and provision it before automated installation. Do not substitute hand-copied files for an installation receipt.

Manual/older installations without a release receipt need a verified original release-aware kit baseline before CLI upgrades. Unknown ownership stops the upgrade; it never authorizes replacement.
Pre-CLI kits without release metadata require a separately reviewed migration; this MVP leaves them untouched.

Python runtime releases use a different writer protocol. This release refuses that upgrade unchanged; retain their matching tools until a migration is verified.
