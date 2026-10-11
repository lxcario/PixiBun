# Large GIF raster corruption

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

Date: 2026-10-01. The user reported stripes and a black lower block in an 8x cycle GIF. This correction is included in the user-requested Git publication; verification used local checks without an external test service or tunnel.

## Cause and correction

GIF scaling already uses nearest-neighbor pixel replication. The corruption was reproduced in the shared `gifEncoderCore.ts` compression path: after reaching the 4,096-code dictionary limit, the encoder emitted a Clear code but immediately inserted a phrase built from its previous dictionary prefix. A decoder restarts without a previous phrase, so subsequent codes referred to missing or different entries. This can scramble later rows of larger rasters regardless of export FPS.

The encoder now clears its dictionary and starts again from the next literal pixel without that stale insertion. The fix applies to both the worker and main-thread paths, including ordinary timeline GIFs and cycle GIFs. It changes compression integrity, not palette cycling, art buffers, GIF color quantization or scale behavior. Existing corrupted downloads require re-export.

The [GIF89a specification, Appendix F](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) requires Clear codes to reset compression/decompression parameters and tables; subsequent codes are processed as a fresh stream. It specifies a 12-bit maximum code width. The corrected reset follows those rules.

## Reproduction and proof

The test-only decoder reconstructs GIF LZW independently, rejecting invalid codes, missing end codes and raster lengths that disagree with image dimensions. Before the correction, all four new tests failed with invalid codes after dictionary resets. They cover repeated resets at 2-, 3- and 8-bit palette depth and a textured 64px indexed image enlarged exactly 8x. After correction they decode every pixel correctly and reach the 12-bit dictionary boundary.

Twenty focused unit/worker checks passed. A real local Chromium workflow exported a textured 64×64 fire/wood fixture at 8x, 8 FPS and a two-second loop. The downloaded GIF is 512×512 with 16 frames. Chromium's native `ImageDecoder`, independent of the production encoder and test-only decoder, decoded every frame and compared all 4,194,304 pixels against expected nearest-neighbor source pixels and cycle colors: **zero mismatches**. Wood shades, ink and transparency match; source artwork remains unchanged after export. The fixture deliberately stresses the dictionary and is not extracted from the user's screenshot.

Existing checks verified headers, frame counts, GIF timing and source isolation, but did not decompress a large GIF's complete pixel stream. The new checks directly cover that gap. The focused browser workflow passed in 8.5s; it also displays the actual downloaded GIF for visual review. Windows Photos was not automated and the full browser inventory was not rerun.

The final five-stage project gate passed in **65.39s**: documentation, TypeScript, lint, **1,502 unit/integration tests across 149 suites**, and the production build. An initial run caught a missing explicit type in the new test-only decoder; it was corrected before this passing run. The discovered editor inventory is 155 scenarios in 37 files; this correction ran the focused browser scenario, not that entire inventory.

Saved evidence: [four failing regressions before the fix](evidence/2026-10-01/gif-8x-before-fix.log), [20 passing focused tests](evidence/2026-10-01/gif-8x-unit.log), [native browser download and decode](evidence/2026-10-01/gif-8x-browser.log), [final project gate](evidence/2026-10-01/gif-8x-gate.log), and [reviewed actual GIF rendering](evidence/2026-10-01/decoded-8x-gif.png).
