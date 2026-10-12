# BoneHarness setup checklist

| Check | Evidence to retain |
|---|---|
| Containment | Observed changes confined to `.harness/`; repository instructions unchanged |
| Structure | Checker command, exit status and output; or recorded manual observations |
| Profile | Every adapter shows connection, status and reason; no invented compatibility |
| Connections | Matching assessments; execution claims retain command, exit status and output; gaps name the affected phase/action |
| Node.js helpers | Node.js version and actual installed-checker result |
| Activation | Installed README and development guide were explicitly loaded |
| Handoff | Known blockers, next prompt and evidence; no guarantees about future phases |

Record PASS, FAIL or PENDING with a reason and evidence. Reuse one setup log under `artifacts/installation/` for command results and manual observations; reference it from checks. Scripts, lockfiles and instructions alone do not prove checks ran. Missing evidence stays pending. Checker results cover declared checks, not permissions, tool quality or task completion.

Keep connections in the profile; invocation details in their operation records. Avoid duplicate matrices and placeholder settings.

After changes, repeat affected checks through maintenance. Preserve histories and pinned configurations. Use matching tools for old formats.
