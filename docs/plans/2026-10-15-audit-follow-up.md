# Audit follow-up — 15 October 2026

These phases follow the source-checked product audit. They are separate from the numbered strategy milestones in the [strategy roadmap](2026-10-14-strategy-roadmap.md). Work started from main at `21411d89067b0d803c444971714a898cf5213b99`. Before phases 2–4, main through `422b47d4cf0b8fd918f976dc2abc04a6a89de401`, including Living Postcards, was integrated at `3cce4602ccbb4157c4f45fd7879d9d660eb41036`. Phase 2 is committed at `e8f458a`; phase 3 application source is `626b45be15bf2875d085148be388461a1b252bec`.

| Phase | Scope | Status |
| --- | --- | --- |
| 1. Instructions, claims and coaching | Saved-keymap pan help; actual lighting navigation; ordinary-layer tip triggers; precise clip/export and local/reporting disclosures | Complete; verification below |
| 2. Reproduced interface problems | Measure inspector label clipping and tiny controls at laptop widths; reproduce constellation collisions; clarify the intentional Animate entry while preserving whole-layer capture | Complete; original and integrated verdicts below |
| 3. Drawing consistency and measurement | Specify direction behavior for Line, protect preview/commit parity, and measure browser input/render work before changing pointer sampling | Complete within the stated scope; device latency and playback qualification remain open |
| 4. Current documentation pictures | Refresh operating-guide screenshots and show all eight Studio themes in Day and Night | Complete; 129 current screenshots and native-pixel verification |

## Phase 1 behavior

- First-edit help uses Space-drag for Standard and Alt-drag for classic, updating when the saved keymap changes. It describes an edit rather than claiming every history action paints pixels.
- The layer milestone requires a newly added ordinary drawing layer in the same project/frame. It ignores tags, effect/research provenance, project loading and frame navigation; adding a second ordinary layer above generated output still qualifies. This is a bounded metadata rule, not universal user-intent attribution for every future operation.
- Project changes clear pending/active coaching and the local edit counter. The Lamp tip names the actual Effects task and preview controls without promising palette-only output.
- Clip help describes supported metadata and explicitly excludes `.ase`/`.aseprite` project export. No encoder or project format changes are included.
- The pledge distinguishes local saving, optional sharing/reporting and the Google connection service used by Internet Co-Draw. It describes documented graphics algorithms without claiming a universal cross-browser pixel-identity proof.
- Privacy dialogs explain local logs (on by default), reporting (off by default), and the site's reporting endpoint. Missing upstream configuration prevents forwarding; it does not mean an opted-in browser request never left the device. Existing consent, rate, admission and networking policies are unchanged.

## Phase 2 behavior

At the supported 260 px inspector width with two layers, the compiled phase-1 baseline truncated all four labels regardless of the selected tab. With controlled repeated random choices, three hero names repeated over the headline. These are reproduced defects, unlike the earlier unconfirmed default-width clipping claim.

Tabs now keep full 12 px labels below their icons, with a separate count row. Shared section headings and shortcut text, timeline Preview/Frame time labels, and status text use at least 11 px. The existing Studio range hit area already measured 24 px; the shared RangeRow now also declares that height directly. This is a scoped readability change, not a global interface-size setting or a whole-app type-size floor.

**Tools → Animate artwork** is a collapsible action group. It opens for a selected area and remains available without a selection for whole-layer or merged-visible-layer capture. Existing motion tests use that disclosure through the UI; their pixel, cancellation, bake, Undo/Redo and persistence expectations are retained. The canvas's accessible pan instruction now follows the saved keymap too.

Names are unique among the six retained constellations; up to four labels use measured text boxes and avoid the copy, one another and the available bounds. Resize, fonts and scroll trigger placement; a name hides if no slot fits while its creation remains announced. Scene hues remain decorative randomness. This does not change saved artwork or claim the landing scene is deterministic.

Phase 2 passed lint, production compilation and 15 focused unit cases. The first compiled browser selection retained **42 passes /3 failures**, zero skips/retries: all 21 new interface cases and the existing motion cases passed. The three failures were the previously recorded edge-aligned color-dock fixture running in the now-default floating scene theme. It now explicitly selects Graphite, the intended flat layout, keeping its original geometry and interaction assertions. That case then passed in all three engines. These results are separate runs, not a rewritten 45-case pass.

The 45-case candidate used build `BPpE5DxOMoExApy85CE_V` on merge base `3cce4602ccbb4157c4f45fd7879d9d660eb41036`. The before/after guard retained **952 non-Markdown inputs outside `docs/`**, SHA-256 `a586cbc41f2a43377e832b84f3b6f3d39dd8fec80f2f1cc715da06074cc1dcb3`. The later fixture clarification and added rendered contrast checks are included in the final integrated recheck, not attributed to that earlier source guard.

## Phase 3 behavior and initial checks

Line, unsnapped Iso Line and Standard Shift-click segments canonicalize endpoints before clipping/rasterization, returning points in caller order. Freehand Bresenham ordering is unchanged. Shape preview and commit share geometry, and preview stamping now applies the current selection mask, thick footprint and symmetry; a newly locked source clears its preview. The pixel-perfect helper discards consecutive dwell samples before testing corners, preserving nonconsecutive revisits. The live brush already skips repeated coordinates; this helper change is defensive hardening, not a claim that ordinary live strokes were retaining those duplicates.

The new shape selection/direction regression selection initially retained **10 failures /1 pass** on the original code. After the corrections, the four-file drawing selection passed **59 cases**, including 4,096 clipped/subpixel endpoint combinations. An initial compiled Chromium selection passed **14 cases**, including exact shape preview/commit/Undo/Redo, rendered contrast checks for Graphite and Sakura Day/Night, and response observations at 128² and 512².

The response probe records synthetic `pointerdown` capture → first matching canvas raster and → next animation-frame callback, with two warmups and twelve measured dots per size/engine. It includes instrumentation/readback and does not measure physical stylus input, coalesced hardware samples, compositor presentation or user drawing feel. There is no new latency budget or sub-16 ms promise. Pointer sampling and React state ownership were not changed speculatively. Final integrated results and the screenshot capture scope follow below.

## Integrated verification

The integrated application at `626b45be15bf2875d085148be388461a1b252bec` passed all six configured gates on Node **22.23.3**: documentation, type checking, lint, **2,542 unit tests /241 files** with coverage, unchanged performance budgets and production compilation. Coverage was **65.21% statements /59.73% branches /60.15% functions /66.43% lines**. RotSprite p90 was **0.23272 ms** against the unchanged 10 ms limit. The full gate completed in **216.22 s**. Discovery enumerates **256 editor cases /45 files** and **516 production cases /51 files**; those complete browser inventories were not executed.

The compiled build is `RhUR8p-Rib8ldc4yuuDRo`, cache `v1.14.1-626b45be15bf2875d085148be388461a1b252bec`, with **86 static precache assets**. The original gate/browser/capture candidate's guard covered **955 tracked or new non-ignored, non-Markdown inputs outside `docs/`**, SHA-256 `3bd182b9a02159368ccf65aab8cbdd373fcb6e3c13b75a428bacdc076e338e64`. This is a scoped source guard, not a complete compiled-artifact fingerprint.

The integrated browser selection covered interface labels/targets/contrast, line and selected-shape pixels, welcome downloads/keymaps, motion binding/history, Studio geometry/playback and Living Postcards across Chromium, Firefox and WebKit. Its original verdict is **73 passed /2 failed**, with zero skips/retries. In WebKit, a hover-help card covered the initial Iso Line drag point, and the application-update banner intercepted the Frame actions click. The retained screenshot/trace identifies those actual overlays. The drawing fixture now turns Tool Previews off through Studio's preference control and verifies brush size; the motion fixture dismisses the update banner through its button. All original pixel, frame, bake and Undo/Redo assertions remain. These fixture changes do not qualify application-update notification behavior or change production application bytes.

The follow-up ran both complete drawing and motion suites in all three engines: **20 passed /1 failed**, zero skips/retries. Both original overlay failures passed; the long WebKit save/reload motion case reached its unchanged 60 s total limit near its final pixel assertion. With other verification work finished, a separate isolated WebKit motion run passed **both cases**, retaining the same deadline and all assertions. This remains an observed timing limitation, not a rewritten 21-case pass. The separate 955-input guard is `f18ad8588110ec9cfe4ea8eeb10edcd9d6d7c80451f93a89a4cef1be726d8879`, on the same compiled build. Only the two test fixtures changed after the original gate and capture guard. Original failures remain failures rather than being combined into a rewritten 75-case pass.

The separate response probe passed **6 cases**, zero failures/skips/retries. Each row includes two warmups and twelve measured dots; observations are milliseconds from synthetic pointerdown capture, with instrumentation/readback included.

| Engine | Canvas | Median matching raster | p90 matching raster | p90 next animation-frame callback |
| --- | --- | ---: | ---: | ---: |
| Chromium | 128 × 128 | 0.6 | 0.9 | 9.7 |
| Chromium | 512 × 512 | 0.9 | 1.2 | 10.1 |
| Firefox | 128 × 128 | 1 | 2 | 55 |
| Firefox | 512 × 512 | 2 | 3 | 47 |
| WebKit | 128 × 128 | 1 | 1 | 268 |
| WebKit | 512 × 512 | 2 | 2 | 189 |

The late WebKit callbacks remain a limitation. Matching canvas readback does not prove compositor presentation, physical pen latency, continuous-stroke feel or stable playback. No timeout, retry policy, latency/coverage/performance budget or pointer-sampling behavior was relaxed. Actual Safari/devices, screen readers, real collaboration networks, long sessions, M3 scheduling, arbitrary-angle artwork quality, the separate navigator alignment case and production-host update/rollback remain outside this scoped completion.

## Phase 4 pictures and documentation

The handbook now has **129 current PNG pictures /15,081,102 bytes**, captured from that production build in isolated Chromium **151.0.7922.34** contexts. Coverage includes the current welcome/story, desktop lessons and picker, Pocket lessons/free pad, Teaching Board, all seventeen drawing tools, Curve handles, motion capture/pose, timeline/layers, palettes/cycling, lighting, research/cleanup/tiles, import/recovery/archive boundaries, privacy/Co-Draw controls, exports, the phone cart player, Light Sweep and Living Postcards. The captures illustrate actual available states; they are not a claim that every codec, lesson outcome, accessibility path or device was qualified.

The [theme gallery](../guides/themes.md) shows **all eight Studio themes in both Night and Day**, sixteen pictures at 1280 × 900, device scale 1. Each uses the same original 56 × 32 three-frame sample assembled from built-in artwork and imported through the normal project dialog. General guide pictures use a legible 1440 × 960 Graphite desk; phone pictures use 390 × 844. Reduced motion keeps the scenes still. No real artist data, diagnostic opt-in or live Co-Draw connection was used.

Every published PNG was independently decoded and its full RGBA hash matched the retained native screenshot after lossless container compression. All 129 were visually inspected in five contact sheets, with selected full-size review of scene themes, the completed lesson, motion pose and pending Curve controls. An unrelated toast in the first Curve illustration was removed by a clean UI retake; both the superseded capture and original run attempts remain local. The [capture manifest](../assets/screenshots/2026-10-15-current-ui/run.json) records each final image's dimensions, bytes, file/native hashes and decoded-pixel hash.

All current Markdown image references were redirected to the new pictures. Captions, lesson names, inspector/motion navigation, dates and theme names were reconciled. The task/strategy summaries now distinguish implemented carts, phone player, Light Sweep, Handmade Receipt and Living Postcards from remaining launch and sharing-platform qualification. Older review verdicts, proposal boundaries and dated benchmark/token tables keep their original scope.

The **109 replaced PNGs /12,479,941 bytes** matched their original Git blobs before being copied byte for byte into the [local screenshot archive](../archives.md#replaced-handbook-pictures--15-october-2026). The tracked [retirement receipt](../assets/screenshots/2026-10-15-current-ui/retired-images.json) has SHA-256 `035d7c240cf652eceafa0faafc64467ae15e3cc762388406d0003875e367eb45`. Originals remain recoverable from Git history. Their earlier capture manifests retain their original labels. No raw traces/logs or private transcripts were added to the source repository, and the 40 MiB checkout budget is unchanged.

## Phase 1 verification and remaining scope

All eight new coaching regressions failed against the original implementation; after the correction, the six-file focused selection passed **52 tests** on Node **22.23.3**. Cases cover both keymaps and live switching, tagged/effect output, adding an ordinary layer above an effect, frame navigation, project loading and queued-tip cancellation. The existing relay test retains its 503 expectation and additionally asserts no upstream request when no destination is configured. Compiled welcome checks exercise both saved keymaps.

The final candidate passed all six configured gates: documentation checks, type checking, lint, **2,514 unit tests in 238 files** with coverage, unchanged warmed performance budgets, and a fresh production build. Coverage was **65.02% statements /59.61% branches /60.07% functions /66.34% lines**. RotSprite p90 was **0.27444 ms** against the unchanged 10 ms limit. Generated discovery counts are separate from execution results: 256 editor cases and 471 production cases were enumerated; these complete browser inventories were not executed for this phase.

The compiled welcome suite passed **12 cases across Chromium, Firefox and WebKit**, with zero failures, skips or retries. A separate Chromium inspection confirmed that the reporting explanation is visible before opt-in, reporting remained disabled, and no diagnostic request was sent. The pledge, privacy dialog and clip help were checked in the compiled app. At 1280 × 900 with the default 292 px inspector and two layers, inspector tab labels were not clipped; narrower admitted widths and other layouts remain phase-2 investigation, not a reproduced default-layout defect.

The gate and browser candidate were based on `21411d89067b0d803c444971714a898cf5213b99`, with build ID `RY-80JqKoBJ4I7_D3H_xq`, cache version `v1.14.1-21411d89067b0d803c444971714a898cf5213b99` and 86 static precache assets. A before/after guard retained the same **943 tracked or new non-ignored, non-Markdown inputs outside `docs/`**, SHA-256 `c97674b544578324324aa4e8a6d627755015e6a5594c171e4d081c97ad7bdd8a`. This is a scoped source guard, not a complete compiled-artifact fingerprint. Raw logs and screenshots remain local under the archive policy; the initial sandbox cache-permission failure is retained separately from the successful rerun. No test budgets or policies were weakened.

This phase does not establish full device/accessibility or production-host qualification. Historical gate/browser verdicts retain their original builds. Broad palette changes, a universal UI-scale system, static-shell/CSP redesign, arbitrary coverage targets and global ID renames are not required by the confirmed phase-1 defects. Reference images, indexed recoloring, groups, linked cels, mobile Studio and additional file formats remain separate product decisions.
