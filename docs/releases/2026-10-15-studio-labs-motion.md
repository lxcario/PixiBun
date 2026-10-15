# Studio Labs motion and documentation — 15 October 2026

This integration combines the local Labs history through `d2c588f6` with remote audit and handbook updates through `65d29077`. The inspector merge retains the remote four-column classic tabs and the local liquid-tab option. The screenshot refresh and earlier audit fixes keep their original source/build receipts.

## Final behavior

- Studio → Labs offers Dynamic island, Liquid tabs, Paint pot palette and Quick magic on the six scene themes. Graphite and Plum stay classic. Flags persist locally and automated runs default off unless explicitly opted in.
- Tool changes stage the outgoing blur before the incoming controls appear. The old controls are inert during exit; rapid replacement cancels obsolete phases and leaves the final requested tool usable.
- The approved text bloom starts at 95%, with a small, quickly damped overshoot. Resetting scale velocity at the invisible swap prevents the earlier deep scale dip. Blur, shell motion and artwork playback are separate concerns.
- The shell measures intrinsic content rather than transformed bounds, deduplicates resize destinations, grows below a stable top row and clamps its rendered height to the compact 38 px minimum.
- Liquid tabs use calmer snap/follow springs and smaller lens lift/stretch. Paint-pot palette and Quick magic controls have softer easing. Their artwork actions retain their existing engines and Undo/preview contracts.

## Hover quick actions

The pill and right-hand droplet share one separation spring (opening stiffness/damping 420/26, closing 520/34, mass .9). The body compresses to 90% width during the pull and rests at 94% while the droplet is out; glyphs keep their original scale and position. A filtered neck joins the shapes during separation/merge, with a separate glass sheen. The circle has a fixed hit target: scene-wide button press styles no longer replace its positioning transform. Hover, keyboard focus, Escape, reversal and live reduced-motion changes are supported.

| Tools | Direct shortcut |
| --- | --- |
| Pen, Eraser, Line | Switch between 1 px and 4 px strokes |
| Bézier Curve | Switch between soft .3 and tight .8 curves |
| Flood Fill, Magic Wand | Toggle connected pixels only |
| Pixel Gradient | Toggle linear/radial shape |
| Dither Brush | Switch Bayer 2×2 / 4×4 |
| Color Replace, Eyedropper | Swap foreground/background colors |
| Erase Sampled Color | Toggle color-family matching |
| Marquee Box, Lasso Select | Toggle RotSprite/Paeth rotation engine |
| 2:1 Iso Line | Toggle angle snap |
| Rectangle, Ellipse | Toggle filled/outline shape |
| Normal Chisel | Toggle ridge mode |

The top rail shows Clean corners only inside expanded Pen/Bézier brush controls. Existing detailed inspector settings keep their own placement. These shortcuts change settings or colors; they do not directly edit pixels.

## Ownership and tuning

| Area | Owner | Final parameters |
| --- | --- | --- |
| Lab flags and scene gating | [labsStore](../../src/experimental/labsStore.ts) | `pixibun:labs:v1`; scene styles only |
| Island shell | [DynamicIsland](../../src/experimental/island/DynamicIsland.tsx) | Width stiffness/damping 420/31; height 460/25; mass 1 |
| Tool content | Same component | Exit 110 ms, blur 8 px, scale .97; reveal delay 60 ms, blur 12 px, opacity/blur tween 420 ms; scale .95 → 1, stiffness 600, damping 26, mass .9, rest delta .0005 and rest speed .01 |
| Hover action ownership | [useIslandQuickAction](../../src/experimental/island/useIslandQuickAction.ts) | Exhaustive tool mapping; existing store setters |
| Stable menu markup | [AtelierRail](../../src/components/layout/AtelierRail.tsx) | Persistent brush-control row; hidden/inert closed brush panel |
| Inspector branches | [RightInspector](../../src/components/layout/RightInspector.tsx) | Readable classic grid plus optional [LiquidTabs](../../src/experimental/liquid/LiquidTabs.tsx) |
| Palette and quick effects | [PaintPotPalette](../../src/experimental/palette/PaintPotPalette.tsx), [QuickMagic](../../src/experimental/magic/QuickMagic.tsx) | Presentation changes; existing color/action ownership retained |

## Verification

The isolated staged application snapshot (tree `3a4cb854fb4e06c372f54cdcc5433a31de62e3be`, before this verification-note edit) passed the five standard quality gates under Node 22.23.3: documentation/contracts, strict types, lint/accessibility rules, coverage with **2,545 unit tests / 242 files**, and the existing warmed performance budgets. Concurrent home page/engine edits are excluded from that snapshot and this publication. The pre-push hook checks the same isolated source again; the pushed commit is the final publication receipt.

The first integrated development-browser run executed 39 checks: **36 passed and 3 failed** (two Firefox stationary-hover failures and the aggregate 17-tool WebKit case exceeding its 45-second case budget). Hit-target validation now preserves stationary hover through filtered repaints, with actual outside pointer movement and window blur still closing it. The 17-tool case has a 120-second aggregate budget; its individual assertions retain the normal 7-second limit. The final affected regressions passed **9/9, zero retries**, across Chromium, Firefox and WebKit: compact/wide geometry and live reduced motion, the coupled squeeze plus fixed text/click target and pointer/keyboard behavior, and direct actions for every tool. Those browser checks used the development preview; they do not claim a fresh production build or physical-device frame rate. The earlier integrated and failed trial results retain their own source scope and local logs.

## Markdown corpus disposition

The current tracked corpus is reconciled below. Present operating documents were updated where this work affects them; historical receipts, archive custody, vendor skills and unrelated safety/export contracts were retained. The incoming handbook refresh supplies current screenshots and theme guidance; Labs captures remain separate from those earlier production-build pictures.

| Markdown file | Disposition | Scope |
| --- | --- | --- |
| [.agents/skills/nibbli/SKILL.md](../../.agents/skills/nibbli/SKILL.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [.agents/skills/testsprite-onboard/SKILL.md](../../.agents/skills/testsprite-onboard/SKILL.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [.agents/skills/testsprite-verify/SKILL.md](../../.agents/skills/testsprite-verify/SKILL.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [AGENTS.md](../../AGENTS.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [ARCHITECTURE.md](../../ARCHITECTURE.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [BENCHMARKS.md](../../BENCHMARKS.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [CHANGELOG.md](../../CHANGELOG.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [DESIGN.md](../../DESIGN.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [FullStackGuide.md](../../FullStackGuide.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [MAIN.md](../../MAIN.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [README.md](../../README.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [SECURITY.md](../../SECURITY.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [SKILL.md](../../SKILL.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [TASKS.md](../../TASKS.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [V2_VISION.md](../../V2_VISION.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/README.md](../README.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/archives.md](../archives.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/contracts/carts.md](../contracts/carts.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/contracts/exports.md](../contracts/exports.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/contracts/learning.md](../contracts/learning.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/contracts/rendering.md](../contracts/rendering.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/contracts/security-boundaries.md](../contracts/security-boundaries.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/contracts/shortcuts.md](../contracts/shortcuts.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/contracts/storage.md](../contracts/storage.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/current-status.md](../current-status.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/features.md](../features.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/guides/README.md](../guides/README.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/guides/animation-and-review.md](../guides/animation-and-review.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/artist-study.md](../guides/artist-study.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/artist-workspace.md](../guides/artist-workspace.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/artwork-safety.md](../guides/artwork-safety.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/cart-survival.md](../guides/cart-survival.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/collaboration-and-privacy.md](../guides/collaboration-and-privacy.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/deployment.md](../guides/deployment.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/drawing-tools.md](../guides/drawing-tools.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/exporting.md](../guides/exporting.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/learning-and-playground.md](../guides/learning-and-playground.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/lighting-and-surfaces.md](../guides/lighting-and-surfaces.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/nibbli-agent.md](../guides/nibbli-agent.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/nibbli.md](../guides/nibbli.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/palettes-and-cycling.md](../guides/palettes-and-cycling.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/guides/pixitools-cleanup-and-tiles.md](../guides/pixitools-cleanup-and-tiles.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/guides/release-readiness.md](../guides/release-readiness.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/studio-workspace.md](../guides/studio-workspace.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/guides/testing.md](../guides/testing.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/guides/themes.md](../guides/themes.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/guides/variations-and-scenes.md](../guides/variations-and-scenes.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/guides/welcome-and-demos.md](../guides/welcome-and-demos.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/plans/2026-10-14-strategy-roadmap.md](../plans/2026-10-14-strategy-roadmap.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/plans/2026-10-15-audit-follow-up.md](../plans/2026-10-15-audit-follow-up.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/plans/README.md](../plans/README.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/plans/learn-by-making-2026.md](../plans/learn-by-making-2026.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/plans/nibbli.md](../plans/nibbli.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/plans/research_grounded_product_roadmap.md](../plans/research_grounded_product_roadmap.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [docs/releases/2026-10-13-studio-and-nibbli.md](2026-10-13-studio-and-nibbli.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/releases/2026-10-15-codebase-and-documentation.md](2026-10-15-codebase-and-documentation.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/releases/2026-10-15-studio-labs-motion.md](2026-10-15-studio-labs-motion.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [docs/releases/v1.14.1-signoff.md](v1.14.1-signoff.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/research/PHASE4_ARTIST_UX_STUDY.md](../research/PHASE4_ARTIST_UX_STUDY.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/research/issue-registry.md](../research/issue-registry.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/research/phase6-artist-evaluation.md](../research/phase6-artist-evaluation.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/research/pixitools-baseline-study.md](../research/pixitools-baseline-study.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/research/testsprite-plan-registry.md](../research/testsprite-plan-registry.md) | Retained | Historical results/reference retained with original labels; no new verdict inferred. |
| [docs/verification/README.md](../verification/README.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |
| [src/experimental/README.md](../../src/experimental/README.md) | Updated | Updated current behavior, ownership, navigation or publication scope. |
| [testsprite-plans/challenge-2026-10-03/README.md](../../testsprite-plans/challenge-2026-10-03/README.md) | Retained | Reviewed for this UI scope; unrelated operating contract or proposal retained. |

Raw logs, captures, trial sources and rollback copies remain local under the [archive policy](../archives.md). They are not added to the source checkout.
