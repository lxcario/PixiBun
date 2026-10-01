# Pixel glints and the live light bulb

Date: 2026-10-01. Scope: the studio's Specular Glint action and reflected highlights in the live lighting bulb. Verification is local, following the user's instruction not to upload repository workflows to TestSprite.

## What was wrong

The separate glint action ran immediately and created white pixels with opacity proportional to `NdotH^16`, accepting the entire region above 0.35. This produced broad, strong patches rather than a controlled pixel highlight. It used the same yellow-biased reflection for both metal and gold. Its silhouette-only normals ignored the artist's painted surface normals. Its outline guard recognized only near-black ink; colored outlines and object details needed protection too.

The main lighting renderer also had two different highlight rules: a diffuse-threshold highlight for characters and continuous additive Blinn highlights for objects. That made a shared Glint switch inconsistent unless both old contributions were suppressed for the new workflow.

Real browser verification also exposed a history defect: newly generated layers returned from Redo using `source-over` regardless of their original blending mode. The new glint mask made that measurable as small color differences. Pixel snapshots now retain and restore their blending mode; retained replay baselines do too.

## Research and decisions

| Primary source | Relevant finding | Decision for PixiBun |
| --- | --- | --- |
| Moreira, Coutinho and Chaimowicz, **Analysis and Compilation of Normal Map Generation Techniques for Pixel Art**, SBGames 2022 ([full paper](https://arxiv.org/html/2212.09692v1)) | The six surveyed techniques differ by sprite structure. Color-based gradients can mistake painted shading for grooves; manually painted normals provide the reference results in the study. | Use a cached silhouette normal field for estimated reflections, independently of color boundaries. Painted normals take priority at covered pixels. This is an estimate, rather than recovered 3D geometry. |
| Ivan Adriyanov Nikolov, **Light the Sprite: Pixel Art Dynamic Light Map Generation**, Eurographics 2025 Short Papers ([university-hosted paper](https://vbn.aau.dk/ws/portalfiles/portal/782049158/egs20251032.pdf)) | Its training-light construction separates directional lights from per-pixel point-light directions and attenuation. The study uses depth estimates and a learned light-map model. | Moving the bulb changes direction; moving its center changes the local point-light direction. We use deterministic existing geometry and do not introduce its neural model or claim its measured results. |
| Brent Burley, **Physically Based Shading at Disney**, SIGGRAPH 2012 course notes ([official paper](https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf)) | Roughness controls highlight shape; specular parameters are designed for artists. The notes distinguish chromatic metal reflections from dielectric reflections, and discuss limiting highlights that become excessively hot. | Replace the old undifferentiated strong patch with bounded intensity and separate footprint choices. Ordinary metal is no longer forced toward gold. Our hue-preserving artistic highlight is an explicit stylization, not a complete Disney BRDF. |
| Google, **Filament**, material model and roughness remapping ([official rendering guide](https://google.github.io/filament/main/filament.html)) | Perceptual roughness is squared; finite roughness limits numerical problems and excessively small highlights. Material tools can expose values in terms artists understand. | Present **Off / Soft / Crisp**, using finite roughness values. Keep the distribution bounded and use two coverage levels instead of adding a smooth gradient of white paint. This does not implement Filament's complete anti-aliasing system. |
| Pharr, Jakob and Humphreys, **Physically Based Rendering**, fourth edition, §9.6 ([official book chapter](https://www.pbr-book.org/4ed/Reflection_Models/Roughness_Using_Microfacet_Theory)) | Trowbridge–Reitz/GGX models the distribution of reflected directions. A distribution alone is insufficient for an energy-conserving BSDF. | Use the GGX lobe's shape, normalized to a peak of one, as an artist-controlled mask. Bound output separately. Do not describe this mask as physically correct or energy-conserving PBR. |
| Motion Twin development account, **Giving back colors to cryptic worlds in Dead Cells** ([developer article](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-)) | The studio describes hand-painted normals after automatic tools produced unwanted flat, blurred or embossed forms; its workflow emphasizes control over volumes, legibility and opacity. | Preserve ink and features, honor authored surface maps, keep controls visible beside the artwork, and make the result editable and reversible. We have not reproduced Dead Cells' renderer or art pipeline. |

These sources support the rendering principles. The thresholds, two coverage levels, brightness cap, and hue-preserving color lift are implementation judgments for this editor, checked against local fixtures rather than validated by those publications.

## Current behavior

- The bulb bar includes **Glint: Off / Soft / Crisp** next to Shade. Soft is a gentler, wider reflection; Crisp has a smaller, stronger footprint. The choices have matching heights and an announced selected state. Clicking a choice rerenders the artwork; dragging the bulb also rerenders before pointer release.
- **Specular Glint** opens the same bulb interaction in **Live Glint** mode. It previews the highlight alone and hides the unrelated Shade choices. Its default is Crisp. It does not immediately commit an effect.
- Cached macro normals avoid treating palette boundaries as reflective creases. Painted surface normals override that estimate at their covered pixels, with OpenGL up converted to screen down consistently with the bulb compass. Feature masks, ink masks, very dark pixels, and dark colored silhouette borders are excluded.
- Reflections retain the source hue/chroma family through a bounded OKLCH lightness lift. The result is intentionally stylized. Matte/fabric responses are weaker than metal responses. Strength changes the lamp and glint tone lift; coverage is capped at 96%, with flat core/shoulder levels.
- Apply commits one editable generated layer. Cancel restores the previous layer pixels, name, tag, recipe, blending mode and drawing-layer focus, or removes the uncommitted new layer. Repeated starts do not create overlapping preview sessions. Locked effect layers cannot be edited without unlocking.
- New lighting and highlight-only layers use **On artwork only** (`source-atop`) blending to retain destination transparency. The native project validator and Co-Draw structure allowlist recognize this standard canvas mode. The saved recipe records the glint choice and can be reopened from Layers through Edit FX.
- Pixel history captures the layer's blend mode, so Undo/Redo restores the same composite rather than changing the glint's blending operation. Highlight colors also use representable premultiplied byte values for translucent canvas storage.
- HUD placement measures the visible workspace and keeps the bar inside it while resizing, zooming or panning. Secondary coordinate readouts yield space at narrower widths. Apply and Cancel remain directly visible.

An explicitly chosen lighting palette also constrains the finished highlight colors.

Legacy calls that omit a glint choice retain their existing renderer outputs. The studio bulb and lighting actions explicitly select the new path. Volumetric optics and unrelated research lighting are outside this change.

## Verification and limits

The focused rendering tests exercise blue metal, cardinal light directions, one-degree movement, compact Soft/Crisp footprints, authored normals facing away from the light, feature protection, source immutability, coverage preservation, and isolation of the highlight from diffuse shading. Component checks cover selection, deferred preview flushing before Apply, and Enter selecting a control without applying the session. Native schema checks preserve the mask blend and saved style.

Local browser checks use an imported blue outlined object and real canvas pixels. They check live movement before release, Off returning to the source, distinct Soft/Crisp output, transparency, Cancel, layer count, Apply, Undo/Redo, and cancelling an edit of an existing effect. Layout is checked against workspace bounds at 1280 and 1024px; a separate lighting check covers the new choice next to Shade.

The final evidence below records verification after the transparency, history, normal-direction and compact-HUD corrections. There is no artist study, arbitrary-sprite guarantee, recovered-depth guarantee, external TestSprite run, or full cross-browser result. A guessed cushion cannot describe every object correctly; a painted surface map gives the artist control over its shape. Glint is an optional style, and Off leaves the new reflected highlight disabled.


### Initial local results

| Evidence | Outcome |
| --- | --- |
| [Full quality gate](evidence/2026-10-01/live-glint-gate.log) | Documentation inventory, TypeScript, lint, all **1,481 tests across 144 unit suites**, and production build passed; 85.80s overall. |
| [Final real-browser proof](evidence/2026-10-01/live-glint-browser-final-proof.log) | Both focused Chromium scenarios passed in 9.4s, including partial alpha in highlight-only and lighting previews, live changes, Cancel, Apply, Undo/Redo, existing-effect cancellation and compact workspace bounds. |
| [Painted-surface integration run](evidence/2026-10-01/live-glint-browser-verified.log) | The existing chisel/normal-map/lighting/palette workflow and glint lifecycle passed. That run's separate combined lighting-HUD layout check failed; the compact-spacing correction then passed in the final proof above. |

Screenshots from the final proof: [lighting bulb with the Glint option](evidence/2026-10-01/light-bulb-glint-option.png), [all lighting controls inside the 1024px workspace](evidence/2026-10-01/light-bulb-glint-option-1024.png), [Soft glint on imported blue artwork](evidence/2026-10-01/live-glint-soft-1920.png), [Crisp at 1280px](evidence/2026-10-01/live-glint-crisp-1280.png), and [Crisp at 1024px](evidence/2026-10-01/live-glint-crisp-1024.png).

The earlier browser logs are retained alongside the passing proof. They document the original blend-restoration mismatch and the subsequently corrected HUD clipping. They are not passing evidence. The initial discovered editor inventory was 148 tests in 33 suites; only the stated focused browser scenarios were executed for this change. These were local verification results; the user subsequently requested Git publication. No deployment is claimed.

## Visibility correction

The user's subsequent character screenshot showed that the initial reflection was too faint. The old Soft lightness lift of 0.16 was multiplied by matte coverage of roughly 0.3, and local light weighting introduced extra intermediate shades. Those settings are superseded.

Soft now uses a wider finite roughness of 0.52, with a bright core and a distinct shoulder; Crisp uses 0.38 and a tighter footprint. Core/shoulder OKLCH lightness lifts are 0.32/0.20 for Soft and 0.40/0.28 for Crisp, scaled together by the lamp strength. Coverage is flat per level, capped at 96%; fabric retains a modest reduction rather than the previous fourfold suppression. Lighting direction gates and shapes the mask, but does not interpolate its coverage into a gradient. Source hue, outlines, facial features, alpha, painted-normal priority and explicit palette constraints remain protected. These are artist-directed stylization choices, not a new claim of physical correctness.

The bulb is 24×27px, without the radial halo or blurred shadow. Its angle badge appears on hover/focus/drag, and guide rings/rays are quieter while idle. This exposes more of the actual reflection without adding toolbar controls.

A native 32×32 purple character fixture covers the matte case from the user's complaint. Its unit regression requires at least four adjacent reflected pixels brighter by at least 35 luminance units on the 0–255 scale, at most two glint tones for a uniform source color, fewer than 70 reflected pixels, and preserved colored ink. The real-browser character check uses the combined lighting workflow at 315°/45°, strength 115%, checks at least four pixels with the same contrast floor against Glint Off, retains source alpha, applies the exact preview, and restores original pixels with Undo. This fixture resembles the case; it is not an extraction of the user's screenshot.

The earlier results above remain historical. Current local evidence is recorded below. No external TestSprite upload or deployment was performed. Git publication was subsequently requested by the user.

| Current evidence | Outcome |
| --- | --- |
| [Visibility quality gate](evidence/2026-10-01/pixel-glint-gate.log) | All five gates passed in 59.18s: documentation, TypeScript, lint, **1,482 unit/integration tests in 144 suites**, and production build. |
| [Visibility browser proof](evidence/2026-10-01/pixel-glint-browser.log) | All three focused Chromium scenarios passed in 12.8s: visible matte-character contrast and Apply/Undo, existing glint lifecycle, and compact lighting controls. This is not an execution of all 149 discovered editor tests. |

Visually reviewed browser captures: [Soft in the live bulb](evidence/2026-10-01/pixel-glint-character-live.png), [Crisp in the live bulb](evidence/2026-10-01/pixel-glint-character-crisp.png), and [applied Soft result](evidence/2026-10-01/pixel-glint-character-applied.png). The bright face cluster and body reflection have visible native-pixel edges, with no blurred highlight halo. Whitespace validation passed.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The studio retains its single-row header and live pixel glints. Palette tools now support named creation, scans of at most six main artwork colors, and direct swatch removal. First/Last cycle swatches can animate fire while preserving wood and outlines. Cycle Loop exports APNG or GIF at 3/5/8/10/12/15/24/30 FPS, initially 8 FPS. The shared GIF encoder now restarts its compression dictionary correctly, fixing corrupted larger exports. Existing damaged GIFs need re-export. [Interface record](session-ui-ux-2026-10-01.md), [palette tools](palette-creator-2026-10-01.md), [cycle scope](palette-cycle-scope-2026-10-01.md), [export timing](palette-cycle-export-2026-10-01.md) and [GIF correction](gif-8x-corruption-2026-10-01.md).

The latest full project gate passed documentation, types, lint, **1,502 unit/integration tests across 149 suites**, and the production build in 65.39s. A real 512×512 8x GIF passed native Chromium decoding of all 16 frames with zero pixel mismatches. The current discovered editor inventory is **155 tests in 37 files**, plus 39 separate compiled-production scenarios; the new work has scoped browser verification, not a full inventory rerun. Earlier results retain their dates and scope. The user requested documentation reconciliation and Git publication of this checkpoint; Git history records publication. [Delivered work, evidence and open validation](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
