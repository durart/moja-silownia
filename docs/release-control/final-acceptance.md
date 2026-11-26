# Variant B final acceptance checklist
Status: planned, not activated. Baseline main: 2a6bfe6499d748791df89e61c553225c15e65f5a.
## Before bootstrap
- Confirm all PR checks for the exact final head, including browser, security and real PDF/DOCX tests. Missing or skipped required checks block acceptance.
- Confirm owner-only approval is independent of connector credentials. If unavailable, stop; do not claim independent enforcement.
- Confirm Pages source, environment protection, artifact retention and recovery backup. No changes without separate consent.
## Isolated integration matrix
| Scenario | Expected |
|---|---|
| Failed or cancelled regression | No publication |
| Missing browser/security result | No publication |
| Valid PR regression | No deployment authorization |
| Wrong branch or requested SHA | No artifact publication |
| No owner approval or rejected approval | No deployment |
| New main SHA while waiting | Reject stale run |
| Preview-only artifact with identical production manifest | Eligible for manual approval |
| Changed, added or removed production file | Reject staging candidate |
| Untrusted or missing baseline | Reject staging candidate |
| Concurrent publication | Serialized, stale baseline rejected |
| Approved exact artifact | Deploy only in isolated test target |
| Rollback | Restore verified prior artifact with explicit approval |
## Activation
Follow kiss-activation.md. The inactive Pages template now references exact-SHA regression; the PR dry run records a complete manifest against Git and preserves evidence. The deployed allowlist and independent trusted baseline still need verification. The local authorization and rollback simulation is not an environment enforcement test. Keep current production and preview URLs. Do not activate automatic staging. No custom keys for variant B. Existing cryptographic tests remain optional regression coverage.
## Evidence
Record run IDs, exact commit, approval identity, artifact digest and outcome for each case. No live authorization or deployment tests have been executed.
