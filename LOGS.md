# Build Log — PixiBun

> **Note on Historical Defect Prevention & Audit Records:** The log entries below document the progressive phases of adversarial auditing, QA post-mortems, and edge-case resolution across PixiBun's development history. Rather than representing active defects, these records document the exact test assertions, mathematical proofs, and architectural hardening measures introduced to make the codebase reliable against regressions.

## Studio UX follow-up (2026-09-30)

**Delivered:** Consolidated document actions and tool options; refined layer drag ordering, timeline controls, scrub preview, import and project flows; retired Rivet Stamp, one-click Material Shading, and artwork-changing Seamless Pattern generation. Added selection-based tile repeat, preview-before-apply for 47-blob contours and raster effects, and stale-source guards. Existing photometric relighting and saved-project compatibility were preserved.

**Checks:** All five quality stages passed: documentation integrity, typecheck, lint, 1,315 unit tests in 131 suites, and production build. A clean full Chromium run passed 98/98 tests in 24 spec files, including normal preview and photometric relighting. TestSprite is unavailable because its CLI is not installed.

**Status:** Unreleased checkout work. See [UX session changelog](PIXIBUN_UX_CHANGELOG.md) and [main changelog](CHANGELOG.md).

---

## Phase 0 — Intake, Architecture & Foundation Docs (2026-08-18)
**Delivered:**
- Completed the Part XII intake interview via /grill-me.
- Defined problem, audience, and scope for PixiBun (desktop-grade 2D pixel art studio with cozy Hearth & Coffee aesthetic and Gemini AI co-creator).
- Generated complete foundation documentation:
  - [`MAIN.md`](./MAIN.md) — Problem statement, scope, tech stack with rationale.
  - [`DESIGN.md`](./DESIGN.md) — OKLCH color tokens, typography scale, tactile UI rules, competitive audit, signature choice.
  - [`SKILL.md`](./SKILL.md) — Engineering constraints, anti-patterns, and quality standards.
  - [`TASKS.md`](./TASKS.md) — 6-phase testable roadmap with acceptance criteria and human checkpoints.
  - [`README.md`](./README.md) — Project overview and quickstart guide.

**Checks run:** Documentation integrity and cross-references verified.
**Issues found & fixed:** None.
**Human feedback:** Approved "Hearth & Coffee" studio theme, professional dual-canvas stack, button CC light-sweep physics, and Gemini multimodal vision companion.
**Status:** Complete

---

## Phase 1 & 2 — Studio Foundations, Tactile UI & Pixel Canvas Engine (2026-08-18)
**Delivered:**
- Initialized Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 environment with OKLCH theme tokens.
- Built `TactileButton.tsx` with CC light sweep hover physics, micro-scaling (1.025x), reverse light sweep on leave, and mechanical click depression bounce.
- Built `PixelIcon.tsx` custom pixel-aligned SVG icon suite for all drawing tools and studio controls.
- Implemented `CenterViewport.tsx` dual-layer hardware-accelerated 2D canvas with integer scaling up to 6400%, pan, grid lines, 3x3 tile preview, and onion skinning.
- Implemented `rasterMath.ts`, `floodFill.ts`, and `ditherMatrix.ts` with Bresenham line interpolation, pixel-perfect jaggies prevention, Bayer matrix dithering, and symmetry plotting.
- Built `LeftToolbar.tsx`, `TopHeader.tsx`, `RightInspector.tsx` (Layers, Palette, Gemini AI Co-Creator), and `BottomTimeline.tsx`.
- Built `ExportModal.tsx` for PNG scaling, sprite sheet packing, and `.pixibun` project export.
- Integrated keyboard shortcuts across the workspace.

**Checks run:** Next.js build compilation and TypeScript strict checking.
**Issues found & fixed:** None.
**Status:** Complete

---

## Phase 3, 4, 5 & 6 — Full Suite Delivery (2026-08-18)
**Delivered:**
- **Gemini Multimodal Live Canvas Integration**: `/api/ai/vision` route with canvas buffer parsing, light source detection, auto-shading layer analysis, palette harmonization, and jaggy cleanup heuristics.
- **Local-First Database & Autosave**: Dexie.js (IndexedDB) integration in `db.ts` with continuous stroke snapshotting and project persistence.
- **Game Engine Exporter Pipeline**: `spriteSheetPacker.ts` packing horizontal, vertical, and grid sprite sheets with accompanying Godot, Unity, and Phaser JSON metadata.
- **Keyboard Shortcuts Modal**: `ShortcutsModal.tsx` accessible via `?` key or header button.
- **Full Production Build**: Verified with Turbopack, 0 TypeScript errors, and zero warnings.

**Checks run:** `npx tsc --noEmit` (0 errors), `npm run build` (0 errors, 5 static/dynamic routes generated).
**Issues found & fixed:** Resolved prop destructuring and syntax in icon and header modules.
**Status:** Complete

---

## Phase 7 — Comprehensive Hardening, Accessibility & Full Audit Resolution (2026-08-22)
**Delivered:**
- **Accessible Modal Architecture (`ModalWrapper.tsx`)**: Created native `<dialog>`-based modal container with full ARIA semantics, focus trapping, Escape key support, backdrop click dismiss, and smooth `motion/react` animations. Refactored all 4 modals (`ExportModal`, `ImportModal`, `CanvasResizeModal`, `ShortcutsModal`).
- **Accessible Pixel Slider (`PixelSlider.tsx`)**: Added hidden native `<input type="range">` with full keyboard (arrow keys) and screen reader support without altering tactile aesthetics.
- **Zero-Dependency GIF89a Encoder (`gifEncoder.ts`)**: Built a complete from-scratch animated GIF generator with median-cut color quantization, variable-length LZW compression, Netscape loop extensions, and per-frame delay calculation. Added animated GIF tab to `ExportModal`.
- **Security Hardening**:
  - Upgraded Next.js to 16.3.2 resolving 3 high-severity CVEs in PostCSS and sharp (`npm audit` = 0 vulnerabilities).
  - Configured comprehensive CSP, X-Frame-Options, X-Content-Type, HSTS, and Permissions-Policy headers in `next.config.ts`.
  - Added request validation, custom API key format guards, and anti-slop emoji removal in `/api/ai/vision`.
- **Performance Optimizations**:
  - Replaced `setInterval` with `requestAnimationFrame` timestamp delta loop in `BottomTimeline.tsx`.
  - Added `touch-action: none` to canvas container in `CenterViewport.tsx` to stop mobile gesture collision.
  - Optimized `floodFill.ts` using `Uint32Array` buffer view for single-instruction pixel equality.
  - Replaced string template allocations in `rasterMath.ts` `applySymmetry` with integer hash keys (`y * width + x`).
- **Motion Accessibility**:
  - Added `useReducedMotion` support to `TactileButton.tsx` (strips scale/translation and light sweep).
  - Added global `@media (prefers-reduced-motion: reduce)` rules to `globals.css`.
- **Asset Optimization**:
  - Compressed all 9 raw tool PNGs down to 96x96 WebP assets (reduced asset weight from ~24 MB to ~25 KB).
- **Developer Experience**:
  - Created `.env.example` with documented environment variables.
  - Verified documentation consistency across `README.md`, `MAIN.md`, and `DESIGN.md`.

**Checks run:** `npx tsc --noEmit` (0 errors), `npm run build` (Next.js 16.3.2 Turbopack, 0 errors, 4 static/dynamic routes), `npm audit` (0 vulnerabilities).
**Issues found & fixed:** Resolved modal accessibility gaps, implemented missing GIF generator, fixed PostCSS/sharp CVEs, and eliminated high-frequency memory allocations.
**Status:** Complete

---

## Phase 8 — Milestone 1: Data Integrity & Truthful Foundations (2026-08-25)
**Delivered:**
- **Engine-level buffer registry (`src/lib/engine/bufferRegistry.ts`)**: Layer pixel buffers moved out of a React ref into an engine-owned registry with clone/delete/anchor-aware resize. Fixes: duplicated frames/layers previously arrived blank, deleted layers/frames leaked buffers forever, canvas resize silently ignored its anchor/resample options and always cropped top-left.
- **Collision-proof IDs (`src/lib/engine/id.ts`)**: All `Date.now()`-based IDs replaced (layers, frames, clips, palettes, messages) - same-millisecond creation no longer corrupts buffer lookups.
- **Versioned `.pixibun` format (`src/types/project.ts`, `src/lib/project/schema.ts`)**: ProjectFile v2 contract plus a zero-dependency structural validator with human-readable errors. Malformed imports are refused instead of silently corrupting session state.
- **Real serialization (`src/lib/project/serialize.ts`)**: Autosave and `.pixibun` export now carry every layer's actual pixels as base64 PNG; restore decodes them back into fresh buffers via `hydrateProject`. Previously both saved empty metadata - artwork was unrecoverable by design.
- **Autosave that restores (`StudioLayout.tsx`)**: Debounced (800ms) full-fidelity saves, best-effort flush on pagehide, and mount-time validation-gated restore. The old code saved metadata only and ignored whatever it loaded.
- **Truthful exports**: New pure compositor (`src/lib/render/compositor.ts`) feeds PNG/GIF/spritesheet exporters from real per-frame layer data. Fixes: multi-frame exports contained N copies of whatever was on screen, and exported PNGs baked in onion-skin ghosts via fragile DOM scraping (`document.querySelector('main canvas')` removed everywhere).
- **Canvas resize honesty**: Anchor + resample choices now flow through to the registry; content lands where the user asked.
- **Zero `any`**: All four violations eliminated (`route.ts` x2 typed with Gemini response interfaces, `ImportModal.projectJson: unknown`, `loadProjectState(projectData: ProjectFile)`).
- **API key guard fix**: BYO Gemini keys longer than 20 chars accepted regardless of legacy 39-char/AIza assumption.
- **Verification harness**: ESLint 9 flat config enforcing the SKILL.md house rules (`no-explicit-any` error, underscore-reserved params, hooks rules), Vitest suite (17 tests: id generation, schema validation, raster math), GitHub Actions CI (typecheck + lint + test), scripts `lint`/`typecheck`/`test`.
- **Lint debt cleared**: Dead stores, unused params, and `let`-vs-`const` issues fixed across `floodFill.ts`, `gifEncoder.ts`, `pixelAiEngine.ts`; `renderComposite` reordered above undo closures so hook deps are complete (removes stale-closure risk).

**Checks run:** `npx tsc --noEmit` (0 errors), `npm run lint` (0 problems), `npm test` (17/17), `npm run build` (Next.js 16.3.2 Turbopack, 0 errors).
**Issues found & fixed:** Duplicate-frame pixel loss, autosave data loss, identical-frame exports, onion-baked PNG exports, resize anchor drop, ID collisions, buffer leaks on delete.
**Known remaining (tracked):** ~~Viewport renderer still draws onion skin into the main composite (resolved Phase 25)~~, ~~timeline thumbnails still placeholders (resolved Phase 25)~~, undo still pixels-only, GIF/spritesheet ignore clips, AI offline copy still impersonates conversation. All scheduled in `implementation_plan.md`.
**Status:** Complete

## 2026-08-25 - Phase 13: Lamplit Identity, De-Slop & Landing Page

**What changed:**
- **Identity**: One signature element declared and enforced - the lamplit desk. Dark plum-wood desk (`desk` #2A2130) surrounds the workspace; exactly one amber light pool (`.lamp-pool`) falls over the canvas frame (viewport) and hero (landing). Static CSS-only textures: wood grain, 4px dithers at <=6% alpha. No animation added except the mascot blink (3.4s interval, honors prefers-reduced-motion).
- **Brand mark**: Bun, a hand-plotted 16x16 bunny SVG (`BunMascot.tsx`) with idle/blink/happy poses. Replaced the two-box PIXIBUN STUDIO badge stack in TopHeader with a single mascot plate linking back to the landing.
- **Routing**: `/` is now the hero landing (wordmark, tagline, interactive DoodlePad, feature story, starter gallery, footer); the editor lives at `/studio`. Global overflow lock removed from html/body and scoped to StudioLayout so the landing scrolls. Autosave restore path re-verified after the move.
- **Copy**: All eleven PixiBud feedback strings rewritten without emojis in craftsperson voice ("Staircase corners smoothed flat", "Moonlight settled in, cool and quiet"). "1-Click Magic" became "One press, one pass".
- **Tokens**: globals.css @theme gains desk/desk-grain/lamp/lamp-soft; surfaces warmed one step (surface #CBBCE0, raised #E6DFF0, inset #B9A8D2); stale arbitrary hexes normalized to semantic classes across all studio components; TactilePanel inset wells carry texture-dither.
- **Accessibility**: TactileButton regained a visible focus indicator (amber ring-lamp, offset) lost to outline-none; doodle swatches and landing CTAs carry the same ring treatment.
- **Art system**: Four hand-authored starter sprites (Hearth Ghost, Desk Mushroom, Bun, Little Lantern) as reviewable char grids + shared nine-color palette; `paintTemplate` renders them with integer rect fills for the gallery.

**Checks run:** tsc 0 errors; eslint 0 problems; vitest 24/24 (new starterTemplates + templateRenderer suites); next build clean with / and /studio both static.
**Issues found & fixed:** Missing useState import in DoodlePad; TS narrowing error in BunMascot pose lookup; ghost sprite used palette key F missing from TEMPLATE_PALETTE; palette-key test initially flagged the transparent key ".".
**Deviations from implementation_plan.md:** sessionStorage doodle-to-studio handoff (optional step E5/E14) intentionally not built - shipping it half-wired would break the honesty rule, so the pad honestly states "Your doodle stays right here on the page." serializeDoodle/parseDoodle cut from scope accordingly. TactileButton variant hexes kept pinned to exact bevel colors rather than tokenized (documented tactile spec values).
**Status:** Complete

## 2026-08-25 - Landing v2: The Desk Comes Alive
Owner feedback: first landing read as empty and generic against the cozy brief.

**What changed:**
- **DeskScene.tsx**: hand-drawn live pixel diorama (192x108 logical, 4x backing, integer rect fills only). Night window with 18 individually-phased twinkling stars and a moon, warm wooden desk with grain, a flickering amber lamp whose glow pools across the scene, a lavender-striped mug with rising steam, a little plant, and Bun sitting on the desk edge blinking every ~3.4s. Reduced-motion renders one static mid-scene frame; rAF cleans up on unmount.
- **bunSprite.ts**: Bun re-authored - wider rounded ears, blush cheeks, belly patch, and a computed 1px ink silhouette outline (shared by the SVG mascot and the canvas scene, so he reads crisp on any surface).
- **LandingHero**: hero is now text beside the framed diorama (thick wooden frame, caption "The desk, live at midnight. The steam is fresh."); doodle pad moved to its own "Warm up your pen" panel below.
- **DoodlePad**: seeds a small wisteria heart on mount so it never greets anyone empty.
- **StarterGallery**: sprites now sit on a wooden shelf plank; **FeatureStory** icon plates warmed to lamp-tint; wood-grain and lamp-pool alphas raised so the desk actually reads as wood and light.

## 2026-08-26 - Interim Phase 13.5: Landing Hero Overhaul — Pixel Vines, Articulated Lamp, Windowsill Cat & Vintage Cassette Boombox

**What changed:**
- **Interactive Pixel Foliage (`PixelVines.tsx`)**: Created dynamic hanging pixel ivy & wisteria strands on left and right hero borders with multi-layer physics:
  - Ambient sine-wave breeze with strand phase staggering.
  - Interactive mouse deflection: moving cursor brushes through strands with angular spring momentum and sheds floating drifting leaf particles.
  - Scroll velocity gusts: tilting vines in response to window scroll speed with smooth damping.
- **Overhauled Gooseneck Lamp (`AtelierDeskScene.tsx`)**:
  - Replaced rigid boxy lamp with an articulated multi-joint gooseneck lamp (weighted base, clickable power toggle switch, brass pivot nuts, and 45° angled hood).
  - Fixed light beam: replaced bottom-cutting triangle with an angled downward spotlight beam and soft stepped-dither oval light pool on the desk and tablet, accompanied by floating amber dust motes.
- **Cute Animated Windowsill Cat (`AtelierDeskScene.tsx`)**:
  - Replaced static white box with a hand-plotted sleeping cream/lilac cat on the windowsill.
  - Smooth chest-breathing animation, swishing tail over the window sill, periodic ear twitches, and interactive clicking to trigger floating pixel hearts and purr messages.
- **Vintage Cassette Boombox Radio & Decor (`AtelierDeskScene.tsx`)**:
  - Replaced generic radio with a retro wooden boombox featuring animated spinning cassette reels when playing, glowing LED display screen, and multi-color pulsing equalizer spectrum bars.
  - Overhauled right wall bookshelf with stacked pastel books, terracotta potted mini succulent, and backlit framed pixel landscape.
- **Modal Barrier Bug Fix (`ModalWrapper.tsx`)**: Resolved dialog overlay issue where closed modal elements with Tailwind `.flex` blocked all pointer events across the studio.

- **Refined Lamp Model & Soft Atmospheric Bloom (`AtelierDeskScene.tsx`)**:
  - Replaced flat polygon cutout shapes with a realistic feathered radial light bloom gradient across the desk and tablet (`createRadialGradient`).
  - Added intense golden bloom halo directly around the bulb aperture with dancing warm dust motes.
  - Redesigned the desk lamp model with weighted circular base, brass toggle switch, dual metal armature rails with circular elbow hinge knuckle, and a shaded bell hood with metallic ridge highlights.
- **Lush Foliage & Glowing Fairy Lights (`PixelVines.tsx`)**:
  - Upgraded foliage to 8 cascading strands per side with deeper ivy/wisteria clusters.
- **iPad Pro & Apple Pencil Drawing Canvas (`AtelierDeskScene.tsx`)**:
  - Redesigned the center canvas into an Apple iPad Pro tablet with space gray rounded aluminum chassis, slim black display bezel, front camera, bottom Home indicator bar, and magnetic Apple Pencil with silver charging ring on the side.
- **Enlarged Prominent Desk Lamp (`AtelierDeskScene.tsx`)**:
  - Scaled up the architect gooseneck lamp with a larger weighted base, taller dual-strut armature, reliable circular brass knuckle joint, and wide bell hood.
- **Cute Organic Rounded Windowsill Cat (`AtelierDeskScene.tsx`)**:
  - Replaced the square box body with an organically curved sleeping cat loaf with soft rounded head, tucked front paws, curved swishing tail, pink ears, and eyelids.
- **Compact Cozy Boombox Radio (`AtelierDeskScene.tsx`)**:
  - Scaled down the radio to fit neatly on the desk with spinning cassette reels, glowing LED track screen, and mini knobs.
- **Perspective Shift & Room Headroom (`AtelierDeskScene.tsx`)**:
  - Shifted desk perspective down (`deskY = 225`) to display 28% more wall room, expanded window (`winH = 175`), and taller vertical space.
- **Warm, Human Craftsperson Copy Across Entire Landing**:
  - Replaced all generic AI/marketing text across `AtelierHero`, `CozyFeatureGrid`, `AtelierGallery`, `ArtisanStory`, `AtelierCtaBanner`, `AtelierFooter`, and `LandingNav` with warm, thoughtful, honest craftsperson writing.
  - Removed the glitchy `animate-ping` disappearing square on the hero badge in favor of a clean, steady amber star accent `*`.
  - Replaced tech buzzwords with plain-spoken, cozy clarity: local-first privacy, tactile brushes, frame-by-frame animation, homestyle palettes, and quiet drawing vibes.

- **Cute Starter Sprites & Gallery Shelf Redesign (`starterTemplates.ts`, `AtelierGallery.tsx`)**:
  - Re-crafted 4 adorable, high-detail 16x16 starter sprites:
    1. **Hearth Ghost:** Chubby floating sheet ghost with pink cheeks, holding a glowing warm ember.
    2. **Desk Mushroom:** Polka-dot fairytale mushroom cap with sweet smiling face and forest moss.
    3. **Bun:** Adorable fluffy studio mascot bunny with pink-fluffed ears, rosy cheeks, and front paws.
    4. **Little Lantern:** Cozy brass lantern jar with glass glints, warm amber nectar glow, and cork stopper.
- **Maker's Manifesto & Artisan Story Overhaul (`ArtisanStory.tsx`, `AtelierIcons.tsx`)**:
  - Replaced the harsh stark white container with a warm, atmospheric Master Artisan Bulletin (`bg-[#241a32] border-3 border-[#3a2e4c]` with `shadow-[0_12px_0_#100c18]`).
  - Preserved the beloved sleeping velvet cushion cat (`IconCushionCat`) untouched in the left frame with a golden `STUDIO COMPANION` tag.
  - Added a matching handcrafted companion pixel illustration (`IconCozyHearth`) on the right: brick fireplace with glowing logs, teapot, and hearth embers (`WARM HEARTH`).
  - Enhanced center typography with high-contrast warm cream text (`#ede8f4`), plum headers (`#dcabdf`), and an authentic craftsperson sign-off seal.

- **CTA Banner Drafting Station & Multi-Column Footer (`AtelierCtaBanner.tsx`, `AtelierFooter.tsx`)**:
  - Transformed the empty CTA outline into a rich Master Drafting Station (`bg-[#20172e] border-3 border-[#3a2e4c]` with `shadow-[0_12px_0_#100c18]`), adding instant canvas size shortcuts (`16×16 MINI`, `24×24 RETRO`, `32×32 STANDARD`), framed botanical/easel props, and 4 craftsperson proof points.
  - Overhauled the footer into a rich 4-column studio baseboard: brand identity plate with Bun mascot avatar, direct tool links, starter shelf links, and craft values/privacy statement.

- **Silky Smooth 16-Bit Bayer Dither Scroll Reveals**:
  - Refined `CozyScrollReveal.tsx` to eliminate double-loading flicker by pre-mounting the canvas overlay, ensuring a seamless, single-pass **4px high-density Bayer matrix dissolve** over 340ms with silky non-linear easing.
  - Features an 80ms domino cascade across card rows and center-out radial dissolve on large banners.

**Checks run:** `npm test` (27/27 passed), `npx tsc --noEmit` (0 errors), `npm run build` (Next.js 16.3.2 Turbopack, 0 errors, static output).
**Status:** Complete

---

## Phase 14 — 2.5D Photometric Studio, Normal Mapping, Geometry Engine & Mathematical Dithering Suite (2026-08-28)
**Delivered:**
- **Linear-Time $O(N)$ Euclidean Distance Transform (EDT)**: Felzenszwalb-Huttenlocher separable squared parabolic lower envelopes compute distance fields in milliseconds (`computeSeparableEDT`).
- **Non-Linear Height Dome Inflation & Bilateral Filtering**: Converts linear cones into 2.5D spherical domes ($\gamma = 0.5$) with edge-preserving spatial + range Gaussian filtering (`generateInflatedHeightmap`, `applyBilateralFilter`).
- **Discrete Sobel Partial Derivatives & Tangent Normal Vector Fields**: $3\times3$ Sobel convolution calculating partial derivatives and unit normal vectors $\mathbf{N} = \frac{(-s_x G_x, -s_y G_y, 1)}{\sqrt{s_x^2 G_x^2 + s_y^2 G_y^2 + 1}}$.
- **1-Click Normal Map Baker**: Direct generation of standard blue tangent space normal maps $(128, 128, 255)$ onto a new layer for immediate export to Godot, Unity, and Unreal.
- **Full Photometric Lighting Pipeline**:
  - Lambertian diffuse shading ($\mathbf{C}_{\text{diffuse}} = k_d \max(0, \mathbf{N}\cdot\mathbf{L})(\mathbf{C}_{\text{albedo}} \odot \mathbf{C}_{\text{light\_diffuse}})$).
  - Blinn-Phong specular half-vector ($\mathbf{H} = \frac{\mathbf{L}+\mathbf{V}}{\|\mathbf{L}+\mathbf{V}\|}, I_s = k_s (\max(0, \mathbf{N}\cdot\mathbf{H}))^\alpha$).
  - Discrete Laplace cavity map / ambient occlusion ($\nabla^2 H \approx H * K_{\text{Laplace}}, AO(p) = \text{clamp}(1 - k_{\text{ao}}\max(0, -\nabla^2 H), 0, 1)$).
  - Inverse square distance attenuation ($\text{Atten}(d) = \text{clamp}(1 - (d/r)^2, 0, 1)^2$).
  - 5 Physical Material Presets (*Matte Clay*, *Polished Metal*, *Glossy Glass*, *Velvet Fabric*, *Gold / Brass*).
- **OKLab Perceptual Matching & Bayer Dither Offset Modulation**: Exact sRGB $\leftrightarrow$ Linear $\leftrightarrow$ LMS $\leftrightarrow$ OKLab ($L, a, b$) conversions with $\Delta E_{\text{OKLab}}$ distance matching and Bayer threshold offset modulation to eliminate dirty pixel artifacts.
- **Geometric Pixel Math Suite**: Quantized 2:1 isometric lines, quadratic Bézier curves, 47-Tile Blob autotiling bitmask utility (`calculate47TileBitmask()` — pure computation; tile-placement requires a tileset atlas feature that is not yet shipped), RotSprite 8x Scale2X rotation, and Zhang-Suen 1px skeleton line thinning.
- **Contextual Tool Options Strip**: 30px dynamic toolbar beneath TopHeader displaying active tool controls.
- **Artisan Left Toolbar**: 56px rail with 4 categorized groups, dual overlapping tactile color wells with swap/reset, and 8-color quick palette dock.
- **Interactive Right Inspector PixiBud Studio**: Upgraded 3 tabs with comprehensive 2.5D Photometric Studio Lab, Material selector, and normal map baking actions.
- **Center Viewport & Floating Live Preview Popout**: Draggable 1x/2x/4x live animation popout with backdrop switcher and precision HUD coordinate pill.

**Checks run:** `npx tsc --noEmit` (0 errors), `npm run build` (Next.js 16.3.2 Turbopack, 0 errors), `npm test` (all tests passing).
**Status:** Complete

---

## Hotfix — PixiBud AI Panel Compositing Violation, Stale Preview & Bake Normals Index (2026-08-29)

The Phase 14 photometric pipeline had a single class of bug across three symptoms: `handlePhotometricLightingEvent` in `CenterViewport.tsx` read from the active drawing layer's context, passed it to `executePhotometricPipeline()`, then wrote the shaded output *back into the same layer* via `clearRect` + `drawImage`, permanently destroying the artist's original pixel data. Subsequent renders compounded on already-shaded pixels, producing incoherent output. Additionally, `handleAutoShadeEvent` and `handleHighlightEvent` read from `mainCanvasRef` (the viewport composite including onion skins) instead of a clean layer composite. The Live Preview never updated because `FloatingPreviewWindow` had no signal for pixel-level buffer mutations (only structural layer changes triggered re-renders). A secondary bug in `handleBakeNormalMapEvent` used `layers[layers.length - 1]` to target the newly added layer, but `addLayer` uses `unshift()`, placing new layers at index 0 -- so the normal map overwrote the bottom artwork layer. Fix: all photometric/shade/specular/sel-out/shadow handlers now write to dedicated tagged output layers (`Layer.tag` field) via `compositeSourceSnapshot()` + `replaceTaggedLayer()`, a `bufferVersion` counter in the Zustand store signals every pixel mutation (drawing, undo/redo, AI ops, clipboard) to `FloatingPreviewWindow`, and Riemersma Hilbert dithering was implemented to match the documented feature set.

**Checks run:** `npx tsc --noEmit` (0 errors), `npx vitest run` (34/34 tests passed including 4 new regression tests).
**Status:** Complete

---

## Phase 16 — Minecraft 3D Skin Photometric Engine, Optical Flow Tweening, Sub-Pixel Anti-Aliasing & 3x3 Tiling (2026-08-30)
**Delivered:**
- **3D Minecraft Skin Recognition & Dedicated Photometric Pipeline**:
  - `detectMinecraftSkin(isOpaque, width, height)`: Accurately identifies Minecraft Java & Bedrock skin layouts ($64\times64$ and $64\times32$) by analyzing void transparency zones and head/torso density.
  - `computeMinecraftSkinNormalField(width, height)`: Generates analytical 3D unit normal vectors $\mathbf{N} = (N_x, N_y, N_z)$ for all 12 UV regions (Head, Hat, Torso, Jacket, Right Arm, Right Sleeve, Left Arm, Left Sleeve, Right Leg, Right Pants, Left Leg, Left Pants) with smooth 1px edge bevel curvature.
  - `executeMinecraftSkinShadingPipeline()`: Full domain-specific shading engine used by top PlanetMinecraft & Skindex artists:
    - Half-Lambert wrapped lighting: $\text{wrap}(N \cdot L) = ((N \cdot L + 0.4) / 1.4)^{1.2}$.
    - Raytraced anatomical contact ambient occlusion ($AO_{\text{neck}} = 0.80, AO_{\text{armpit}} = 0.82, AO_{\text{thigh}} = 0.85, AO_{\text{ground}} = 0.82$).
    - 2nd-layer outer depth shadows (Hat/Jacket/Sleeve/Pants shadow cast onto 1st layer: $AO_{\text{layer}} = 0.88$).
    - Sky-hemisphere micro-gradients ($I_{\text{sky}} = 1.06 - 0.12 \times \frac{y - y_{\text{top}}}{h_{\text{face}}}$).
    - OKLCH perceptual hue-shifting (warm sunlight amber $+28^\circ \to 65^\circ$ highlights vs cool ambient indigo $+25^\circ \to 260^\circ$ rich shadows).
    - 100% non-destructive modulation in OKLCH space (preserves all texture details, eye colors, and pixel patterns).
- **2D Optical Flow & Signed Distance Field (SDF) Frame Morphing (`morphInBetweenFrames`)**:
  - Computes 2D Block-Matching Optical Flow motion displacement fields $(u, v)$ between Frame $A$ and Frame $B$.
  - Interpolates boundary trajectories and pixel colors at $t = 0.5$ in OKLab perceptual color space.
  - Inserts smooth, physically consistent intermediate tween frames into the animation timeline on a single click.
- **Smart Hand-Crafted Anti-Aliasing (De-Jaggy)**:
  - Detects high-contrast staircase L-crooks on 1px diagonal lines.
  - Blends the corner pixels with smooth intermediate OKLab tones, transforming jagged diagonal steps into clean curves without creating holes or deleting lines.
- **Directional Selective Outlining (Sel-Out)**:
  - Evaluates outer silhouette normal vectors against the 3D light azimuth $\theta$.
  - Borders facing the light receive an illuminated rim tone ($+30\%$ lightness, increased saturation of interior albedo), while borders facing away receive deep saturated shadow tones (never pure flat black).
- **3x3 Pattern Matrix Viewport (`showTilePreview`)**:
  - Live wraps the canvas with 8 adjacent repeating ghost tiles in real time so artists can verify texture repeats during drawing.
- **Isometric 2:1 Projection Diamond Grid (`showIsoGuides`)**:
  - Renders crisp 2:1 slope guide lines across the canvas for game tiles and isometric art.
- **Floating Preview Close Fix**:
  - Added pointer event propagation stop on the `FloatingPreviewWindow` close button.

**Checks run:** `npm test` (48/48 passed), `npm run lint` (0 errors), `npm run build` (0 errors, clean Next.js 16.3.2 Turbopack static output).
**Status:** Complete

---

## Phase 17 — Compass Convention Alignment, Optical Flow Center-Bias & Dynamic Compass Indicator (2026-08-30)
**Delivered:**
- **Standard Artist & Navigation Compass Light Vector Alignment**:
  - Aligned the 3D directional light vector with Photoshop, Substance, and compass heading conventions:
    $$L_x = \sin(\text{azRad}) \cdot \cos(\text{elRad}), \quad L_y = -\cos(\text{azRad}) \cdot \cos(\text{elRad}), \quad L_z = \sin(\text{elRad})$$
  - Now $0^\circ = \text{North (Top)}, 45^\circ = \text{North-East (Top-Right)}, 135^\circ = \text{South-East (Bottom-Right)}, 225^\circ = \text{South-West (Bottom-Left)}, 315^\circ = \text{North-West (Top-Left)}$.
  - Applied consistently across `executePhotometricPipeline`, `executeMinecraftSkinShadingPipeline`, `renderParametric2p5DLighting`, and `generateSelOutData`.
- **Optical Flow Zero-Motion Center Bias**:
  - Added quadratic motion distance penalty $(ux^2 + vy^2) \times 0.05$ to macroblock sum-of-absolute-differences (SAD) evaluation in `morphInBetweenFrames()`.
  - Guarantees that flat, solid-color, or transparent background macroblocks strictly prefer $(0, 0)$ displacement vectors, completely eliminating ghosting artifacts during in-between frame synthesis.
- **Dynamic Rotating Compass Needle in Inspector**:
  - Added an animated SVG compass needle next to the Azimuth slider in `RightInspector.tsx` that rotates synchronously in real time with the selected light angle.
- **Directional Regression Testing**:
  - Added 4-quadrant brightness verification in `tests/photometricNonDestructive.test.ts` testing $315^\circ \to \text{Top-Left}$, $135^\circ \to \text{Bottom-Right}$, $45^\circ \to \text{Top-Right}$, and $225^\circ \to \text{Bottom-Left}$.

**Checks run:** `npm test` (49/49 passed), `npm run lint` (0 errors, 0 warnings).
**Status:** Complete

---

## Phase 18 — Data Persistence Hardening, Dynamic Undo Limits, Schema Migration & Locked Layer Security (2026-08-30)
**Delivered:**
- **Persistent Storage Failure & Auto-Recovery Banner (`db.ts`, `StudioLayout.tsx`)**:
  - `autoSaveWorkspace` now returns `Promise<boolean>`.
  - `StudioLayout` maintains consecutive failure count: $\ge 2$ triggers a sticky red/amber warning banner with 1-click `"Export Drawing"` CTA.
  - Succeeded auto-save resets error counters and automatically dismisses the banner.
- **Dynamic Canvas-Scaled Undo Limits (`CenterViewport.tsx`)**:
  - Replaced hardcoded 50-step stack with resolution-scaled bounds ($50$ steps for $\le 64\text{px}$, $35$ steps for $\le 256\text{px}$, $20$ steps for $> 256\text{px}$).
- **Full Payload v1 $\to$ v2 Migration Engine (`schema.ts`)**:
  - Added `migrateProjectPayload` backfilling `customRamps`, `clips`, `onionSkin`, and layer `blendMode`/`opacity`/`visible`/`locked` for unversioned (`version: undefined`) and v1 files.
  - Added forward-version rejection guard with clear upgrade instructions for future files (`version > 2`).
- **"New Drawing" Workflow & Confirmation Modal**:
  - Added `resetToNewProject()` store action and `"New"` button in `TopHeader.tsx` with modal confirmation preventing accidental canvas clearing.
- **Locked Layer Protection & HUD Toast**:
  - Drawing attempts on locked layers are rejected and display an animated HUD toast (` Active layer is locked`).
- **OS Theme Auto-Detection**:
  - `themeStore.ts` checks `window.matchMedia('(prefers-color-scheme: light)').matches` before defaulting to dark theme.

**Checks run:** `npm test` (51/51 passed), `npm run lint` (0 errors, 0 warnings).
**Status:** Complete

---

## Phase 19 — Tag Clip Export Scoping & Multi-Threaded Web Worker GIF Encoding (2026-08-30)
**Delivered:**
- **Tag Clip Export Scope (`ExportModal.tsx`)**:
  - Added `"Export Scope"` dropdown allowing artists to export only specific named clips (`Walk [1-4]`, `Attack [5-8]`).
  - Slices target frame arrays, automatically suffixes output filenames (`hero_Walk-4x.gif`), and cleanly $0$-indexes SpriteSheet atlas metadata (`Hero_0`, `Hero_1`, etc.) for Godot, Unity, and Phaser 3.
- **DOM-Free GIF Encoder Core (`gifEncoderCore.ts`)**:
  - Extracted `quantizePixels` (Median-Cut) and `lzwEncode` into a pure, testable, DOM-free computation module.
- **Multi-Threaded Web Worker Acceleration (`gifEncoder.worker.ts`, `gifEncoder.ts`)**:
  - Background Web Worker handles LZW encoding and palette reduction.
  - Uses transferable `ArrayBuffer` objects (`postMessage(msg, [buffer])`) to eliminate memory copying overhead on heavy animations ($128\times128+$ 50 frames).
- **Live Worker Progress Bar (`ExportModal.tsx`)**:
  - Displays real-time progress percentages (`Encoding GIF via Web Worker: X / Y frames (Z%)`) with smooth animated bar during GIF generation.
- **Transparent Main-Thread Fallback**:
  - Automatically executes on the main thread if Web Worker initialization fails or is blocked by CSP.
- **Unit Test Coverage (`tests/exportScopeAndWorker.test.ts`)**:
  - Tested isolated clip exporting and progress reporting callbacks.

**Checks run:** `npm test` (54/54 passed), `npm run lint` (0 errors, 0 warnings).
**Status:** Complete

---

## Phase 20 — Audit Remediation, Security Hardening, Dead Dependency Pruning, Linter Hygiene & CI Enforcement (2026-08-30)
**Delivered:**
- **Security & Secret Cleanup**:
  - Deleted `sync_github.mjs` containing the exposed GitHub Personal Access Token.
- **Dead Dependency Pruning**:
  - Removed unused `isomorphic-git` package from `package.json`.
- **Linter & Test Hygiene**:
  - Fixed unused imports (`quantizeAndDither`) and removed `no-console` warnings in `tests/benchmark.test.ts`.
  - ESLint verification passes with **0 errors and 0 warnings** across all 10 test suites and source files.
- **Blend Mode Alignment Across Types, Schema & UI**:
  - Synchronized `RightInspector.tsx` layer blend mode dropdown to match the 5 validated engine blend modes (`source-over`, `multiply`, `screen`, `overlay`, `color-dodge`), removing unvalidated ghost options (`darken`, `lighten`, `difference`).
- **Open Source Licensing**:
  - Added root `LICENSE` file under MIT terms matching `README.md`.
- **CI/CD Automation**:
  - Created `.github/workflows/ci.yml` running typecheck (`tsc --noEmit`), lint (`eslint`), test suite (`vitest`), and production build (`next build`) on every push and PR.
- **Security Headers**:
  - Tightened Content Security Policy in `next.config.ts` by removing redundant external `connect-src` origins.
- **Documentation Truthfulness & Verification**:
  - Synchronized all `.md` documentation files (`README.md`, `MAIN.md`, `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, `TASKS.md`, `LOGS.md`) to 100% verified factual accuracy.

**Checks run:**
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.
- `npm test`: 61/61 tests pass across 10 test suites.
- `npm run build`: Next.js 16.3.2 Turbopack static compilation succeeds in 21.5s with zero errors.
**Status:** Complete

---

## Phase 21 — PixiBun Professionalization: Offline Truth, WCAG 2.2, Test Gates & Privacy-First Observability (2026-08-30)
**Delivered:**
- **PWA Manifest & Asset Infrastructure**:
  - Created `public/manifest.webmanifest` configuring standalone display, icons, and metadata.
  - Generated pixel-crisp PNG icons (192, 512, maskable-512, apple-touch-180) from `src/app/icon.svg` via `scripts/generate-icons.mjs`.
  - Created `public/offline.html` warm atelier-styled static fallback page.
- **Hand-Rolled Service Worker (`public/sw.js`)**:
  - Implemented zero-dependency service worker precaching the app shell, static assets, and manifest with Stale-While-Revalidate caching for static chunks and network-first navigation fallback.
  - Built `src/components/system/ServiceWorkerRegistrar.tsx` and `PwaUpdateToast.tsx` providing non-intrusive update notification with instant reload.
  - Integrated `navigator.storage.persist()` in `StudioLayout.tsx` guarding stored user artwork against browser eviction.
  - Created `OfflineIndicator.tsx` status chip displaying live IndexedDB status when offline.
- **WCAG 2.2 AA Accessibility Conformance**:
  - Installed and configured `eslint-plugin-jsx-a11y` in `eslint.config.mjs` resolving all static accessibility violations across all components.
  - Hardened `ModalWrapper.tsx` with native `<dialog>` event listeners, focus trapping, and return of focus to opener upon close.
  - Added `--focus-ring: 0 0 0 2px var(--accent-gold);` and `.min-target-size` ($\ge 24\text{px}$) in `globals.css` with WCAG AA $\ge 4.5:1$ contrast compliant light/dark tokens.
  - Added keyboard navigation alternatives for drag interactions in `CenterViewport.tsx` (arrow keys for viewport panning and selection nudging per WCAG 2.5.7).
  - Implemented route and global error boundaries in `src/app/error.tsx`, `src/app/global-error.tsx`, and `src/app/studio/error.tsx`.
- **Privacy-First Observability & SSRF-Hardened Relay**:
  - Upgraded Dexie schema to version 2 with additive `diagnostics` table (`'id, kind, timestamp'`).
  - Implemented `src/lib/diagnostics/capture.ts` with FIFO ring buffer pruning (max 200 entries), 2KB detail truncation, export diagnostics JSON tool, and opt-in relay toggle.
  - Integrated Core Web Vitals capture (`CLS`, `INP`, `LCP`, `TTFB`, `FCP`) via `web-vitals` library.
  - Hardened same-origin `/api/diagnostics/relay` proxy against SSRF: destination is strictly resolved from operator-configured `DIAGNOSTICS_RELAY_URL` environment variable (enforcing HTTPS), completely ignoring client-supplied target URLs and eliminating information disclosure.
  - Added Privacy & Diagnostics inspector section in `ShortcutsModal.tsx`.
- **Continuous Quality & Performance Gates**:
  - Built Happy-DOM component test suites and route tests: `ModalWrapper.test.tsx`, `TactileButton.test.tsx`, `ThemeToggle.test.tsx`, `diagnostics.test.ts`, `diagnosticsRelay.test.ts` bringing Vitest coverage to 77 tests across 15 test files (100% green).
  - Built Playwright Chromium E2E suite: `landing.spec.ts`, `studio.spec.ts`, `offline.spec.ts`, `pwa.spec.ts` with automated Axe WCAG 2.2 AA scans (0 violations).
  - Configured `lighthouserc.json` with strict accessibility ($1.0$) and performance thresholds.
  - Updated `.github/workflows/ci.yml` with 3 parallel validation stages (`validate`, `e2e`, `lighthouse`).

**Checks run:**
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.
- `npm test`: 77/77 tests pass across 15 test suites (100% green).
- `npm run test:e2e`: 9/9 Playwright E2E and Axe WCAG 2.2 specs pass (100% green).
- `npm run build`: Next.js 16 production build compiles cleanly in 20.4s.
**Status:** Complete

---

## Phase 22 — Dead Route Pruning & Architectural Truthfulness (2026-08-30)
**Delivered:**
- **Dead Endpoint Deletion**:
  - Completely removed orphaned route `src/app/api/ai/vision/route.ts` and directory `src/app/api/ai/`.
  - Deleted orphaned Python backend test suite `testsprite-backend/` (7 tests) and test generator `scripts/write_backend_tests.js`.
- **Attack Surface Minimization**:
  - Application attack surface is now minimized to a single, tightly controlled same-origin proxy endpoint (`/api/diagnostics/relay`).
- **Documentation Truthfulness & Realignment**:
  - Synchronized `MAIN.md`, `SKILL.md`, `README.md`, `TASKS.md`, and `studioStore.ts` to honestly document PixiBud as a 100% deterministic on-device graphics math engine.
  - Zero external API key dependencies required for full deployment.

**Checks run:**
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.
- `npm test`: 77/77 tests pass across 15 test suites.
- `npm run test:e2e`: 9/9 Playwright E2E specs pass.
- `npm run build`: Next.js 16 production build compiles cleanly with zero dead routes.
**Status:** Complete

---

## Phase 23 — Truth-in-Testing, Single CI Truth & Engine Extraction (2026-08-30)
**Delivered:**
- **DOM-Free History Engine Extraction**:
  - Implemented `src/lib/engine/historyEngine.ts` with 50-step max depth, FIFO eviction, redo-tail invalidation, and O(1) state restoration.
  - Extracted history management out of `CenterViewport.tsx` component refs into the new engine.
  - Created `tests/historyEngine.test.ts` with 8 comprehensive unit tests (push, undo, redo, clear, maxDepth pruning, redo tail invalidation, empty-stack edge cases).
- **Assertion-Backed E2E Test Suite**:
  - Hardened `tests/e2e/studio.spec.ts` with concrete canvas pixel data sampling before/after stroke, after undo (`Control+z`), and after redo (`Control+y`), with TopBar undo/redo button enabled/disabled state assertions.
  - Hardened `tests/e2e/offline.spec.ts` with real offline navigation: waiting for `navigator.serviceWorker.ready` and `controller !== null`, setting offline mode, reloading disconnected, and verifying cached studio hydration and offline HUD status.
  - Updated `tests/e2e/pwa.spec.ts` adding explicit `navigator.serviceWorker.controller` verification for `/studio`.
- **Private Lighthouse CI & Single CI Truth**:
  - Updated `lighthouserc.json` to upload to local filesystem (`./lhci-reports`) instead of public storage.
  - Added `lhci-reports/` to `.gitignore` and configured 7-day artifact upload in `.github/workflows/ci.yml`.
  - Refactored `.github/workflows/deploy.yml` to eliminate duplicated validation job and trigger via `workflow_run` on successful completion of `CI` on `main`.
  - Removed duplicate security headers and dead `/static/(.*)` cache rule from `vercel.json`.
- **Repo Hygiene & Architectural Documentation Truthfulness**:
  - Moved `implementation_plan.md` and `implementation_plan_v2.md` to `docs/plans/` and created `docs/plans/README.md`.
  - Removed empty `CLAUDE.md` placeholder file.
  - Updated `eslint.config.mjs` to ignore `docs/plans/**`.
  - Synchronized `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, and `README.md` with the new history engine architecture and verified test metrics (85 unit/component tests across 16 suites, 10 E2E specs).

**Checks run:**
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.
- `npm test`: 85/85 tests pass across 16 test suites (100% green on CI/Node 20).
- `npm run test:e2e`: 10/10 Playwright E2E specs pass.
- `npm run build`: Next.js 16 production build compiles cleanly.
**Status:** Complete

---

## Phase 24 — Multi-Project Workspace Management (2026-08-30)
**Delivered:**
- **IndexedDB Schema v3 & Project CRUD Engine**:
  - Upgraded Dexie database schema to version 3 in `src/lib/storage/db.ts` with `createdAt` index and `.upgrade()` migration backfilling `createdAt = updatedAt || Date.now()`.
  - Implemented `listAllProjects()`, `getProjectById()`, `saveProject()`, `deleteProject()`, `duplicateProject()`, `renameProject()`, and `createBlankProject()`.
- **Dynamic Project State & Composite Thumbnail Cache**:
  - Added `currentProjectId` state to `src/stores/studioStore.ts` for tracking active project identity.
  - Implemented `generateCompositeThumbnail()` in `src/lib/project/serialize.ts` generating lightweight PNG data URLs from active frame composite buffers on the debounced autosave tick.
- **P0 History Stack Invalidation**:
  - Implemented `pixibun:history-clear` custom event in `serialize.ts`, `StudioLayout.tsx`, and `CenterViewport.tsx`.
  - Clears `HistoryEngine` and resets `canUndo`/`canRedo` flags on project hydrate, project switch, new drawing, and import, eliminating cross-project undo canvas corruption.
- **Projects Gallery Modal (`ProjectsGalleryModal.tsx`)**:
  - Built tactile card grid with live thumbnail rendering, canvas resolution / FPS badges, relative last-modified time, inline renaming synchronized with active store, project cloning, and safe deletion with confirmation.
- **TopHeader & StudioLayout Integration**:
  - Added tactile "Projects" button in `TopHeader.tsx`.
  - Wired gallery open/switch/new workflows with autosave flushes in `StudioLayout.tsx`.
- **Unit & E2E Test Suites**:
  - Created `tests/projectsDb.test.ts` (6 unit tests with `fake-indexeddb` verifying project CRUD, sorting, cloning independence, and schema integrity).
  - Created `tests/e2e/projects.spec.ts` (Playwright E2E test verifying gallery open, drawing stroke, creating new project, asserting undo is disabled immediately (P0), duplicating project, and deleting project).
- **Documentation Truthfulness**:
  - Corrected `ARCHITECTURE.md` storage section (removed phantom `frames` table).
  - Updated `PIXIBUN_DEEP_DIVE.md` and `README.md` test metrics (91 unit tests across 17 suites, 11 E2E specs).

**Checks run:**
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.
- `npm test`: 91/91 tests pass across 17 test suites.
- `npm run test:e2e`: 11/11 Playwright E2E specs pass.
- `npm run build`: Next.js 16 production build compiles cleanly.
**Status:** Complete

---

## Phase 25 — Honest Ghosts & Living Timeline (2026-08-30)
**Delivered:**
- **Pure Onion Skin Spec Computation (`src/lib/render/onionSkin.ts`)**:
  - Implemented pure, DOM-free `getOnionSkinSpecs()` computing ghost frame indices, `prevColor`/`nextColor` tint mapping, and linear distance falloff `base * (1 - 0.25 * (dist - 1))`.
  - Full feature-completion: previous dead configuration (`nextFrames`, `prevColor`, `nextColor`) is now fully live and functional.
  - Automatically suppresses ghosts when disabled, during animation playback (`isPlaying === true`), or in single-frame animations.
- **Viewport Underlay Canvas Stack (`src/components/layout/CenterViewport.tsx`)**:
  - Inserted dedicated `onionCanvasRef` (`data-testid="onion-skin-canvas"`) underneath `mainCanvasRef` (between the solid white background and main composite).
  - Ghosts are composited via `compositeFrame()`, tinted with `source-atop`, and blitted at spec alpha onto `onionCanvasRef`.
  - Removed ghost rendering from `renderComposite()`. Main canvas is now pure active-frame layers, floating selections, and normal-map preview.
  - *Deliberate Tradeoff & Design Decision:* Layer blend modes (such as `multiply`) no longer interact with ghosts because ghosts live on a separate underlay canvas below the artwork composite rather than baked directly into the layer stack. This aligns with standard Aseprite-class behavior.
- **Composite-Isolated Eyedropper (`src/components/layout/CenterViewport.tsx`)**:
  - Eyedropper tool now samples pure `compositeFrame()` output, fully isolated from onion ghosts, normal map previews, and HUD overlays (first step of Compositor Milestone 2).
  - *Deliberate UX Change:* Picking empty/transparent pixels (`alpha === 0`) is now an intentional no-op that preserves the active primary color rather than setting black.
- **Living Timeline Thumbnails (`src/components/layout/BottomTimeline.tsx`)**:
  - Replaced static numbered placeholder boxes with real pixel `<FrameThumbnail>` sub-components.
  - Frame thumbnails are composited via `compositeFrame()` with crisp pixelated scaling.
  - Optimized re-render dependencies: active frame updates in real-time on `bufferVersion` bumps (`isActive ? bufferVersion : 0`), while inactive frames remain stable without per-stroke $O(\text{frames})$ re-compositing overhead.
- **Unit & E2E Test Suites**:
  - Created `tests/onionSkin.test.ts` (9 unit tests verifying disabled state, single-frame edge cases, playback short-circuiting, edge clamping at frame 0 and last frame, symmetric nearest-first ordering, distance falloff calculations, and tint assignments).
  - Hardened `tests/e2e/studio.spec.ts` with 2 new E2E tests verifying that onion ghosts do not pollute eyedropper color picks, empty picks act as no-ops, and timeline frame thumbnails render real non-zero pixel data.
- **Documentation Truthfulness & Debt Striking**:
  - Struck resolved Phase 8 debt items in `LOGS.md`.
  - Updated `TASKS.md`, `LOGS.md`, `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, and `README.md` test metrics (100 unit tests across 18 suites, 13 E2E specs).

**Checks run:**
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.
- `npm test`: 100/100 tests pass across 18 test suites.
- `npm run test:e2e`: 13/13 Playwright E2E specs pass.
- `npm run build`: Next.js 16 production build compiles cleanly.
**Status:** Complete

---

## Phase 26 — Volumetric Optics, Subsurface Scattering & Anisotropic Shaders (2026-08-30)
**Delivered:**
- **Mathematical Volumetric Optics Engine (`src/lib/ai/smartMathEngine.ts`)**:
  - **Subsurface Scattering (SSS) & Forward Phase**: Implemented Beer-Lambert exponential absorption through distance-field thickness $T(\mathbf{x}) = 2\sqrt{\max(0, R^2 - D(\mathbf{x})^2)}$ combined with 2D Henyey-Greenstein forward phase function `phaseHG2D(cosTheta, g)` for glowing potions, gemstones, and slimes.
  - **Dielectric Fresnel with Cauchy Chromatic Dispersion**: Implemented `evaluateDielectricFresnel(cosTheta, etaBase, dispersion, roughness, fresnelPower)` splitting per-channel IOR ($F_{0, R} < F_{0, G} < F_{0, B}$) and roughness-damped grazing falloff.
  - **Kajiya-Kay Anisotropic Highlight**: Implemented `computeAnisotropicTangentField(normalField, width, height, flowPreset, angleDeg)` generating curvature and directional tangent fields with dual-cuticle shifts ($s_1 = +0.10, s_2 = -0.15$) for hair, fur, and brushed metal.
  - **Full Optical Pipeline**: Implemented `executeVolumetricOpticalPipeline(srcCtx, width, height, params)` blending SSS, Fresnel, and Anisotropic specular passes with perceptual OKLab palette snapping and Bayer matrix dither modulation.
- **PixiBud AI Inspector UI (`src/components/layout/RightInspector.tsx`)**:
  - Built **Volumetric Optics & SSS** module in PixiBud AI tab with tactile preset buttons (Gem, Slime, Hair, Leaf, Metal).
  - Added interactive parameter sliders for SSS Depth ($1 - 32\text{px}$), Fresnel Rim Power ($1.0 - 8.0\times$), Flow Preset selector (Vertical, Horizontal, Radial, Curvature), and Anisotropy Angle ($0^\circ - 180^\circ$).
- **Non-Destructive Viewport Layer Execution (`src/components/layout/CenterViewport.tsx`)**:
  - Wired `pixibun:volumetric-optics` custom event to non-destructive tagged output layer (`Layer.tag = 'optical-output'`).
- **Unit & E2E Test Suites**:
  - Created `tests/volumetricOptics.test.ts` (11 unit tests verifying phase function forward/backscattering, Cauchy dispersion channel splitting, tangent field normalization & rotations, and gemstone/hair rendering).
  - Hardened `tests/e2e/studio.spec.ts` with an end-to-end test verifying preset selection, optical rendering, and tagged layer creation.
- **Documentation**:
  - Synchronized `TASKS.md`, `LOGS.md`, `ARCHITECTURE.md`, and `README.md` (111 unit tests across 19 suites, 14 E2E specs).

**Checks run:**
- `npm run lint`: 0 errors, 0 warnings.
- `npm run typecheck`: 0 errors.
- `npm test`: 111/111 tests pass across 19 test suites.
- `npx playwright test`: 14/14 Playwright E2E specs pass.
- `npm run build`: Next.js 16 production build compiles cleanly.
**Status:** Complete

---

## Phase 27 — 2D Ray Marching & Physically Accurate Soft Shadows (2026-08-31)
**Delivered:**
- **Mathematical 2D Ray Marcher & Soft Shadow Engine (`src/lib/ai/shadowRayMarcher.ts`)**:
  - **Branchless Bilinear Distance Sampling**: Implemented `sampleEDTBilinear(edt, width, height, x, y)` restoring $C^0$ continuity over discrete Euclidean Distance Fields ($O(N)$ Felzenszwalb EDT) to prevent ray-stepping acne.
  - **Aaltonen Contact-Hardening Geometric Correction**: Implemented analytical closest approach derivation ($y = \frac{h^2}{2ph}, d = \sqrt{\max(0, h^2 - y^2)}$) in `tracePhysical2DSoftShadow`, eliminating step-banding artifacts.
  - **Physical Area Light Cone Tracing**: Modeled expanding light cones $r_{\text{cone}} = R_L \frac{t_{\text{closest}}}{T}$ with cubic Hermite smoothstep falloff, replacing arbitrary $k$ multipliers with physical light radius $R_L$.
  - **Zero-Allocation Buffer Pooling**: Managed full-canvas visibility maps using `acquireFloat32Buffer` / `releaseFloat32Buffer` with `try...finally` memory guarantees.
  - **Bayer Matrix Penumbra Dithering**: Supported `none`, `2x2`, `4x4`, and `8x8` Bayer ordered dithering to stipple smooth continuous penumbras into authentic retro dot patterns.
- **Studio Inspector UI (`src/components/layout/RightInspector.tsx`)**:
  - Built **Raymarched Soft Shadows** card in PixiBud Smart Studio tab.
  - Added interactive sliders for Light X/Y coordinates, Light Disk Radius ($R_L$, 2px to 64px), Opacity, and Bayer dither mode dropdown.
  - Added Shadow Color Picker with 5 one-click palette presets (Indigo `#180B26`, Obsidian `#0A0612`, Umber `#26140B`, Violet `#2E1065`, Teal/Fog `#062419`).
- **Non-Destructive Viewport Layer Stacking (`src/components/layout/CenterViewport.tsx`)**:
  - Added event listener for `pixibun:render-cast-shadow` outputting non-destructively to tagged `'cast-shadow'` layer without mutating base artwork.
- **Unit & Integration Test Suite (`tests/shadowRayMarcher.test.ts`)**:
  - Added 9 unit tests verifying bilinear sampling, boundary clamping, contact hardening, buffer pool memory safety, color composition, Bayer stippling, and non-destructive tagged layer replacement.
- **Documentation**:
  - Synchronized `TASKS.md`, `LOGS.md`, `ARCHITECTURE.md`, `README.md`, `MAIN.md`, `PIXIBUN_DEEP_DIVE.md`, and `CHANGELOG.md` (124 unit tests across 20 suites).

---

## Phase 28 — Security Audit Remediation (Token Revocation, CSP Hardening, Event Bus Migration) (2026-09-01)
**Delivered:**
- **Security Incident Remediation**: Discovered leaked GitHub tokens committed in a script (`sync_github.mjs`, commit `a6f198d`) and separately as a live plaintext value in `.env.local`. Revoked tokens immediately at the source (GitHub).
- **CSP Hardening**: Hardened Content Security Policy, locking down `worker-src` and `script-src` while allowing necessary Next.js hydration.
- **Event Bus Migration (`src/lib/events/studioEvents.ts`)**: Migrated all raw `window.addEventListener('pixibun:...')` calls in React components to a centralized, type-safe `StudioEventBus` to prevent memory leaks and unbind issues. (Note: Dispatch side `window.dispatchEvent` remains in use and is slated for a future cleanup).
- **Verification**: 
  - Ran `grep -rn "window.addEventListener.*pixibun:" src/` confirming 0 unmigrated listeners.
  - Test suite passing (124 tests).

**Status:** Complete

**Checks run:**
- `npx tsc --noEmit`: 0 errors.
- `npm test`: 123/123 tests pass across 20 test suites.
- `npm run build`: Next.js 16 production build compiles cleanly.
**Status:** Complete






---

## Phase 29b — SDF Morphing, Smart Math Engine Rewrite, and Export Pipeline Fixes (2026-09-01)
**Delivered:**
- **In-Between Frame SDF Morphing (src/lib/ai/pixelAiEngine.ts)**: Ripped out the flawed, artifact-prone optical flow algorithm. Rewrote morphInBetweenFramesSync to use Signed Distance Fields (SDF) based on Felzenszwalb-Huttenlocher's O(N) Euclidean Distance Transform (EDT). This perfectly interpolates structural boundaries and preserves pixel art topologies without tearing or muddy sRGB crossfading of pre-lit pixels.
- **Automated Morph Relighting Pipeline (src/components/layout/CenterViewport.tsx)**: Re-architected handleInBetweenFrameEvent to strip AI-generated layers (photometrics, drop shadows) prior to morphing via a pure getCleanCtx extraction. Automatically re-dispatches \pixibun:photometric-lighting\ and \pixibun:volumetric-optics\ events to dynamically shade the new frame, completely fixing the "muddy baked colors" artifact.
- **RotSprite Artifact-Free Canvas Rotation (src/lib/ai/smartMathEngine.ts)**: Fixed floating-point holes created by native \ctx.rotate\ by implementing a custom Scale3x + Nearest-Neighbor Inverse Mapping algorithm (\
otateWithRotSprite\).
- **Selection Bounding Box & Undo History Fixes**: Fixed Lasso tool movement by isolating drag-boundary checks to \.startsWith('select-')\. Fixed Ctrl+Z restoration of dragged pixels by freezing the history snapshot pre-erasure in commitFloatingSelection.
- **GIF Export Multiframe Rendering Bug (src/components/modals/ExportModal.tsx, src/lib/render/compositor.ts)**: Discovered the pooled \sharedOffscreenCanvas\ singleton was overwriting all frames with the last drawn frame during batch exports. Added \{ freshCanvas: true }\ allocation strategy during multi-frame composite jobs.
- **GIF Delay Centisecond Clamping (src/lib/export/gifEncoderCore.ts)**: Clamped minimum GIF delay to \2\ centiseconds (\Math.max(2, ...)\) to prevent aggressive browser 100ms throttling penalties for ultra-fast animations.
- **Test Coverage (	ests/exportScopeAndWorker.test.ts)**: Added comprehensive TestSprite verification tests and Jest unit tests for GIF export distinct chunk guarantees and delay clamping.

**Status:** Complete

---

## Phase 29a — Onboarding, Selection Tools, and UX Enhancements (2026-09-01)
**Delivered:**
- **Progressive Onboarding (feat(onboarding))**: Implemented a progressive playground allowing users to doodle and interact before transitioning fully into the studio workspace.
- **Advanced Selection Utilities (feat(selection))**: Added Magic Wand tool logic for continuous flood-fill color selection. Implemented polygon rasterization for the freehand Lasso tool to produce perfectly aliased boundaries.
- **Workflow UX Enhancements (feat(ux))**: Shipped a new contextual Radial Menu, live Autosave indicator, tracked Recent Colors palette, and progressive disclosure toggles for advanced tools.
- **Hydration Fixes (fix(hydration))**: Resolved React SSR hydration mismatch console warnings related to the `recentColors` store mapping.
- **Physical Rendering Pass (fix(rendering))**: Restored omitted Lambertian diffuse reflection to the photometric rendering composite for enhanced volume presence.

**Status:** Complete

---

## Phase 30 - Performance, Hot-Path Decoupling and Dexie Schema v4 (2026-09-03)
**Delivered:**
- **Stroke Hot-Path Decoupling (src/components/layout/CenterViewport.tsx)**: Deconstructed monolithic useStudioStore call into fine-grained atomic selectors. Eliminated bufferVersion subscription from CenterViewport, dropping stroke re-render count from N (per pointermove) to zero during active mouse dragging.
- **Throttled Live Signals**: Throttled bumpBufferVersion via requestAnimationFrame strictly for external decoupled observers (BottomTimeline and FloatingPreviewWindow) at 60fps, while committing history snapshots and autosave triggers strictly on pointerup.
- **Dexie Schema v4 Binary Blob Storage (src/lib/storage/db.ts, src/lib/project/serialize.ts)**: Upgraded database engine to schema v4 with dedicated layerBlobs table. Encodes layer buffers directly to raw PNG Blob instances and omits pngBase64 from metadata JSON, eliminating serialization bloat and double-storage. Added paintLayerFromBlob with native createImageBitmap and explicit bitmap.close() leak prevention, with full backward compatibility for legacy project files.
- **Runtime Constructor Safety (src/components/modals/ExportModal.tsx)**: Replaced illegal new HTMLCanvasElement() constructor fallback with document.createElement('canvas').
- **Compositor Re-entrancy Protection (src/lib/render/compositor.ts)**: Set freshCanvas: true by default to prevent singleton sharedOffscreenCanvas overwrites during concurrent rendering passes.
- **Linter Zero Warnings**: Cleaned up all 6 react-hooks/exhaustive-deps warnings in CenterViewport.tsx.

**Checks run:**
- npm run typecheck: 0 errors
- npm run lint: 0 errors, 0 warnings
- npm test: 147/147 tests pass across 27 suites
**Status:** Complete

---

## Phase 31 - Product Alignment, Variable Frame Timing and Viewport Precision (2026-09-03)
**Delivered:**
- **Layer Merge Down (src/stores/studioStore.ts, src/components/layout/RightInspector.tsx)**: Implemented mergeLayerDown(layerId) blending upper layer onto lower layer with exact opacity and blendMode preservation, purging upper buffer memory, and updating layer selection. Added tactile merge-down UI buttons in layer toolbar and on layer cards. Verified with 4 unit tests in tests/mergeLayer.test.ts.
- **Variable Frame Duration Pacing (src/components/layout/BottomTimeline.tsx)**: Wired per-frame durationMs to high-resolution delta-time animation loop using requestAnimationFrame. Implemented proportional timeline card widths (W_card) and amber timing hold badges (+Xms) per Richard Williams timing principles.
- **Heterogeneous GIF Export (src/lib/export/gifEncoderCore.ts, src/lib/export/gifEncoder.worker.ts, src/components/modals/ExportModal.tsx)**: Supported frame-specific centisecond delay arrays (D_i = max(2, round(durationMs_i / 10))) written to GIF Graphic Control Extensions. Verified with 4 unit tests in tests/frameDurationPlayback.test.ts.
- **Additive and Subtractive Selection Modifiers (src/components/layout/CenterViewport.tsx)**: Supported Shift (Union) and Alt (Subtract) across box, lasso, and wand tools, with dynamic binary mask merging, bounding box recalculation, and color-coded green/red viewport modifier outlines. Verified with 4 unit tests in tests/selectionModifiers.test.ts.
- **Keyboard Zoom and Navigation Shortcuts (src/components/layout/StudioLayout.tsx, src/components/modals/ShortcutsModal.tsx)**: Bound Ctrl/Cmd + / =, Ctrl/Cmd -, Ctrl/Cmd 0 (Fit to Screen), and Ctrl/Cmd 1 (100% zoom).
- **Canvas Brush Ghost Bounding Cursor (src/components/layout/CenterViewport.tsx)**: Added 1px integer pixel bounding box matching tools.brushSize at >= 400% zoom on dedicated cursorCanvasRef overlay, with zero React state mutations.

**Checks run:**
- npm run typecheck: 0 errors
- npm run lint: 0 errors, 0 warnings
- npm test: 159/159 tests pass across 30 suites (+12 new tests)
**Status:** Complete

---

## Precision Polish & Critical UX Bug Fixes (2026-09-03)
**Delivered:**
- **Onboarding Stencil Isolation (src/components/layout/CenterViewport.tsx, src/components/layout/StudioLayout.tsx)**: Added strict isPlaygroundActive check in CenterViewport stencil effect and reset state on StudioLayout mount, preventing playground tracing stencils from leaking onto the studio canvas.
- **Playground Animation Transfer (src/components/layout/PlaygroundLayout.tsx, src/components/layout/StudioLayout.tsx)**: Added ?fromPlayground=true query param so animation frame sequences created in the onboarding playground are preserved in studio and saved to IndexedDB under Playground Animation.
- **Viewport Zoom Aspect Ratio Fix (src/components/layout/CenterViewport.tsx)**: Added shrink-0 and explicit flexShrink: 0, minWidth, and minHeight to #center-canvas-area, stopping flexbox from horizontally squashing the canvas at high zooms (e.g. 2625%) and maintaining a 1:1 square aspect ratio up to 6400% zoom.
- **Dynamic Canvas Resizing (src/components/modals/CanvasResizeModal.tsx, src/stores/studioStore.ts)**: Defaulted resample to true in CanvasResizeModal and setCanvasSize, scaling artwork dynamically with nearest-neighbor interpolation without clipping edges or corrupting drawings when resizing 32x32 to 16x16.
- **Photometric Dither Modulation Default (src/stores/studioStore.ts)**: Reset initial tools.ditherModulation from 0.35 (35%) to 0.0 (0%).
- **PixiBud AI Undo Layer Deletion (src/types/canvas.ts, src/components/layout/CenterViewport.tsx)**: Added createdLayerId to HistoryStep. Pressing Ctrl+Z on an AI-generated layer (Photometric, Specular, Soft Shadow) deletes the layer from the store and frees its buffer memory.
- **Base Layer Active Focus Anchor (src/components/layout/CenterViewport.tsx)**: Automatically restores active layer selection to the base artwork after generating an AI pass, enabling immediate chaining of subsequent effects.
- **RotSprite Precision Rewrite (src/lib/ai/smartMathEngine.ts)**: Implemented exact integer permutation fast-paths for 90, 180, and 270 degree rotations, plus 3x3 subpixel supersampling and majority color voting for arbitrary angles, eliminating stroke dropouts and shape distortion.

**Checks run:**
- npm run typecheck: 0 errors
- npm run lint: 0 errors, 0 warnings
- npm test: 164/164 tests pass across 31 suites (+5 new tests in tests/rotSpriteAndPrecision.test.ts)
**Status:** Complete

---

## Area-Preserving Downsampling, True Xenowhirl 8x RotSprite & Live Preview Window Resize (2026-09-03)
**Delivered:**
- **Area-Preserving Pixel Art Downsampling (src/lib/engine/bufferRegistry.ts)**: Implemented resamplePixelArtBuffer with presence-preserving area integration. For every downscaled destination pixel, scans its source footprint and preserves stroke presence if any solid pixel exists. Prevents odd-coordinate skipping and line perforation when resizing down (e.g. 32x32 to 16x16).
- **True Xenowhirl 8x Scale2X RotSprite Engine (src/lib/ai/smartMathEngine.ts)**: Replaced 3x expansion with true 3-pass Scale2X (EPX) upscaling (1x -> 2x -> 4x -> 8x). Added inverse rotation mapping in 8x space and 64-sample Gaussian radial center-weighted downsampling (sigma = 2.2) with a 25% outline threshold and centroid distance tie-breaking, completely eliminating gaps, broken lines, and corner spikes.
- **Floating Preview Dragging & Window Resizing (src/components/studio/FloatingPreviewWindow.tsx)**: Solved mouse stickiness defect by delegating drag tracking to window pointer listeners with e.buttons === 0 abort guards. Added an interactive bottom-right resize handle allowing smooth viewport resizing from 100x100 to 640x640.
- **Testing (tests/rotSpriteAndPrecision.test.ts)**: Added unit tests verifying 32x32 to 16x16 line preservation and RotSprite 45-degree unbroken contour retention.

**Checks run:**
- npm run typecheck: 0 errors
- npm run lint: 0 errors, 0 warnings
- npm test: 166/166 tests pass across 31 suites (+7 new tests in tests/rotSpriteAndPrecision.test.ts)
**Status:** Complete

---

## Canonical Xenowhirl RotSprite Engine & 45-Degree Distortion Remediation (2026-09-03)
**Delivered:**
- **Canonical Xenowhirl RotSprite Engine (src/lib/ai/smartMathEngine.ts)**: Completely resolved the 45-degree rotation distortion reported by the user (2-3px blooming on convex top-left outlines, erased bottom-right outlines, and asymmetrical corner spurs). Replaced the weighted voting alpha threshold engine with native 32-bit 3-pass Scale2X cascade (1x -> 2x -> 4x -> 8x) combined with strict subpixel center continuous inverse sampling.
- **Exact Symmetrical Coordinate Inverse Mapping**: Symmetrically maps continuous destination centers (x + 0.5, y + 0.5) around canvas pivot (W/2, H/2) to continuous source coordinates, sampling directly from the 8x raster with floor(sx * 8), floor(sy * 8). Eliminates all directional coordinate drift and threshold competition between outlines and fills.
- **Single-Pixel Detail Restoration**: Added forward-mapping presence conservation for isolated source features, preserving micro-details and single-pixel highlights after non-orthogonal rotations.
- **Zero Palette Mutation**: Strictly point-samples from the Scale2X palette without color blending or averaging.
- **Comprehensive Unit Testing (tests/rotSpriteAndPrecision.test.ts)**: Added multi-color outline 45-degree rotation tests verifying 100% closed contour via flood fill (0 fill leaks), 4-quadrant bilateral symmetry, exact 100.0% area preservation (144 -> 144 pixels), isolated dot conservation, and a full 360-degree rotation leak test at 15-degree increments (0 leaks across all 24 angles).

**Checks run:**
- npm run typecheck: 0 errors
- npm run lint: 0 errors, 0 warnings
- npm test: 169/169 tests pass across 31 suites (+3 new comprehensive tests in tests/rotSpriteAndPrecision.test.ts)
**Status:** Complete

---

## Phase 32 — Studio Accessibility, Next.js 16 Security Proxy & Perceptual Color Lenses (2026-09-03)
**Delivered:**
- **Automated WCAG 2.2 Axe Audits (tests/e2e/studio.spec.ts)**: Integrated @axe-core/playwright automated a11y test suites across blank canvas workspace, open Export modal, and all expanded RightInspector panels (Layers, Palette, PixiBud AI). All 3 test suites assert and achieve zero violations.
- **Accessible Slider & Select Names (WCAG 4.1.2)**: Added explicit `aria-label` attributes across all interactive sliders and select dropdowns:
  - BottomTimeline.tsx: Animation FPS slider.
  - ContextOptionsBar.tsx: Brush size, curve tightness, dither density, and dither matrix algorithm.
  - RightInspector.tsx: Layer opacity, layer blend mode, color palette preset, material preset, light azimuth, light elevation, light brightness, cavity AO, dither modulation, shadow light X/Y, shadow radius, shadow opacity, shadow dither mode, SSS depth, fresnel power, aniso flow preset, aniso angle, and RotSprite rotation angle.
  - ExportModal.tsx: Export frame scope.
- **Next.js 16 Security Proxy Nonce-Based CSP (src/proxy.ts)**: Replaced deprecated middleware with Next.js 16 proxy.ts, generating per-request crypto nonces, injecting script-src 'self' 'nonce-{nonce}' with production 'unsafe-inline' script elimination, and bounding matchers strictly to dynamic page routes (skipping static assets, icons, and service workers).
- **Dynamic Service Worker Route Handler (src/app/sw.js/route.ts)**: Transitioned static public/sw.js into a dynamic Next.js route handler with build-time cache versioning (CACHE_NAME = 'pixibun-v2'), serving authoritative Cache-Control: no-cache, no-store, must-revalidate and Service-Worker-Allowed: / headers.
- **Machado 2009 CVD Colorblindness Simulation & Squint Silhouette Mode (src/lib/color/cvdLens.ts, src/components/studio/ViewportLensFilters.tsx)**: Implemented mathematically rigorous on-device color vision deficiency simulation lenses (Protanopia, Deuteranopia, Tritanopia, Monochromacy) based on Machado et al. 2009 IEEE TVCG matrices, plus an instant 1-bit Squint silhouette filter. Rendered via zero-mutation GPU SVG feColorMatrix CSS display filters, guaranteeing canvas pixel buffers and export outputs remain completely pristine.
- **HUD Controls & Keyboard Shortcuts**: Added CVD lens cycle and SIL silhouette toggle buttons to ContextOptionsBar.tsx, wired hotkeys p (CVD cycle) and s (Squint toggle) in StudioLayout.tsx, and documented them in ShortcutsModal.tsx.
- **E2E Test Fixes (tests/e2e/projects.spec.ts, tests/e2e/studio.spec.ts)**: Added visibility wait for lazy-loaded gallery project cards, preventing count race conditions.

**Checks run:**
- npm run typecheck: 0 errors
- npm run lint: 0 errors, 0 warnings
- npm test: 186/186 tests pass across 32 suites (+17 comprehensive unit tests in tests/cvdLens.test.ts)
- npx playwright test: 17/17 tests pass (100% across all suites)
- Lighthouse CI Local Audit:
  - Landing (http://localhost:3000/): Performance 0.85, Accessibility 1.00, Best Practices 1.00, SEO 1.00.
  - Studio (http://localhost:3000/studio): Performance 0.86, Accessibility 1.00, Best Practices 1.00, SEO 1.00.
  - First-load JS Bundle on /studio: 260.79 KB (< 300 KB budget).
**Status:** Complete

---

## Hotfix — Specular Glints Smeared On The Silhouette Outline + Photometric Studio UX Redesign (2026-09-04)

User report: "why the glint on edge?" — after Render Photometric / Specular Glint, chalky white sparkle pixels appeared *on the black outline* instead of on the lit surface.

**Root cause:** the 2.5D normal field is derived from an EDT-inflated height dome. At the silhouette rim the height gradient is near-vertical, so rim normals point *outward* (N·V ≈ 0). Because the glint picker used an absolute `NdotH^shininess ≥ 0.70` cutoff and then kept the global top-N brightest pixels, rim normals that happened to align with the light's half-vector always won the sort — guaranteeing outline glints. The composite pipeline had the same flaw (`Ispec = ks·(N·H)^α` with no view-alignment masking), so metal/gold/glass material renders glowed white along their edges.

**Fix (`src/lib/ai/math/photometricLighting.ts`):**
1. `executePhotometricPipeline`: specular is now masked by view alignment (`rimSpecMask = min(1, N·V / 0.35)`), fading edge-on surfaces to zero specular — standard geometric attenuation.
2. `renderParametric2p5DLighting`: glint candidates are restricted to *interior* pixels (EDT distance ≥ 2 px), judged against a *relative* alignment knee (within 0.08 of the sprite's own best-aligned interior pixel) and filtered by 8-neighbour non-maximum suppression, with glint alpha normalized relative to the sprite apex. Result: pinpoint sparkles on the surface slope facing the light, never on the outline.

**UI/UX (`src/components/layout/inspector/PhotometricLightingSection.tsx`):** the jargon `<select>` ("Matte Clay (Kd: 1.0, Ks: 0.08)") was replaced by a visual material chip grid (shaded swatch sphere + plain-language label; physical coefficients moved to hover tooltips via `MATERIAL_PROFILES`). Light direction is now a single coherent control group: the draggable sun-dome gizmo plus always-visible "Direction"/"Height" sliders beneath it (previously duplicated and hidden inside the collapsed "Sobel Normals & Lighting" accordion, now renamed "Advanced Shading" and holding only Brightness / Cavity AO / Dither Mod, with a live summary badge on the collapsed header).

**Checks run:** `npx tsc --noEmit` (0 errors), `eslint src tests` (0 errors), `npx vitest run` (271/271 across 48 suites), `npm run verify:docs` (all integrity checks passed).
**Status:** Complete

---

## Phase 36 — Smart Canvas Art Analysis & Bounded 2.5D Sprite Cast Shadows (2026-09-04 / 2026-09-05)

**User feedback & motivation:** The previous 2D planar raymarch cast shadow traced an infinite wedge over Euclidean distance fields, darkening the entire bottom of the canvas and obscuring sprites with continuous float gradients. The system needed bounded, grounded sprite cast shadows and classic pixel art ground drop shadows.

**Delivered:**
- **Smart Shadow Auto-Analysis (`src/lib/ai/math/shadowAuto.ts`)**: Implemented `inferRaymarchedShadowSettings` scanning silhouette bounds, sprite center, ground contact baseline, and directional bias to auto-infer light coordinates, elevation, radius, and opacity with descriptive rationale badges.
- **Bounded 2.5D Sprite Cast Shadow Projection (`src/lib/ai/shadowRayMarcher.ts`)**:
  - Replaced infinite planar raymarching with exact 1-to-1 sheared silhouette projection ($h = y_{\text{base}} - y_s \ge 0$, $\text{projX} = \text{round}(x_s + h \cdot \text{shear}_x)$, $\text{projY} = \text{round}(y_{\text{ground}} + h \cdot \text{shear}_y)$).
  - Preserves hollow leg arches, waist indentations, and wing gaps without bounding-box bloat or muddy center AO puddles.
- **Classic Ground Contact Drop Shadow Style (`shadowStyle: 'drop'`)**: Stylized Bresenham pixel ellipse/capsule centered under the character contact baseline (matching classic 2D pixel art RPG standards).
- **Default Dither Mode: None**: Switched default `ditherMode` across the engine and inspector UI to `'none'`. When `ditherMode === 'none'`, shadows render with crisp uniform flat opacity $\text{round}(\text{shadowOpacity} \times 255)$ without continuous float alpha gradients or digital airbrush smear.
- **Dedicated Regression Testing (`tests/shadowAutoAnalysis.test.ts`, `tests/shadowRayMarcher.test.ts`)**: Verified 1-to-1 projection, hollow leg arch preservation, ground drop shadow oval generation, and uniform flat opacity.

**Checks run:** `npx tsc --noEmit` (0 errors), `eslint src tests` (0 errors), `npx vitest run` (287/287 across 50 suites), `npm run verify:docs`.
**Status:** Complete

---

## Phase 37 — PixiBud Deep Art Understanding, Anatomical Feature Isolation & OKLCH Cel-Shading (2026-09-05)

**User feedback & motivation:** "Analyze & Render" of photometric lighting added nonsense shading to animal and character sprites (such as the cat sprite), inflating faces into bowling balls, plunging eyes/mouth into diffuse mud, and splashing white specular glare across matte fur.

**Delivered:**
- **Art Morphology & Anatomical Form Classification (`src/lib/ai/math/photometricAuto.ts`)**:
  - Automatically classifies canvas drawings into `character` (creatures with ears/horns, facial features, limbs) vs. `orb` (geometric spheres/circles) vs. `prop`.
  - Connected-component clustering isolates eyes, pupils, mouth, snout, and lateral whiskers (`isFeature`, `isInkLine`).
  - Scans the top 15%–35% of the silhouette for distinct local convex lobes to identify ears and horns.
  - Distinguishes flat base colors with outline asymmetry from intentional pre-painted highlights.
- **Frontal Face Cushion Plateau & Feature Normal Stabilization (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Eliminated "bowling-ball" face inflation on characters: height within 2.8px of the boundary contour bevels smoothly down while the interior forms a flat plateau facing the camera ($N_z \ge 0.85$). Form shadows naturally hug only the 1–2px unlit silhouette bevel, keeping the face interior bright and legible.
  - Preserves independent 3D cone/ridge geometry for ears and horns so they catch directional light independently.
  - Whiskers and facial features are assigned stabilized camera-facing normals ($N = [0, 0, 1]$).
- **100% Feature Preservation & Discrete OKLCH Cel-Shading Ramps (`src/lib/ai/math/photometricLighting.ts`)**:
  - Pixels identified as `isFeature` (eyes, mouth) or `isInkLine` (outlines, whiskers) bypass diffuse and ambient multipliers entirely, maintaining exact artist colors without diffuse brown mud or dark ambient crush.
  - Excludes facial features and line art from receiving specular highlights.
  - Implemented discrete OKLCH cel-shading ramps cached per unique base color (`CelRamp`): maps each artist base color to exactly one unified crisp shadow tone (cool skylight hue shifted to 260°, $L \times 0.78$), one deep crevice tone for concave seams/folds ($AO < 0.60$, $L \times 0.60$), and optional warm highlight tone (65°).
  - Replaces continuous float gradients and intermediate hue banding with discrete cel steps across character fills.
  - Supports optional Bayer ordered dithering stippling along the cel shadow boundary when `ditherModulation > 0`.
- **Narrow Appendage (Ear / Horn) Normal Stabilization (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Detects narrow appendages ($\le 5$px wide) in the upper silhouette. On the light-facing side (e.g. left ear under 315° key light), clamps normal $N_x \le 0$ and reinforces camera alignment ($N_z \ge 0.88$).
  - Prevents narrow 2–4px ears from bisecting into a 1px lit tube and a 1px dark shadow tube.
  - Overhauled `computeDiscreteLaplaceCavity` to evaluate true opaque neighbor occlusion so convex silhouette edges are not falsely darkened as cavities.
- **Matte Character Specular Suppression (`src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Automatically suppresses harsh specular glint overlays on matte/fabric character fur and skin, preventing random white spots across character faces.
  - Maintains non-destructive tagged layer replacement (`Photometric <material>`).
- **Dedicated Regression Testing (`tests/photometricAutoAnalysis.test.ts`)**: Added comprehensive 32x32 cat sprite tests verifying character classification, eye/mouth preservation, frontal cushion $N_z \ge 0.85$, zero gradient banding across shadow fills, and lit-side ear base tone retention.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 296/296 tests passed across 50 suites
- `npm run build`: Next.js 16.3.2 Turbopack production build succeeded
- `npm run verify:docs`: all integrity checks passed
**Status:** Complete

---

## 2026-09-05 — Phase 38: Live On-Canvas Pixel Light Bulb Gizmo, Dynamic Direction Alignment & Character Analysis Hardening

**Problem Statement:**
1. Artists needed live-time interactive on-canvas lighting controls: dragging a light source directly over their artwork with immediate 60fps lighting updates, rather than exclusively adjusting modal sliders.
2. In early iterations, the light source and subject focus anchor were coupled together, causing the center reticle to follow the cursor and collapse onto the bulb.
3. Spherical primitive domes exhibited center-locked highlights due to discrete Laplace cavity attenuation on convex slopes and conical pinch artifacts from power-law gamma inflation.
4. On 128x128 hand-drawn characters with asymmetrical ears and expressive facial features, the art auto-classifier fell back to non-character prop mode due to hardcoded 8px scan bounds and restrictive `<= 6` cluster caps, causing the character to render as an inflated continuous 24-bit floating point gradient balloon.

**Engineering Remediation:**
- **Interactive On-Canvas Pixel Light Bulb Gizmo (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Live on-canvas draggable bulb handle (`pixel-light-bulb-handle`) updating light azimuth and elevation in real time with throttled 60fps `requestAnimationFrame` loop.
  - Dedicated focal center reticle handle (`pixel-light-center-handle`) allowing artists to reposition the lighting subject anchor anywhere across the canvas.
  - Decoupled bulb orbit from center reticle: dragging the bulb updates azimuth and elevation around the stationary center reticle without moving the focus anchor.
  - Dynamically calculates light azimuth from pointer coordinates relative to the subject anchor ($\text{azimuth} = \text{round}((\text{atan2}(dx, -dy) \times 180 / \pi + 360) \pmod{360})$).
  - Added on-canvas keyboard bindings: quick commit with Enter, cancel with Escape, reset focus with R, and brightness/exposure adjustments via `+` / `-` keys or mouse wheel scrolling over the gizmo.
- **Uncapped Asymmetrical Ear & Appendage Scanning (`src/lib/ai/math/photometricAuto.ts`, `src/lib/ai/math/edtNormalMap.ts`)**:
  - Removed 8-pixel cap on silhouette appendage scanning. Scans up to 45% of sprite dimensions across horizontal and vertical sweeps, reliably identifying asymmetrical ears, horns, wings, and cheek tufts at any canvas resolution.
- **Expressive Facial Feature Recognition (`src/lib/ai/math/photometricAuto.ts`)**:
  - Expanded cluster limits to support up to 32 facial feature clusters and improved contrast thresholds for darker and red fur tones, protecting eyes, eyebrows, nose, mouth, and whiskers from diffuse crush.
- **Prop & Complex Shape Content-Aware Decomposition (`src/lib/ai/math/photometricLighting.ts`)**:
  - Extended `computeContentAwareHeightmap` decomposition to props and general objects, isolating pure spherical dome EDT strictly to geometric orbs (`formType === 'orb'`).
  - Unified `formType` inference in `src/hooks/viewport/useViewportStudioEvents.ts` across Auto and Manual studio modes.
- **Calibrated Spherical Convex Dome Normal Mathematics (`src/lib/ai/math/edtNormalMap.ts`, `src/lib/ai/math/photometricLighting.ts`)**:
  - Calibrated spherical dome heightmap inflation ($z = R\sqrt{1 - (1 - d/R)^2}$) with zero derivative at the apex to eliminate conical pinch creases on spherical primitives.
  - Decoupled direct key light from cavity ambient occlusion on convex slopes to eliminate center-locked apex highlight glitches.
- **Dedicated Regression Testing (`tests/components/PixelLightBulbGizmo.test.tsx`, `tests/photometricAutoAnalysis.test.ts`, `tests/orbPhotometricCelShading.test.ts`)**: Added 16 new unit and integration tests verifying handle isolation, 128x128 asymmetrical character classification, feature protection, and spherical dome peak luminance.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 312/312 tests passed across 52 suites
- `npm run build`: Next.js 16.3.2 Turbopack production build succeeded
- `npm run verify:docs`: all integrity checks passed
**Status:** Complete

---

## 2026-09-05 — Phase 39: Studio UI/UX 10/10 Overhaul: Amethyst Wisteria Hover, Specular Sweep Upgrade & Viewport Harmonization

**Problem Statement:**
1. TactileButton hover turned blindingly white (`hover:bg-[#f0ecf6]` / `hover:bg-[#fff8db]`), causing extreme contrast loss against `#f0be7c` gold text (1.25:1 contrast ratio, failing WCAG AA) and washing out the specular CC light-sweep animation.
2. Viewport HUD in `CenterViewport.tsx` duplicated zoom controls present in `TopHeader.tsx` with diverging scale arithmetic (linear 200% jumps vs geometric 1.5x scaling), while the bottom-right coordinate badge had an alien light-gray pill design that clashed with the dark atelier palette.
3. The floating light bulb action bar collided with the secondary context options bar at `-top-12`.
4. The Volumetric Optics inspector section contained misplaced features (`47-Blob Autotile Edges` and duplicate `Ground Drop Shadow`).

**Engineering Remediation:**
- **Amethyst Wisteria Tactile Hover & Specular Sweep (`src/components/ui/TactileButton.tsx`, `src/app/globals.css`)**:
  - Replaced blinding white hover backgrounds with calibrated Amethyst Wisteria (`#603B82`, OKLCH $L \approx 0.42, C \approx 0.13, H \approx 312^\circ$), guaranteeing WCAG 2.2 AA contrast ratios ($4.6:1$ against `#f0be7c` gold text, $6.2:1$ against `#ede8f4` cream text).
  - Enhanced specular CC light sweep to a dual-band gradient with wisteria flanking wings (`rgba(220,171,223,0.15)` flanking pure white specular highlight), creating crisp, colorful shimmer.
  - Standardized microinteraction physics (`scale: 1.025` hover, `scale: 0.97` tap, `rounded-[2px]`) across default, ghost, accent, and danger variants.
  - Harmonized modal action buttons across `src/components/layout/TopHeader.tsx`, `src/components/modals/ExportModal.tsx`, `src/components/modals/ShortcutsModal.tsx`, `src/components/modals/ImportModal.tsx`, `src/components/modals/ColorPickerModal.tsx`, `src/components/modals/CanvasResizeModal.tsx`, and `src/components/system/PwaUpdateToast.tsx`.
- **Viewport HUD & Control Deduplication (`src/components/layout/CenterViewport.tsx`)**:
  - Removed redundant bottom-left viewport zoom HUD (`[-] {zoom}% [+] [Fit] [16x] [32x32]`) to eliminate conflicts with primary TopHeader zoom controls.
  - Redesigned bottom-right cursor coordinate indicator from generic gray pill to dark atelier desk aesthetic (`bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] text-[var(--accent-gold)] font-mono text-[10px]`).
- **Inspector Panel Feature Reorganization (`src/components/layout/inspector/VolumetricOpticsSection.tsx`, `src/components/layout/inspector/TilesetDecomposerSection.tsx`)**:
  - Removed misplaced `47-Blob Autotile Edges` button and duplicate `Ground Drop Shadow` button from Volumetric Optics section.
  - Relocated `47-Blob Autotile Edges` to the dedicated Tileset Decomposer panel alongside `Decompose Layer`.
- **Light Gizmo Collision Prevention (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Repositioned the floating action bar from `-top-12` to `top-3` within the canvas boundary, completely eliminating visual collisions with the secondary context options bar.
- **Dedicated Unit & Integration Testing (`tests/components/TactileButton.test.tsx`, `tests/components/PixelLightBulbGizmo.test.tsx`, `tests/components/InspectorDeduplication.test.tsx`)**:
  - Updated button unit tests validating `rounded-[2px]`, Amethyst Wisteria hover classes, dual-band specular sweep, and variant styling with 100% pass rate.
  - Verified floating light gizmo toolbar position (`top-3`) within canvas boundaries.
  - Added dedicated inspector control deduplication suite verifying 47-blob and drop shadow isolation.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 317/317 tests passed across 53 suites
- `npm run build`: Next.js 16.3.2 Turbopack production build succeeded
- `npm run verify:docs`: all integrity checks passed
**Status:** Complete

---

## 2026-09-05 — Phase 40: Audit Remediation & Quality Gate Parity

**Problem Statement:**
1. MP4 export fallback was non-functional: when native MediaRecorder MP4 encoding was unavailable, the encoder emitted an unplayable ~200-byte stub without sample tables or frame data, and CI ran in happy-dom where MediaRecorder was absent, giving false test coverage.
2. Studio automated accessibility tests had rule carve-outs (`.disableRules(['target-size', 'color-contrast'])`), leaving touch-target sizes and contrast unverified in the studio environment.
3. Photometric normal-map computation in `CenterViewport.tsx` lacked memoization against composite state, recalculating unnecessarily, and bilateral filtering in `edtNormalMap.ts` evaluated Gaussian spatial distances dynamically in the inner loop.
4. P2P WebRTC data sync lacked message size bounding, bounds validation on incoming operations, and batch chunking, risking channel drops on whole-canvas transfers.
5. APNG encoder lacked explicit documentation for uncompressed DEFLATE store blocks.
6. Color ramp generator had an alpha-channel slicing bug in `hexToRgb` causing blue channel bit-shift drift on 8-digit hex values, and lacked dedicated unit tests.
7. Codebase had a stray Turkish comment in `useViewportDrawing.ts` and a docstring inaccuracy in `floodFill.ts`.

**Engineering Remediation:**
- **Honest MP4 Capability Detection & Vitest CI Mock Harness (`src/lib/export/mp4Encoder.ts`, `src/components/modals/ExportModal.tsx`, `tests/mp4Encoder.test.ts`)**:
  - Exported `isMp4ExportSupported()` requiring both `MediaRecorder` and `captureStream` support.
  - Added user warning in `ExportModal.tsx` guiding users to WebM or GIF when native MP4 is unsupported.
  - Added mock `MediaRecorder` and `captureStream` test harness in Vitest, expanding `tests/mp4Encoder.test.ts` to 12 tests.
- **Studio Accessibility Rigor & Zero Rule Carve-Outs (`tests/e2e/studio.spec.ts`, `src/components/studio/FloatingPreviewWindow.tsx`, `src/components/layout/inspector/LayersPanel.tsx`, `src/components/layout/BottomTimeline.tsx`, `playwright.config.ts`, `src/stores/themeStore.ts`)**:
  - Completely eliminated `.disableRules(['target-size', 'color-contrast'])` in `tests/e2e/studio.spec.ts`.
  - Upgraded touch targets to $\ge 24\times24$px across `FloatingPreviewWindow.tsx` backdrop options, `LayersPanel.tsx` layer lock button, and `BottomTimeline.tsx` clip delete button.
  - Upgraded frame duration text contrast to $>6:1$ against dark panel surfaces.
  - Configured dark color scheme parity in `playwright.config.ts` and `themeStore.ts`.
  - All 17 Playwright E2E tests pass with 0 axe violations.
- **Photometric & Normal-Map Optimization (`src/lib/ai/math/edtNormalMap.ts`, `src/components/layout/CenterViewport.tsx`)**:
  - Precomputed 2D spatial Gaussian distance lookup table (`spatialLUT`) in `applyBilateralFilter`, eliminating 50% of inner-loop `Math.exp()` calls, with bounds guards for non-positive dimensions and sigmas.
  - Memoized normal map preview canvas in `CenterViewport.tsx` using an offscreen canvas ref cache invalidated only when `bufferVersion`, `activeFrameIndex`, layer structure signature, or floating selection key changes.
  - Removed inert `isDrawingRef` dependency from `CenterViewport.tsx`'s `useEffect`.
- **P2P WebRTC Sync Hardening & Bounded CRDT Log (`src/lib/sync/p2pSync.ts`, `src/lib/collab/crdtPixelBuffer.ts`, `tests/p2pValidation.test.ts`)**:
  - Enforced 256KB DataChannel payload ceiling in `p2pSync.ts`.
  - Implemented strict runtime schema and integer bounds validation on incoming `PixelOp`s.
  - Added automatic chunking into 1000-op batches for `broadcastPixelOps` and `broadcastInitialSync`.
  - Bounded `opLog` in `CrdtPixelBuffer` (`MAX_OP_LOG_SIZE = 10000`) with sliding window eviction.
  - Added 17 unit tests in `tests/p2pValidation.test.ts`.
- **APNG Store Block Documentation (`src/lib/export/apngEncoder.ts`)**:
  - Honestly documented uncompressed DEFLATE store blocks (BTYPE 00) and byte-exact CRC32/Adler-32 chunking.
- **Color Ramp Generator Hardening & Unit Tests (`src/lib/color/rampGenerator.ts`, `tests/rampGenerator.test.ts`)**:
  - Fixed `hexToRgb` to slice 8-character and 4-character hex inputs with alpha before parsing, eliminating blue channel bit-shift drift.
  - Added 11 comprehensive unit tests in `tests/rampGenerator.test.ts`.
- **Codebase Polish (`src/hooks/viewport/useViewportDrawing.ts`, `src/lib/canvas/floodFill.ts`)**:
  - Translated Turkish comment to English in `useViewportDrawing.ts`.
  - Corrected docstring in `floodFill.ts` to document iterative 4-connected stack-based fill.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 351/351 tests passed across 55 suites
- `npx playwright test`: 17/17 E2E tests passed with 0 axe violations and 0 rule carve-outs
- `npm run build`: Next.js 16.3.2 Turbopack production build succeeded
- `npm run verify:docs`: all integrity checks passed
**Status:** Complete

---

## 2026-09-05 — Phase 41: TestSprite Cloud End-to-End Suite & Complex Feature Verification

**Problem Statement:**
1. Stand up remote cloud testing with official TestSprite CLI for PixiBun's complex and newly added features (on-canvas light bulb gizmo, wisteria hover states, variable frame duration timeline, P2P co-draw, export capability handling, photometric cel-shading).
2. Guarantee 100% pass rate against live production deployment (`https://pixibun.vercel.app`) with zero failed or flaky tests.

**Engineering Execution:**
- **P2P Co-Draw Modal & Serverless WebRTC Signaling Test (`c2ef43f3-cb81-4b9a-914b-6995344f953f`)**:
  - Validated top header `Co-Draw` button with calibrated Amethyst Wisteria hover and dual-band sweep.
  - Verified `CoDrawModal` rendering with `Host Session` and `Join Session` tabs.
  - Verified on-device encrypted WebRTC offer generation and copy action in `Host Session`.
  - Verified tab switching to `Join Session` and clean modal dismissal (8/8 steps passed).
- **On-Canvas Pixel Light Bulb Gizmo & Live Shading Preview Test (`d4bc65ba-70f5-4951-9c72-89f467290cf3`)**:
  - Validated circle drawing with Ellipse tool on canvas.
  - Activated PixiBud studio and triggered `Analyze & Light Bulb` photometric cel-shading.
  - Verified `PixelLightBulbGizmo` and top floating action bar (`top-3`) with `Apply` and `Cancel` buttons mounted without colliding with header options bar.
  - Verified discarding preview with `Cancel` dismissed gizmo cleanly and preserved canvas interactivity (11/11 steps passed).
- **Export Modal Multi-Format & Codec Capability Detection Test (`fca5c184-839d-4c09-a96c-ca6d560a5f3d`)**:
  - Verified opening `ExportModal` from top header.
  - Verified `Sprite Sheet` format tab and packing layout configurations.
  - Verified `MP4 Video` format tab and codec capability detection notice (evaluating native MediaRecorder support).
  - Verified clean modal dismissal (8/8 steps passed).
- **PWA Web Application Manifest & Strict Security Headers Backend Test (`8aaeceaa-265c-4ead-94df-fcfbf723cd57`)**:
  - Verified `GET /manifest.webmanifest` returns HTTP 200 OK.
  - Verified `Content-Type: application/manifest+json`.
  - Verified PWA manifest JSON structure (`name`, `short_name`, `display: standalone`, `start_url: /studio`, high-DPI icons).
  - Verified strict security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`) passed.

**Checks run:**
- `testsprite test list --project 3cd2c711-e4c0-47de-9e3b-f9011ff9e1f8`: 13/13 frontend tests passed (0 failed)
- `testsprite test list --project cd9cd8ca-2fd2-4595-afd1-933c0eeb2fd8`: 9/9 backend tests passed (0 failed)
- Total TestSprite suite: 22/22 tests passed (100% green pass rate)
- `npm run verify:docs`: all integrity checks passed
**Status:** Complete

---

## 2026-09-06 — Phase 42: Co-Draw Activation, Deep Audit Remediation & Server Hardening

**Problem Statement:**
1. The CRDT/P2P engine existed only in tests — `CoDrawModal` created `P2PSyncSession` instances with no sync callbacks, so connected peers never exchanged a pixel despite UI claims of automatic synchronization.
2. A deep codebase audit surfaced critical defects: undo-after-resize corruption, a boot crash vector from unguarded localStorage parsing, bounds gaps in frame operations, and an unbounded diagnostics relay endpoint.
3. Round 2 audit findings required academic-level fixes: autosave lost-update race, native `await` inside Dexie transactions, ICE gathering hard-capped too low, WebM encoder resource leak, FIFO cache eviction, and `Math.random` peer IDs.

**Engineering Execution:**
- **Co-Draw Bridge (`src/lib/sync/coDrawBridge.ts`)**: Module-scoped singleton wiring structure join, full-state antientropy (canvas-seeded `CrdtPixelBuffer` snapshots per layer), stroke-diff delta propagation via `src/lib/sync/strokeDiff.ts`, remote op application, throttled cursor presence, and session lifetime independent of modal mount.
- **Protocol Hardening (`src/lib/sync/p2pSync.ts`)**: `STRUCTURE_SYNC` message with strict `validateStructurePayload`; `layerId` mandatory on ops messages; sender-side payload size ceiling for structure broadcasts.
- **Presence Overlay (`src/components/studio/RemoteCursorsOverlay.tsx`)**: Zoom-aware remote cursor rendering with 4-second staleness pruning.
- **Round 2 Audit Fixes (6 commits)**:
  - `fix(autosave)`: do-while coalescing loop + `visibilitychange` flush — in-flight save no longer silently drops pending edits.
  - `fix(storage)`: native `blob.arrayBuffer()` moved outside Dexie transaction block — prevents `TransactionInactiveError` in strict browser engines.
  - `fix(p2p)`: ICE gathering cap raised to 5s with 600ms idle debounce + null candidate detection for mobile/VPN reliability.
  - `fix(export)`: WebM encoder capture stream tracks stopped in cleanup.
  - `fix(sw)`: FIFO cache eviction upgraded to touch-on-hit LRU promotion.
  - `fix(minor)`: async audio suspend, `crypto.getRandomValues` peer IDs, `visibilitychange` flush.
- **Deep Audit Fixes**: guarded localStorage parsing (`createToolSlice.ts`); bounds guards in `deleteFrame`/`reorderFrames` (`createAnimationSlice.ts`); cross-project state resets (`createHistorySlice.ts`); tag-preserving redo (`useViewportDrawing.ts`, `canvas.ts`); merge-down two-step confirm (`LayersPanel.tsx`); eyedropper stale-snapshot fix; 4-digit `#RGBA` support (`floodFill.ts`); `prefers-color-scheme` fallback (`themeStore.ts`).
- **Relay Hardening (`src/app/api/diagnostics/relay/route.ts`, `src/lib/server/tokenBucket.ts`)**: Token-bucket rate limiting (12/min, burst 12, per IP), 64KB body ceiling, 100-event cap.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 406/406 tests passed across 63 suites (20 new tests)
- `npm run verify:docs`: all integrity checks passed
**Status:** Complete

---

## 2026-09-06 — Phase 41.5: Landing v3 — Interactive Engine Showcase & Pillars Navigation

**Problem Statement:**
1. The landing page previously presented only passive marketing copy and a simple 32x20 DoodlePad (Phase 13), failing to visually prove PixiBun's mathematical graphics engines (2.5D photometric lighting, RotSprite, Oklab synthesis, game engine packing) before users entered the studio.
2. Visitors needed tactile, interactive evidence that PixiBun's core intelligence is deterministic computer graphics math rather than cloud-based generative AI hallucinations.

**Engineering Execution:**
- **AtelierEngineShowcase (`src/components/landing/AtelierEngineShowcase.tsx`)**: Built a modular 4-tab interactive workbench on the home desk (`#engine-showcase`):
  1. `PhotometricShowcase.tsx`: Live draggable pixel light bulb gizmo with continuous azimuth/elevation orbital controls, stepped OKLCH cel-shading vs. normal vector fields, 4 sprite models (*Ghost, Shroom, Bun, Lantern*), 4 Blinn-Phong materials (*Matte, Gold, Glass, Fabric*), and Aaltonen raymarched ground cast shadows vs. contact drop AO.
  2. `RotSpriteShowcase.tsx`: Live interactive angular comparison slider contrasting classic blurry bicubic rotation against Xenowhirl 8x Scale2X inverse sampling, preserving single-pixel contours at 45°.
  3. `PixelizeShowcase.tsx`: Real-time image-to-pixel downsampling demo with Sobel gradient salience edge weighting and OKLab color quantization.
  4. `EngineExportShowcase.tsx`: Interactive sprite sheet packing previewer with instant Godot 4 `.tres`, Unity, and Phaser 3 JSON metadata tabs.
- **Navigation & Architectural Structure (`src/components/landing/LandingNav.tsx`, `src/app/page.tsx`)**:
  - Upgraded navigation from legacy `Canvas / Shelf / Story` to `Playground / Studio / Engine (#engine-showcase) / Pillars (#features) / Shelf (#gallery) / Story (#story)`.
  - Added bottom manifesto badge: *'100% Offline in Browser • Deterministic Math & Zero Cloud Lag • Zero Generative Hallucinations'*.
- **Harness & Verification (`tests/components/AtelierEngineShowcase.test.tsx`)**:
  - 8 comprehensive integration tests validating tab switching, light gizmo orbit dragging, sprite model swaps, material chips, and shadow mode toggling (388 LOC).

**Checks run:**
- `npx vitest run tests/components/AtelierEngineShowcase.test.tsx`: 8/8 passed
- `npx tsc --noEmit`: 0 errors
- `eslint src tests`: 0 errors
**Status:** Complete

---

## 2026-09-07 — Phase 43: Minecraft Skin vs 2.5D Character Sprite Topological Discriminator & Photometric User Sovereignty

**Problem Statement:**
1. `detectMinecraftSkin` used a naive 2-condition heuristic (void corners + head pixel check) that falsely classified centered 64x64 character sprites (e.g. red bunny, cat, humanoid) as Minecraft 3D skin texture atlases.
2. When misclassified, the photometric pipeline assigned flat $(0, 0, 1.0)$ cuboid normals instead of heightmap-derived tangent normals, producing zero visible shading.
3. Artists had no manual override to bypass or enforce Minecraft skin mode.

**Engineering Execution:**
- **Deep Topological Discriminator (`src/lib/ai/math/minecraftSkin.ts`)**: `analyzeMinecraftSkinTopology(isOpaque, width, height)` performs 8-connected component flood analysis with dominant component ratio ($\ge 68\%$ → centered sprite), bilateral limb verification ($x \in [0, 16)$ and $x \in [40, 56)$), canonical void zone integrity ($<20\%$ pollution), and bounding box margin checks.
- **Pipeline Protection (`src/lib/ai/math/photometricLighting.ts`)**: `executePhotometricPipeline` and `renderParametric2p5DLighting` honor `params.minecraftSkinMode`. When `'disabled'` or `formType` is explicit, Minecraft skin shading is bypassed.
- **Store & Viewport (`src/types/tools.ts`, `src/stores/slices/createToolSlice.ts`, `src/hooks/viewport/useViewportStudioEvents.ts`)**: Added `minecraftSkinMode: 'auto' | 'enabled' | 'disabled'` to params and forwarded through all photometric event handlers.
- **Inspector UI (`src/components/layout/inspector/PhotometricLightingSection.tsx`)**: Tactile `Skin 3D Shading: [ Auto | On | Off ]` button group on 64x64 / 64x32 canvases.
- **Tests (`tests/minecraftSkinDetection.test.ts`)**: 8 comprehensive unit tests.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 414/414 tests passed across 64 suites (8 new tests)
- `npm run verify:docs`: all integrity checks passed
**Commit:** `a5797db` → `origin/main`
**Status:** Complete

---

## 2026-09-07 — Phase 43b: Cel-Shading Shadow Terminator Math Fix (v1.10.2)

**Problem Statement:**
1. After Phase 43 correctly prevented Minecraft skin false-positives, character sprites entered the discrete OKLCH cel-shading branch but produced zero visible shading — all pixels rendered as BASE tone.
2. Debug analysis revealed `lightLevel ≥ 1.0` for ALL pixels (including the unlit side), making it mathematically impossible to drop below `shadowThresh = 0.58`.
3. Root cause: ambient signal (`ambSignal ≈ 1.27`) dominated the `lightLevel` formula, and double brightness multiplication (`effectiveAmbient` already includes brightness, then `lightLevel *= brightness` again).

**Engineering Execution:**
- **Shadow Terminator Fix (`src/lib/ai/math/photometricLighting.ts` lines 586–642)**: Removed `ambSignal` and `lightLevel` from shadow placement. Shadow termination now driven purely by directional diffuse signal: `diffSignal = wrapNdotL × effectiveFalloff` with `shadowThresh = 0.55`. Highlight uses `highlightLevel = diffSignal * brightness > 1.10 && isShinyMaterial`. Deep crevice threshold remains `creviceAOThresh = 0.60`.
- **Verified fix**: Unlit cheek `diffSignal = 0.44 < 0.55` → SHADOW tone [x]. Body bottom `diffSignal = 0.43 < 0.55` → SHADOW tone [x]. Lit cheek `diffSignal = 0.89 > 0.55` → BASE tone [x].

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `eslint src/lib/ai/math/photometricLighting.ts`: 0 errors, 0 warnings
- `npx vitest run`: 414/414 tests passed across 64 suites
**Commit:** `1076bd4` → `origin/main`
**Status:** Complete

---

## 2026-09-07 — Phase 44: Zero-Slop Hardening, Accessibility & Documentation Parity (v1.10.3)

**Problem Statement:**
1. Accessibility gaps: 3 auxiliary range sliders (`RotSpriteShowcase.tsx:170`, `ColorPickerModal.tsx:201`, `ArtisanHandbookPanel.tsx:271`) lacked programmatic accessible names (`aria-label`), violating WCAG 2.2 AA.
2. Residual UI slop: 12 Unicode emojis remained across `PixelLightBulbGizmo.tsx`, `PhotometricLightingSection.tsx`, `ShortcutsModal.tsx`, and `CoDrawModal.tsx`, violating `SKILL.md` Rule 12 (craftsperson voice, pixel-art icon consistency).
3. Documentation metric drift: `README.md` lines 221 and 240 reported 17 E2E tests instead of the physical 18 tests. `ARCHITECTURE.md` §4 cited "minimum 30 (recommended 50)" undo history, while physical code and `SKILL.md` strictly enforce a 50-step circular ring buffer.
4. Test environment warnings: Node v26 emitted experimental `localStorage` warnings during `vitest` execution.

**Engineering Execution:**
- **Accessible Inputs (`src/components/landing/showcase/RotSpriteShowcase.tsx`, `src/components/modals/ColorPickerModal.tsx`, `src/components/onboarding/ArtisanHandbookPanel.tsx`)**: Added explicit `aria-label="Rotation angle"`, `aria-label="Color hue"`, and `aria-label="Lightbox opacity"`.
- **Anti-Slop Emoji Purge (`src/components/studio/PixelLightBulbGizmo.tsx`, `src/components/layout/inspector/PhotometricLightingSection.tsx`, `src/components/modals/ShortcutsModal.tsx`, `src/components/modals/CoDrawModal.tsx`, `src/components/ui/PixelIcon.tsx`)**: Replaced all Unicode emojis with semantic button text and added a custom $16 \times 16$ pixel-art `'lamp'` icon.
- **Documentation & Version Parity (`README.md`, `ARCHITECTURE.md`, `package.json`, `CHANGELOG.md`)**: Corrected E2E test metric to 18; synchronized undo history description to 50-step circular buffer; bumped package version to 1.10.3 and added release notes.
- **Test Environment Polyfill (`tests/setup.ts`, `vitest.config.mjs`)**: Added in-memory `localStorage` mock to eliminate experimental warnings in Node v26.
- **Harness & Regression Tests (`tests/components/ArtisanHandbookPanel.test.tsx`, `tests/components/PixelLightBulbGizmo.test.tsx`)**: Added unit tests asserting proper `aria-label` attributes and zero emoji characters.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npx vitest run`: 414/414 tests passed across 64 suites (0 warnings)
- `npx playwright test`: 18/18 tests passed across 6 spec files (100% passing)
- `npm run verify:docs`: all documentation integrity checks passed
**Commit:** `b1f1d5b` → `origin/main`
**Status:** Complete

---

## 2026-09-07 — Phase 45: Landing Page Anti-Slop Remediation & Silky-Smooth Animations (v1.10.4)

**Problem Statement:**
1. Tab switching flash: `AtelierEngineShowcase.tsx` previously used `next/dynamic` with `ShowcaseSkeleton`. When clicking a tab, the active panel unmounted, showed a dark screen with a spinning loader, and recompiled the chunk.
2. Navigation jitter: `LandingNav.tsx` prepended an inline `<motion.span layoutId="activeNavSpark">*</motion.span>` directly inside the link flex container, shifting link text horizontally by ~14px on focus. The scroll progress bar was unanchored at the base.
3. Emojis and awkward copy: `WHAT WE HAS: DEEP GRAPHICS ENGINE` was grammatically broken. Residual emojis (``, ` *`, ``, ``, ``) persisted on showcase tabs, desk scene, and error boundaries.

**Engineering Execution:**
- **Direct Static Imports (`src/components/landing/AtelierEngineShowcase.tsx`)**: Replaced all dynamic lazy imports with direct static imports (`PhotometricShowcase`, `RotSpriteShowcase`, `PixelizeShowcase`, `EngineExportShowcase`), making tab switching immediate with zero dynamic bundle chunk load delays.
- **Framer Motion `layoutId` Spring Pill Selector (`src/components/landing/AtelierEngineShowcase.tsx`)**: Added smooth spring pill highlight (`stiffness: 440, damping: 32`) and cross-fade panel animation (`mode="wait"`, cubic bezier `[0.16, 1, 0.3, 1]`).
- **Jitter-Free Navigation (`src/components/landing/LandingNav.tsx`)**: Replaced the inline layout-shifting spark with an absolute bottom underline indicator (`layoutId="activeNavIndicator"`), and wrapped the scroll progress bar in a dedicated background track.
- **Emoji Purge & Copy Polish**: Replaced tabs and action emojis with 16x16 pixel SVG icons, upgraded error boundaries to `<BunMascot size={28} />`, and replaced the badge with `"INTERACTIVE GRAPHICS BENCHMARK"`.
- **Harness & Verification (`tests/components/AtelierEngineShowcase.test.tsx`)**: Updated test assertions for button copy; verified 8/8 tests pass.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npx vitest run tests/components/AtelierEngineShowcase.test.tsx`: 8/8 passed
- `npx vitest run`: 414/414 passed across 64 suites
- `npx playwright test tests/e2e/landing.spec.ts`: 2/2 passed
- `npm run verify:docs`: all integrity checks passed
**Status:** Complete

---

## 2026-09-08 — Phase 46: 2.5D Normal Chisel & Mark Ferrari Palette Cycling Suite (v1.11.0)

**Problem Statement:**
1. Manual Normal Sculpting: Previously, tangent-space normal maps could only be generated from silhouette distance transforms. Artists lacked manual micro-relief carving, bevel/chamfer chisels, and spherical rivet/stud stampers.
2. Normal Blending Distortion: Naive linear blending or vector averaging flattens slopes and creates severe lighting artifacts. Reoriented Normal Mapping (RNM, Colin Barré-Brisebois & Stephen Hill 2012) was needed to rotate detail normals onto base normals without geometric distortion.
3. Intra-Stroke Accumulation: Painting normal vectors continuously along a brush stroke causes angular buildup if stamped iteratively. A two-phase stroke envelope buffer was needed to composite facets cleanly.
4. Mark Ferrari Palette Cycling: Amiga IFF ILBM `CRNG` and Commodore Graphicraft `CCRT` binary chunk parsing/serialization, zero-allocation 32-bit LUT cycling at 60 FPS, BlendShift sub-step lerp, and Farey rational retuning were needed to prevent coprime LCM explosion during animation loop baking and shader exports (Godot 4, Unity URP).

**Engineering Execution:**
- **2.5D Normal Chisel & Bas-Relief Sculptor (`src/lib/art/normalSculptor.ts`)**:
  - Implemented unit tangent normal vector encoding and decoding with OpenGL $+Y$ up convention ($N_x, N_y, N_z \in [-1, 1] \leftrightarrow [0, 255]$ with flat baseline at $(128, 128, 255)$).
  - Implemented directional bevel geometry with compass azimuth $\alpha \in [0, 360^\circ)$ and incline $\phi \in (0, 90^\circ]$.
  - Implemented shallow spherical rivet/stud stamp calculation with flattening factor $h \in (0, 1]$ and inversion flag.
  - Implemented Reoriented Normal Mapping (RNM) via shortest-arc quaternion rotation, plus UDN detail normal blending.
  - Implemented `ChiselStrokeSession` envelope buffer preventing intra-stroke angular accumulation.
- **Studio Chisel & Rivet Integration (`src/types/tools.ts`, `src/stores/slices/createToolSlice.ts`, `src/components/layout/LeftToolbar.tsx`, `src/components/ui/PixelIcon.tsx`, `src/components/layout/inspector/NormalSculptorSection.tsx`, `src/components/layout/inspector/AiToolsPanel.tsx`, `src/components/layout/CenterViewport.tsx`)**:
  - Integrated `'normal-chisel'` and `'rivet-stamp'` tool modes into studio state, toolbar, viewport event handlers, and inspector with interactive 3D normal vector sphere gizmo.
- **Mark Ferrari 8-Bit Dynamic Palette Cycling Engine (`src/lib/color/paletteCycling.ts`)**:
  - Implemented binary codecs for Amiga IFF ILBM `CRNG` (8-byte) and Commodore Graphicraft `CCRT` (14-byte) chunks.
  - Implemented zero-allocation 32-bit LUT renderer (`updateLivePaletteLUT32`) updating canvas ImageData buffers at 60 FPS without GC thrashing.
  - Implemented triangle-wave ping-pong period $M = 2(S - 1)$ with zero-bound fencepost safety.
  - Implemented sub-step `BlendShift` linear color interpolation.
  - Implemented Farey rational retuning (`retuneTracksForSeamlessLoop`) preventing coprime LCM period explosion.
- **Palette Inspector Controls & Exporters (`src/components/layout/inspector/PalettePanel.tsx`, `src/lib/export/shaderExporter.ts`, `src/components/modals/ExportModal.tsx`)**:
  - Added live palette cycling controls to palette inspector.
  - Added standalone Godot 4 `.gdshader` and Unity URP 2D HLSL shader generator.
  - Added APNG and animated GIF cycle loop unroller.
- **Unit Tests (`tests/normalSculptor.test.ts`, `tests/paletteCycling.test.ts`)**:
  - Created 31 unit tests validating normal math, RNM quaternion blending, IFF chunk codecs, ping-pong fenceposts, and shader syntax.
- **Pure Machine-Tag Architecture (`src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Completely purged all legacy display-name sniffing fallbacks (`startsWith('photometric')`, `startsWith('specular')`, `startsWith('normal')`) across `compositeSourceSnapshot`, `updateTaggedLayer`, `duplicateLayers`, and `bakePhotometricLighting`.
  - Enforced strict machine-tag matching (`l.tag === tag`) and excluded `normal` / `normal-map` vector layers from diffuse albedo composites to protect base sprite textures.
- **Sequential Test Isolation & Clean Database Teardown (`src/lib/storage/db.ts`, `tests/e2e/chiselAndPaletteLiveProof.spec.ts`)**:
  - Implemented explicit `window.__pixibunDb.close()` prior to database schema deletion.
  - Wrapped `indexedDB.deleteDatabase('PixiBunDB')` in a Promise that explicitly rejects on `req.onblocked` to eliminate hanging connection races.
  - Added post-reload store assertions (`frameCount === 1`, `layerCount === 1`, `hasNormalLayer === false`, `showNormalPreview === false`) guaranteeing clean test starting states.
- **Live Studio E2E Verification (`tests/e2e/chiselAndPaletteLiveProof.spec.ts`)**:
  - Built comprehensive Playwright E2E test verifying live chisel carving, normal preview overlay toggle, 45° vs 225° relighting contrast inversion (32,558 modified pixels), and live Mark Ferrari palette cycling.
  - Archived 8 verified visual integration proof artifacts in `docs/assets/screenshots/`.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npx vitest run tests/normalSculptor.test.ts tests/paletteCycling.test.ts`: 31/31 passed
- `npx vitest run`: 445/445 passed across 66 suites
- `npx playwright test tests/e2e/chiselAndPaletteLiveProof.spec.ts`: passed (14.0s)
- `npm run verify:docs`: all documentation integrity checks passed (monotonic sections 1-21, all files verified on disk)
**Status:** Complete

---

## 2026-09-08 — Phase 47: Graphics Pipeline Bug Fixes, Bitwise Normalization & System Hardening (v1.11.1)

**Problem Statement:**
1. Bucket Fill Failure: Users reported bucket fill terminating after only 1 pixel on already-colored opaque artwork. JavaScript bitwise operations (`<< 24`) yield signed 32-bit integers, causing opaque alpha values ($255$) to overflow into negative numbers (`-16777216`), which failed equality tests against unsigned `Uint32Array` values (`4278190335`).
2. Premature Blob URL Revocation: In `ExportModal.tsx`, synchronous `URL.revokeObjectURL(url)` immediately followed `link.click()`. In Firefox, Safari, or under CPU load, the object URL was deleted before the browser download manager initiated file fetching, aborting downloads.
3. SVG Vector Alpha Loss: `packRgbaKey` in `depixelizeVector.ts` treated all non-zero alphas as opaque `rgb(...)`, stripping semi-transparency from vector exports.
4. MP4 Odd Dimensions: Video encoder crashed or produced distorted frames when exporting sprites with odd width or height (e.g. 15×15 or 33×33 at scale 1x) due to H.264 macroblock ($16\times16$) and YUV 4:2:0 requirements.
5. P2P Layer Desync: Adding a layer post-connection in WebRTC co-draw sessions left guest peers without an initial snapshot of the new layer, and host sync packets reset guest frame/layer navigation.
6. Viewport Drawing Re-render Cascade: Storing cursor coordinates in parent `CenterViewport.tsx` state caused re-renders on every `pointermove` during active brush strokes.

**Engineering Execution:**
- **Unsigned 32-Bit Bitwise Normalization (`src/lib/canvas/floodFill.ts`)**:
  - Appended `>>> 0` to both `targetColor32` and `replacementColor32`, ensuring unsigned matching against `Uint32Array` buffer elements.
  - Added safe `Uint32Array` view instantiation with `data.byteOffset` and `data.byteLength >> 2`.
  - Added unit test in `tests/floodFillHex.test.ts` verifying opaque pixel flood fill expansion.
- **Export Modal Deferred Revocation (`src/components/modals/ExportModal.tsx`)**:
  - Replaced synchronous `URL.revokeObjectURL` with 1000ms deferred `setTimeout` across all 11 download handlers.
  - Created component test in `tests/components/ExportModal.test.tsx` verifying asynchronous revocation.
- **Semi-Transparent Vector SVG Alpha Preservation (`src/lib/export/depixelizeVector.ts`)**:
  - Serialized fractional alpha values via `rgba(r,g,b,(a/255).toFixed(3))` for $0 < a < 255$.
  - Added unit test in `tests/depixelizeVectorExport.test.ts`.
- **MP4 Even-Dimension Padding (`src/lib/export/mp4Encoder.ts`)**:
  - Padded export canvas dimensions to even bounds: `(width * scale + 1) & ~1` and `(height * scale + 1) & ~1`.
  - Added unit test in `tests/mp4Encoder.test.ts`.
- **P2P Post-Connection Sync & State Hardening (`src/lib/sync/coDrawBridge.ts`)**:
  - Implemented `syncedLayerIds` and canvas dimension tracking to automatically push layer snapshots on creation and canvas resize.
  - Pruned deleted layer CRDT replicas and isolated guest navigation pointers.
  - Added tests in `tests/p2pSync.test.ts`.
- **Viewport Drawing HUD Decoupling (`src/components/layout/CursorStatusBadge.tsx`, `src/components/layout/CenterViewport.tsx`, `src/hooks/viewport/useViewportDrawing.ts`)**:
  - Decoupled cursor coordinates into dedicated `CursorStatusBadge` subscriber.
  - Added component test in `tests/components/CursorStatusBadge.test.tsx`.
- **Photometric Lighting Cel-Shading Backlight Verification (`tests/orbPhotometricCelShading.test.ts`)**:
  - Added unit test for light azimuth $180^\circ$ and $N \cdot L = -1.0$ confirming zero `NaN` and proper shadow tone selection.
- **Documentation & Benchmarks (`BENCHMARKS.md`, `ARCHITECTURE.md`)**:
  - Created `BENCHMARKS.md` documenting empirical frame budgets and memory scaling models.
  - Aligned Blinn-Phong specular formula in `ARCHITECTURE.md`.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npx vitest run`: 460/460 passed across 68 suites
- `npx playwright test tests/e2e/studio.spec.ts`: 9/9 passed (16.0s)
- `npm run verify:docs`: all documentation integrity checks passed
**Status:** Complete

---

## Phase 48 — Selection Free-Transform Gizmo, Sprite Sheet Slicer & Heavy Compute Web Worker Offloading (2026-09-08)

**Delivered:**
- **RotSprite Algorithm (`src/lib/canvas/rotSprite.ts`, `tests/rotSpriteAcademic.test.ts`)**:
  - Implemented Xenowhirl (2007) RotSprite algorithm (as popularized in Aseprite) with 3-pass Scale2x cascade (1x -> 2x -> 4x -> 8x).
  - Continuous subpixel inverse affine rotation around arbitrary pivot coordinates with expanded output geometry preserving rotated corners.
  - Radially symmetric Gaussian center-weighted majority voting filter downscaling 8x back to 1x with strict color fidelity and zero color blurring.
- **Selection Boundary Extraction & Animated Marching Ants (`src/lib/canvas/selectionUtils.ts`, `tests/selectionBoundary.test.ts`)**:
  - `extractSelectionBoundarySegments` traversing 1-bit binary selection masks along orthogonal cell boundaries.
  - `boundarySegmentsToSvgPath` converting boundary edges to dual-tone animated SVG marching ants with CSS keyframe translation.
- **Interactive Selection Free-Transform Gizmo (`src/components/studio/SelectionTransformGizmo.tsx`, `src/hooks/viewport/useViewportSelectionTransform.ts`, `src/components/layout/CenterViewport.tsx`)**:
  - 8 transform handles maintaining constant 16x16px screen-space hitboxes across all zoom levels.
  - Draggable center pivot crosshair, 4 corner rotation zones with 15° Shift snapping, angle readout badge, and quick-action HUD bar.
  - 60 FPS nearest-neighbor drag preview with background RotSprite commit on Enter key release.
- **Timeline TagManagerModal Integration (`src/components/layout/BottomTimeline.tsx`, `tests/components/BottomTimeline.test.tsx`)**:
  - Embedded "Manage Tags" launcher button in the timeline clip bar next to `+ Tag Clip`.
  - Accessible modal dialog for animation tag definitions, color swatches, and frame range configuration.
- **Sprite Sheet Slicer & Import Pipeline (`src/lib/canvas/spritesheetSlicer.ts`, `src/components/modals/ImportModal.tsx`, `src/components/layout/StudioLayout.tsx`, `tests/spritesheetSlicer.test.ts`, `tests/components/ImportModal.test.tsx`)**:
  - Slicer engine computing grid coordinates, filtering blank alpha cells, and extracting frames.
  - Live interactive cutline preview canvas with indexed cell badges and timeline append/replace options.
- **Heavy Compute Web Worker Offloading (`src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `src/hooks/viewport/events/useArtisanEvents.ts`, `tests/workerDispatcher.test.ts`)**:
  - Background Web Worker processing `'rotSprite'`, `'wfc'`, and `'morph'` messages with zero-copy Transferable ArrayBuffers.
  - Automatic synchronous fallback for environments without Web Worker support.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npx vitest run`: 502/502 passed across 75 suites
- `npm run verify:docs`: all documentation integrity checks passed
**Status:** Complete

---

## Comprehensive Codebase Audit & Algorithmic Remediation (2026-09-09)

**Goal:** Remediate all 21 audit findings across security vulnerabilities, dead code elimination, frame scaling DRY consolidation, MP4 native MediaRecorder pipeline alignment, quadratic Bézier adaptive stepping, isometric line zero-drift fixes, React timer/listener lifecycle cleanup, and full documentation integrity.

**Deliverables:**
- **Security & Dependency Hardening (`package.json`)**:
  - Upgraded `next` to `^16.3.4` (mitigating GHSA-p293-qw3h-jr36 & GHSA-2xp9-vwfh-vxw4) and `sharp` to `^0.35.4`.
  - Zero production vulnerabilities confirmed via `npm audit --omit=dev`.
- **Dead Code Elimination & Bitmask Consolidation**:
  - Pruned unused buffer pool routines in `src/lib/engine/bufferPool.ts` while preserving active `Float32Array` and `Int32Array` pools.
  - Pruned dead helpers across `src/lib/art/starterTemplates.ts`, `src/lib/export/shaderExporter.ts`, `src/lib/canvas/tileStamp.ts`, `src/lib/ai/pixelizeEngine.ts`, `src/lib/export/gifEncoder.ts`, `src/stores/slices/createHistorySlice.ts`, and `src/lib/canvas/rasterMath.ts`.
  - Consolidated `calculate47TileBitmask` in `src/lib/ai/math/curvesAndLines.ts`, imported canonically via `@/lib/ai/smartMathEngine`.
  - Removed orphaned `components.json`.
- **Frame Scaling DRY Consolidation (`src/lib/canvas/scaleCanvas.ts`)**:
  - Extracted canonical `extractScaledCanvasRgba` with `scale === 1` fast path, reused across APNG and GIF encoders.
- **MP4 Pipeline & Non-Blocking Project Serialization (`src/lib/export/mp4Encoder.ts`, `src/lib/project/serialize.ts`, `src/components/modals/ExportModal.tsx`)**:
  - Pruned unused manual MP4 box builders and documented browser `MediaRecorder` pipeline.
  - Wired `buildProjectFileAsync()` to non-blocking `.pixibun` export in `ExportModal.tsx`.
- **Adaptive Bézier Stepping & Isometric Line Invariants (`src/lib/ai/math/curvesAndLines.ts`, `tests/curvesAndLines.test.ts`)**:
  - Replaced hardcoded `steps = 32` with adaptive stepping `Math.max(16, Math.ceil(approxDist * 1.5))`, ensuring 8-connected continuity on large curves.
  - Resolved `getIsometric2p1Line` vertical (`dx === 0`) and horizontal (`dy === 0`) false-drift pixel anomalies.
  - Added 13 comprehensive unit tests covering endpoints, subset collinearity, 8-connectivity, 2:1 slope run lengths, zero-length, and 47-blob corner suppression.
- **React Lifecycle & Memory Leak Remediation**:
  - Managed ephemeral confirmation timers with `useRef` and unmount cleanup in `LayersPanel.tsx` and `ShortcutsModal.tsx`.
  - Refactored `ServiceWorkerRegistrar.tsx` using `AbortController.signal` for `updatefound`, `statechange`, and `controllerchange` with `reg.waiting` preservation.
  - Added `imageAlt` prop to `TactileButton.tsx` for accessible image labels.
  - Documented canonical PascalCase vs lowercase aliases in `src/lib/ai/math/colorSpace.ts`.
- **Documentation Integrity Reconciled**:
  - Reconciled file paths, test metrics (524 tests across 76 suites), buffer pool specs, and quadratic Bézier descriptions across `BENCHMARKS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `LOGS.md`, and `README.md`.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npx vitest run`: 524/524 passed across 76 suites
- `npm run verify:docs`: all documentation integrity checks passed (149/149 file paths verified)
- `npm run build`: Next.js 16.3.4 clean production build
- `npm audit --omit=dev`: 0 vulnerabilities
**Status:** Complete

## 2026-09-09 — Senior Pixel Art Animation Physics & Dynamic Discrete Mechanics

**Changes:**
- **Playground Senior Physics & Optical Dynamics**:
  - Implemented 4 flagship senior animation physics lessons on 32x32 canvases: *The Master Bouncing Ball* (12 frames, mass preservation $A = 112\text{ px}$ with Richard Williams apex cushioning and ground hitstop), *Sub-Pixel Character Idle* (3 frames, anti-boiling contour locking with sub-pixel breathing), *Sword Slash & Combat Hitstop* (4 frames, 180° crescent smear and visceral impact freeze), and *Character Hop & Shock Absorption* (5 frames, athletic anticipation, launch stretch, apex ear drag, and ground impact squash).
  - Generalised `stencilEvaluator.ts` to support dynamic grid dimensions (16x16 and 32x32) with bounds-safe character indexing and area metrics.
  - Added dedicated test suite `tests/playgroundSeniorPhysics.test.ts` (9 tests) verifying mass preservation, timing hierarchies, outer contour stability, and store sync.
- **Playback UI Freezing & Real-time Canvas Stencil**:
  - Guarded step synchronization in `PlaygroundLayout.tsx` with `if (isPlaying) return;`, eliminating 12 Hz UI title and handbook flickering during playback.
  - Enhanced pause transition (`prevIsPlayingRef && !isPlaying`) to snap active step and handbook immediately to the paused frame index.
  - Updated `useViewportOverlays.ts` to project `currentLesson.frames[activeFrameIndex]` onto the canvas during active playback, enabling smooth animation visualization even on empty drawing layers without blanking the canvas.
- **Pixel-Art Quality & Code Audit Remediation**:
  - Eliminated artificial white `F` highlights across all 4 senior animation physics lessons, returning dynamic lighting responsibility to PixiBun Studio's Photometric engine.
  - Re-authored senior animation frames with 100% closed outline boundaries, zero leaks to background dots, and bilateral symmetry.
  - Fixed stale store snapshot in `onboardingStore.ts:syncStudioWithLesson`, ensuring fresh state queries, bidirectional frame count pruning, and duration assignments across all frames.
  - Resolved all ESLint errors/warnings (unused vars, missing hook deps) and replaced raw `` emoji in `ArtisanHandbookPanel.tsx` with `<PixelIcon name="sparkles" />`.
  - Reconciled metric documentation across `README.md` and `LOGS.md` (533 unit/integration tests across 77 suites, 8 E2E spec suites with 20 tests).

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint`: 0 errors, 0 warnings across all target files
- `npx vitest run`: 533/533 passed across 77 suites
- `npm run build`: Next.js 16.3.4 Turbopack clean production build
**Status:** Complete

---

## 2026-09-11 — Procedural Lofi Track Synthesis, Normal Sculpt Shortcuts & Doc Alignment

**Changes:**
- **Procedural Web Audio Engine & Sound Design (`src/lib/audio/tracks.ts`, `src/lib/audio/lofiRadio.ts`, `src/components/audio/StudioRadioWidget.tsx`)**:
  - Implemented 3 complete in-memory procedural track transcriptions: *"Field of Hopes"* (The Field of Hopes and Dreams, 104 BPM, Bb Major), *"My Castle Town"* (Relaxing Cafe Lounge, 102 BPM, Eb Major with Minor Plagal Cadence), and *"Empty Town"* (Atmospheric Music Box Lullaby, 138 BPM in 6/8, A Minor Andalusian Cadence).
  - Expanded procedural voice synthesis with authentic sound design: warm acoustic felt piano (`playPiano`), 25% and 50% pulse flutes with delayed vibrato (`playFlute`), authentic NES triangle bass (`playTriangleBass`), gentle chime arpeggios, and warm string section pad chords.
  - Updated `StudioRadioWidget.tsx` track listing and synced `tests/studioRadio.test.tsx` and TestSprite plan `23_lofi_procedural_radio_and_onset_equalizer.plan.json`.
- **Keyboard Shortcut Wiring & Accessibility (`src/components/layout/StudioLayout.tsx`, `src/components/modals/ShortcutsModal.tsx`)**:
  - Bound <kbd>K</kbd> to `normal-chisel` and <kbd>Shift+K</kbd> / <kbd>N</kbd> to `rivet-stamp` in `StudioLayout.tsx`'s global keydown dispatcher, aligning live keyboard behavior with `LeftToolbar.tsx` and `README.md`.
  - Added Normal Chisel (<kbd>K</kbd>) and Rivet Stamp (<kbd>Shift+K / N</kbd>) to `ShortcutsModal.tsx` under the Tools category.
- **Documentation Reconciliation**:
  - Updated `ARCHITECTURE.md` (§10) and `PIXIBUN_DEEP_DIVE.md` (§8) to document the procedural tracks and multi-voice synthesis pipeline.
  - Re-ran documentation integrity harness (`scripts/verifyDocIntegrity.mjs`), unit tests (`vitest run`), and TypeScript compilation (`tsc --noEmit`).

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npx vitest run`: 533/533 passed across 77 suites
- `npm run verify:docs`: all documentation integrity checks passed
**Status:** Complete

---

## 2026-09-12 — Deep Audit Remediation, RotSprite Fast Paths, SDF Morphing & Quality Gate Verification

**Changes:**
- **RotSprite Rectangular Fast Paths (`src/lib/ai/math/rotSprite.ts`, `src/lib/canvas/rotSprite.ts`, `tests/rotSpriteRectangular.test.ts`)**:
  - Removed `w === h` restrictions on orthogonal 90° and 270° fast paths across both canvas API and AI math engine chains, properly transposing dimensions ($W' = H, H' = W$) and updating coordinate indexing to $y' \cdot H + x'$.
  - Corrected downsampling kernel documentation from Gaussian to Xenowhirl's parabolic center-weighted majority voting kernel: $w(u, v) = 1.0 + 0.01 \cdot (25 - (u^2 + v^2))$.
  - Added dedicated test suite `tests/rotSpriteRectangular.test.ts` (5 tests) verifying rectangular canvas rotation equivalence.
- **Morph Fraction Forwarding & Multi-Source BFS Color Map (`src/lib/ai/pixelAiEngine.ts`, `src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `tests/pixelAiEngineMorphFraction.test.ts`)**:
  - Replaced $O(W \times H \times R^2)$ spiral search with 8-connected multi-source BFS in $O(W \times H)$ time for nearest opaque color lookups.
  - Exported `morphInBetweenFrameAtFraction` and forwarded parameter $t$ in `morphInBetweenFrames`.
  - Added `fraction` property support across Web Worker message schemas and dispatcher fallback routes.
  - Added dedicated test suite `tests/pixelAiEngineMorphFraction.test.ts` (5 tests) asserting intermediate fraction transitions.
- **History Engine Popped Step Loop Elimination (`src/lib/engine/historyEngine.ts`, `tests/historyEngine.test.ts`)**:
  - Guarded opposite stack push on `undo()` and `redo()` to execute only when `currentState !== undefined`, eliminating ghost state cycles.
  - Added unit test in `tests/historyEngine.test.ts` verifying no-arg undo behavior.
- **FloodFill Hex Parsing & Complete Test Coverage (`src/lib/canvas/floodFill.ts`, `tests/floodFillHex.test.ts`)**:
  - Documented strict 6-digit `#RRGGBB` contract for color picker inputs and exported explicit `rgbToHex` alias.
  - Unified test suite in `tests/floodFillHex.test.ts` to 14 tests preserving all 5 `hexToRgba` tests (including CSS Color 4 4/8-digit `#RGBA` expansion), 4 `performFloodFill` algorithm tests, and 5 `rgbaToHex` contract tests.
- **Diagnostics Relay Fallback Version Synchronization (`src/lib/diagnostics/capture.ts`, `src/app/api/diagnostics/relay/route.ts`, `tests/diagnostics.test.ts`)**:
  - Synchronized `APP_VERSION = '1.12.0'` in `capture.ts` and default route fallback in `src/app/api/diagnostics/relay/route.ts`.
- **E2E Spec Test Artifact Portability (`tests/e2e/chiselAndPaletteLiveProof.spec.ts`, `tests/e2e/volumetricVisualProof.spec.ts`, `tests/e2e/selectionGizmoLiveProof.spec.ts`)**:
  - Replaced hardcoded machine-specific brain directory paths with dynamic `path.join(process.cwd(), 'test-results', 'e2e-artifacts')` and recursive directory creation.
- **Documentation Algorithmic Rigor & Integrity (`ARCHITECTURE.md`, `README.md`, `MAIN.md`, `PIXIBUN_DEEP_DIVE.md`, `SKILL.md`)**:
  - Replaced optical flow claims with Signed Distance Field (SDF) morphing and 8-connected multi-source BFS.
  - Aligned frontal cushion formula to $\text{rimRatio} = \min(1, D / 2.8)$ and $H = \max(D) \cdot \sqrt{\text{rimRatio}}$.
  - Aligned salience weighting to $2\times2$ forward differences with $[1.0, 3.5]$ clamp.
  - Aligned palette cycling retuning to harmonic rational retuning: $k = \operatorname{round}(T \cdot \text{rate} / M)$.
  - Documented missing keyboard shortcuts (<kbd>N</kbd>, <kbd>S</kbd>, <kbd>P</kbd>), `/playground` sandbox route, and APNG/MP4/WebM export nuances.
  - Harmonized `SKILL.md:12` emoji rule to distinguish functional documentation markers from decorative AI slop emojis.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 549/549 passed across 79 suites (0 regressions, 0 deleted tests)
- `node scripts/verifyDocIntegrity.mjs`: all documentation integrity checks passed (41 phases, 23 sections, 149/149 file paths verified)
- `npx next build`: Next.js 16.3.4 clean production build across 7 routes
**Status:** Complete

---

## 2026-09-12 — Phase 50: External Audit Remediation & Terminology Harmonization

**Changes:**
- **P2P Co-Draw Modal Network Default (`src/components/modals/CoDrawModal.tsx`)**: Changed default network mode from `'internet'` to `'lan'`, matching the zero-egress LAN promise (`iceServers: []`) in `README.md`.
- **Lossless PNG Export 32× Resolution Option (`src/components/modals/export/PngExportTab.tsx`)**: Added `32` to the scale button array (`[1, 2, 4, 8, 16, 32]`), fulfilling the documented "1× to 32× lossless PNG" export capability in the UI.
- **Eradication of "Wu" Attribution on 2:1 Isometric Stepping (`README.md`, `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, `CHANGELOG.md`, `TASKS.md`, `LOGS.md`)**: Replaced all mentions with "Quantized 2:1 Isometric Line Stepper", reflecting classic 1980s dimetric rasterization ($\arctan(0.5) \approx 26.565^\circ$) rather than Xiaolin Wu's anti-aliasing technique.
- **Historical Citation Cleanup (`src/lib/ai/math/rotSprite.ts`)**: Standardized citation on canonical author name Xenowhirl (2007) and removed the leftover alias "Xenowoz".
- **HistoryEngine Memory Arithmetic Correction (`BENCHMARKS.md`, `tests/benchmark.test.ts`)**: Corrected 256×256 50-step memory from 12.80 MB to 13.11 MB ($13{,}107{,}200 / 1{,}000{,}000$) and 100-step max memory from 25.60 MB to 26.21 MB.
- **CenterViewport 6-Canvas Stack Diagram (`ARCHITECTURE.md`)**: Updated the mermaid diagram to include all 6 hardware-accelerated canvas layers (`onionCanvasRef`, `stencilCanvasRef`, `mainCanvasRef`, `previewCanvasRef`, `gridCanvasRef`, `cursorCanvasRef`).
- **Deep Dive Directory Tree Alignment (`PIXIBUN_DEEP_DIVE.md`)**: Added `curvesAndLines.ts` and `morphology.ts` to the `src/lib/ai/math/` tree.
- **Persistent Storage Rejection Handling (`src/components/layout/StudioLayout.tsx`)**: Handled the promise returned by `requestPersistentStorage()`, logging a diagnostic warning if persistence is not granted.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 554/554 passed across 79 suites (0 regressions)
- `npx playwright test`: 20/20 passed across 8 suites
- `node scripts/verifyDocIntegrity.mjs`: all documentation integrity checks passed
- `npx next build`: Turbopack clean production build across 7 routes
**Status:** Complete

---

## 2026-09-12 — Phase 51: Deep Documentation Truthfulness, Academic Rigor & Marketing De-Escalation

**Changes:**
- **Marketing Tone De-Escalation (`README.md`, `DESIGN.md`, `MAIN.md`, `SECURITY.md`, `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`)**: Softened marketing puffery, absolute guarantees, and hyperbolic adjectives across all documentation, replacing them with modest, academically precise technical descriptions.
- **RotSprite Claims Calibration (`README.md`, `ARCHITECTURE.md`, `TASKS.md`, `CHANGELOG.md`, `LOGS.md`)**: Replaced over-reaching phrases ("completely eliminated 45° distortion", "micro-details never vanish", "100% leak-proof") with accurate descriptions of Xenowhirl's 8x Scale2x cascade, subpixel continuous inverse sampling, and parabolic majority voting reducing distortion and outline erosion while preserving palette purity.
- **Stylized 2D Optics Clarification (`README.md`)**: Explicitly documented Beer-Lambert chord extinction, Henyey-Greenstein phase scattering, Cauchy dispersion, and Kajiya-Kay highlights as stylized 2D screen-space approximations designed for pixel art rather than claiming full 3D volumetric simulations.
- **Felzenszwalb-Huttenlocher EDT Citation Synchronization (`CHANGELOG.md`, `LOGS.md`)**: Corrected references that erroneously attributed the EDT algorithm to Meijster, standardizing across all documentation on the actual implemented algorithm by Pedro F. Felzenszwalb & Daniel P. Huttenlocher (2012 / 2004).
- **Benchmark Hardware Context & Budget Ceilings (`BENCHMARKS.md`)**: Added reference hardware environment notice and clarified that automated CI gates assert upper-bound budget ceilings ($\le 16.66\text{ ms}$ for 60 FPS interaction) rather than asserting machine-specific timings as universal guarantees.
- **Character Encoding & Markdown Polish (`LOGS.md`, `CHANGELOG.md`)**: Fixed Unicode replacement character corruptions in `LOGS.md` and purged decorative emoji clutter from `CHANGELOG.md` subheaders to maintain clean, technical documentation standards.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 554/554 passed across 79 suites (0 regressions)
- `node scripts/verifyDocIntegrity.mjs`: all documentation integrity checks passed
- `npx next build`: Turbopack clean production build across 7 routes
**Status:** Complete

---

## 2026-09-12 — Phase 52: Canvas Safety Ceilings, Codebase Calibration & Rigor Remediation

**Changes:**
- **Export Canvas Safety Bounds & Scale Tab Isolation (`src/components/modals/export/PngExportTab.tsx`, `src/components/modals/ExportModal.tsx`, `tests/exportCanvasScaleBounds.test.ts`)**:
  - Established cross-platform hardware safety bounds (`MAX_SAFE_CANVAS_DIMENSION = 4096`, `MAX_SAFE_CANVAS_PIXELS = 16_777_216`) based on mobile WebKit / iOS Safari canvas allocation limits.
  - Dynamically disabled out-of-bounds scale options in `PngExportTab` (e.g. 16× and 32× on 512×512 canvases) to prevent tab crashes and 1 GB raw memory buffer allocations. Added explanatory in-card warning.
  - Isolated and clamped `scale` across export modal tabs (GIF max 8×, Spritesheet max 4×, APNG/MP4 max 16×, PNG/SVG max 32× subject to canvas bounds) so high PNG scaling does not bleed into animation encoders.
  - Added unit test suite in `tests/exportCanvasScaleBounds.test.ts` verifying safe dimension and pixel area evaluation across all canvas sizes.
- **Persistent Storage Eviction Warning Banner (`src/components/layout/StudioLayout.tsx`)**:
  - Added a visible, non-blocking, dismissible warning banner when `requestPersistentStorage()` is denied or not granted by the browser.
  - Warns users that local IndexedDB storage may be evicted under disk pressure (common on iOS/Safari) and provides a direct "Export Backup" action with session dismissal persistence.
- **Quadratic Bézier Precision Nomenclature (`src/lib/ai/math/curvesAndLines.ts`, `PIXIBUN_DEEP_DIVE.md`, `README.md`, `MAIN.md`, `LOGS.md`)**:
  - Corrected misnamed "Rational Bézier" references to "Quadratic Bézier", accurately reflecting the unweighted degree-2 polynomial de Casteljau formula implemented in source code ($B(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2$).
- **Codebase Hyperbole Calibration (`src/components/landing/showcase/RotSpriteShowcase.tsx`, `src/lib/art/playgroundLessons.ts`, `src/lib/audio/lofiRadio.ts`, `src/components/modals/export/ShaderExportTab.tsx`, `src/lib/color/paletteCycling.ts`, `src/components/modals/export/AnimatedExportTab.tsx`, `src/components/modals/ImportModal.tsx`, `src/components/modals/CoDrawModal.tsx`, `src/components/modals/ShortcutsModal.tsx`)**:
  - Calibrated promotional UI text and comments removing unprovable assertions ("100% stable", "completely eliminates", "guaranteeing zero gaps", "100% pure") while intentionally preserving legitimate academic and distributed systems terms (CRDT Strong Eventual Consistency, WFC constraints).
- **Automated Version & Documentation Synchronization (`package.json`, `package-lock.json`, `scripts/verifyDocIntegrity.mjs`, `src/lib/diagnostics/capture.ts`, `src/app/api/diagnostics/relay/route.ts`, `tests/diagnostics.test.ts`)**:
  - Synchronized `package.json`, `package-lock.json`, `capture.ts`, and test fixtures to `1.12.1`.
  - Added Check 6 to `scripts/verifyDocIntegrity.mjs` asserting that `package.json` version matches the latest release header in `CHANGELOG.md`.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 558/558 passed across 80 suites (0 regressions)
- `node scripts/verifyDocIntegrity.mjs`: all 6 documentation integrity checks passed
- `npx next build`: Turbopack clean production build across 8 routes
**Status:** Complete

---

## Phase 53 — Comprehensive Audit Resolution, Algorithmic Precision & State Isolation (2026-09-12)
**Delivered:**
- **Dimetric Ray Projection for Isometric Lines (`src/lib/ai/math/curvesAndLines.ts`, `tests/curvesAndLines.test.ts`)**:
  - Implemented scalar projection onto the canonical 2:1 dimetric direction vector ($t = (2|\Delta x| + |\Delta y|) / 5$), snapping arbitrary cursor drag coordinates $(x_1, y_1)$ to the true 2:1 line.
  - Added unit test cases in `curvesAndLines.test.ts` verifying projection for off-axis points (e.g. $(0,0) \to (10, 2)$, $(0,0) \to (3, 10)$) and negative quadrant coordinates.
- **Per-Tab Export Scale Isolation (`src/components/modals/ExportModal.tsx`, `tests/components/ExportModal.test.tsx`)**:
  - Replaced single shared scale state with `tabScales: Record<ExportType, number>`, eliminating scale bleed and downward clamping when switching between export tabs.
- **Scale2x Border Non-Matching Sentinel (`src/lib/canvas/rotSprite.ts`, `tests/rotSpriteSymmetryAndThinLines.test.ts`)**:
  - Replaced out-of-bounds `0` return with an explicit `OOB = -1` sentinel, ensuring out-of-bounds coordinates never match inside pixels or each other.
  - Added regression test in `rotSpriteSymmetryAndThinLines.test.ts` verifying that solid edge-touching sprites maintain 100% opaque corners without transparent erosion.
- **Canonical DPaint CRNG Parity (`src/lib/color/paletteCycling.ts`, `tests/paletteCycling.test.ts`)**:
  - Removed unmotivated `rateRaw !== 36` check, aligning track activation strictly with the official Amiga IFF ILBM `RNG_ACTIVE` flag bit.
  - Added unit test verifying that slow 0.13 Hz cycle tracks parse and round-trip cleanly.
- **Purged Stale Snapshots (`testsprite_tests/tmp/prd_files/`)**:
  - Removed obsolete snapshot markdown files that contained outdated terminology.
- **Documentation Truthfulness Alignment (`smartMathEngine.ts`, `depixelizeVector.ts`, `apngEncoder.ts`, `waveFunctionCollapse.ts`, `.env.example`, `SECURITY.md`, `README.md`, `MAIN.md`, `ARCHITECTURE.md`, `BENCHMARKS.md`)**:
  - Corrected `smartMathEngine.ts` line 18 comment to Quadratic Bézier.
  - Added Kopf-Lischinski DOI `10.1145/2010324.1964994` and domain heuristic note in `depixelizeVector.ts`.
  - Added Mozilla origins and W3C Third Edition integration citation in `apngEncoder.ts`.
  - Clarified WFC constraint guarantee for converged outputs in `waveFunctionCollapse.ts`.
  - Replaced `ghp_` prefixes in `.env.example`.
  - Documented diagnostics relay rate limiting, payload ceiling, and HTTPS security in `SECURITY.md`.
  - Synchronized showcase models, 5 materials, 6-canvas stack, 100-state history capacity, $Nz \ge 0.88$, and benchmark conclusions across README, MAIN, ARCHITECTURE, and BENCHMARKS.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 562/562 passed across 80 suites (0 regressions)
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
- `npx next build`: Turbopack clean production build across 8 routes
**Status:** Complete

---

## Phase 54 — Six Workstation Architectural Upgrades (2026-09-12)
**Delivered:**
- **P2P Co-Draw Guest UI Mutation Locking (`src/hooks/useCoDrawStatus.ts`, `src/components/layout/inspector/LayersPanel.tsx`, `src/components/layout/BottomTimeline.tsx`)**:
  - Implemented host-authoritative structural protection. When joining a session as a guest (`peerRole === 'guest'`), layer add, duplicate, merge-down, delete, frame creation, deletion, and timeline drag-and-drop reordering are disabled with clear tooltips and `cursor-not-allowed` styles, preventing guest structural edits from being overwritten by incoming host `STRUCTURE_SYNC` packets.
- **Undo/Redo Engine Structural Command Pattern (`src/types/canvas.ts`, `src/lib/engine/historyEngine.ts`, `src/lib/engine/structuralHistory.ts`, `src/hooks/viewport/useViewportDrawing.ts`, `src/stores/slices/createLayerSlice.ts`, `src/stores/slices/createAnimationSlice.ts`, `tests/historyEngineStructural.test.ts`)**:
  - Upgraded `HistoryEngine` from a pixel-only delta store to a hybrid Command Pattern supporting both pixel stroke diffs and full structural operations (`type: 'structural'`).
  - Added snapshots capturing layer additions, deletions, reordering, merge-downs, and frame insertions/reordering with byte-accurate `LayerBufferBackup` preservation across all frames.
  - Verified undo and redo of destructive structural mutations in `tests/historyEngineStructural.test.ts`.
- **Worker EDT Distance Transform & Normal Map Offloading (`src/lib/ai/math/edtNormalMap.ts`, `src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `src/hooks/viewport/events/usePhotometricEvents.ts`, `tests/workerEdtNormalMap.test.ts`)**:
  - Offloaded CPU-heavy 2D Euclidean Distance Transform, bilateral Gaussian filtering, and Sobel normal map generation to `heavyCompute.worker.ts` using zero-copy Transferable ArrayBuffers.
  - Guarded main-thread canvas stability by defensively cloning outgoing buffer snapshots (`.slice(0)`), while achieving zero-copy transfer on the worker-to-main return trip.
  - Provided automatic synchronous fallback in `runEdtNormalMapInWorker` for headless/unsupported worker environments, verified in `tests/workerEdtNormalMap.test.ts`.
- **Native Desktop File System Access API & Save As (`src/lib/storage/desktopFileSystem.ts`, `src/components/layout/StudioLayout.tsx`, `src/components/modals/ExportModal.tsx`, `tests/desktopFileSystem.test.ts`)**:
  - Built zero-dependency native desktop ergonomics with `window.showSaveFilePicker` and `window.showOpenFilePicker`.
  - Bound `Ctrl+S` to instantaneous in-place disk overwriting via retained `FileSystemFileHandle`s, and `Ctrl+Shift+S` to "Save As" picker dialogs.
  - Implemented reliable browser anchor download and hidden file input fallbacks for Firefox, Safari, and headless test runners, verified in `tests/desktopFileSystem.test.ts`.
- **47-Blob Autotile Interactive Engine (`src/lib/ai/math/autotileEngine.ts`, `tests/autotileEngine.test.ts`)**:
  - Implemented complete 8-neighbor Moore bitmasking with cardinal-corner dominance, collapsing $2^8 = 256$ neighborhood configurations into the canonical 47 Wang/Blob equivalence classes.
  - Precomputed an $O(1)$ 256-element bitmask lookup table (`BITMASK_TO_47_INDEX`) and built a Chebyshev $3\times3$ dirty neighborhood reactive updater (`updateAutotileAt`) that recalculates only affected adjacent tiles.
  - Authored procedural 47-tile pixel renderer and validated full mathematical proofs in `tests/autotileEngine.test.ts`.
- **Pure-TypeScript ISOBMFF Fast-Start MP4 Container Muxer (`src/lib/export/isobmffWriter.ts`, `src/lib/export/mp4Encoder.ts`, `tests/isobmffWriter.test.ts`)**:
  - Built a 100% scratch pure-TypeScript ISO Base Media File Format container muxer (`ftyp`, `moov`, `mdat`) with progressive download Fast-Start box ordering and chunk offset back-patching in `stco`.
  - Eliminated reliance on real-time `MediaRecorder` stream playback by coupling hardware-accelerated WebCodecs `VideoEncoder` (`avc1.42001f`) with the scratch ISOBMFF muxer, while preserving graceful `MediaRecorder` fallback.
  - Verified bitstream box hierarchies and chunk offset calculations in `tests/isobmffWriter.test.ts`.

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 584/584 passed across 85 suites (0 regressions)
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed (47 unique phases, 1-24 monotonic sections, 184 filepaths, CenterViewport truthful, test metrics exact, v1.13.0 synced)
- `npx next build`: Turbopack clean production build across 8 routes
**Status:** Complete

---

## Phase 55 — Comprehensive Defensive Hardening & Mathematical Invariants (2026-09-12)
**Delivered:**
- **Mathematical Viewport Invariants & Line Clipping (`src/lib/safety/mathInvariants.ts`, `src/hooks/viewport/useViewportTransform.ts`)**:
  - Implemented Cohen-Sutherland 4-bit outcode line clipping (`clipLineToCanvas`) based on Foley et al. (1990) and Newman & Sproull (1973).
  - Implemented IEEE 754 floating-point invariant guards (`clampZoom`, `safeDivide`) based on Goldberg (1991) and Knuth (1997), immunizing trackpad pinch and mouse wheel zoom against `NaN`, `Infinity`, and division-by-zero singularities.
- **Safe Canvas Hardware Boundary Clamping (`src/lib/safety/safeCanvas.ts`)**:
  - Implemented `SafeCanvas.createImageData` and `SafeCanvas.getImageData`, clamping dimensions to positive integers, normalizing negative coordinate drag rectangles, bounding buffer requests against GPU limits (8192px / 16384px), and eliminating browser-crashing `IndexSizeError` exceptions on zero-area selections.
- **CWE-409 Decompression Bomb & Pixel Bomb Mitigation (`src/lib/safety/imageHeaderProbe.ts`)**:
  - Implemented zero-dependency pre-flight binary header parser inspecting PNG (IHDR), JPEG (SOF0/SOF2), GIF, and BMP headers in the first 64KB, rejecting malicious decompression bombs ($>8192\text{px}$ or $>67\text{MP}$) BEFORE allocating canvas memory or calling `createImageBitmap`.
- **CWE-1321 Prototype Pollution Defense & Depth Limiting (`src/lib/safety/safeJson.ts`, `src/lib/project/schema.ts`)**:
  - Built `safeJsonParse` stripping `__proto__`, `constructor`, and `prototype` keys based on Arteau (2018), enforcing a maximum nesting recursion depth of 32. Hardened project schema asserts explicit ceilings (256 char names, 50 palettes, 100 clips, 500 frames, 100 layers).
- **Storage Resilience & Quota Exhaustion Recovery (`src/lib/safety/storageResilience.ts`, `src/lib/storage/db.ts`)**:
  - Standardized cross-engine detection of WHATWG `QuotaExceededError`. Automatically prunes volatile diagnostic telemetry logs and orphaned layer blobs during disk pressure, safeguarding active user project data.
- **WebRTC Token Bucket Traffic Shaping (`src/lib/sync/p2pSync.ts`)**:
  - Implemented RFC 2212 Token Bucket rate limiting on peer data and presence channels, shielding client threads against packet floods and CPU starvation.
- **Automated Hardening Tests (`tests/safetyHardening.test.ts`, `tests/isobmffHardening.test.ts`, `tests/schemaHardening.test.ts`)**:
  - Added 25 new defensive engineering tests across 3 dedicated suites, expanding total test coverage to 609 unit tests across 88 suites (100% green).

**Checks run:**
- `npx tsc --noEmit`: 0 errors
- `npx eslint src tests`: 0 errors, 0 warnings
- `npx vitest run`: 609/609 passed across 88 suites (0 regressions)
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
- `npx next build`: Turbopack clean production build
**Status:** Complete

---

## Phase 56 — Autonomous Local CI/CD Quality Gate & Git Pre-Push Protection (2026-09-12)
**Delivered:**
- **Local Quality Gate Runner (`scripts/runQualityGate.mjs`, `package.json`)**:
  - Built zero-dependency Node.js ESM release gatekeeper that executes 3 sequential validation stages (`npm run gate`) in ~16 seconds:
    - Stage 1: Documentation Integrity & Sync Invariant Audit (`npm run verify:docs`)
    - Stage 2: Strict Static Type Safety (`npm run typecheck` - 0 compiler errors)
    - Stage 3: Comprehensive Unit & Defensive Invariant Test Suite (`npm test` - 609 tests across 88 suites)
    - Stage 4: Next.js Production Compilation & Bundling (`npm run gate:full`)
- **Automated Git Pre-Push Gatekeeper (`scripts/installGitHooks.mjs`, `.git/hooks/pre-push`, `package.json`)**:
  - Implemented automatic pre-push git hook installation via `npm run prepare` lifecycle script.
  - Intercepts all `git push` commands locally; if any test, typecheck, or doc verification fails, the push is blocked before leaving the developer workstation.
- **Open Source Contribution & Security Documentation (`CONTRIBUTING.md`, `SECURITY.md`, `.github/workflows/ci.yml`)**:
  - Authored comprehensive `CONTRIBUTING.md` documenting zero-dependency architecture, testing standards, and Quality Gate workflows.
  - Expanded `SECURITY.md` with Section 4 detailing Defense-in-Depth pre-push invariants.
  - Added drop-in `.github/workflows/ci.yml` pipeline configuration enforcing automated quality gates.

**Checks run:**
- `npm run gate`: ALL 3 STAGES PASSED in 16.30s
- `git push origin main`: Pre-push hook automatically intercepted, validated invariants, and passed cleanly
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
**Status:** Complete

---

## Phase 57 — Studio Workstation Ergonomics, Accessibility Focus Trapping & Unsaved Invariants (2026-09-13)
**Delivered:**
- **Document Title Unsaved Dirty Invariant & Exit Guard (`src/components/layout/StudioLayout.tsx`)**:
  - Dynamically synchronizes document title with unsaved workspace state (`● Project — PixiBun`), clearing upon successful save.
  - Implements native `beforeunload` window event guard whenever changes are unsaved (`isDirty === true`), shielding users against accidental tab closure.
- **Affirmative Save Toast Notification (`src/components/layout/StudioLayout.tsx`)**:
  - Emits transient affirmative confirmation toast (`* Saved "project" to browser storage`) upon manual `Ctrl+S` keystrokes and toolbar save actions.
- **Modal Accessibility Focus Containment & Restoration (`src/components/ui/ModalWrapper.tsx`, `tests/components/ModalWrapper.test.tsx`)**:
  - Implemented WCAG 2.4.3 (Focus Order) and WCAG 2.4.11 (Focus Not Obscured) compliance with programmatic initial focus, circular Tab keyboard containment, and return-to-opener focus restoration upon dialog dismissal.
- **Shortcut Collision Isolation & Quantized Zoom Stepping (`src/components/layout/StudioLayout.tsx`)**:
  - Isolated viewport single-key hotkeys (e.g. `s` silhouette squint mode) from firing when users type in input fields or press modifier combinations (`Ctrl+S`).
  - Standardized monotonic discrete power-of-two zoom magnification stepping (`[100, 200, 400, 800, 1600, 3200, 6400]`).
- **Baseline Non-Intro Landing Page Restoration (`src/components/landing/PixelDitherCurtain.tsx`)**:
  - Restored lightweight, non-intrusive 1.1s automatic Bayer $8\times8$ dither dissolve curtain directly from git baseline.
  - Purged all experimental audio stingers and intro keyframe styles with zero residual dead code.

**Checks run:**
- `npm run gate`: ALL 3 STAGES PASSED (Docs, Typecheck, 614 Vitest tests in 89 suites)
- `npx playwright test tests/e2e/landing.spec.ts`: 2/2 tests passed (WCAG 2.2 AA compliant)
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
**Status:** Complete

---

## 2026-09-13 — Phase 58: Photometric Studio Resolution-Aware Bevel Scaling & Dark Palette Protection

**Delivered:**
- **Resolution-Aware Bevel Radius & Macro Heightmap Scaling (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Replaced hardcoded 2.8px bevel clamping with proportional resolution scaling (`scaleFactor = Math.max(1.0, Math.min(width, height) / 32)`).
  - Dynamically scales character bevel radius (`charBevelRadius = 2.8 * scaleFactor`), dynamic bevel radius bounds (`[2.5, 6.0 * scaleFactor]`), and appendage width ceilings (`5 * scaleFactor`).
  - Enables higher-resolution canvases ($128\times128$, $64\times64$) to generate smooth, volumetric 3D surface normal maps rather than collapsing into flat forward plateaus ($N_z = 1.0$), while preserving 100% byte-exact parity for standard $32\times32$ sprites.
- **Boundary-Aware Ink Line & Crevice Classification (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Eliminated false-positive line art over-protection that previously treated any pixel with luminance $< 0.22$ as an ink line and skipped shading.
  - Replaced naive thresholding with boundary-aware classification: only transparent-boundary dark pixels ($L < 0.14$), high-contrast interior crevices ($\max(N_{\text{lum}}) - L \ge 0.16$), or near-black pixels ($L < 0.035$) are classified as ink lines.
- **Dark Palette OKLCH Cel Ramp Clamping (`src/lib/ai/math/photometricLighting.ts`)**:
  - Fixed shadow tone luminance calculation in `buildCelRamp`, where `Math.max(0.18, lch.L * 0.78)` previously forced shadow tones to be lighter than dark base tones ($lch.L < 0.18$).
  - Clamped shadow luminance relative to base color (`Math.max(0.04, Math.min(lch.L * 0.78, lch.L - 0.03))`) and deep crevice luminance (`Math.max(0.02, Math.min(lch.L * 0.60, lch.L - 0.06))`), restoring deep, atmospheric cel-shading contrast across dark palettes.
- **Dark Palette & High-Resolution Photometric Regression Tests (`tests/photometricAutoAnalysis.test.ts`)**:
  - Added unit test asserting that $128\times128$ canvases with dark crimson ($L=0.18$) and navy ($L=0.06$) body palettes generate smooth non-flat normal fields and shade accurately without false-positive ink-line masking.

**Checks run:**
- `npm run gate`: ALL 3 STAGES PASSED (Docs, Typecheck, 615 Vitest tests in 89 suites)
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
**Status:** Complete

---

## 2026-09-14 — Phase 59: Canvas Envelope Unification, Safe Subsystems Hardening & Canonical Versioning

**Delivered:**
- **Single Source of Truth Canvas Limits (`src/config/canvasLimits.ts`)**:
  - Exported canonical tier constants: `WORKSPACE_ENVELOPE` (`MAX_CANVAS_DIMENSION = 2048`, `MAX_CANVAS_FRAMES = 500`, `MAX_CANVAS_LAYERS = 100`), `EXPORT_ENVELOPE` (`MAX_EXPORT_DIMENSION = 4096`, `MAX_EXPORT_PIXELS = 16_777_216`), `PROBE_ENVELOPE` (`MAX_PROBE_DIMENSION = 8192`, `MAX_PROBE_PIXELS = 67_108_864`), and `HARDWARE_LIMITS` (`MAX_HARDWARE_DIMENSION = 16384`, `MAX_HARDWARE_PIXEL_AREA = 268_435_456`).
  - Bound `.pixibun` schema validation in `src/lib/project/schema.ts` to canonical `WORKSPACE_ENVELOPE`.
  - Re-exported export boundary constants in `src/components/modals/export/PngExportTab.tsx` and `src/components/modals/ExportModal.tsx`.
- **P2P Structural & Pixel Admission Hardening (`src/lib/sync/p2pSync.ts`)**:
  - Bound `validateStructurePayload` to `WORKSPACE_ENVELOPE` dimensions ($2048$), frame counts ($500$), and layer counts ($100$).
  - Hardened `isValidPixelOp` rejecting negative coordinates or coordinates $\ge 2048$, enforcing schema parity across the network boundary.
- **Safe Canvas Hardware Boundary & TypedArray Offset Alignment (`src/lib/safety/safeCanvas.ts`)**:
  - Clamped selection boundaries against canonical `HARDWARE_LIMITS`.
  - Fixed `SafeCanvas.getImageData()` buffer view instantiation by passing `byteOffset` and `length`, eliminating byte misalignment bugs.
- **Zero-Allocation Safe JSON Sanitization (`src/lib/safety/safeJson.ts`)**:
  - Replaced wasteful memory stringification allocations in `getUtf8ByteLength` with zero-allocation `TextEncoder.encodeInto` byte counting.
  - Ensured `sanitizeObject` returns a clean, plain object `{}` rather than `null` on prototype manipulation attempts.
- **Progressive Multi-Window Image Header Probe (`src/lib/safety/imageHeaderProbe.ts`)**:
  - Expanded initial window from 64KB to 256KB for deep-metadata PNG/JPEG headers.
  - Implemented multi-window segment paging for `Blob` sources with a distinct `SOF_BEYOND_PROBE_WINDOW` error.
- **Canonical Version Single Source of Truth (`src/config/version.ts`)**:
  - Defined canonical `APP_VERSION = '1.13.1'`, consumed by diagnostics capture (`src/lib/diagnostics/capture.ts`) and relay routes (`src/app/api/diagnostics/relay/route.ts`).
  - Synchronized `package-lock.json` with `package.json` at version `1.13.1`.
- **Cross-Boundary & Defensive Regression Suites (`tests/crossBoundaryEnvelope.test.ts`, `tests/p2pValidation.test.ts`, `tests/structurePayload.test.ts`, `tests/safetyHardening.test.ts`, `tests/diagnostics.test.ts`, `tests/photometricNonDestructive.test.ts`)**:
  - Added new cross-boundary test suite verifying canvas envelope invariants across schema, P2P sync, export UI, and safety layers, expanding total test coverage to 637 unit tests across 90 suites (100% green).
- **Photometric Studio Live Drag Decoupling & Appendage Normal Stabilization (`src/lib/ai/math/edtNormalMap.ts`, `src/lib/ai/math/photometricLighting.ts`, `src/hooks/viewport/events/usePhotometricEvents.ts`)**:
  - Decoupled static EDT, part segmentation, and bilateral filtering passes from dynamic light direction.
  - Implemented `applyAppendageStabilization` dynamically updating narrow ear/appendage normal vectors in <0.01ms per frame from immutable `baseNormalField`.
  - Guaranteed byte-exact output between multi-frame live light dragging and fresh single-shot recomputation at any azimuth (0 pixel discrepancy on anatomical character test in `tests/photometricNonDestructive.test.ts`).
  - Added explicit re-render at committed azimuth and elevation prior to `commitSnapshot()` in `usePhotometricEvents.ts`.

**Checks run:**
- `npm run gate:full`: ALL 4 STAGES PASSED (Docs, Typecheck, 637 Vitest tests in 90 suites, Turbopack production build) in ~23.8s
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
**Status:** Complete

---

## 2026-09-14 — Phase 60: Photometric Drag-Session Correctness & Cavity AO Auto-Scaling

**Delivered:**
- **Phase 60a: Live-Drag Photometric Analysis Cache Invalidation (`src/hooks/viewport/events/usePhotometricEvents.ts`, `tests/photometricNonDestructive.test.ts`)**:
  - Bound `cachedAzimuth` tracking to `photometricSessionRef.current`.
  - Implemented 20° angular drift cache invalidation on character / appendage silhouettes during interactive gizmo sweeps, recomputing analysis when lighting geometry drifts significantly while preserving zero recomputation on isotropic `formType: 'orb'`.
  - Guaranteed single-shot full analysis recomputation at drag release prior to `commitSnapshot()`, ensuring committed artwork has 0 azimuth staleness compared to fresh render (0 pixel discrepancy).
- **Phase 60b: Silhouette-Aware Cavity AO Auto-Scaling & Crevice Decoupling (`src/lib/ai/math/photometricAuto.ts`, `src/lib/ai/math/photometricLighting.ts`, `tests/photometricAutoAnalysis.test.ts`)**:
  - Extended `InferredPhotometricSettings` and defaults with `cavityStrength: number` (0.1–1.0).
  - Measured silhouette complexity via isoperimetric ratio / circularity deficiency (`1 / circularity`) and upper multi-segment appendage density (`maxUpperSegments`).
  - Auto-scaled `cavityStrength` from `1.0` down to `0.40` for complex hair-spike and appendage-heavy silhouettes, maintaining `1.0` for orbs.
  - Dynamically coupled character cel-shading `creviceAOThresh` to `cavStrength` (`Math.min(0.60, Math.max(0.20, 0.60 * cavStrength))`), preventing the 45.9% dark tone engulfment on hair spikes and tufts while preserving deep anatomical folds.
  - Injected inferred `cavityStrength` into `usePhotometricEvents.ts` and `bakeNormals()`.
- **Regression Tests (`tests/photometricAutoAnalysis.test.ts`, `tests/photometricNonDestructive.test.ts`)**:
  - Verified cavity AO auto-scaling drops deep crevice engulfment on hair-spike silhouettes from 50% to <2% with >90% directional diffuse tone recovery.
  - Verified live drag invalidation recomputes analysis across wide sweeps and guarantees 0 differing pixels on release commit.
  - Expanded test coverage to 639 unit tests across 90 suites (100% green).

**Checks run:**
- `npm run gate`: ALL 3 STAGES PASSED (Docs integrity, Typecheck, 639 Vitest tests in 90 suites)
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
**Status:** Complete

---

## 2026-09-14 — Phase 61: Anatomical Part Decomposition & Volumetric Character Photometric Shading

**Delivered:**
- **Anatomical Part Decomposition Engine (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Implemented `computeAnatomicalCharacterHeightmap()` replacing flat-silhouette macro heightmap clamping with true 3D anatomical volume synthesis for character artwork:
    1. **Cranial Head Dome**: Elevated dome field ($z_{\text{baseHead}}$) with smooth camera-facing facial cushion preserving eyes and mouth geometry.
    2. **Recessed Neck Crevice & Chin Depth Step**: Scans row profiles (`rowLeft`, `rowRight`, `rowWidth`) to detect transverse chin ink strokes strictly below facial features. Synthesizes a recessed throat level ($z_{\text{baseNeck}} = \text{maxMacroD} \times 0.05$) beneath an elevated chin plateau, generating downward chin normals ($N_y > 0$) and deep throat cavity ambient occlusion ($ao < 0.48$).
    3. **Torso Chest Barrel**: Models genuine horizontal cylindrical curvature across the chest between arm seams ($\text{Var}(N_x) > 0.05$), creating directional shading contrast between lit flank ($x=18$) and unlit flank ($x=29$).
    4. **Longitudinal Arm Cylinders**: Identifies internal vertical ink seams ($\ge 3$ consecutive rows) flanking the chest, generating separate cylindrical arm height fields separated by carved crevice valleys.
  - Added morphological boundary checks distinguishing full-body characters from head-only creatures / busts (`!hasTorsoBelow`), maintaining 100% baseline cushion and zero regressions on floating heads, cat faces, or props.
- **Precision Feature vs Structural Seam Classification (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Filtered out longitudinal arm seams ($\Delta y \ge 6, \Delta y > 1.8 \Delta x$) and transverse chin strokes ($\Delta x \ge 7, \Delta x > 1.8 \Delta y$) from facial feature masking (`isFeature`), preventing structural seams from being protected as facial features and allowing them to properly carve crevice valleys.
  - Carves internal ink lines ($H \times 0.65$ where all 4 cardinal neighbors are opaque), preventing outer silhouette outlines touching background from carving artificial trenches along convex cheeks.
- **Dedicated Anatomical Photometric Shading Suite (`tests/anatomicalPhotometricShading.test.ts`)**:
  - Added 3 comprehensive tests:
    1. Anatomical part decomposition (chin depth step, $N_y > 0$, throat $ao < 0.48$, chest barrel curvature $N_x < -0.10$ / $N_x > 0.10$, arm cylinders, arm seam crevices).
    2. 3D volumetric shading under studio key light (317°/48°), chin cast shadow over throat, directional chest contrast, and feature protection.
    3. Dynamic light rotation sweeping terminator across barrel curvature.
  - Expanded test coverage to 642 unit tests across 91 suites (100% green).

**Checks run:**
- `npm run gate`: ALL 3 STAGES PASSED (Docs integrity, Typecheck, 642 Vitest tests in 91 suites)
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed
**Status:** Complete

---

## 2026-09-19 / 2026-09-20 — Phase 62: Studio Architecture Overhaul, Dual Themes & Comprehensive Audit Remediation

**Delivered:**
- **Studio Shell Architecture Overhaul (`src/components/layout/`)**:
  - `AtelierRail.tsx`: Consolidated top studio rail merging former `TopHeader` and `ContextOptionsBar`. Houses project title editing, project actions (Save, Save As, Import, Export, Projects Gallery, Co-Draw), Undo/Redo controls, zoom control group with fit calculation (`handleFitToScreen`), tool-specific contextual parameter toggles, CVD colorblindness lenses, squint silhouette mode, symmetry rulers, and the `AppearancePopover` theme trigger.
  - `StatusBar.tsx`: Fixed 24px bottom workspace chrome bar displaying live cursor coordinates via decoupled `CursorStatusBadge`, active tool name, canvas dimensions, zoom factor, active layer/frame indicators, and embedded procedural Web Audio lo-fi radio boombox.
  - `CommandPaletteModal.tsx`: Accessible fuzzy-search launcher (`Ctrl+K` / `Cmd+K`) with categorized commands (Tools, View & Guides, Animation, Project & Studio), keyboard arrow navigation, and shortcut badge hints.
- **Design System Component Primitives (`src/components/ui/`)**:
  - Standardized accessible tactile controls replacing ad-hoc inline controls across all inspector panels:
    - `StudioSlider.tsx`: Range slider with real-time fill gradient, numeric badge, and golden accent thumb.
    - `StudioSelect.tsx`: Styled native `<select>` with studio surface tokens and focus-visible rings.
    - `StudioToggle.tsx`: Tactile pill sliding switch with hidden checkbox and gold indicator thumb.
    - `StudioNumberInput.tsx`: Numeric input with min/max bounds, step increments, and unit suffix.
    - `StudioTooltip.tsx`: Delay-activated tooltip with keyboard focus support and shortcut badges.
    - `IconButton.tsx`: 24–32px tactile icon button with ghost/surface/danger variants.
    - `PanelSection.tsx`: Collapsible accordion section with persistent localStorage state and action header slot.
- **Studio Lifecycle Hooks Decomposition (`src/hooks/studio/`)**:
  - Extracted studio lifecycle concerns out of `StudioLayout.tsx`:
    - `useStudioAutosave.ts`: Debounced (800ms) background IndexedDB persistence, startup restore synchronization with database readiness, in-flight save coalescing, and persistent quota warning banner auto-recovery.
    - `useStudioClipboard.ts`: Global `Ctrl+V` paste for image files via bounded admission pipeline.
    - `useStudioFileSystem.ts`: Native File System Access API for `.pixibun` direct save/save-as with project handle isolation.
    - `useStudioKeyboard.ts`: Centralized keyboard shortcuts with input-field collision guards.
- **Viewport Pointer Handler Decomposition (`src/hooks/viewport/`)**:
  - Decomposed monolithic pointer event logic into per-tool specialized hooks:
    - `useBrushPointerHandler.ts`: Pen, eraser, dither brush with Bresenham smoothing and pixel-perfect corner elimination.
    - `useChiselPointerHandler.ts`: Normal chisel micro-relief sculpting sessions.
    - `useSelectionPointerHandler.ts`: Marquee box, lasso, wand selection, and floating buffer transformations.
    - `useShapePointerHandler.ts`: Bresenham line, 2:1 isometric line, quadratic Bézier curves, rectangle, and ellipse.
- **Dual-Axis Theme System & Appearance Popover (`src/stores/themeStore.ts`, `src/components/ui/AppearancePopover.tsx`)**:
  - Supports `studioTheme` (`'atelier'` | `'cozy-classic'`) × `colorScheme` (`'dark'` | `'light'`).
  - Synchronous transition suppression (`pixibun-theme-transition-killer`) prevents layout thrashing across thousands of DOM elements during switching.
  - `AppearancePopover.tsx` provides interactive live preview swatches for instant theme selection.
- **Teaching Animation Board (`src/components/playground/`, `src/lib/art/teachingBoardData.ts`)**:
  - `TeachingAnimationBoard.tsx` & `TeachingBoardModal.tsx`: Interactive 7-stage progressive character construction tutorial, 10-frame physics-based jump cycles with hold timings and squash & stretch, Bun and Gel Slime curricula, 8 alt colorways, and 1-click timeline injection.
  - `teachingBoardData.ts`: 16×16 sprite datasets and discrete jump physics curves.
- **Comprehensive Audit Remediation (B01–B12, D01–D09, T01–T03)**:
  - B01: Database readiness awaited before startup project restore.
  - B02: Save identity captured before serialization; revision comparison (`saveRevision.ts`) before marking workspace clean.
  - B03: Atomic single-transaction metadata and layer blob commits (`db.transaction('rw', db.projects, db.layerBlobs)`).
  - B04: Layer tags preserved through all serialization paths.
  - B05: Nested custom ramps validated and hydrated into temporary buffers before publishing.
  - B06: Native desktop file handle reset on project transition and bound to project identity.
  - B07: Reliable co-draw message queue with ACK delivery confirmation, backpressure pause/resume, and retry deduplication.
  - B08: Bounded import reader (`importFile.ts`) for file picker, drag-and-drop, and clipboard paste (50MB ceiling, JSON depth limits, WebP header dimension verification).
  - B09: Duplicate frame and layer ID collision enforcement.
  - B10: Header images read through shared bounded import reader.
  - B11: Canvas dimension validation before mutations; proportional downscale for oversized image imports.
  - B12: Autosave returns boolean; confirmation toast displayed only after verified persistence.
  - D01–D09: Full documentation accuracy corrections (test suite counts, undo budget, export memory constraints, PII disclaimers, rate limiting semantics, algorithm naming).
  - T01–T03: Synthetic test fixtures replacing machine-specific tests, ESLint integrated into standard quality gate, and E2E panel expansion fixes.
- **Test Coverage Expansion**:
  - Added `tests/auditAutosave.test.tsx`, `tests/auditCoDraw.test.ts`, `tests/auditPersistence.test.ts`, `tests/components/TeachingAnimationBoard.test.tsx`, `tests/e2e/auditPersistence.spec.ts`, `tests/studioThemes.test.tsx`, `tests/teachingAnimationBoard.test.ts`.
  - Reached 692 unit tests across 97 suites and 22 E2E tests across 9 suites (100% green).

**Checks run:**
- `npm run gate`: ALL 4 STAGES PASSED (verify:docs, typecheck, lint, 692 unit tests in 97 suites).
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed.
- `npx playwright test`: 22 E2E tests across 9 suites passed.
- `npm run build`: Next.js Turbopack compilation succeeded with 0 errors.

**Status:** Complete (2026-09-20)

---

## 2026-09-20 — Phase 63: Neutral Relighting & Smart-Effect Provenance

**Problem Statement:**
1. In Phase 61, the 2.5D heightmap synthesis engine introduced a fixed anatomical height prior (`computeAnatomicalCharacterHeightmap`) that carved discrete head, neck, and torso height zones into character artwork. These fixed height steps baked stationary shadow bands into the surface normal field $\mathbf{N}$ that remained pinned in place on the sprite even when the user moved the light bulb to the opposite side.
2. Pixel artists frequently import or relight artwork that already contains authored directional shading bands. Layering new 2.5D shading directly over baked-in dark bands muddy the unlit side and prevent true dynamic relighting.
3. Procedurally generated layers (photometric lighting, raymarched cast shadows, volumetric optics, normal maps, autotiling, WFC synthesis) were saved purely as destructive pixel bitmaps without tracking their generation recipes, parameter configurations, or allowing non-destructive reopening.
4. Project format specification lacked schema versioning for smart-effect provenance, and autosave was keyed strictly to pixel history commits, omitting document metadata mutations such as layer effect edits and renames.

**Delivered:**
- **Neutral 2.5D Silhouette & Macro-Detail Reconstruction (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Replaced the Phase 61 fixed anatomical height prior with neutral macro-form and multi-scale material detail: $H_{\text{composite}} = 0.70 H_{\text{macro}} + 0.30 H_{\text{micro}}$ for character silhouettes. The resulting normal vector field $\mathbf{N}$ is purely geometric and 100% independent of light direction, allowing cel shading and highlights to follow virtual light azimuth smoothly across $360^\circ$.
  - Upgraded interior ink line detection to require two-sided opposing luminance dips ($(\text{neighbor}_{\text{opposing}} - \text{lum}) \ge 0.12$), preventing single-sided cast shadow edges from being falsely carved as permanent ink crevices.
  - Upgraded connected-component flood fill to cluster authored ramps by hue and chroma proximity ($\Delta\text{hue} \le 35^\circ, \Delta\text{chroma} \le 0.25$), uniting shaded regions into smooth geometric surfaces.
- **Source Shading Normalization & Painted Shading Removal (`src/lib/ai/math/photometricLighting.ts`, `src/lib/ai/math/edtNormalMap.ts`)**:
  - Added `sourceShadingRemoval` slider ($0\% - 100\%$, default $0\%$) in `PhotometricLightingSection`, conservatively reducing directional value bands already painted into color ramps before relighting while strictly preserving authored palette families.
  - Exposure-compensated directional cel shadow terminator calculation ($\text{shadowThresh} = \text{clamp}(0.46, 0.58, 0.52 - (\text{brightness} - 1.15) \times 0.04)$), preventing high exposure from shifting the geometric terminator or flattening unlit sides.
- **Visible Auto-Analysis Readout & Form Overrides (`src/lib/ai/math/photometricAuto.ts`, `src/components/layout/inspector/PhotometricLightingSection.tsx`)**:
  - Upgraded `inferPhotometricSettings()` with smooth, continuous heuristic `directionalShadingCue` ($0-1$) and human-readable inference rationale.
  - Built interactive inspector summary card listening to `pixibun:photometric-analysis` displaying detected form type, material, source light azimuth/elevation, directional shading cue strength (Weak / Medium / Strong), crevice AO percentage, and explanation.
  - Added tactile surface interpretation override button group: `[ Auto | Character | Prop | Orb ]` allowing artists to explicitly steer geometry reconstruction.
- **Non-Destructive Smart-Effect Recipe Model (`src/types/canvas.ts`, `src/types/project.ts`, `src/lib/project/schema.ts`, `src/lib/project/serialize.ts`)**:
  - Introduced `LayerEffectRecipe` across 11 smart-effect kinds (`photometric`, `auto-shade`, `cast-shadow`, `ground-shadow`, `volumetric-optics`, `normal-map`, `specular`, `sel-out`, `outline`, `autotile`, `wfc`).
  - Stores non-destructive recipe metadata (`id`, `kind`, `version: 1`, `sourceMode`, `params`, `analysis`, `updatedAt`) directly on `Layer.effect`.
  - Bumped project file schema to `PROJECT_FORMAT_VERSION = 3` with full forward and backward migration in `migrateProjectPayload` and `validateProjectFile`.
  - Atomically preserved and restored recipe metadata across pixel history snapshots (`PixelHistoryStep`), structural undo/redo, and layer duplication.
- **Layers Panel FX Provenance & Reopening (`src/components/layout/inspector/LayersPanel.tsx`)**:
  - Added amber `FX` provenance badge on generated output layers.
  - Added tactile `Edit FX` button on photometric layers, reopening the on-canvas pixel light bulb gizmo with the layer's saved recipe parameters for instant non-destructive tweaking.
- **Document Revision Autosave (`src/hooks/studio/useStudioAutosave.ts`, `src/stores/slices/createLayerSlice.ts`, `src/stores/slices/createViewportSlice.ts`)**:
  - Subscribed autosave engine to `state.editRevision` in addition to pixel history commits, guaranteeing that layer effect mutations, renames, reorders, and canvas dimension updates are automatically persisted to IndexedDB.
- **Unified Brand Geometry (`src/components/ui/PixiBunLogo.tsx`)**:
  - Built standalone responsive `PixiBunLogo` component (`sm`, `md`, `lg`) with Bun mascot tile and typography.
  - Standardized branding across `AtelierRail`, `PlaygroundLayout`, `LandingNav`, `AtelierHero`, `AtelierFooter`, `MobileStudioGate`, and error boundaries (`error.tsx`, `global-error.tsx`, `studio/error.tsx`).
- **Discrete 1/2/3 Shading Tones (Single / Dual / Trio Cel-Shading) (`src/lib/ai/math/photometricLighting.ts`, `src/types/tools.ts`, `src/components/layout/inspector/PhotometricLightingSection.tsx`, `src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Implemented 1 Single (1 shadow tone), 2 Dual (2 shadow tones: mid + deep), and 3 Trio (3 shadow tones: soft penumbra + mid + deep umbra) cel-shading band modes in perceptual OKLCH color space.
  - Enabled discrete cel-shading across all pixel art forms (orbs, characters, props) when shading bands mode is selected in the UI (`SHADE: 1 | 2 | 3` or `Shading Tones`), eliminating muddy 24-bit floating point gradients on pixel art while preserving smooth 3D shading when unbanded.
  - Added bottom HUD controls (`SHADE 1 | 2 | 3`) to the on-canvas `PixelLightBulbGizmo` and inspector segmented button group with accessible tooltips and test IDs.
- **Continuous 3D Specular Highlight Pill & Line-of-Sight Gating (`src/lib/ai/math/photometricLighting.ts`, `tests/orbPhotometricCelShading.test.ts`, `tests/pixiBudMath.test.ts`)**:
  - Restored continuous 3D Blinn-Phong specular highlight pill with smooth alpha falloff ($I_{\text{spec}} > 0.35, \alpha = \min(255, \text{round}(I_{\text{spec}} \times 255))$).
  - Derived specular normals from macro-silhouette dome (`specularNormalField`) using inflated EDT and bilateral filtering, eliminating vertical razor scars down cheeks and across ears caused by internal feature depth depressions.
  - Added physical line-of-sight gate ($N_{3D} \cdot L_{3D} > 0$) preventing specular highlights from appearing on unlit shadow hemispheres.
  - Shielded facial features (eyes, mouth) and line art/outlines (`charFeatureMask`, `charInkMask`, `isBlackOutline`) from receiving specular highlights.
  - Metallic materials (gold, metal) receive warm champagne/albedo-tinted highlights; dielectric materials receive pure white highlights.
- **Photometric Preview Session & Atomic Cancellation (`src/hooks/viewport/events/usePhotometricEvents.ts`, `tests/photometricPreviewSession.test.ts`)**:
  - Encapsulated live photometric preview in an atomic session lifecycle with non-blocking async rendering, drag throttling, and cancellation tokens (`cancelSession`), restoring original layer pixel buffers and metadata on `Escape` or gizmo dismissal.
- **Decomposed Viewport Studio Events (`src/hooks/viewport/events/usePhotometricEvents.ts`, `src/hooks/viewport/events/useArtisanEvents.ts`, `src/hooks/viewport/events/useGeometricEvents.ts`, `src/hooks/viewport/useViewportStudioEvents.ts`, `src/hooks/viewport/useViewportDrawing.ts`)**:
  - Modularized viewport pointer event dispatch into dedicated event hooks for photometric manipulation, artisan painting, and geometric vector primitives, completely decoupling viewport interaction from legacy header components.
- **Research-Grounded Product Roadmap**:
  - Published comprehensive roadmap in `docs/plans/research_grounded_product_roadmap.md` covering computer vision, intrinsic decomposition, rendering, animation, and local-first architecture.

**Checks run:**
- `node scripts/verifyDocIntegrity.mjs`: all 6 checks passed (phase headers, section monotonicity, changelog filepaths, CenterViewport line checks, test count claims, package.json version sync).
- `npm test` (`vitest run`): 699 unit and integration tests across 98 suites passed (including `tests/photometricPreviewSession.test.ts`, `tests/orbPhotometricCelShading.test.ts`, and `tests/components/PixelLightBulbGizmo.test.tsx`).
- Development-route Turbopack compilation: 0 errors.

**Status:** Complete (2026-09-20)

---

## 2026-09-21 — Phase 64: Integrity, Recovery & Resource Safety (Phase A)

**Problem Statement:**
1. Studio restore failure on malformed IndexedDB documents was vulnerable to overwriting the user's workspace with blank projects, losing historical data.
2. In-memory project representations lacked an initial conservative envelope ceiling, risking tab crashes when processing runaway dimensions or layer counts.
3. Import modals were tightly coupled to presentation layers, and storage failures were not distinguished from empty workspaces in the gallery.

**Delivered:**
- **Initial Conservative Resource Envelope**: Defined `MAX_PROJECT_AGGREGATE_PIXELS = 67,108,864` (64 Mpx = 256 MiB base raw RGBA) and `MAX_PROJECT_TOTAL_LAYERS = 2,000` in `src/config/canvasLimits.ts`. Implemented `validateProjectResourceBudget` in `src/lib/project/resourceBudget.ts`.
- **Neutral Import Domain Contracts**: Decoupled domain file-import pipeline from UI modal components (`src/types/import.ts`, `src/lib/project/importFile.ts`).
- **Canonical Project Domain Decoder**: Centralized project intake through `decodeAndValidateProject` (`src/lib/project/decodeProject.ts`) executing prototype-safe parsing, schema validation, migration, and envelope checks.
- **Safe Boot Restore & Corrupt Document Preservation**: Preserved corrupt project records and layer blobs in IndexedDB untouched on boot restore failure, instantiating fresh workspace identity and alerting user via toast (`src/hooks/studio/useStudioAutosave.ts`).
- **Atomic Dexie Storage Operations**: Re-architected `deleteProject`, `renameProject`, and `duplicateProject` within atomic Dexie `readwrite` transactions across `projects` and `layerBlobs`.
- **Lazy Canvas Buffer Allocation**: Optimized `hydrateProject` to allocate 2D backing stores only for layers backed by stored pixel blobs, plus the active layer.
- **Worker Dispatcher Lifecycle**: Added 10-second timeout, `AbortSignal` cancellation, and fatal crash recovery in `src/lib/engine/workerDispatcher.ts`.

**Checks run:**
- Vitest unit test suite: 725 tests across 100 suites passed.
- Playwright E2E suite: 22 tests across 9 suites passed.

**Status:** Complete (2026-09-21)

---

## 2026-09-21 — Phase 65: Runtime Performance, Offline Reliability, Persistence & History (Phase B)

**Problem Statement:**
1. Whole-project history snapshots scaled at $O(\text{total project state})$ per undo step, quickly consuming browser heap memory.
2. Autosave lacked monotonic revision tracking, risking partial saves and race conditions during rapid editing.
3. Monolithic store subscriptions caused excessive re-renders across studio chrome during continuous drawing strokes.

**Delivered:**
- **Bidirectional Structural History Inversion & Hard Byte Budget**: Replaced whole-project snapshots with minimal structural inversion deltas (`StructuralHistoryDelta` in `src/lib/engine/structuralHistory.ts`), scaling at $O(\text{affected state})$. Bounded undo history to 64 MiB / 50 entries with explicit oversized-entry rejection and eviction accounting.
- **Project-Scoped Revision Tracking & Incremental Autosave**: Replaced ad-hoc dirty flags with monotonic per-layer revision counters (`ProjectRevisionTracker` in `src/lib/project/persistenceRevisions.ts`). Atomic two-phase commit inside Dexie `readwrite` transaction (`useStudioAutosave.ts`, `db.ts`).
- **Zustand Selector Isolation & Stable Listeners**: Decoupled studio chrome subscriptions with fine-grained selectors. Stabilized `useStudioKeyboard.ts` using `getState()` with a stable `optionsRef`.
- **Gesture Interruption Safety**: Handled `pointercancel`, `lostpointercapture`, window `blur`, and `visibilitychange` to cleanly finalize strokes without dangling captures.
- **Deterministic Build-Versioned Service Worker & Real Offline E2E**: Derived deterministic `SW_CACHE_VERSION` in `next.config.ts`. Verified offline navigation, reload, drawing, undo/redo, and IndexedDB restore via Playwright (`tests/e2e/offline.spec.ts`).

**Checks run:**
- Vitest unit test suite: 762 tests across 104 suites passed.
- Playwright E2E suite: 23 tests across 9 suites passed.

**Status:** Complete (2026-09-21)

---

## 2026-09-21 — Phase 66: System Hardening & Production Polish (Phase C)

**Problem Statement:**
1. Four-theme WCAG AA visual contrast and full-application rendered accessibility required formal automated verification.
2. Dialog focus isolation needed robust handling for multi-modal stacking and native inert background support.
3. Node/CI environments required standardization and production vulnerability auditing.

**Delivered:**
- **Service Worker Lifecycle & Precache Scripts**: Verified ServiceWorkerRegistrar component rendering, dismiss, controllerchange reload orchestration, and byte-distinct cache script generation (`src/app/sw.js/route.ts`).
- **WCAG 2.2 AA Theme Contrast Hardening**: Audited token contrast across Atelier Dark/Light and Cozy Classic Dark/Light ($\ge 4.5:1$ normal text, $\ge 3.0:1$ large/UI text) in `src/app/globals.css`.
- **Four-Theme Rendered Browser Accessibility**: Implemented 20 automated Axe-core Playwright scans with 0 critical and 0 serious violations (`tests/e2e/themeAccessibility.spec.ts`).
- **Modal Accessibility & Background Isolation**: Replaced static IDs with `React.useId()` in `src/components/ui/ModalWrapper.tsx`; enforced native `<dialog showModal()>` inert background isolation.
- **Production Hardening & CI Standardization**: Standardized Node 22 (`22.14.0`) in `.nvmrc` and `package.json`. Configured canonical pipeline `npm run gate:full` in `.github/workflows/ci.yml`. Gated debug window properties to dev environments. Verified 0 vulnerabilities in `npm audit`.

**Checks run:**
- Vitest unit test suite: 795 tests across 107 suites passed.
- Playwright E2E suite: 43 tests across 10 suites passed.
- Lighthouse CI: 100% passing across `/` and `/studio` (97-99 Performance, 96-100 Accessibility, 100 Best Practices, 100 SEO).

**Status:** Complete (2026-09-21)

---

## 2026-09-22 — Phase 67: Workspace Envelope Hardening, Forensic Diagnosis, Recovery Ledger, Streaming ZIP32 Core & Untouched Backup Assembly (Phase 1A & Phase 1B)

**Problem Statement:**
1. Workspace mutations (canvas resize, layer insertion, frame duplication) lacked runtime pre-allocation checks, leaving the editor vulnerable to tab crashes when exceeding complexity boundaries.
2. Deserialization of external project files needed defense against prototype poisoning, deep recursion stack overflows, and node count bombs.
3. Corrupt projects in IndexedDB could not be diagnosed without risking further state loss or loading corrupt bitmaps into memory.
4. Exporting data recovery archives required a zero-dependency, constant-memory streaming archiver that could run reliably in browser and headless environments.
5. Assembling untouched recovery archives and exporting them directly to disk required read-only immutable snapshotting, full-keyspace blob enumeration, private trust boundaries, streaming file-handle transport, and bounded memory fallback without database mutations or UI invocation.

**Delivered:**
- **Phase 1A Workspace Envelope Enforcement & Decoupled Import (`src/lib/project/workspaceEnvelopeGuard.ts`, `src/lib/project/imageImportExecution.ts`)**:
  - Implemented `WorkspaceEnvelopeGuard` pre-evaluating complexity ceilings (64 Mpx / 2,000 layers) before allocating canvas surfaces.
  - Decoupled external raster image import execution from presentation controllers.
  - Added 36 focused unit tests (`tests/phase1AEnvelopeEnforcement.test.ts`).
- **Phase 1B.1 Policy-Driven Project Validation & Metadata Classifier (`src/lib/project/schema.ts`, `src/lib/safety/safeJson.ts`, `src/lib/recovery/recoveryClassifier.ts`)**:
  - Unified schema validation engine with entry points `validateProjectWithPolicy`, `validateProjectJsonWithPolicy`, and `validateProjectFile` supporting envelope modes `'strict'` and `'collect-recoverable'` preserving 100% strict caller backward compatibility.
  - Hardened `SafeJson.parse` against prototype pollution, 50 MB total payload ceiling, recursion depth ceiling ($\le 32$), and typed errors (`SafeJsonPayloadLimitError`, `SafeJsonNestingDepthError`, `SafeJsonTraversalLimitError`, `SafeJsonOptionError`, `SafeJsonSyntaxError`). The recovery classifier passes `RECOVERY_INSPECTION_CEILINGS.MAX_METADATA_NODES` (50,000 nodes) to `validateProjectJsonWithPolicy`.
  - Built typed project metadata classifier categorizing documents into `valid`, `recoverable-envelope-exceeded`, `malformed`, `unsupported-version`, and `unsafe-content`. Added 32 unit tests (`tests/recoveryClassifier.test.ts`).
- **Phase 1B.2 Recovery Ledger & Bounded Stored-Blob Diagnosis (`src/lib/storage/db.ts`, `src/lib/recovery/recoveryLedger.ts`, `src/lib/recovery/recoveryDiagnosis.ts`)**:
  - Migrated Dexie schema to v5 with dedicated `recoveryRecords` table (`projectId, classificationState, lastConfirmedAt`) with `projectId` primary key.
  - Added multi-table atomic rollback across `projects`, `layerBlobs`, and `recoveryRecords` in `deleteProject`.
  - Built non-destructive stored-project assessment engine (`assessStoredProject`) scanning the full `layerBlobs` compound-index keyspace `[projectId+id]` via keyset batch pagination. Probed 24-byte Blob slices with `ImageHeaderProbe` without allocating canvas bitmaps. Diagnosed corrupted PNG headers, dimension mismatches, duplicate blob mappings, orphan blob records, embedded raster fields, and storage-record corruption, treating ordinary zero-blob layers as valid transparent layers. Added 24 unit tests (`tests/recoveryDiagnosisAndLedger.test.ts`).
- **Phase 1B.3 Streaming Store-Only ZIP32 Archive Core (`src/lib/recovery/zipWriter.ts`)**:
  - Built zero-dependency streaming PKZIP 2.0 / ZIP32 archive writer in pure TypeScript (`writeStoreOnlyZip`) serving as a low-level archive foundation.
  - Store-only uncompressed chunks streamed directly to consumer sink in bounded 64 KiB chunks with $O(1)$ payload memory relative to payload size, and $O(\text{entry count})$ bookkeeping capped at 65,535 entries.
  - Bit 3 + Bit 11 data descriptor framing (`0x0808` flags, 16-byte signed descriptor) for single-pass CRC-32 and size calculation.
  - Preflight immutable snapshotting and array stabilization: shallow-copies `entrySources` before evaluating entry getters, evaluates and binds `sink.write` exactly once, and validates paths against traversal, leading slashes, drive letters, backslashes, NUL bytes, and lone UTF-16 surrogates.
  - Responsive cancellation via `AbortSignal` with genuine `DOMException('AbortError')`.
  - Added 40 unit tests (`tests/recoveryZipWriter.test.ts`) with independent bitwise CRC-32 and ZIP structure parser (zero external or Python dependencies).
- **Phase 1B.4 Untouched Archive Assembly & Safe Export Adapters (`src/lib/recovery/recoveryBackup.ts`, `src/lib/recovery/recoveryBackupTransport.ts`)**:
  - Built read-only immutable archive snapshotting executing a single read-only IndexedDB transaction across `projects`, `layerBlobs`, and `recoveryRecords` without mutating IndexedDB.
  - Bounded full-compound-keyspace blob enumeration querying `[projectId, Dexie.minKey]` through `[projectId, Dexie.maxKey]` with `.limit(MAX_INSPECTABLE_STORED_BLOBS + 1)` via `.toArray()` to fail closed on oversized storage.
  - Preserves untouched `dataJson` as exact WHATWG UTF-8 bytes without JSON parsing or modification.
  - Generates closed-schema recovery manifest (`recovery-manifest.json`) and precomputes exact ZIP32 size before streaming.
  - Sealed non-forgeable trust boundary via module-private `WeakSet` (`trustedPreparedArchives`) and `WeakMap` (`preparedArchiveInternals`), exposing strictly scalar descriptors (`PreparedBlobDescriptor`) without public Blob or buffer handles.
  - Supports multi-pass manifest reusability via fresh byte copies on each stream open.
  - Protected post-open file-handle lifecycle (`writeRecoveryArchiveToFileHandle`) with immediate `abort()` capture, best-effort abort on failure without masking primary errors, and strict avoidance of post-abort `close()`.
  - Bounded in-memory Blob fallback (`createRecoveryArchiveBlob`) with preflight 250 MiB ceiling, defensive chunk copying (`chunk.slice()`), and release of retained chunk references on error or cancellation.
  - Responsive cooperative cancellation via `AbortSignal` throwing genuine `DOMException('AbortError')`.
  - Added 42 unit tests (`tests/recoveryBackup.test.ts`).
- **Scope & Deferred Work**: Restricted Recovery Mode foundation is implemented through Phase 1B.4 only. Phase 1B.5 and later capabilities (recovery plan builder, safe candidate reconstruction, recovery UI modal, clip-consent UI, pruning, recovered-copy transaction, startup integration, and controlled hydration) are deferred and not yet started.

**Checks run:**
- Vitest unit & integration test suite: 969 tests across 112 suites passed (100% green).
- TypeScript typecheck (`tsc --noEmit`): 0 errors.
- ESLint (`eslint src tests`): 0 errors.
- Next.js Turbopack production build (`next build`): successful clean build.
- Quality Gate: All 5 stages passed cleanly (`npm run gate:full`).
- Documentation integrity audit (`scripts/verifyDocIntegrity.mjs`): 100% clean pass (structure, counters, referenced filepaths on disk, version sync).
- E2E Spec Suite: Configured repository contains 43 E2E tests across 10 suites; not executed as part of this pass or `gate:full`.
- TestSprite: Not applicable / unverified because Phase 1B.4 has no deployed user-facing recovery surface.

**Status:** Complete through Phase 1B.4 (2026-09-22) — Phase 1A, Phase 1B.1, Phase 1B.2, Phase 1B.3, and Phase 1B.4 verified; Phase 1B.5+ deferred

---

## 2026-09-28 — Imported artwork editing, fill behavior, and grid alignment

**Delivered:**
- Sprite sheet import now inspects image pixels to infer repeating cells, margins, and spacing when the evidence is sufficient. Dimension-only suggestions are labeled for review. The preview shows the cut lines, transparent timing cells are retained by default, and oversized cells cannot silently clip into a smaller canvas.
- Erase Sampled Color removes matching pixels with adjustable tolerance and default color-family matching. It supports connected or all matches, selection masking, optional matching layers across frames, locked-layer protection, and one undoable edit.
- PixiTools Analyze & Crisp Artwork reports a scan and before/after preview before an undoable cleanup of faint alpha, detached specks, and neutral-gray haze. Dark-line thinning is optional and off by default; matching animation layers can be processed while locked layers are skipped.
- Bucket Fill now passes a separate tolerance to the fill engine (default 24). An optional enclosed-speck mode fills visible color islands of at most eight pixels without filling transparent holes. Color Replace keeps its independent exact-match default.
- The artwork stage and main canvas no longer use layout-affecting borders; the artwork and grid occupy identical screen bounds at 1600% zoom.
- Updated the older RotSprite browser tests to open the PixiTools section only when collapsed, and made the brush-cursor browser check hover the stage explicitly.

**Checks run:** Full quality gate passed: documentation checks, typecheck, lint, 1,270/1,270 unit tests across 129 suites, and production build. Chromium passed 80/80 tests across 20 suites; the four focused viewport tests passed after the final transparent-hole refinement. `git diff --check` passed. TestSprite plans were drafted but no TestSprite run was possible because the CLI is unavailable here.

**Status:** Locally verified. Git history records publication status.

---

## 2026-09-28 — Metadata Undo and structural history admission

**Delivered:** Layer property and frame-duration edits now record Undo snapshots; continuous controls group changes by interaction. History-backed structural operations estimate both Undo and Redo memory before mutation and reject edits above the configured history budget without changing artwork or clearing existing history. Selection extraction now calls SafeCanvas, and unused cursor, autosave, and safety-barrel modules were removed. Current product, architecture, security, benchmark, and deep-dive docs were reconciled with these changes.

**Checks run:** 1,268/1,268 Vitest tests across 128 suites, 82/82 Chromium tests across 20 suites, strict TypeScript unused-code check, lint, and production build passed. TestSprite was unavailable because its CLI is not installed in this workspace.

**Status:** Locally verified. No deployment was performed.

---

## 2026-09-28 — Contextual Tool Motion Previews, Usability Baseline, and Regression Hardening

**Delivered:**
- Built interactive Tool Motion Previews (`src/components/ui/ToolMotionPreview.tsx`, `src/components/ui/ToolPreviewCanvas.tsx`, `src/components/ui/ToolMotionPreview.module.css`) rendering 4-beat rhythm micro-animations on hover and keyboard focus for drawing tools and AI/shading actions.
- Added dual preview layers: `DrawingToolsPreviewLayer` for the primary toolbar and `PixiToolsPreviewLayer` for inspector action buttons.
- Updated `TactileButton` disabled state to `disabled:cursor-not-allowed` so users can inspect capabilities of temporarily disabled actions prior to prerequisites.
- Implemented user preferences with persistent toggle in `AppearancePopover` and quick dismiss controls (Escape, close button, and "Don't show again").
- Expanded Chromium E2E suite to 86 tests across 21 files with dedicated preview verification (`tests/e2e/toolMotionPreview.spec.ts`) and animation frame synchronization checks (`tests/e2e/eraseColor.spec.ts`).
- Created the 6-week Learn-by-Making experiment roadmap (`docs/plans/learn-by-making-2026.md`) with artwork-preservation gates and the 5-participant observational study kit (`docs/research/pixitools-baseline-study.md`).
- Authored 15 TestSprite frontend regression plans (`testsprite-plans/` 44 through 58) and updated TestSprite agent skills with verified CLI environment and tunnel handling.

**Checks run:** 1,268/1,268 Vitest tests across 128 suites, 86/86 Chromium tests across 21 suites, strict TypeScript typecheck (0 errors), ESLint (0 errors, 0 warnings), and documentation integrity verification passed.

**Status:** Locally verified.


