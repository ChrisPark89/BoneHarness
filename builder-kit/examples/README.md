# Small profile examples

[Connected adapter](connected-profile.yaml) shows only the extra information needed for a connected test command. Its NOT_ASSESSED status is intentional: an example supplies no compatibility evidence.

[Unconnected profile](../templates/runtime/framework/config/repo-profile.yaml) is the installation default. Add a connection when needed; keep unknown details absent.

To record COMPATIBLE, inspect actual usage and evidence interpretation, retain the check under `.harness/artifacts/`, and add its relative path to that adapter's `evidence`. Fixture checks may establish interface behavior, never completed production work or tool quality.

Actual source, target, environment, deadlines and artifacts belong in task operations when relevant. These examples execute nothing and do not generate fake installation or task histories.
