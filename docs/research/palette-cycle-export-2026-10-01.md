# Exporting color animation at 15 FPS

Date: 2026-10-01. Follow-up included in the user-requested Git publication; verification used local checks without an external testing service or tunnel.

## Workflow

For the user's six-color campfire palette, choose cycle registers 2–5 to exclude wood and outlines. Start with Rate 6, Forward, smooth blending enabled and Playback Speed 1x. Play the cycle to inspect the color flicker. These settings change the existing flame colors; they do not generate moving flame silhouettes. Rising tips and changing shapes require drawn timeline frames, with wood left unchanged.

Use Export → Cycle Loop, choose 15 FPS, a two-second loop, APNG or GIF and the desired image scale. Download cycle animation creates 30 generated frames from the active artwork frame and its moving enabled cycles. The ordinary GIF/APNG tabs export drawn timeline animation; Cycle Loop is the color-cycling export. Sprite Sheet still exports timeline frames and does not bake a cycle into an atlas.

The panel offers 3/5/8/10/12/15/24/30 FPS (initial setting: 8 FPS) and equal-width choices in each row. These rates support both formats with the existing GIF encoder's 20ms minimum hold. It shows frame count, loop duration and FPS, and disables download when no enabled cycle contains at least two colors. Numeric FPS is separate from cycle Rate: Rate controls how quickly colors rotate; FPS controls export sampling.

## Timing and preservation

The old exporter fixed its sample rate at 30 FPS and ignored the preview speed multiplier. Frame generation, memory admission and encoders now share the selected FPS. Preview speed multiplies cycle rates before the existing loop-period retuning. Rate adjustments ensure the selected duration ends at a complete cycle, so the exported speed can differ from an unrestricted live preview.

The [PNG specification](https://www.w3.org/TR/png-3/) allows a rational frame delay. Integer-FPS APNG exports now use 1/FPS exactly unless authored frame durations override it. Existing timeline holds retain their millisecond timing. APNG preserves full RGBA. For 15 FPS, this is 1/15 second per generated frame.

The [GIF89a specification](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) uses hundredths of a second. GIF delays alternate 70/60/70 ms at 15 FPS using cumulative boundary rounding, so a 30-frame loop totals 2,000 ms instead of drifting to 2,100 ms. Individual delays approximate 15 FPS; GIF uses its existing indexed color and binary transparency encoding. Actual viewer scheduling can vary.

Pixels mapped outside moving cycle ranges retain their original source bytes in generated frames. APNG download checks prove this preservation; GIF's format conversion does not promise arbitrary RGBA byte identity. Cycles sharing a color with another object still affect that color everywhere. Current-frame scope is explicit, and the unused clip selector is hidden for cycle and shader exports.

## Local verification

Twenty-six focused unit/safety checks passed, including exact 15-FPS APNG fractions and unchanged authored holds. The final Chromium download scenario passed in 6.3s: 30 APNG frames with exact delays and infinite looping, original wood/outline/transparency bytes across every decoded frame, expected animated fire pixels at preview speed 2x, 30 GIF frames with correct total duration, equal-width FPS choices, clear current-frame scope and unchanged source artwork after download. The existing fire-only playback scenario also passed during the preceding two-scenario run.

An initial empty-cycle assertion used a preset containing tracks; the fixture was corrected to select a palette without tracks. Format labels were aligned with their visible uppercase text. The fire-pixel assertion was corrected for the engine's forward color order. These intermediate failures do not count as passing evidence. Pixel comparisons were batched to retain complete coverage without thousands of individual assertions.

The final five-stage gate passed in 64.47s: documentation, TypeScript, lint, all **1,495 unit/integration tests in 148 suites**, and production compilation. The current discovered editor inventory is 154 scenarios in 36 files; only the focused workflows were run here. The separate 39-scenario production-browser matrix was not rerun.

Evidence: [focused unit checks](evidence/2026-10-01/palette-cycle-export-unit.log), [final downloaded-file check](evidence/2026-10-01/palette-cycle-export-browser-final.log), [full gate](evidence/2026-10-01/palette-cycle-export-gate-final.log), and [visually reviewed export panel](evidence/2026-10-01/cycle-export-15fps.png). Whitespace checks passed.

## Slower FPS choices

Added 3, 5 and 8 FPS at the user's request; 8 FPS is now the initial selection. Eight choices stay in one equal-width row. This affects Cycle Loop export, not existing timeline frame durations or saved cycle rates.

10 FPS is not inherently excessive for pixel art. The [Aseprite sprite constructor](https://github.com/aseprite/aseprite/blob/main/src/doc/sprite.cpp) initializes the first frame to 100 ms (10 FPS), and its [frame-duration documentation](https://www.aseprite.org/docs/frame-duration/) supports individually authored holds. [John Park's Adafruit sprite animation guide](https://learn.adafruit.com/pixel-art-matrix-display?view=all) distinguishes a handful of unique game poses from film's larger number of unique frames, and its sample renderer also starts at 100 ms while allowing animation-specific overrides. Pose count per cycle is not the same as frames played per second; these sources do not establish a universal ideal FPS.

For this loop, 8 FPS is our starting recommendation; 5 FPS gives more visible steps and 3 FPS longer holds. These are creative choices, not research-proven optimal values. Lower sampling does not lengthen a fixed two-second loop: reduce Cycle Rate or Playback Speed for calmer motion. Fast cycling sampled sparsely can skip colors or alias the apparent direction, so inspect the exported loop before settling on very low FPS.

| Export FPS | Frames in a 2-second loop | APNG hold |
| --- | --- | --- |
| 3 | 6 | 1/3 second |
| 5 | 10 | 1/5 second |
| 8 | 16 | 1/8 second |

Twenty-seven focused encoder/safety checks passed. One Chromium workflow passed in 11.1s, downloading eight animations at 3, 5, 8 and 15 FPS in both APNG and GIF. It checks default selection, frame counts, exact APNG fractions, GIF rounding bounds and two-second totals, animated fire colors, unchanged wood/outline/transparent pixels throughout every APNG, original artwork preservation and equal button widths. The final five-stage gate passed in 54.22s, including all **1,498 tests in 148 suites** and production compilation. The complete editor inventory and production-browser matrix were not rerun.

Evidence: [focused checks](evidence/2026-10-01/cycle-low-fps-unit.log), [eight downloaded animations](evidence/2026-10-01/cycle-low-fps-browser.log), [full gate](evidence/2026-10-01/cycle-low-fps-gate.log), and [reviewed low-FPS controls](evidence/2026-10-01/cycle-export-low-fps.png).

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](session-ui-ux-2026-10-01.md), [palette tools](palette-creator-2026-10-01.md), [cycle scope](palette-cycle-scope-2026-10-01.md), [export timing](palette-cycle-export-2026-10-01.md) and [GIF correction](gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
