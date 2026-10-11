# Install BoneHarness — format 2

1. **Inspect** the target repository and its instructions. Identify where the harness will be used; do not infer permissions or adapters.
2. **Create** a fresh `.harness/` with `python3 builder-kit/installer/install.py --repo-root /absolute/repository`. Existing destinations are refused. If Python is unavailable, follow the manual steps in the [reference](installer/installation-reference.md). No root instruction file is changed.
3. **Review** the compact profile. Select needed connections; keep other capabilities NOT_CONNECTED. Add instructions or compatibility evidence only when available. See the [reference](installer/installation-reference.md).
4. **Check** installed structure using the [checklist](installer/installation-checklist.md) and optional checker. Record actual findings, not assumed PASS. Missing prerequisites remain visible.
5. **Activate** by explicitly loading `.harness/README.md` and the development guide. Record the observation in the installation record before confirming activation.
6. **Hand off** `docs/setup.md`: configuration, checked structure, activation, outstanding issues, next action and evidence. Keep it under 200 words.

Files live entirely beneath `.harness/`. A failed copy remains visibly incomplete for inspection; never overwrite it blindly. Later changes use installed maintenance. New kit tools accept only format 2; old installations and histories retain their original tools. No automatic migration is provided.
