# Audit remediation plan — 2026-09-26

> Historical checklist for the 2026-09-26 audit. The current [Phase 77 status](../../TASKS.md) records metadata Undo and preflight rejection of structural edits above the history budget; the entries below retain their original assessment.

Source: `PIXIBUN_AUDIT_RESULTS+DEEP.md`. The audit has 66 finding IDs, despite its original 60-item summary. This checklist tracks the 41 findings assessed as open or partial on 2026-09-26. A checked item means the behavior has been changed and locally verified; a partial finding stays unchecked until its remaining claim is addressed.

## Phase 1 — export correctness and collaboration memory

- [x] M5: Record the `stco` box offset while writing MP4 metadata; patch that exact offset. Verified with an AVC configuration payload containing `stco` bytes before the real box.
- [x] C4: Correct the `stco` header comment while updating the writer.
- [x] M2: Replace the session-long received-message set with bounded duplicate suppression on the ordered reliable channel. Verified duplicate ACKs after 2,000 messages and reset on disconnect.

## Phase 2 — project and history integrity

- [x] M12: An oversized completed edit now clears discontinuous Undo and Redo history and warns the user. Oversized Redo admission does the same. The edit remains on canvas but cannot be undone under the 64 MiB snapshot cap. Keeping an older chain would restore a state from before the edit; this corrects the original audit recommendation after checking the call sites.
- [x] M4: Normal validation now enforces palette ID/name/color bounds, clip name bounds, and valid palette references.
- [x] L1: Normal validation rejects inverted and out-of-frame animation clips.
- [x] L21: Verified existing recovery diagnosis, plan, and wizard handle a mismatched layer image without modifying the source project; targeted recovery tests pass.
- [x] L23: PNG export errors now show a toast; tested an encoder failure.
- [x] L32: A worker timeout rejects its own request while other pending requests keep their own deadlines; a lone timed-out worker is replaced.

## Phase 3 — algorithmic cost and correctness

- [x] H1: Component distance propagation now visits only labeled members using one shared buffer and reuses direction arrays instead of allocating neighbors for every visited pixel; bitwise output comparisons cover overlapping component bounds.
- [x] M3: Corrected Riemersma error propagation strength and tested visible dithering quality.
- [x] M8: Hilbert traversal now processes pixels directly without an `order²` coordinate array.
- [x] L2: Blank heightmaps return separate arrays.
- [x] L6: Clamped normal vectors are renormalized.
- [x] L8: WebCodecs encoders close on every exit path, including abort; encoded frames close even when encoding throws.
- [x] L9: Documented PixiBun's nonstandard CCRT ping-pong direction value in code and README.
- [x] L10: Documented thinning behavior at the outer border.
- [x] L27: Worker fallback emits a one-time console warning and diagnostic.
- [x] L33: SDF morph preserves interpolated alpha and rejects incompatible frame dimensions.
- [x] L34: Removed unused rim output and lighting parameters from the public API and callers.
- [x] L35: CoDrawBridge uses the module ICE default unless public STUN is explicitly requested.
- [x] L36: Bresenham rejects invalid integer inputs and has a bounded loop.

## Phase 4 — security, tests, and developer checks

- [x] M13: Dexie and studio-store debug handles now appear only in development/test builds; the production client bundles contain neither handle name. Browser E2E uses a development server and a focused Chromium test passes.
- [x] L3: The phase-header check now requires at least one parsed phase and still rejects duplicates.
- [x] L4: Lint covers scripts and config files; documentation checks compare the current BENCHMARKS.md inventory with the live test runner.
- [x] L5: History benchmark assertions now use engine-reported bytes, cap, and eviction count instead of self-derived equality checks.
- [x] L11: Enabled the typed no-unnecessary-assertion rule for production source. Replaced browser/worker casts with interfaces and checked APIs, removed false BlobPart casts with a safe byte-view helper, and reviewed the nine remaining documented boundary casts.
- [x] L24: README and SECURITY.md disclose pathname capture, the 2,048-character detail cap, and opt-in transmission.

## Phase 5 — claims, limits, and attribution

- [x] M9: Replaced stale current test counts and rebuilt the quality-gate table from measured standard/full runs with commands, machine, cache state, and source revision recorded.
- [x] M16: Grading comments now describe the shipped OKLCH hue/lightness/chroma presets instead of Kelvin or chromatic adaptation calculations.
- [x] L15: README describes PixiBun's RotSprite-inspired implementation and names the missing canonical stages.
- [x] L16: README scopes OKLab matching to image conversion and names RGB-distance matching in canvas dithers.
- [x] L19: README and MAIN disclose the 50 MiB import limit for images as well as projects.
- [x] L22: README and MAIN disclose the 2,048 px per-axis canvas ceiling.
- [x] L25: README and MAIN list the enforced project structure, metadata, duration, and matching-layer-dimension limits.
- [x] L29: Re-measured both gate variants on named hardware and updated BENCHMARKS.md and CONTRIBUTING.md.
- [x] C2: Corrected the Riemersma article title against the author's publication list.
- [x] C3: Separated Eric Johnston's EPX from Andrea Mazzoleni's Scale2x attribution in both RotSprite source headers.
- [x] C5: `curvesAndLines.ts` re-exports the single autotile bitmask implementation; both test suites pass.
- [x] C6: Verified `WfcResult.status` now exists after earlier WFC work; clarified that the documented complete state also has `success: true`.
- [x] C7: Documented 8-connected/Chebyshev nearest-color sampling alongside Euclidean SDF interpolation.

## Phase 6 — browser closure and newly exposed defects

- [x] U-1: Ran the full pre-existing Chromium suite: 55 of 55 tests passed. The two browser checks added in this phase also pass, bringing the current suite to 57 tests.
- [x] U-6: A live WFC action now creates a bundled heavy-compute worker and receives a `wfc:done` message. The indirect constructor had caused Turbopack to serve raw `.ts` as a static asset; using the literal `new Worker(...)` form produces a compiled worker chunk in development and production builds.
- [x] U-8, project round trip: Downloaded a project with artwork, cleared the workspace, imported the file, and compared visible pixels and every exported layer PNG byte string. The browser test now covers two frames, two layers per frame, a named clip, and a nondefault frame duration. Palette cycle tracks survive the round trip. Whole-file bytes differ because each export writes fresh timestamps.
- [x] Verified this phase with 4 focused Chromium tests, all 1,228 unit tests, TypeScript, lint, documentation integrity, and the production build.

## Follow-up — palette admission and documentation

- [x] Palette creation, color addition, cycle-track edits, and custom ramp replacement now respect the same limits as project validation. Rejected edits show an error and leave the project unchanged.
- [x] Accepted palette edits advance the dirty revision, and startup completion schedules autosave for an edit made while the workspace was opening. A Chromium check verifies persistence across reload.
- [x] Reconciled architecture and quality-inventory documentation with the checkout at this follow-up point: 1,245 unit tests across 124 suites and 65 Chromium tests across 15 specs. See the root `README.md` for the current inventory.

## Follow-up — metadata, history, export, and claim accuracy

- [x] C1: Project, layer, and clip editing paths reject invalid metadata before changing state or storage. Frame deletion remaps clip ranges and removes clips whose only frame was deleted. A Chromium test verifies save and reload after frame deletion.
- [x] M12: Redo also clears the disconnected history chain when its current-state snapshot exceeds the byte cap.
- [x] L7: MP4 encoders pad odd output dimensions to even sizes without scaling source pixels into the padding.
- [x] M6, M7, M15, L28: Corrected allocation, active shadow mode, dome apex derivative, and specular alpha descriptions to match the shipped code.
- [x] Documentation recheck: corrected current export limits, HTML canvas buffer descriptions, RotSprite scope, undo restore cost, worker transfer wording, plan index, and historical v2 metrics.
- [x] Worker view-offset regression: normal-map dispatch now copies exactly the selected `Uint8ClampedArray` view before transfer.

The original audit's other uncertainty items remain outside the 41-item remediation checklist: U-2 source-file review, U-3 test-quality review, U-4 full historical-document review, U-5 remaining attributions, U-7 old benchmark tables, U-9 genuine IFF fixtures, and U-10 empirical reproduction of the former `stco` bug. U-11 is clarified in current docs: the v1 bridge has one session and supports one host plus one guest; general multi-peer convergence remains unverified and is not claimed as a v1 feature. U-8 now has a two-frame, two-layer browser round trip, though this does not exhaust every possible project shape.

After each phase: run focused tests, TypeScript, lint, and the relevant TestSprite test if the changed build is reachable. Preserve existing uncommitted work throughout.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

This document retains its dated findings, plan or transcript. For subsequent delivered fixes, grouped header controls, the bottom-right save badge and beginner lighting menus, use the [current completion record](../research/session-completion-2026-10-01.md) and [UI/UX verification](../research/session-ui-ux-2026-10-01.md). The latest gate includes 1,472 passing unit tests and a production build; artist evaluation and new release approval remain open.
<!-- /session-publication-2026-10-01 -->
