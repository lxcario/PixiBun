# Audit follow-up — 15 October 2026

These phases follow the source-checked product audit. They are separate from the numbered strategy milestones in the [strategy roadmap](2026-10-14-strategy-roadmap.md). Work starts from main at `21411d89067b0d803c444971714a898cf5213b99`; concurrent Living Postcard edits in the primary checkout are outside this phase.

| Phase | Scope | Status |
| --- | --- | --- |
| 1. Instructions, claims and coaching | Saved-keymap pan help; actual lighting navigation; ordinary-layer tip triggers; precise clip/export and local/reporting disclosures | Complete; verification below |
| 2. Reproduced interface problems | Measure inspector label clipping and tiny controls at laptop widths; reproduce constellation collisions; clarify the intentional Animate entry while preserving whole-layer capture | Next |
| 3. Drawing consistency and measurement | Specify direction behavior for Line, protect preview/commit parity, and measure browser input/render work before changing pointer sampling | Planned |

## Phase 1 behavior

- First-edit help uses Space-drag for Standard and Alt-drag for classic, updating when the saved keymap changes. It describes an edit rather than claiming every history action paints pixels.
- The layer milestone requires a newly added ordinary drawing layer in the same project/frame. It ignores tags, effect/research provenance, project loading and frame navigation; adding a second ordinary layer above generated output still qualifies. This is a bounded metadata rule, not universal user-intent attribution for every future operation.
- Project changes clear pending/active coaching and the local edit counter. The Lamp tip names the actual Effects task and preview controls without promising palette-only output.
- Clip help describes supported metadata and explicitly excludes `.ase`/`.aseprite` project export. No encoder or project format changes are included.
- The pledge distinguishes local saving, optional sharing/reporting and the Google connection service used by Internet Co-Draw. It describes documented graphics algorithms without claiming a universal cross-browser pixel-identity proof.
- Privacy dialogs explain local logs (on by default), reporting (off by default), and the site's reporting endpoint. Missing upstream configuration prevents forwarding; it does not mean an opted-in browser request never left the device. Existing consent, rate, admission and networking policies are unchanged.

## Verification and remaining scope

All eight new coaching regressions failed against the original implementation; after the correction, the six-file focused selection passed **52 tests** on Node **22.23.3**. Cases cover both keymaps and live switching, tagged/effect output, adding an ordinary layer above an effect, frame navigation, project loading and queued-tip cancellation. The existing relay test retains its 503 expectation and additionally asserts no upstream request when no destination is configured. Compiled welcome checks exercise both saved keymaps.

The final candidate passed all six configured gates: documentation checks, type checking, lint, **2,514 unit tests in 238 files** with coverage, unchanged warmed performance budgets, and a fresh production build. Coverage was **65.02% statements /59.61% branches /60.07% functions /66.34% lines**. RotSprite p90 was **0.27444 ms** against the unchanged 10 ms limit. Generated discovery counts are separate from execution results: 256 editor cases and 471 production cases were enumerated; these complete browser inventories were not executed for this phase.

The compiled welcome suite passed **12 cases across Chromium, Firefox and WebKit**, with zero failures, skips or retries. A separate Chromium inspection confirmed that the reporting explanation is visible before opt-in, reporting remained disabled, and no diagnostic request was sent. The pledge, privacy dialog and clip help were checked in the compiled app. At 1280 × 900 with the default 292 px inspector and two layers, inspector tab labels were not clipped; narrower admitted widths and other layouts remain phase-2 investigation, not a reproduced default-layout defect.

The gate and browser candidate were based on `21411d89067b0d803c444971714a898cf5213b99`, with build ID `RY-80JqKoBJ4I7_D3H_xq`, cache version `v1.14.1-21411d89067b0d803c444971714a898cf5213b99` and 86 static precache assets. A before/after guard retained the same **943 tracked or new non-ignored, non-Markdown inputs outside `docs/`**, SHA-256 `c97674b544578324324aa4e8a6d627755015e6a5594c171e4d081c97ad7bdd8a`. This is a scoped source guard, not a complete compiled-artifact fingerprint. Raw logs and screenshots remain local under the archive policy; the initial sandbox cache-permission failure is retained separately from the successful rerun. No test budgets or policies were weakened.

This phase does not establish full device/accessibility or production-host qualification. Historical gate/browser verdicts retain their original builds. Broad palette changes, a universal UI-scale system, static-shell/CSP redesign, arbitrary coverage targets and global ID renames are not required by the confirmed phase-1 defects. Reference images, indexed recoloring, groups, linked cels, mobile Studio and additional file formats remain separate product decisions.
