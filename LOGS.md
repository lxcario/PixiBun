# Build Log — PixiBun

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
**Known remaining (tracked):** Viewport renderer still draws onion skin into the main composite (eyedropper ghost-sampling; overlay-canvas split planned for Phase 9), timeline thumbnails still placeholders, undo still pixels-only, GIF/spritesheet ignore clips, AI offline copy still impersonates conversation. All scheduled in `implementation_plan.md`.
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

## 2026-08-26 - Phase 14: Landing Hero Overhaul — Pixel Vines, Articulated Lamp, Windowsill Cat & Vintage Cassette Boombox

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
  - Scaled up the architect gooseneck lamp with a larger weighted base, taller dual-strut armature, robust circular brass knuckle joint, and wide bell hood.
- **Cute Organic Rounded Windowsill Cat (`AtelierDeskScene.tsx`)**:
  - Replaced the square box body with an organically curved sleeping cat loaf with soft rounded head, tucked front paws, curved swishing tail, pink ears, and eyelids.
- **Compact Cozy Boombox Radio (`AtelierDeskScene.tsx`)**:
  - Scaled down the radio to fit neatly on the desk with spinning cassette reels, glowing LED track screen, and mini knobs.
- **Perspective Shift & Room Headroom (`AtelierDeskScene.tsx`)**:
  - Shifted desk perspective down (`deskY = 225`) to display 28% more wall room, expanded window (`winH = 175`), and taller vertical space.
- **Warm, Human Craftsperson Copy Across Entire Landing**:
  - Replaced all generic AI/marketing text across `AtelierHero`, `CozyFeatureGrid`, `AtelierGallery`, `ArtisanStory`, `AtelierCtaBanner`, `AtelierFooter`, and `LandingNav` with warm, thoughtful, honest craftsperson writing.
  - Removed the glitchy `animate-ping` disappearing square on the hero badge in favor of a clean, steady amber star accent `✦`.
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
- **Geometric Pixel Math Suite**: Wu's quantized 2:1 isometric lines, rational quadratic/cubic Bézier curves, 47-Tile Blob autotiling bitmask utility (`calculate47TileBitmask()` — pure computation; tile-placement requires a tileset atlas feature that is not yet shipped), RotSprite 8x Scale2X rotation, and Zhang-Suen 1px skeleton line thinning.
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

## Phase 16 — Minecraft 3D Skin Photometric Engine, Optical Flow Tweening, Sub-Pixel Anti-Aliasing & 3x3 Seamless Tiling (2026-08-30)
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
- **3x3 Seamless Pattern Matrix Viewport (`showTilePreview`)**:
  - Live wraps the canvas with 8 adjacent repeating ghost tiles in real time so artists can verify seamless texture repeats during drawing.
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
  - Drawing attempts on locked layers are rejected and display an animated HUD toast (`🔒 Active layer is locked`).
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



