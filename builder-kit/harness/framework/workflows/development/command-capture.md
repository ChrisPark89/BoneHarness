# Capture command evidence

1. Record INTENT with the compatible connection and exact `command` arguments. Confirm these invoke the intended adapter. Use foreground commands from the repository root, without interactive input. Set `deadline` when needed.
2. Read fresh context, then run:

```sh
node .harness/framework/tools/command.cjs --repo-root /absolute/repository --task-id TASK --operation-id build-1 --actor ACTOR --context-id DIGEST
```

3. Inspect returned evidence. One `<operation-id>.command.json` preserves exit code, stdout/stderr and command. Empty output stays empty; non-UTF-8 bytes use base64. Its hash is recorded before returning. Never rewrite it.
4. Judge the phase against evidence and specification. Process PASS means exit zero, not phase success. Put interpretation in the phase summary. Nonzero exits cannot become PASS.
5. After interruption/timeout, follow [recovery](../shared/recovery.md). Never automatically rerun; descendants or remote work may remain active.

Pass arguments directly; explicitly select a shell for shell syntax or Windows wrappers.

For other tools, omit `command`, preserve the original response and execution metadata, then record through `journal.cjs`. This checks saved bytes, not original capture. Never claim helper capture. Local hashes cannot prevent replacement of both evidence and history.

CLI exits: `0` process passed; `1` failure/blocked/unknown recorded; `2` capture unavailable—inspect before retrying.

Commands are argument arrays, executed without an implicit shell. On Windows, `.cmd`/`.bat` adapters need an explicit interpreter (for example `cmd.exe /d /s /c`) or the tool's JavaScript entry point through Node.js. Review shell quoting when configuring that adapter; never silently reinterpret arguments.
