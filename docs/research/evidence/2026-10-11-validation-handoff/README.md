# Final validation evidence — 11 October 2026

Source `a176d8629c64b1c73c74631454eeff54f838f3d7`; matching CI merge `6f57c93f5e206149f82c431df43d612f0fb47ad0`; [CI run 38081448403](https://github.com/lxcario/PixiBun/actions/runs/38081448403). See the [handoff](../../2026-10-11-validation-handoff.md) for results, publication scope and remaining release qualification.

The [manifest](manifest.json) covers 326 copied payload files and their original bytes. This README, the maintenance census and later publication receipts are companion records outside that payload manifest. Original CI indexes retain their original archive-relative paths.

- `ci-browser/`: complete independently retrieved 279-file browser payload plus original index; development **196 passed**, production **359 passed /4 skipped**, one worker and zero retries. Build guards match all 259 compiled files.
- `ci-browser-custody/`: original CI automatic retrieval verdict; API digest, independent file verification and index custody are in `receipts/`.
- `ci-rollback/`: complete eight-file final rollback payload plus original index; **five passed /one WebKit legacy-Blob capability skip**. Its original index paths remove the explicit `artifacts/` prefix in this archive layout.
- `ci-gate/`: final **2,227-test /203-suite** gate log and original 379-file index. The full coverage payload is not copied into this selected gate directory; its original retrieval verification is retained separately.
- `receipts/`: candidate/CI source continuity, benchmark, input/build guards and download/hash verdicts.
- `excluded-periodic-session/`: original three passing periodic pixel cases. The compiled-build guard fails, so these do not qualify a frozen build.

The complete original API ZIPs and larger source/build capsules remain in their separately recorded stores. This selected repository evidence does not assert custody of files outside its manifest or approve a deployed release. Historical failures retain their original records and verdicts.
