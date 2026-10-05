# Deep audit repair phase 4 — preview and save/export memory

5 October 2026. Local uncommitted work on the Phase 1–3 checkout, package 1.14.1, supported Node 22.23.3. Findings A10/A11 originate in the [deep audit](2026-10-05-deep-product-code-audit.md). The original source trace identified risks; it did not establish an out-of-memory failure. This phase measures a controlled workload and repairs its preparation/retention paths. No publication, deployment or external TestSprite execution is implied.

## Implemented behavior

Timeline cells now retain aspect-correct previews of at most 24 pixels per axis; the hover view uses at most 96. Intersection observation unmounts offscreen preview canvases while retaining every frame button for selection, keyboard use and reordering. Layer order, visibility, opacity, blend, raster revision and buffer generation determine visual refresh. Duration changes and edits to another frame do not repaint unchanged artwork. Preview backing surfaces register in the combined memory ledger and release on replacement/unmount; admission failure leaves a blank preview rather than compromising the drawing.

The final path composites at native size into one admitted temporary surface per refresh, scales the finished pixels with smoothing disabled, then immediately zeroes the temporary. An attempted direct small-layer composite changed translucent/blended colors by two byte values in WebKit. The retained WebKit failure led to the native-composite correction, rather than relaxing the pixel assertion. Small retained surfaces and selective refresh remain the performance improvements; full-size temporary work has not disappeared.

Async autosave and portable preparation encode at most two layers concurrently **per job**. Reservations precede native PNG snapshots, and prepared Blob/string sizes count through preparation. Dirty autosave and portable export can run simultaneously, so their combined native encoder count can exceed two. Failed work stops queued jobs and drains started callbacks before cleanup. The database separately reserves its physical byte copies and converts at most two dirty Blobs concurrently.

A queued raster must still match its captured revision and buffer generation when encoding begins. If it changed, serialization refuses the mixed snapshot. A layer edited after its encoding began retains its older captured revision, so the edit remains dirty. The autosave coordinator retries superseded preparation at most twice within an invocation; repeated changes preserve dirty artwork and the last valid save instead of publishing mismatched pixels/metadata. This also prevents a replaced buffer with a restarted revision from masquerading as the original.

Incremental autosave reconciles active layers, duplicates and orphan records using compound index/primary keys without loading unchanged PNG values. Metadata, raster writes/deletes and the expected storage-version comparison still commit in one transaction. Existing Dexie schema v5 remains unchanged.

GIF, MP4 and WebM source preparation reserves before compositing, yields between frames, checks cancellation and queued frame visual identity, and releases exclusive composites on success/failure/cancellation. Sprite sheets reserve source surfaces plus estimated sheet/PNG work and release them after use. Existing APNG preparation remains in place. These are bounded whole-batch encoders, not streaming implementations.

## Controlled measurements

The compiled fixture contains 64 identical 128×128 opaque frames with a green square, at the default desktop viewport. The final fixture captures Studio's imported native pixels, erases one pixel with a real mouse stroke, saves, downloads a portable backup, decodes all 64 PNGs and compares exact pixels. It scrolls to the last frame and checks the remounted preview against native artwork. A second fixture compares every small-preview byte against a scaled native composite with fractional alpha, a screen blend, a hidden layer and a rectangular canvas. A third cancels observable GIF preparation with Escape and checks intact artwork plus a subsequent PNG download.

| Chromium observation | Phase 3 baseline | Final Phase 4 |
| --- | --- | --- |
| Retained timeline canvases | 64 | 15 |
| Thumbnail backing dimensions | 128×128 each | 24×24 each |
| Retained thumbnail backing estimate | 4,194,304 bytes | 34,560 bytes |
| Thumbnail draws for one-frame stroke | 128 | 1 |
| Isolated portable preparation peak native PNG encodes | 64 | 2 |

The retained backing estimate falls about **99.2%** in this fixture. An initial overlapping dirty-autosave/backup run reached three encodes; the final isolated backup check deliberately saves first. These counts describe this workload and viewport, not every device or project.

Per-browser runner-observed input and backup durations are in the measurement JSON files. They include automation, UI waiting and download handling; they are single observations, not percentile latency or CPU-time benchmarks. Chromium backup observation increased from about 1.09 seconds to about 1.93 seconds in the recorded runs. Bounded preparation trades some completion time for fewer simultaneous snapshots; no universal speedup is claimed. Process RAM, GPU backing, browser encoder internals, long-session behavior and physical low-memory devices were not measured.

For the original 16-frame 2048×2048 example, old thumbnail backing alone computes to 256 MiB. Sixteen 24×24 retained previews compute to 36 KiB, with an admitted 16 MiB native temporary during a refresh. This is allocation arithmetic, not a demonstrated device-memory ceiling or a new large-project benchmark. Registered artwork/history and encoder work still consume their own budgets.

## Validation and retained failures

The initial five-stage gate/build passed **1,819 tests /178 suites** in **107.71 seconds**, build `A1QZlZZgNtS4vk97e1ZbA`. After the WebKit preview correction, the full gate/build again passed the same **1,819/178** in **80.84 seconds**, build `tIMHMeMaTtlXiNuuXWfFE`.

The initial compiled combined run recorded **24 passes /three failures**: all 21 Phase 1/2 checks passed; Phase 4 failed an overly strict global encoder-count assertion, a WebKit PNG representation comparison and a real WebKit blended-preview mismatch. The next six-case run passed five with one remaining WebKit fixture comparison; the expanded nine-case follow-up passed eight, including all three GIF cancellation checks, with a remaining hard-coded imported-color assumption.

WebKit encoded different PNG metadata/color-profile representations, and this fixture's imported green had one red byte rather than the constructor's assumed zero. The final fixture compares exports and scrolled previews with captured **imported native artwork**, without pixel tolerances. This scopes export/preview correctness; it does not qualify all import color-profile conversions. Original logs, screenshots, traces and measurement files remain separate from subsequent results. The earliest sandbox browser launch was refused with `spawn EPERM`; approved local launches subsequently worked. Baseline extension failures came from an unfitted canvas coordinate and an unnecessary close action after backup already closed its dialog; their measurements are not mislabeled as a passing full run.

The final combined compiled run passed **30/30** in **3.5 minutes**, one worker, zero retries, across Chromium/Firefox/WebKit on build `tIMHMeMaTtlXiNuuXWfFE`: nine Phase 4 checks and all 21 Phase 1/2 save/pixel regressions. Closing documentation/type/lint checks and source/build/evidence hashes are recorded in the [evidence folder](evidence/2026-10-05-audit-phase4/).

## Primary-source research and remaining boundary

The HTML standard specifies a bitmap copy before parallel `toBlob` serialization. That informed admission **before** snapshotting and revision checks when a queue delays a layer's start; asynchronous callbacks alone do not make encoding allocation-free. [WHATWG canvas specification](https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob).

Dexie's key APIs avoid instantiating complete stored objects and can use native key reads for simple ranges. The index-only reconciliation keeps the existing atomic transaction and is independently checked with a reading-hook assertion that no unchanged raster value is materialized. [Dexie primaryKeys](https://dexie.org/docs/Collection/Collection.primaryKeys()), [Dexie keys](https://dexie.org/docs/Collection/Collection.keys()).

The 512 MiB ledger remains an application estimate. Prepared strings are tracked through the builder, not for every caller's subsequent JSON stringify/download lifetime. Browser/GPU/codec internals are outside its scope. The new queue does not make arbitrarily large artwork exportable. MP4/WebM preparation cleanup/cancellation is covered locally; physical codec/device qualification remains separate.

The TestSprite workflow was applied: the existing 17-case inventory was inspected, and existing backup/APNG cancellation cases are retained rather than duplicated. One new [memory-path draft](evidence/2026-10-05-audit-phase4/testsprite-memory.plan.json) covers the missing surface/concurrency/native-pixel assertions. Its offline lint passed; registration and a temporary local connection await review confirmation. A read-only case lookup initially encountered an automatic approval-review usage-limit failure; a later approved retry succeeded. No case was created or updated, no connection opened and no external test run was performed.

Next is Phase 5: timestamp preservation, clipboard failure feedback and deployment ordering. This phase's memory/pixel observations are not release approval.
