# Verification rules

- Follow phase order. Task initialization includes baseline; Pattern review stays visible.
- Specification acceptance and final verification are mandatory. Phase PASS cannot replace acceptance.
- Other skips require original user instructions and attributed phase/task scope review. Reconcile earlier skips at acceptance. Requirements survive skips; hashes do not authenticate users.
- PASS needs relevant evidence: successful matching operations for execution, attributed judgment for review. Fixtures cannot support completion; interpretation cannot turn failure into PASS.
- Record intent before dispatch. Preserve inputs, source/specification, handles and outcomes. Commands declare arguments and use `tools/command.cjs`; retain its result, including empty output. Other tools preserve original responses. Interpretation belongs in summaries.
- Resolve live or uncertain operations before advancing or skipping. Closed operations stay closed; retries use new IDs and preserve failures.
- Evidence precedes its claim. Changed source invalidates affected proof. Verify required criteria against accepted specification and current scoped source.
- The writer supplies identities and checks sequencing, not judgments. Resolved phases and satisfied required criteria support completion.
- Follow captured review settings. HUMAN phases stay BLOCKED until explicit approval of the presented result; never invent approval or disable gates.
- Respect permissions and captured configuration. Use the tools/settings guide for configuration changes and Update BoneHarness for kit releases.
