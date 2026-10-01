# Fire-only palette cycling

Date: 2026-10-01. Follow-up to palette creation and compact scans, included in the user-requested Git publication. Verification used local checks without an external testing service or tunnel.

## Artist workflow

In the attached six-color palette, registers 0 and 1 are the outline and wood. Choose **First color 2** (red) and **Last color 5** (light orange). Registers 2–5 animate; brown and black remain fixed. The two matching swatch rows provide those choices directly, with selected outlines and an inclusive color strip. Numeric inputs remain available in the Color index numbers disclosure.

Playback speed selections now use the same serialized numeric strings as their controlled values, so selecting 1x, 2x or 4x stays visible.

## Pixel preservation

Previously, playback assigned every opaque pixel its nearest palette color, even when its register was outside the animation range. Raster-imported wood shades could therefore flatten simply from starting playback. Live playback and CPU-generated animation frames now copy exact source RGBA bytes outside moving enabled ranges. Disabled, stopped and single-color tracks do not trigger that quantization. Pause restores the original canvas composite; source buffers are never changed.

Cycling remains based on the nearest RGB palette register and contiguous register ranges. If wood and fire share the same selected color/register, both animate. This change does not add spatial masks or infer object boundaries. Indexed shader export still follows its existing indexed-palette format; CPU frame preservation does not change that format. The general cycling limit remains 256 palette registers.

## Local verification

- Eighteen focused unit checks passed across the existing cycling suite and two new suites. New checks cover ordered swatch selection, endpoint crossing, disabled/stopped/single-color exclusions, overlapping ranges, exact off-palette wood/outline RGBA preservation and animated fire in generated frames.
- One Chromium workflow passed in 7.6s. An imported native PNG fixture animates fire while every pixel outside the fire remains identical across three captured frames. Pause restores all source pixels; range changes support Undo/Redo and survive save/reload. The First/Last row widths match at 1440px. This fixture is not extracted from the user's screenshot.
- The full five-stage project gate passed in 77.69s: documentation, TypeScript, lint, all **1,494 unit/integration tests in 148 suites**, and production compilation. The discovered editor inventory is 153 scenarios in 35 files; only the focused cycle scenario was run here. The separate 39-scenario production-browser matrix was not rerun.

Evidence: [focused unit checks](evidence/2026-10-01/palette-cycle-scope-unit.log), [Chromium pixel proof](evidence/2026-10-01/palette-cycle-scope-browser.log), [full gate](evidence/2026-10-01/palette-cycle-scope-gate.log), and [visually reviewed cycle controls](evidence/2026-10-01/fire-only-cycle.png). Whitespace checks passed.
