# Acceptance scenarios

Expectations; see [results](verification.md).

| Scenario | Expected result |
|---|---|
| Fresh installation | Only `.harness/` created; discovery gaps visible. |
| Missing adapter | Affected phase waits; eligible work remains usable. |
| Replace adapter | Assessment recorded; task configuration preserved. |
| Ordinary task | Same recorded results in CLI/chat; export only on request. |
| Kit upgrade | Preserve settings/history; identify incompatible unfinished tasks. |
| Interrupted upgrade | Restore owned bytes; preserve later edits and show recovery gaps. |
| Failure then repair | Failure retained; replacement attempt can resolve it. |
| User skips testing | Instruction linked; specification requirements remain. |
| Skip specification/final verification | Rejected. |
| HUMAN checkpoint | Block until the unchanged result is approved; revisions need renewed approval. |
| Changed source/evidence | Refresh affected proof before approval/completion. |
| Command output | Keep original output/exit; reject rewritten/replayed results. |
| Interrupted operation | Reconcile outcome; uncertainty blocks completion. |
| Configuration changes | Existing task retains captured settings. |
| Large history | Parse relevant records into bounded context. |
| Older histories | Retain originals and matching tools. |
