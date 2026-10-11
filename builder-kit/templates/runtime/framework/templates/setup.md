# Harness setup

**Can I start? Setup review is pending.**

Configuration: `cfg-1`. Update this page after setup or maintenance.

| Decision | Current finding / action |
|---|---|
| Are instructions and tools installed correctly? | Not checked; follow the setup guide. |
| Can the LLM use the Python helpers? | Not checked; confirm interpreter and dependencies. |
| Have the LLM entry guides been loaded? | Pending. |
| Which phases need attention? | Review the [adapter profile](../config/repo-profile.yaml). |

**Next:** ask the installing LLM to finish setup and replace pending entries with evidence-backed findings.

When handing off, name known blockers and affected phases. Otherwise say “No known setup blockers for the configured workflow.” Do not promise that future phases cannot wait. Execution phases need compatible connections or an explicit user skip; specification acceptance and final verification cannot be skipped. Research and reviews can use direct inspection without dedicated adapters.

Link the profile, supporting checks and development entry point. List only unresolved decisions. Record the Python executable for LLM use. Keep this page under 200 words; detailed installation records belong in `artifacts/installation/`.
