# BoneHarness builder kit — format 2

Install a portable repository harness whose profile shows adapter connections, status and reasons.

1. Read the [installation guide](INSTALLER_SPEC.md).
2. Create a fresh scaffold: `python3 builder-kit/installer/install.py --repo-root /absolute/repository`.
3. Follow installed setup instructions; scaffolding does not assess adapters or activate the harness.

The installed `.harness/README.md` links development, recovery, setup and maintenance. Humans can open the compact profile directly. Optional CLI helpers support setup, updates and diagnosis.

Only `builder-kit/` is distributed. New installations use format `2.0.0`. Existing installations are never overwritten or automatically migrated. Preserve format 1 histories with their original tools.

See [adapter examples](examples/README.md) and the optional [checker](checker/README.md). Adapter compatibility, installed structure and task completion are distinct claims. Unknown settings remain absent until needed; no generalized configuration framework is required.
