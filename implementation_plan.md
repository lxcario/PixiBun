# Implementation Plan - PixiBun De-Slop: Lamplit Identity, Cozy Studio & Hero Landing Page

## Overview

Transform PixiBun from a competent-but-generic tool UI into a warm, authored, cozy pixel-art webapp with a hero landing page, following the anti-slop protocol in `FullStackGuide.md`. The audit found three slop roots: (1) there is no front door - `/` boots straight into the editor so nothing establishes identity; (2) the chrome is uniform flat rectangles with identical radii, zero texture, zero warmth, and emoji-riddled robotic feedback strings (`'✨ Applied 2.5D curved shadow crescent'`) that violate both `SKILL.md` and FullStackGuide §2.3; (3) despite promising a "Hearth & Coffee" aesthetic, every surface is cool pastel lavender with no light source, no material, no story.

The direction confirmed with the owner: **keep the lavender pastel identity but deepen it** - warmer plum tones, wood/lamplight accents, dithered textures, night-desk coziness.

**One signature element** (FullStackGuide §3.6): *the lamplit desk.* The studio reads as a physical desk at night - a dark plum-wood surface surrounding a paper-lilac workspace, with a single warm lamp-glow pool falling across the canvas frame. Everything else stays disciplined around it. Supporting cast: **Bun**, a hand-pixelled bunny mascot (already latent in `icon.svg`) who becomes the brand mark, lives in the header, and stars in the landing hero. No ambient floating, no glow spam, no sparkle icons - the guide bans them explicitly.

Scope: routing restructure (`/` landing, `/studio` editor), design-token overhaul, texture/material utilities, full copy rewrite of feedback strings, brand mark integration, hero landing page with an interactive doodle pad and starter-sprite gallery rendered through the existing compositor pipeline. Out of scope: the pending engine work in `TASKS.md` Phases 9-12 (compositor-in-viewport, undo v2, animation truth, PWA) - this plan runs alongside those and does not touch pixel-buffer ownership.

## Types

New file `src/types/landing.ts`:

```ts
export interface StarterTemplate {
  id: TemplateId;
  name: string;              // human name, e.g. 'Hearth Ghost'
  blurb: string;             // one warm sentence
  width: number;             // pixels, e.g. 16
  height: number;
  /** rows of single-char color keys; '.' = transparent; keys index TEMPLATE_PALETTE */
  rows: string[];
}

export type TemplateId = 'hearth-ghost' | 'mushroom' | 'bun' | 'lantern';

export const TEMPLATE_PALETTE: Record<string, string>; // char -> hex, shared by all templates

export interface DoodlePadState {
  cols: number;              // e.g. 32
  rows: number;              // e.g. 20
  /** one byte per cell: 0 = empty, 1..n = TEMPLATE_PALETTE key index */
  cells: Uint8Array;
}
```

No store changes required - the doodle pad and gallery are self-contained client islands with local state. If the optional "carry my doodle into the studio" step is taken, the serialized doodle travels via `sessionStorage` (`pixibun:doodle-handoff`) and hydrates as layer pixels through the existing `bufferRegistry`, not through Zustand.

## Files

New files:

| Path | Purpose |
|---|---|
| `src/app/studio/page.tsx` | New editor route; renders `<StudioLayout />` plus its own `metadata` since the root layout no longer fits both pages. |
| `src/components/landing/LandingHero.tsx` | Client component. Silkscreen wordmark, Bun mascot with a 2-frame idle blink (CSS steps, reduced-motion respected), tagline, CTAs. No gradients, no float. |
| `src/components/landing/DoodlePad.tsx` | The hero's interactive proof: a 32x20 crisp-canvas grid visitors paint on with 4 swatches + eraser before entering the studio. Pointer events, integer cell math, `imageSmoothingEnabled = false`. Optional "take it to the studio" button (sessionStorage handoff). |
| `src/components/landing/StarterGallery.tsx` | Renders 4 starter sprites from `starterTemplates.ts` onto small canvases via `templateRenderer`; clicking one opens the studio with that template preloaded. Asymmetric row layout, deliberately not a card grid. |
| `src/components/landing/FeatureStory.tsx` | Single-column narrative section: real sentences about layers, onion skinning, ramps, GIF export, paired with `PixelIcon`s. Craftsperson voice; zero marketing abstractions. |
| `src/components/landing/SiteFooter.tsx` | Quiet footer: mascot mark, one honest line, link back up. |
| `src/components/ui/BunMascot.tsx` | Inline SVG (viewBox 16x16, `shape-rendering="crispEdges"`, same technique as existing `icon.svg`); props: `size`, `pose: 'idle' \| 'blink' \| 'happy'`. Single source of mascot art. |
| `src/lib/art/starterTemplates.ts` | Hand-authored pixel maps (`StarterTemplate[]`) + `TEMPLATE_PALETTE` in the lavender/warm ramp. Char-grid format keeps it reviewable and testable. |
| `src/lib/render/templateRenderer.ts` | `paintTemplate(canvas, template)` - fills rects per non-transparent cell, DPR-aware, smoothing off. Reused by gallery and the studio handoff. |

Modified files:

| Path | Change |
|---|---|
| `src/app/page.tsx` | Rewritten: server component composing `LandingHero`, `FeatureStory`, `StarterGallery`, `SiteFooter`. Page-level `metadata` (title, description, OG). |
| `src/app/layout.tsx` | Remove global `overflow-hidden` from `<body>`/css (it currently kills scrolling app-wide); scope overflow locking to the studio shell instead. Keep fonts. Landing-appropriate default metadata. |
| `src/app/globals.css` | Token overhaul in `@theme`: add `--color-desk` (deep plum-wood ~#2A2130), `--color-desk-grain` (~#3A2C42), `--color-lamp` (warm amber ~#F0BE7C), `--color-lamp-soft` (~#E8AE68); deepen surfaces one step warmer; add utilities `.texture-dither` (2x2 repeating-conic-gradient checker at low alpha), `.texture-wood-grain` (layered repeating-linear-gradients, static, no animation), `.lamp-pool` (single radial-gradient vignette, pointer-events none). Pure CSS data - no image requests, CSP-safe. Scrollbar colors updated. |
| `DESIGN.md` | Locked token table gains desk/lamp/grain roles; documents the signature element ("the lamplit desk"), texture rules (static only, <= 8% alpha dithers), and landing-page voice guide with the banned-phrase list from FullStackGuide §2.3. |
| `src/components/layout/RightInspector.tsx` | Strip every emoji from feedback strings; rewrite each as one warm craftsperson line. No robotic strings. |
| `src/components/layout/TopHeader.tsx` | Brand block rebuilt: `BunMascot` mark (20px) beside the PIXIBUN wordmark in Silkscreen on a single bordered plate instead of the two-box badge stack; radii hierarchy applied. |
| `src/components/layout/StudioLayout.tsx` | Root wrapper becomes the desk: `bg-desk texture-wood-grain` behind the chassis; inset wells get `.texture-dither`; `overflow-hidden h-screen` move onto this wrapper (restoring page scroll globally). |
| `src/components/layout/CenterViewport.tsx` | Canvas stage gains the lamp pool: a `pointer-events-none` overlay div with `.lamp-pool` over the canvas frame only (exports untouched - overlays already render separately from exported frames). Frame becomes a 3px inset "paper on desk" treatment. |
| `src/components/ui/TactilePanel.tsx` | Variants re-tokened from raw hex to semantic tokens; `canvas-frame` variant receives the lamplit inset shadow. |
| `src/components/ui/TactileButton.tsx` | Explicit `focus-visible` ring (amber `--color-lamp`, 2px, offset) restoring WCAG focus lost to `outline-none`; hardcoded hexes swapped for tokens. |

## Functions

New functions:

- `paintTemplate(canvas: HTMLCanvasElement, template: StarterTemplate): void` - `src/lib/render/templateRenderer.ts`. Integer rect fills, devicePixelRatio aware, `imageSmoothingEnabled = false`.
- `serializeDoodle(state: DoodlePadState): string` / `parseDoodle(raw: string): DoodlePadState \| null` - base64 of the `Uint8Array` plus dims header, used by the sessionStorage handoff. Failures return `null`, never throw into render paths.
- `getTemplate(id: TemplateId): StarterTemplate` - `src/lib/art/starterTemplates.ts`.
- `BunMascot({ size, pose })` - `src/components/ui/BunMascot.tsx`.

Modified functions:

- `Home()` in `src/app/page.tsx` - replaced by the landing composition (server component; only `DoodlePad`/`LandingHero` interactivity is client-side islands).
- Feedback handlers in `RightInspector.tsx` (`handleAutoShade`, `handleSpecularHighlight`, `handleSelOut`, `handleAutoOutline`, `handleGroundShadow`, `handleCleanJaggies`, `handleRemoveStrays`, `handleColorGrade`, `handleQuantizePalette`, `handleHarmonizePalette`, `handleInBetweenFrame`) - copy rewrite only; dispatch mechanics unchanged.

Removed functions/patterns:

- The two-box brand badge JSX in `TopHeader.tsx` (replaced by the mascot plate).
- Global `overflow-hidden` on `html, body` in `globals.css` (replaced by scoping in `StudioLayout`).

## Classes

No new classes. The codebase is function-oriented and stays that way. Only existing component contracts touched are the presentational props listed above (`BunMascot` pose union, `TactilePanel` variant retokening).

## Dependencies

**None added.** Everything ships with what exists: Tailwind v4 gradients handle dither/grain/lamp textures, `next/font` already self-hosts Silkscreen, plain CSS `steps()` handles the mascot blink (fewer moving parts than motion). CSP needs no changes (`default-src 'self'`; all assets inline or self-hosted).

## Testing

Unit tests (Vitest, existing suite extended):

- `tests/starterTemplates.test.ts` - every template's `rows` are rectangular, within declared width/height, and use only keys present in `TEMPLATE_PALETTE`; ids unique.
- `tests/templateRenderer.test.ts` - paint a known 2x2 template onto a minimal 2D-context fake recording fillRect calls; verify cell count, colors, transparent cells skipped.
- `tests/doodleHandoff.test.ts` - serialize/parse round-trip equality; corrupted or truncated payloads return `null`.

Manual checkpoints:

1. `/` renders the landing: wordmark crisp (Silkscreen actually loading), mascot blink respects reduced-motion, no console errors.
2. Paint in the hero doodle pad on desktop and touch; cells are crisp integers, eraser works, "open the studio" lands on `/studio` with autosave state intact.
3. Studio still restores the saved project on mount (regression guard: routing change must not break `loadLatestSavedWorkspace` hydration).
4. Every feedback action in the inspector shows warm human copy, zero emojis, zero robotic strings.
5. Lamp pool overlays the canvas frame but eyedropper sampling and PNG/GIF/spritesheet exports remain unchanged (compositor untouched).
6. Keyboard-only pass: focus ring visible on every TactileButton on both pages; Escape closes modals.
7. `typecheck`, `lint`, `test`, and `next build` all clean.

## Implementation Order

**Phase A - Tokens, textures, materials (foundation; everything else consumes these)**
1. `globals.css`: new desk/lamp/grain tokens, warmed surfaces, `.texture-dither`, `.texture-wood-grain`, `.lamp-pool`; remove global `overflow-hidden`; move `h-screen w-screen overflow-hidden select-none` onto `StudioLayout`'s root div.
2. `DESIGN.md`: lock the expanded token table + signature-element statement + copy rules.
3. `TactilePanel.tsx` + `TactileButton.tsx`: retoken to semantic names, add `focus-visible` amber rings.

**Phase B - Route restructure + studio ambience**
4. Create `src/app/studio/page.tsx` hosting `<StudioLayout />` with its own metadata; gut `src/app/page.tsx` to a temporary passthrough so the app builds between commits (replaced in Phase D).
5. Verify autosave hydration, keyboard shortcuts, and modal flows survive the route move (manual checkpoint 3).
6. `StudioLayout.tsx`: desk background + wood-grain texture; `CenterViewport.tsx`: canvas frame treatment + lamp-pool overlay (pointer-events none).

**Phase C - Brand, mascot, de-slop copy**
7. `BunMascot.tsx` (poses: idle, blink, happy); refresh `TopHeader.tsx` brand plate.
8. `RightInspector.tsx`: rewrite all eleven feedback strings - warm, specific, emoji-free.
9. Sweep remaining components (`BottomTimeline`, `LeftToolbar`, modals) for stray hex values, uniform-radius violations, and cold strings; normalize to tokens.

**Phase D - Landing page**
10. `starterTemplates.ts` (hand-author four 16x16 sprites in the house palette) + `templateRenderer.ts` + unit tests.
11. `DoodlePad.tsx` (hero interactive grid) + `tests/doodleHandoff.test.ts`.
12. `LandingHero.tsx` (wordmark, mascot, tagline, CTAs), `FeatureStory.tsx`, `StarterGallery.tsx`, `SiteFooter.tsx`.
13. Compose final `src/app/page.tsx` + landing `metadata`; write the real hero/tagline copy first (Gate 2: words before wireframes) - draft included in PR description for review.

**Phase E - Polish and handoff**
14. Optional (recommended): doodle/gallery to studio handoff over sessionStorage, hydrated into a fresh layer via `bufferRegistry.getOrCreateBuffer` on studio mount when the key exists.
15. Full manual checkpoint sweep (1-7 above), adversarial self-review per Gate 5 (slop-tell category especially), update `TASKS.md` with a completed phase entry and `LOGS.md` notes.
16. Conventional Commits per logical unit (`feat(landing): ...`, `feat(theme): ...`, `fix(copy): ...`).

Every phase exits with typecheck, lint, tests, and a production build green before the next begins.
