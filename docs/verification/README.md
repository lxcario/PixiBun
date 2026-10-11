# Verification receipts

The [current status](../current-status.md) separates qualifying source/build results from publication, deployment and release approval. Full historical reports and raw payloads are retained locally under the [archive policy](../archives.md).

## CI transfer witness

`custody-witness.json` is the original 9 October local validation receipt, copied byte for byte from `docs/research/evidence/2026-10-09-validation-repeatability/verification.json` at source revision `210df955fd25c840ab52d92c2e9bcc95ed050f0e`. Its source/build labels and verdicts remain historical; it does not certify the current checkout.

The dispatch-only CI custody job copies this real receipt to a hidden `.last-run.json` alongside this explanatory page, indexes both files, uploads them, independently downloads them and compares the downloaded bytes. This checks evidence transport, including hidden files. Normal gate, browser and rollback jobs retain their own run-scoped indexes and retrieval checks.

The witness is intentionally small. Browser traces, screenshots, full coverage output and historical audit reports stay outside the source repository.

Receipt SHA-256: `6e7b4de710fb92cc42c270423529f7ab6f8a92ce212a52cc2ba5fb1844e4c046` (11,360 original Git bytes). The receipt's `-text` attribute preserves those bytes across platforms.
