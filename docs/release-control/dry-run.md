# Exact SHA dry run
The PR dry run has read-only repository permissions and no deployment job. It tests the exact PR head, not the merge result. The inactive production template calls the same regression at the main SHA.

The builder copies allowed tracked blobs. A separate Git blob enumeration computes expected SHA-256 hashes and compares every path and byte digest with the filesystem artifact, including preview. The PR base is independently enumerated for comparison; preview-only changes must leave the production manifest unchanged. The PR base is **not** a trusted deployed baseline. The allowlist must still be verified against the live site.

The ordinary Actions archive retains the candidate and five evidence JSON files for 14 days. It is not a Pages artifact or a release authorization. The record includes source/base SHA, complete and split digests, counts and explicit non-authorization.

The isolated authorization simulation covers missing, rejected or mismatched approval, failed/cancelled/missing regression, stale SHA, tampered artifact and rollback using a supplied prior trusted record. Inputs are synthetic; the simulation never deploys. It does not prove independent owner identity, environment enforcement, concurrent publication locking or actual rollback. These remain activation blockers. No automatic staging publisher is enabled.
