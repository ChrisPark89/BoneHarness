# BoneHarness layout

```text
builder-kit/
  harness/                        # files installed into .harness/
    README.md                     # navigation
    framework/
      config/                     # repository settings
      workflows/
        setup/                    # first configuration
        development/              # development tasks and verification
        maintenance/              # change tools/settings
        updates/                  # update BoneHarness
        shared/                   # adapter connection, context, recovery
      templates/
        installation/             # blank setup records
        development/              # blank specifications and task records
        maintenance/              # blank settings-change records
      schemas/                    # machine validation definitions
      tools/                      # helper instructions
  src/                            # implementation
  dist/                           # CLI and helpers; helpers installed into tools/
```

Generated inside the target repository:

| Location | Purpose |
|---|---|
| `.harness/README.md` | Start here |
| `.harness/framework/` | Installed guides, settings, templates and tools |
| `.harness/docs/development/<task>/` | Human specifications; optional exports |
| `.harness/artifacts/installation/` | Setup checks and kit receipt |
| `.harness/artifacts/configurations/` | Immutable task configuration captures |
| `.harness/artifacts/development/<task>/` | Task history, results and evidence |
| `.harness/artifacts/maintenance/<update>/` | Changes, checks and recovery files |

Use chat or `bh status` for results; inspect artifacts when diagnosing. Existing task captures retain their original paths. Compatible updates reorganize managed files while preserving settings and history.
