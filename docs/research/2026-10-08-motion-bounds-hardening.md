# PixiMotion rectangle rendering and ownership hardening

8 October 2026. Local working tree based on commit dcf9f5c303cdbaa6a533e3315de947c261c1e3ac. This follows the [editing follow-up](2026-10-07-editing-quality-release-hardening.md) and review of the supplied replacement files. The local implementation and verification are complete within the scope below. No deployment is claimed.

The replacement was based on an older synchronous implementation. Its real-type overlay produced three TypeScript errors, including the missing async bake export. The current pipeline is retained: dedicated workers, cancellation, bounded preview ownership, source validation and atomic publication/history rollback.

## Changes

A shared typed-array renderer computes rotated bounds, renders only that rectangle and supplies integer destination offsets. Fractional pivots and direct fractional translation keep their sampling phase. Preview and bake clip before alpha-over stamping; the compatibility transform returns a full-size image by placing the rectangle without resampling. Worker result dimensions, destination and byte lengths must match the initiating request. The interior Ghost fixture compares 72 angle/pivot/translation combinations against full-canvas rendering, including fractional alpha. Candidate scoring now evaluates the part rectangle before clipping to the document, so boundary choices can differ from the old canvas-clipped scoring; universal pixel-art quality is not established. Memory admission covers selected/rotated scratch and separate full-canvas staging; there is no retained pose-raster cache. Capture reads only its selected region.

All three RotSprite cardinal-angle checks use circular distance. Interpolation normalizes negative zero while retaining JavaScript Math.round behavior at negative half pixels. Existing finite fractional pivot and saved settings limits remain accepted. No invented palette layerId or half-step restriction is introduced.

Movement refuses source frames containing normal artwork or research siblings dependent on the moved source, with a visible explanation. This avoids publishing misaligned derived pixels; it does not implement moving normals or recomputation. Identity arcs retain copied provenance behavior. Existing wrong-size sibling buffers refuse bake; unallocated empty siblings still bake as empty cels.

## Verification

The final five-stage documentation/types/lint/unit/build gate passed **2,090 tests /199 suites** with default test workers and timeouts. Build `J4TfyfkBNPvS8cwTl_MeZ` serves cache label `pixibun-20261008-motion-bbox-r1`. The affected compiled suite passed **74 cases /one Firefox touch-capability skip /zero failures** across Chromium, Firefox and WebKit, one worker and zero retries. It covers exact preview/bake/Undo/Redo pixels, delayed-worker cancellation, 30 frames, source freshness, saved-rig reload/backups and selection-rotation ownership. The full compiled and development suites were not rerun for this follow-up. The original focused run is retained with its one policy-fixture failure: a previously allowed moving derived-layer case now needs refusal. Its identity/provenance assertions were retained under an identity arc, and separate refusal checks cover real movement and untouched history. The first full gate stopped at stale test discovery after the sandbox prevented temporary-cache writes. The next gate passed docs/types/lint but timed out the combined 72-case comparison under default suite concurrency; all 2,084 other tests passed. The identical assertions were separated into six angle cases without raising timeouts or reducing workers. These original logs remain preserved. Earlier sealed evidence retains its original scope.

The current native Ghost captures show **164 nontransparent pixels** at both 1280- and 1920-pixel viewport widths, at readiness and after settling. The [native screenshot](evidence/2026-10-08-motion-bounds-hardening/motion-bbox-starter-visible-1280-ready.png) establishes actual visible artwork in this local build; it does not establish bitmap capture by the external DOM replay.

The existing TestSprite case **3e1fe6cb-8136-4403-b9ed-756ce296d1ba**, “Motion pose Undo restores precise edits and supports thirty frames”, ran as **4475d036-2de7-4fee-8d81-a58f19bd9e16**. The service passed 25 steps and four visible assertions: 16×16 Studio, three baked frames/editor closed, one frame after Undo, and three after Redo. Exact pose Undo/Redo values, the 30-frame value and source pixels were not asserted. The full planned case remains **audited inconclusive**, with improved partial workflow coverage compared with R6. This used the [verification skill](../../.agents/skills/testsprite-verify/SKILL.md). [Dashboard](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/3e1fe6cb-8136-4403-b9ed-756ce296d1ba). No further plan refinement or repeated run was attempted.

Three sequential fresh Chromium contexts at each size used the prior R6 profile fixture, browser and CPU. Dates and loopback hostnames differ; this is a descriptive desktop comparison, not a randomized benchmark. Five-frame bake medians were:

| Canvas | R6 | Rectangle follow-up |
| --- | --- | --- |
| 64×64 | 269 ms | 290 ms |
| 128×128 | 292 ms | 286 ms |
| 256×256 | 900 ms | 901 ms |

No general bake-speed improvement is established by these profiles. All six before/after groups recorded zero observed long tasks during the measured bake interval; this is not a universal responsiveness guarantee. A separate warmed, alternating-order, three-sample Node measurement of a 16×16 Ghost at 37 degrees within a 512×512 canvas compares current full-canvas rendering with the implemented rectangle plus placement: median **689.3 ms →5.3 ms**, with identical interior output bytes. This excludes worker transfer, browser scheduling, canvas composition and history and must not be described as a complete browser bake.

All **641 source/test/config inputs and three build files** remain identical to the new fingerprint after verification. Eight existing inputs intentionally differ from R6 and two files are added; none are removed. The previous **256 sealed evidence files** retain their hashes. Owned ports 3228/3241 and the temporary TestSprite binding are closed. The [new evidence manifest](evidence/2026-10-08-motion-bounds-hardening/manifest.json) retains terminal results, original failures, profiles, synthetic project backups, native captures and sanitized external steps.

## Limits

This is one rigid color part, not the proposed multi-part engine. Full-canvas composition and per-frame staging remain on the main thread. Physical pen/touch devices, participant studies, long-session quality and real two-build deployment/rollback qualification remain pending. Saved palette rectangles keep fixed coordinates. Changes are local; no push or deployment is performed.
