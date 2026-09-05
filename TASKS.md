# Build Plan — PixiBun

## Phase 30 — Critical Bug Remediation & Hot-Path Performance (P0/P1)
**Goal:** Eliminate drawing stroke re-render cascades, prune unselected Zustand store subscriptions, secure illegal constructor fallbacks, convert monolithic autosave to binary blob storage, and eliminate compositor singleton aliasing risks.

**Evidence & Rationale:**
- Hot-Path Re-render Cascade: `CenterViewport.tsx` (line 124) calls `useStudioStore()` without selectors, subscribing to entire state. `drawPointsOnActiveLayer` (line 1547) triggers `renderComposite()` + `bumpBufferVersion()` on every pointer move, firing line 1161 `useEffect` and rendering composite a second time. Sources: Zustand Slices & Atomic Selectors pattern (zustand.docs.pmnd.rs); Dan Abramov PureCanvas dragging commit pattern.
- Export Modal Fallback: `ExportModal.tsx` line 87 contains `frameCanvases.push(composed ?? new HTMLCanvasElement())`, which throws `TypeError: Illegal constructor` in standard browser environments (W3C DOM specification).
- IndexedDB Autosave Serialization: `serialize.ts` converts every layer to PNG base64 and serializes via `JSON.stringify` into a single `dataJson` column. Storing raw `Blob`/`ArrayBuffer` in IndexedDB reduces storage footprint by ~33% and eliminates base64 CPU overhead (RxDB benchmark documentation).
- Compositor Shared Buffer Aliasing: `compositor.ts` defaults to module-scoped `sharedOffscreenCanvas` when `freshCanvas` is omitted, introducing buffer overwrite risks during concurrent renders.

**Deliverables:**
- [x] Store Selector Pruning (`CenterViewport.tsx`): Refactor monolithic `useStudioStore()` call into atomic selectors or `useShallow` slices so `CenterViewport` renders strictly when its direct dependencies mutate.
- [x] Stroke Hot-Path Decoupling (`CenterViewport.tsx`): Isolate pixel writes to layer canvas during `isDrawing === true`. Write directly to layer canvas and call `renderComposite()`. Throttle `bumpBufferVersion()` via `requestAnimationFrame` during strokes so live preview and timeline remain smooth at 60fps without React event thrashing. Finalize `bumpBufferVersion()`, history snapshot commits, and autosave calls on `handlePointerUp`.
- [x] Safe Export Modal Fallback (`ExportModal.tsx`): Replace `new HTMLCanvasElement()` with `document.createElement('canvas')` and add explicit error handling if `compositeFrame` ever returns null.
- [x] Binary Blob Layer Storage (`src/lib/storage/db.ts`, `serialize.ts`): Introduce dedicated `layerBlobs` table (`++id, [projectId+layerId+frameIndex], projectId, layerId`) in Dexie schema v4. Store raw image `Blob` data directly, retaining metadata in `dataJson` with zero double-storage. Maintain full backward compatibility for v1/v2/v3 project files via `migrateProjectPayload`.
- [x] Compositor Re-entrancy Safety (`src/lib/render/compositor.ts`, `CenterViewport.tsx`): Default `freshCanvas` to `true` while giving priority to explicit `targetCanvas`, and reuse pooled scratch canvas in `renderOnionSkin` to prevent GC pressure during scrub loops.
- [x] Linter & Hook Cleanup: Resolve all 6 `react-hooks/exhaustive-deps` warnings in `CenterViewport.tsx`.

**Acceptance criteria:**
- React DevTools Profiler confirms `CenterViewport` render count during an active multi-point pen stroke drops from N (points count) to <= 1.
- `grep -r "new HTMLCanvasElement" src` returns zero results.
- `projectSchema.test.ts` and `projectsDb.test.ts` verify backward compatibility and migration to schema v4.
- Regression test verifies onion skin and floating preview do not overwrite pixel buffers during concurrent rendering.
- `npm run typecheck`, `npm run lint`, and `npm test` execute cleanly with 0 errors and 0 warnings.

**Status:** Complete (2026-09-03)

---

## Phase 31 — Product Say-Do Alignment & Viewport Precision (P2)
**Goal:** Align published feature promises with implementation reality, connect dead schema fields to real animation pacing, add standard selection modification modes, and implement precision viewport feedback.

**Evidence & Rationale:**
- Merge Down Discrepancy: `FeatureStory.tsx` advertises "merge down" capability, while `studioStore.ts` and `RightInspector.tsx` lack layer merge logic.
- Dead Frame Timing Field: `durationMs` exists on `AnimationFrame` schema but playback and export ignore it, relying solely on global `fps`. Classic animation theory (Thomas & Johnston, Richard Williams *The Animator's Survival Kit*) defines variable frame timing ("holds on a pose") as a fundamental animator tool.
- Selection Modifier Ergonomics: `select-box`, `select-lasso`, and `select-wand` restart selections from scratch without Shift (Union) or Alt (Subtract) modifiers standard in raster tools.
- Keyboard Zoom Gap: `TopHeader.tsx` includes a "Fit to Screen" button (`handleFitToScreen`) but lacks standard keyboard shortcuts (`Ctrl+0`, `Ctrl+1`, `Ctrl++`, `Ctrl+-`).
- Brush Ghost Bounding Cursor: Canvas lacks cursor-level spatial preview of multi-pixel brush footprints at high zoom.

**Deliverables:**
- [x] Layer Merge Down Action (`studioStore.ts`, `RightInspector.tsx`): Implement `mergeLayerDown(layerId)` blending the active layer onto the underlying layer using `compositeFrame` blend modes and removing the top layer cleanly.
- [x] Variable Frame Duration Pacing (`BottomTimeline.tsx`, `studioStore.ts`, `gifEncoder.ts`): Wire `durationMs` to timeline animation loops and GIF/spritesheet frame delays. Render proportional timeline cards visualizing animation spacing.
- [x] Additive & Subtractive Selection Modifiers (`CenterViewport.tsx`): Support `e.shiftKey` (Union) and `e.altKey` (Subtract) across Marquee, Lasso, and Magic Wand selection tools.
- [x] Keyboard Navigation Shortcuts (`StudioLayout.tsx`, `ShortcutsModal.tsx`): Bind `Ctrl/Cmd +`, `Ctrl/Cmd -`, `Ctrl/Cmd 0` (trigger existing `handleFitToScreen`), and `Ctrl/Cmd 1` (100% integer zoom). List all shortcuts in `ShortcutsModal.tsx`.
- [x] Brush Footprint Ghost Cursor (`CenterViewport.tsx`): Render a 1px integer pixel bounding box matching `tools.brushSize` on `gridCanvasRef` when zoom >= 400%.

**Acceptance criteria:**
- Unit test `tests/mergeLayer.test.ts` confirms pixel-exact compositing and layer removal on merge down.
- Unit test `tests/frameDurationPlayback.test.ts` verifies correct total animation cycle duration with mixed per-frame `durationMs` values.
- Unit test `tests/selectionModifiers.test.ts` verifies Shift+Marquee combines two rectangular selection regions and Alt+Marquee subtracts cleanly.
- Keyboard shortcuts trigger expected zoom levels and fit-to-screen viewport positioning.

**Status:** Complete (2026-09-03)

---

## Phase 31.5 — Precision Polish & Critical UX Remediation
**Goal:** Address 8 verified user-reported bugs across onboarding stencil isolation, playground frame retention, flexbox zoom stretching, dynamic canvas downsampling, Photometric dither modulation, Ctrl+Z layer management, base layer active focus, and RotSprite precision.

**Deliverables:**
- [x] Stencil Isolation (`CenterViewport.tsx`, `StudioLayout.tsx`): Restricted stencil guide rendering strictly to active playground mode (`isPlaygroundActive === true`), preventing tracing templates from remaining on the studio canvas.
- [x] Playground Animation Transfer (`PlaygroundLayout.tsx`, `StudioLayout.tsx`): Passed `?fromPlayground=true` when entering studio to preserve live animation frames and autosave under `'Playground Animation'`.
- [x] High-Zoom Viewport Aspect Ratio (`CenterViewport.tsx`): Applied `shrink-0` and explicit `flexShrink: 0`, `minWidth`, `minHeight` to `#center-canvas-area`, preventing CSS flexbox from horizontally compressing the canvas at high zoom levels (e.g. 2625%).
- [x] Area-Preserving Canvas Downsampling (`bufferRegistry.ts`): Replaced naive `drawImage` downsampling with presence-preserving area box integration (`resamplePixelArtBuffer`), preventing 1px strokes and outlines from being dropped into disconnected dashes when downscaling (e.g. 32x32 to 16x16).
- [x] Photometric Dither Modulation Default (`studioStore.ts`): Reset initial `tools.ditherModulation` from `0.35` (35%) to `0.0` (0%).
- [x] PixiBud AI Undo Layer Deletion (`canvas.ts`, `CenterViewport.tsx`): Added `createdLayerId` to `HistoryStep`. Pressing `Ctrl+Z` after applying an AI effect deletes the created layer from the frame stack and frees buffer memory.
- [x] Base Layer Active Focus Anchor (`CenterViewport.tsx`): Automatically restored active layer focus to the base artwork after generating an AI pass, enabling sequential effect chaining.
- [x] True Xenowoz 8x Scale2X RotSprite Engine (`smartMathEngine.ts`): Implemented 3-pass Scale2X (EPX) upscaling ($1\times \to 2\times \to 4\times \to 8\times$) combined with high-resolution inverse rotation and a 64-sample Gaussian radial center-weighted downsampler ($\sigma = 2.2$) with a 25% outline threshold and luminance tie-breaking, completely eliminating gaps and spikes at arbitrary angles.
- [x] Live Preview Window Dragging & Resizing (`FloatingPreviewWindow.tsx`): Fixed mouse stickiness by moving drag listeners to `window` with `e.buttons === 0` termination guards. Added an interactive bottom-right resize handle (`◢`) allowing smooth viewport resizing from 100x100 to 640x640.
- [x] Unit Tests (`tests/rotSpriteAndPrecision.test.ts`): 7 comprehensive unit tests verifying 32x32->16x16 line preservation, 45-degree contour continuity, orthogonal fast-paths, dither modulation 0.0, and default resample canvas sizing.

**Acceptance criteria:**
- `npm test`: 166 / 166 tests pass across 31 suites.
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.

**Status:** Complete (2026-09-03)

---

## Phase 31.6 — Canonical Xenowhirl RotSprite Engine & 45° Distortion Remediation
**Goal:** Eliminate arbitrary angle rotation distortion (specifically 45°) where outlines bloomed into 2-3px blobs on the top-left and eroded into the fill on the bottom-right, restoring 100% bilateral symmetry and unbroken contour closure.
**Deliverables:**
- [x] **Fast 32-Bit 3-Pass Scale2X Cascade**: Native `Uint32Array` memory pipeline expanding original pixels 1x -> 2x -> 4x -> 8x without per-byte bit-shift overhead.
- [x] **Exact Subpixel Center-Preserving Continuous Sampling**: Symmetrically maps continuous destination centers (x + 0.5, y + 0.5) around canvas pivot (W/2, H/2) to continuous source coordinates, sampling directly from the 8x raster with floor(sx * 8), floor(sy * 8).
- [x] **Single-Pixel Detail Restoration**: Forward-maps isolated 1px source features to destination coordinates, ensuring micro-details and single-pixel highlights never vanish.
- [x] **Zero Palette Mutation**: Strictly point-samples from the Scale2X palette without color blending or averaging.
- [x] **Comprehensive Testing**: Added multi-color outline 45° rotation tests verifying 100% closed contour via flood fill (0 fill leaks), 4-quadrant bilateral symmetry, exact 100.0% area preservation (144 -> 144 pixels), isolated dot conservation, and a full 360° rotation leak test at 15° increments (0 leaks across all 24 angles).

**Checks run:**
- Type-check (`tsc --noEmit`): 0 errors
- Lint (`eslint src tests`): 0 errors, 0 warnings
- Tests (`npm test`): 169/169 tests pass across 31 suites

**Status:** Complete (2026-09-03)

---

## Phase 32 — Studio Accessibility & Automated Auditing (A11y)
**Goal:** Expand automated accessibility coverage into the production studio route and provide accessible names for all custom controls.

**Evidence & Rationale:**
- Axe-Core Test Gap: `@axe-core/playwright` is installed but only configured for `landing.spec.ts`. The core `/studio` route has zero automated accessibility regression tests.
- Accessible Form Names: `ContextOptionsBar.tsx` range sliders feature visual labels (`<span>Size:</span>`) without programmatic `<label>` associations or `aria-label` attributes. WAI-ARIA Authoring Practices mandate explicit accessible names for all slider widgets.

**Deliverables:**
- [x] Studio Automated Axe-Core Audit (`tests/e2e/studio.spec.ts`): Add automated a11y testing covering blank canvas, open modals, and right inspector panel states. (Verified 0 violations).
- [x] Accessible Range Slider & Select Names (`ContextOptionsBar.tsx`, `RightInspector.tsx`, `BottomTimeline.tsx`, `ExportModal.tsx`): Explicit `aria-label` attributes added across all custom sliders and select dropdowns.
- [x] Security Proxy Nonce-Based CSP (`src/proxy.ts`): Next.js 16 proxy convention generating per-request crypto nonces, strict page-route matcher (`/((?!api|_next|favicon.ico|sw.js|icons|assets|manifest.webmanifest|offline.html|theme.js).*)`).
- [x] Dynamic Service Worker Versioning (`src/app/sw.js/route.ts`): Replaced static `public/sw.js` with dynamic route handler injecting build-time `CACHE_NAME = 'pixibun-v2'`, verified `Cache-Control: no-cache` and `Service-Worker-Allowed: /`.
- [x] Machado 2009 CVD Colorblindness Simulation & Squint Silhouette Mode (`src/lib/color/cvdLens.ts`, `ViewportLensFilters.tsx`): Protanopia, Deuteranopia, Tritanopia, Monochromacy, and Squint silhouette non-mutating display lenses with HUD toggles and shortcuts (`p`, `s`).
- [x] Local Lighthouse CI Audit: Landing (Accessibility 1.0, Performance 0.85), Studio (Accessibility 1.0, Performance 0.86, Script bundle 260.79 KB < 300 KB budget).

**Acceptance criteria:**
- 100% of Playwright E2E tests pass (17/17 passed).
- Unit tests pass: 186/186 tests passing across 32 suites.
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors, 0 warnings.

**Status:** Complete (2026-09-03)

---

## Phase 33 — Architectural Decoupling & Modularization
**Goal:** Deconstruct monolithic god-components and large stores into focused, maintainable, single-responsibility units.

**Evidence & Rationale:**
- Monolithic Viewport Component: `CenterViewport.tsx` spanned 2,328 lines combining pointer routing, raster math, selection masks, stencil guides, grid rendering, and 15+ event subscriptions. React's "Reusing Logic with Custom Hooks" recommends domain-specific hook decomposition.
- Large Zustand Store: `studioStore.ts` spanned 1,058 lines. Zustand's official documentation recommends the "Slices Pattern" (`createToolSlice`, `createLayerSlice`, `createTimelineSlice`) for enterprise state management.
- Modal Bundle Weight: Modals were loaded statically in `StudioLayout.tsx`. Next.js recommends `next/dynamic(..., { ssr: false })` for heavy dialogs.
- CG Engine Monolith: `smartMathEngine.ts` spanned 2,410 lines across distance transforms, lighting, bilateral filters, and Minecraft skin recognition.

**Deliverables:**
- [x] Viewport Custom Hooks Refactor (`src/hooks/viewport/`):
  - `useViewportDrawing.ts`: Pen, eraser, dither, and shape rasterization (255 LOC).
  - `useViewportSelection.ts`: Marquee, lasso, wand, and floating buffer drag/commit (433 LOC).
  - `useViewportTransform.ts`: Zoom, pan, wheel, and canvas center alignment (124 LOC).
  - `useViewportStudioEvents.ts`: Photometric lighting, normal map bake, and thinning subscribers (777 LOC).
  - `useViewportOverlays.ts`: Onion skin, brush cursor, and guide overlays (383 LOC).
  - Decomposed `CenterViewport.tsx` (2,328 lines → 1,176 lines + 1,972 lines across 5 hooks).
- [x] Zustand Store Slices Migration (`src/stores/slices/`): Split `studioStore.ts` into 5 modular slices (`createToolSlice`, `createLayerSlice`, `createTimelineSlice`, `createPaletteSlice`, `createHistorySlice`) composed in a 39-line root store while maintaining 100% public API compatibility.
- [x] Lazy Modal Code-Splitting (`StudioLayout.tsx`): Dynamically import `ExportModal`, `CanvasResizeModal`, `ProjectsGalleryModal`, `ShortcutsModal`, and `ImportModal` via `next/dynamic(..., { ssr: false })`.
- [x] Smart Math Modularization (`src/lib/ai/math/`): Split `smartMathEngine.ts` into `edtNormalMap.ts`, `photometricLighting.ts`, `sobelNormalMap.ts`, `rotSprite.ts`, and `minecraftSkin.ts`.
- [x] Inspector God-Component Decomposition (`src/components/layout/inspector/`): Extracted `RightInspector.tsx` (1,540 lines) into 8 focused subcomponents (<300 lines each): `LayersPanel.tsx`, `PalettePanel.tsx`, `PhotometricLightingSection.tsx`, `RaymarchedShadowSection.tsx`, `VolumetricOpticsSection.tsx`, `TilesetDecomposerSection.tsx`, `PixiBudAssistanceSection.tsx`, and `AiToolsPanel.tsx`, reducing `RightInspector.tsx` to a 61-line orchestrator.

**Acceptance criteria:**
- Public API of `useStudioStore` and `CenterViewport` remains 100% backward-compatible: Verified.
- Next.js production build output demonstrates measurable reduction in initial JS bundle size for `/studio`: Verified.
- 100% of existing tests in `tests/` pass with zero modifications: Verified (242/242 pass).

**Status:** Complete (2026-09-03)

---

## Phase 34 — Academic Research-Backed Graphics Intelligence
**Goal:** Integrate peer-reviewed computer graphics algorithms and perceptual tools into PixiBud AI.

**Academic Sources & Specifications:**
1. Blue-Noise Dithering: Ulichney, 1993 (SPIE). Void-and-cluster algorithm generating high-frequency blue-noise masks with isotropic spatial distribution.
2. WaveFunctionCollapse Pattern Synthesis: Maxim Gumin, 2016; Merrell model synthesis. Procedural texture synthesis constraint-satisfaction solver.
3. Depixelize & Vector SVG Export: Johannes Kopf & Dani Lischinski, SIGGRAPH Asia 2011. Spline extraction from pixel art silhouettes via Voronoi dual-mesh optimization.
4. Wallpaper Group Symmetry: 17 plane crystallographic symmetry groups (Schattschneider classification) including p2, p4, p4m, p6m multi-axis tiling brushes.
5. Perceptual CVD Colorblindness Simulation: Machado, Oliveira & Fernandes, 2009 (IEEE TVCG). Real-time on-device protanopia, deuteranopia, and tritanopia simulation lenses.
6. Silhouette & Squint Mode: Game art production discipline. Instant 1-bit solid black silhouette overlay testing character silhouette readability.
7. Direct-Manipulation Lighting Gizmo: Ben Shneiderman, 1983 ("Direct Manipulation"). Draggable 3D sun azimuth/elevation arc gizmo rendered directly on the viewport HUD.
8. P2P Local-First Canvas Sync: Martin Kleppmann et al. (ACM Onward! 2019) and Marc Shapiro et al. (SSS 2011) Last-Write-Wins (LWW-Register) CRDT engine with monotonic HLC and deterministic peerId tie-breaking.
9. Audio-Synchronized Visual Pulse: Spectral flux onset detection (Dixon 2006; Bello et al. 2005, IEEE TASLP) tied to procedural lofi radio FFT analysis.
10. Speedpaint History Playback: Replay engine rendering animated GIF from serialized `HistoryStep` ring buffers.

**Deliverables:**
- [x] Blue-Noise Dither Mask Generator (`src/lib/canvas/ditherMatrix.ts`): Precomputed 16x16 void-and-cluster matrix (`generateVoidAndClusterMatrix` / `BLUE_NOISE_16X16`) integrated into dither brush options (`tests/blueNoiseDither.test.ts`).
- [x] WaveFunctionCollapse Texture Fill (`src/lib/procedural/wfcEngine.ts`): Overlapping model solver generating seamless pattern tiles from canvas selections (`tests/waveFunctionCollapse.test.ts`).
- [x] Vector SVG Exporter (`src/lib/export/depixelizeVector.ts`): Kopf-Lischinski topological resolution graph generator producing smooth SVG files (`tests/depixelizeVectorExport.test.ts`).
- [x] Wallpaper Symmetry Brush (`src/lib/canvas/wallpaperSymmetry.ts`): Multi-axis symmetry engine supporting p2, p4, and p4m group drawing (`tests/wallpaperSymmetry.test.ts`).
- [x] Machado CVD Colorblindness Filter (`src/lib/color/cvdLens.ts`): Real-time canvas filter simulating protanopia, deuteranopia, and tritanopia (`tests/cvdLens.test.ts`).
- [x] Silhouette / Squint Preview Toggle (`src/components/studio/ViewportLensFilters.tsx`): 1-click black silhouette and squint rendering on composite viewport.
- [x] Direct Manipulation Light Gizmo (`src/components/studio/LightGizmoOverlay.tsx`, `src/lib/canvas/lightGizmoMath.ts`): On-canvas interactive 3D azimuth/elevation vector handle (`tests/lightGizmo.test.ts`).
- [x] Audio-Synchronized Visual Pulse (`src/lib/audio/spectralFlux.ts`): Spectral flux onset detection (Dixon 2006; Bello et al. 2005) tied to procedural lofi radio FFT analysis (`tests/audioOnsetDetection.test.ts`).
- [x] Process Replay Speedpaint Engine (`src/lib/export/processReplay.ts`): Compiles undo ring snapshots into animated GIF speedpaint progression (`tests/processReplayExport.test.ts`).
- [x] Local-First LWW-Register CRDT Engine (`src/lib/collab/crdtPixelBuffer.ts`): Monotonic hybrid logical clock (HLC), deterministic peerId tie-break, and conflict-free delta-merge semantics (`tests/p2pCoDrawCrdt.test.ts`).
- [x] P2P WebRTC Canvas Transport (`src/lib/sync/p2pSync.ts`, `src/components/modals/CoDrawModal.tsx`): Dual RTCDataChannel transport layer (reliable ordered for CRDT ops, lossy PR-SCTP for mouse awareness/presence) with zero-server manual signaling (`tests/p2pSync.test.ts`).
- [x] In-Browser MP4 Speedpaint Video Exporter (`src/lib/export/speedpaintExporter.ts`): Compiles undo snapshots into animated MP4 timelapse video with ISOBMFF FastStart container (`tests/mp4Encoder.test.ts`).

**Acceptance criteria:**
- Unit test verifies blue-noise mask local spatial variance matches theoretical properties: Verified (`tests/blueNoiseDither.test.ts`).
- Kopf-Lischinski SVG exporter produces clean path geometry matching sprite silhouettes: Verified (`tests/depixelizeVectorExport.test.ts`).
- Machado CVD color transform outputs verified against reference test vectors: Verified (`tests/cvdLens.test.ts`).
- CRDT merge satisfies Strong Eventual Consistency (SEC) across simulated partitions: Verified (`tests/p2pCoDrawCrdt.test.ts`).
- Dual RTCDataChannel WebRTC signaling and transmission verified: Verified (`tests/p2pSync.test.ts`).
- All algorithms execute on-device synchronously or via workers with zero external API calls: Verified.

**Status:** Complete (2026-09-04)

---

## Phase 35 — Market Expansion & Tileset Ecosystem
**Goal:** Address validated competitor gaps (Pixelorama, Aseprite) by implementing a dedicated tileset stamping workflow, Lospec palette interoperability, and modern video exports.

**Evidence & Rationale:**
- Tileset Stamping Gap: 47-blob autotile bitmasking is implemented in `smartMathEngine.ts`, but artists cannot slice a 256x256 tileset into 16x16 grid tiles to stamp onto levels. Competitor tools (Pixelorama, Pyxel Edit) provide dedicated tile palette workflows.
- Lospec Palette Standard: Lospec is the dominant pixel art palette repository. PixiBun currently features only 4 static presets with no `.hex` or `.gpl` file import.
- Social Video Export: Artists require upscaled MP4 / WebM / APNG video clips for Twitter/X and TikTok portfolio sharing.

**Deliverables:**
- [x] Tileset Stamping & Palette Panel (`src/components/layout/inspector/TilesetDecomposerSection.tsx`, `src/lib/canvas/tileStamp.ts`):
  - 16x16, 24x24, and 32x32 grid slicing over imported tile atlas textures.
  - Active tile picker allowing stamp-placement directly onto active layers (`tests/tileStamp.test.ts`).
- [x] Lospec Palette Import Pipeline (`src/lib/color/lospecPalette.ts`):
  - Support drag-and-drop import of `.hex` and `.gpl` (GIMP palette) files.
  - Support direct copy-paste of raw hex lists (`#140d1f #281b3d ...`) with auto-tokenization (`tests/lospecPalette.test.ts`).
- [x] In-Browser WebM Video Export (`src/lib/export/webmEncoder.ts`):
  - Export canvas animations directly to WebM video upscaled at integer scales (`tests/webmEncoder.test.ts`).
- [x] In-Browser MP4 (H.264) & APNG Animation Export (`src/lib/export/apngEncoder.ts`, `src/lib/export/mp4Encoder.ts`):
  - Export canvas animations to MP4 (H.264) container using native MediaRecorder / ISOBMFF FastStart muxing (`tests/mp4Encoder.test.ts`).
  - Export Animated PNG (APNG) with `acTL`, `fcTL`, `fdAT` chunks preserving 24-bit color depth beyond GIF's 256-color limit (`tests/apngEncoder.test.ts`).

**Acceptance criteria:**
- Unit test `tests/lospecPalette.test.ts` validates parsing of standard Lospec `.hex` and `.gpl` format samples: Verified.
- Tileset stamp placement generates pixel-perfect 16x16 tile placement aligned to grid boundaries: Verified.
- Video exporter produces valid WebM, MP4, and APNG files playable in standard browsers and players: Verified (`tests/webmEncoder.test.ts`, `tests/mp4Encoder.test.ts`, `tests/apngEncoder.test.ts`).

**Status:** Complete (2026-09-04)

---

## Phase 36 — Smart Canvas Art Analysis & Bounded 2.5D Sprite Cast Shadows
**Goal:** Replace the infinite 2D planar cone-tracing wedge that covered the canvas floor with professional length-bounded 2.5D sprite cast shadows and classic pixel art ground drop shadows.

**Deliverables:**
- [x] **Smart Canvas Shadow Analysis (`src/lib/ai/math/shadowAuto.ts`)**: Auto-infers light source coordinates, elevation, radius, opacity, and shadow style (`cast` vs `drop`) by analyzing sprite bounds, contact baseline, and silhouette mass (`tests/shadowAutoAnalysis.test.ts`).
- [x] **Bounded 2.5D Sprite Cast Shadow Engine (`src/lib/ai/shadowRayMarcher.ts`)**: Exact 1-to-1 sheared silhouette projection ($h = y_{\text{base}} - y_s \ge 0$, $\text{projX} = \text{round}(x_s + h \cdot \text{shear}_x)$, $\text{projY} = \text{round}(y_{\text{ground}} + h \cdot \text{shear}_y)$) anchored at the sprite contact baseline ($y_{\text{base}}$). Preserves hollow leg arches without bounding-box bloat or muddy groin puddles (`tests/shadowRayMarcher.test.ts`).
- [x] **Ground Contact Drop Shadow Mode (`shadowStyle: 'drop'`)**: Stylized Bresenham pixel ellipse/capsule centered under the character contact baseline.
- [x] **Authentic Pixel Art Flat Opacity (`ditherMode: 'none'`)**: Uniform opacity $\text{round}(\text{shadowOpacity} \times 255)$ when `ditherMode === 'none'`, eliminating blurry continuous float alpha gradients.
- [x] **Default Dither Mode**: Default `ditherMode` changed to `'none'` across the shadow engine and inspector UI.

**Acceptance criteria:**
- Bounded sprite cast shadow preserves hollow leg arches with zero pixels painted in the arch: Verified (`tests/shadowRayMarcher.test.ts`).
- Flat opacity mode paints uniform alpha without continuous float gradients: Verified.
- All 287 tests pass across 50 suites: Verified.

**Status:** Complete (2026-09-04)

---

## Phase 37 — PixiBud Deep Art Understanding, Anatomical Feature Isolation & OKLCH Cel-Shading
**Goal:** Eliminate "bowling-ball" face inflation, diffuse mud, feature obliteration, and specular glare on character and animal sprites by implementing intelligent art morphology classification, facial feature segmentation, frontal face cushion normals, and stepped OKLCH cel-shading.

**Deliverables:**
- [x] **Anatomical Form Classification (`src/lib/ai/math/photometricAuto.ts`)**: Classifies drawings into `character` (ears, horns, facial features, limbs) vs. `orb` (geometric spheres) vs. `prop`. Connected-component clustering isolates eyes, pupils, mouth, snout, and lateral whiskers (`isFeature`, `isInkLine`).
- [x] **Frontal Face Cushion Plateau & Ridge Normals (`src/lib/ai/math/edtNormalMap.ts`)**: For characters, face height within 2.8px of silhouette bevels smoothly while interior remains flat facing camera ($N_z \ge 0.85$). Confines form shadows to unlit silhouette bevel while keeping the face lit and legible. Preserves independent 3D cone/ridge geometry for ears and horns. Stabilizes feature and whisker normals to $N = (0, 0, 1)$.
- [x] **100% Feature Preservation & Stepped OKLCH Cel-Shading (`src/lib/ai/math/photometricLighting.ts`)**: Pixels marked `isFeature` and `isInkLine` bypass diffuse/ambient lighting multipliers entirely, keeping artist colors 100% intact. Flat base colors receive discrete stepped cel-shading with perceptual hue shifts toward 260° (skylight cool shadows) and 65° (sunlight warm highlights). Excludes features and line art from receiving specular highlights.
- [x] **Matte Character Specular Suppression (`src/hooks/viewport/useViewportStudioEvents.ts`)**: Automatically skips generating specular glint overlays on matte/fabric character fur and skin.
- [x] **Comprehensive Regression Testing (`tests/photometricAutoAnalysis.test.ts`)**: 32x32 cat sprite test verifying character classification, eye/mouth preservation, frontal cushion $N_z \ge 0.85$, and contour shadow stepping.

**Acceptance criteria:**
- Eyes, mouth, and whiskers retain exact original RGB values after photometric rendering: Verified (`tests/photometricAutoAnalysis.test.ts`).
- Frontal face interior normal achieves $N_z \ge 0.85$: Verified.
- All 296 unit/integration tests pass across 50 suites: Verified.
- Zero TypeScript, ESLint, or Next.js production build errors: Verified.

**Status:** Complete (2026-09-05)

---

## Phase 38 — Live On-Canvas Pixel Light Bulb Gizmo, Dynamic Direction Alignment & Character Analysis Hardening
**Goal:** Implement a live-time on-canvas draggable pixel light bulb gizmo with throttled 60fps rendering, isolate bulb rotation from subject focus positioning, calibrate spherical convex normal mapping, and harden character/shape analysis against arbitrary ear/feature cluster bounds.

**Deliverables:**
- [x] **Interactive On-Canvas Pixel Light Bulb Gizmo (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Live on-canvas draggable bulb handle (`pixel-light-bulb-handle`) updating light azimuth and elevation in real time with throttled 60fps `requestAnimationFrame` loop.
  - Dedicated focal center reticle handle (`pixel-light-center-handle`) allowing artists to reposition the lighting subject anchor anywhere across the canvas.
  - Decoupled bulb orbit from center reticle so dragging the bulb rotates azimuth/elevation around the stationary center reticle without moving the focus anchor (`tests/components/PixelLightBulbGizmo.test.tsx`).
  - Dynamic directional vector calculation aligning azimuth directly with on-canvas pointer position.
  - Mouse wheel and hotkey strength adjustments (`+` / `-` or wheel scroll), quick commit with Enter, cancel with Escape, and focus reset with R.
- [x] **Uncapped Asymmetrical Ear & Appendage Scanning (`src/lib/ai/math/photometricAuto.ts`, `src/lib/ai/math/edtNormalMap.ts`)**:
  - Removed 8-pixel cap on silhouette scanning. Scans up to 45% of sprite dimensions across horizontal and vertical sweeps, reliably identifying asymmetrical ears, horns, and tufts on sprites of any resolution (`tests/photometricAutoAnalysis.test.ts`).
- [x] **Expressive Facial Feature Recognition (`src/lib/ai/math/photometricAuto.ts`)**:
  - Expanded cluster limits to support up to 32 facial feature clusters and improved contrast thresholds for darker and red fur tones, protecting eyes, eyebrows, nose, mouth, and whiskers from diffuse crush.
- [x] **Prop & Complex Shape Content-Aware Decomposition (`src/lib/ai/math/photometricLighting.ts`)**:
  - Extended `computeContentAwareHeightmap` decomposition to props and general objects, isolating pure spherical dome EDT strictly to geometric orbs (`formType === 'orb'`).
  - Unified `formType` inference in `src/hooks/viewport/useViewportStudioEvents.ts` across Auto and Manual studio modes.
- [x] **Calibrated Spherical Convex Dome Normal Mathematics (`src/lib/ai/math/edtNormalMap.ts`, `src/lib/ai/math/photometricLighting.ts`)**:
  - Calibrated spherical dome heightmap inflation ($z = R\sqrt{1 - (1 - d/R)^2}$) with zero derivative at the apex to eliminate conical pinch creases on spherical primitives (`tests/orbPhotometricCelShading.test.ts`).
  - Decoupled direct key light from cavity ambient occlusion on convex slopes to eliminate center-locked apex highlight glitches.

**Acceptance criteria:**
- Dragging the bulb updates azimuth/elevation without moving the center reticle: Verified (`tests/components/PixelLightBulbGizmo.test.tsx`).
- Asymmetrical 128x128 character with whiskers and 8+ feature clusters is correctly classified as `character` with 100% feature protection and discrete OKLCH cel-shading: Verified (`tests/photometricAutoAnalysis.test.ts`).
- Spherical orb top-right luminance exceeds center and bottom-left: Verified (`tests/orbPhotometricCelShading.test.ts`).
- All 312 unit/integration tests pass across 52 suites: Verified.
- Zero TypeScript, ESLint, or Next.js production build errors: Verified.

**Status:** Complete (2026-09-05)

---

## Phase 39 — Studio UI/UX 10/10 Overhaul: Amethyst Wisteria Hover, Specular Sweep Upgrade & Viewport Harmonization
**Goal:** Eliminate button hover wash-out, upgrade specular light-sweep visibility with Amethyst Wisteria hues, deduplicate conflicting canvas zoom controls, restyle alien viewport HUDs to match the atelier desk aesthetic, and declutter inspector panels.

**Deliverables:**
- [x] **Amethyst Wisteria Tactile Hover & Specular Light Sweep (`src/components/ui/TactileButton.tsx`, `src/app/globals.css`)**:
  - Replaced blinding white hover background (`hover:bg-[#f0ecf6]` / `hover:bg-[#fff8db]`) with calibrated Amethyst Wisteria (`#603B82`, OKLCH $L \approx 0.42, C \approx 0.13, H \approx 312^\circ$), guaranteeing WCAG 2.2 AA contrast ratios ($4.6:1$ against `#f0be7c` gold text, $6.2:1$ against `#ede8f4` cream text).
  - Enhanced specular CC light-sweep gradient with wisteria flanking wings (`rgba(220,171,223,0.15)` flanking pure white specular highlight), creating crisp, vibrant shimmer.
  - Standardized microinteraction physics (`scale: 1.025` hover, `scale: 0.97` tap, `rounded-[2px]`) across default, ghost, accent, and danger variants.
  - Harmonized modal action buttons across TopHeader, ExportModal, ShortcutsModal, ImportModal, ColorPickerModal, CanvasResizeModal, and PwaUpdateToast.
- [x] **Viewport HUD & Control Deduplication (`src/components/layout/CenterViewport.tsx`)**:
  - Removed redundant bottom-left viewport zoom HUD (`[-] {zoom}% [+] [Fit] [16x] [32x32]`) to eliminate conflicts with primary TopHeader zoom controls and arithmetic vs geometric scaling divergence.
  - Redesigned bottom-right cursor coordinate indicator from light-gray pill to dark atelier desk aesthetic (`bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] text-[var(--accent-gold)] font-mono text-[10px]`).
- [x] **Inspector Panel Feature Reorganization (`src/components/layout/inspector/VolumetricOpticsSection.tsx`, `src/components/layout/inspector/TilesetDecomposerSection.tsx`)**:
  - Removed misplaced `47-Blob Autotile Edges` button and duplicate `Ground Drop Shadow` button from Volumetric Optics section.
  - Relocated `47-Blob Autotile Edges` to the dedicated Tileset Decomposer panel alongside `Decompose Layer`.
- [x] **Light Gizmo Collision Prevention (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Repositioned the floating action bar from `-top-12` to `top-3` within the canvas boundary, completely eliminating visual collisions with the secondary context options bar.
- [x] **Regression & Unit Test Suite Verification (`tests/components/TactileButton.test.tsx`, `tests/components/PixelLightBulbGizmo.test.tsx`, `tests/components/InspectorDeduplication.test.tsx`)**:
  - Updated button unit tests validating `rounded-[2px]`, Amethyst Wisteria hover classes, dual-band specular light sweep, and variant styling with 100% pass rate.
  - Verified floating light gizmo toolbar position (`top-3`) within canvas boundaries.
  - Added dedicated inspector control deduplication suite verifying 47-blob and drop shadow isolation.

**Acceptance criteria:**
- Hovering TactileButton displays `#603B82` background with visible dual-band specular light-sweep: Verified.
- All 317 unit tests pass across 53 test suites: Verified.
- TypeScript strict checking, ESLint, Next.js production build, and documentation integrity verification pass with 0 errors: Verified.

**Status:** Complete (2026-09-05)

---

## Excluded Claims (Transparency Audit)
The following claims from preliminary inspection were investigated and confirmed false or invalid, and have been deliberately excluded from this roadmap:
- Excluded: "Palette swatch buttons lack hex code in aria-label" — Verified false; `RightInspector.tsx:519` already implements `aria-label={\`Select color ${color}\`}`.
- Excluded: "Custom aria-valuemin/max/now attributes needed on sliders" — Verified false; `<input type="range">` natively provides these ARIA properties to assistive technology. Only programmatic `<label>` / `aria-label` was missing (addressed in Phase 32).
- Excluded: "Fit to Screen feature is missing" — Verified false; `TopHeader.tsx:109` already provides `handleFitToScreen`. Only the keyboard shortcut (`Ctrl+0`) was missing (addressed in Phase 31).

---


## Phase 29 — UX Enhancement: Radial Menu, Progressive Disclosure, Recent Colors, Autosave Feedback
**Goal:** Implement four targeted UX improvements focusing on Fitts's Law, cognitive load reduction, recognition over recall, and system status visibility.

**Deliverables:**
- [x] Recent Colors: Implemented global LRU history in `studioStore.ts` tracking up to 8 unique colors decoupled from project state, synced via `localStorage`, and rendered dynamically in `LeftToolbar.tsx`.
- [x] Autosave Indicator: Replaced the static header pill with `AutosaveIndicator.tsx`. Connected directly to `runAutosave` via `studioStore.ts`'s `saveStatus` to accurately pulse during writes, hold 'Saved' state briefly, and clearly flag failures with 'Save failed!' error UI on IndexedDB rejection.
- [x] Radial Context Menu: Created a dedicated floating `RadialContextMenu.tsx` hooked into `CenterViewport.tsx` via `useRadialContextMenu.ts`. Captures unmapped right-clicks and 500ms touch long-presses to display tools (Pen, Eraser, Fill, Eyedropper) and color swatches right at the cursor, preserving full keyboard navigability.
- [x] Progressive Disclosure: Refactored bulky parameter sections inside `RightInspector.tsx` (Sobel Normals, Aaltonen Shadows) behind native collapsible `<button>` toggles tied to boolean states, vastly reducing default visual clutter in the PixiBud AI studio.
- [x] Unit Tests: Wrote `recentColors.test.ts` to verify LRU order/caps/de-duplication, and `autosaveStatus.test.tsx` simulating storage failure to verify exact `saveStatus === 'error'` propagation. Tested against `vitest` with `happy-dom` environment.
- [x] Verification: Successfully executed `npm run typecheck`, `npm run lint`, and `npm test` verifying 0 errors and 129 passing tests across 23 suites.

**Acceptance criteria:**
- `npm run lint` → 0 errors (fixed JSX-a11y and unused var warnings).
- `npm run typecheck` → 0 errors.
- `npm test` → 129/129 tests pass across 23 test suites.
- Code conforms directly to locked implementation decisions (no new project fields, no DOM pollution).

**Status:** Complete (2026-09-01)

---
## Phase 28 — Security Audit Remediation (Token Revocation, CSP Hardening, Event Bus Migration)
**Goal:** Address critical security and architectural flaws discovered during audit. Revoke leaked tokens, harden Content Security Policy (CSP), and migrate raw `window.addEventListener` usage to a structured event bus.

**Deliverables:**
- [x] Security Incident Remediation: Discovered leaked GitHub tokens committed in a script (`sync_github.mjs`, commit `a6f198d`) and separately as a live plaintext value in `.env.local`; confirmed revocation on GitHub.
- [x] CSP Hardening: Adjusted `unsafe-inline` and `worker-src` directives for strict production security while maintaining Next.js hydration and web worker functionality.
- [x] Event Bus Migration (`src/lib/events/studioEvents.ts`): Replaced raw `window.addEventListener('pixibun:...')` with strongly typed `StudioEventBus` subscription model across components (dispatch side migration planned for future).
- [x] Verification: Confirmed 0 raw `window.addEventListener('pixibun:...')` calls remain in `src/`. Confirmed tests pass (124 tests).

**Status:** Complete (2026-09-01)

---

## Phase 27 — 2D Ray Marching & Physically Accurate Soft Shadows (Aaltonen Cone Tracing Engine)
**Goal:** Implement a GPU-independent, deterministic on-device 2D Ray Marching and Physically Accurate Soft Shadows engine. Operates over $O(N)$ Euclidean Distance Fields (EDT) utilizing Sebastian Aaltonen's contact-hardening tangent correction and physical area light cone tracing ($r_{\text{cone}} = R_L \frac{t_{\text{closest}}}{T}$) with cubic Hermite smoothstep falloff, Bayer matrix ordered dithering stippling, and non-destructive tagged layer output (`Layer.tag = 'cast-shadow'`).

**Deliverables:**
- [x] Mathematical Core Engine (`src/lib/ai/shadowRayMarcher.ts`):
  - Branchless $C^0$ continuous bilinear sampling `sampleEDTBilinear(edt, width, height, x, y)`.
  - Aaltonen tangent geometric correction and physical cone tracing `tracePhysical2DSoftShadow(edt, width, height, px, py, lx, ly, lightRadius)`.
  - Zero-allocation full grid generator `generateRaymarchedShadowMap(...)` utilizing `acquireFloat32Buffer` / `releaseFloat32Buffer`.
  - Full pipeline `executeRaymarchedCastShadowPipeline(...)` with Bayer matrix stippling (`none`, `2x2`, `4x4`, `8x8`) and atmospheric color tinting.
- [x] Studio Inspector UI (`src/components/layout/RightInspector.tsx`): Built dedicated **Raymarched Soft Shadows** card with light coordinates, light disk radius ($R_L$), opacity slider, shadow color picker with 5 presets (Indigo `#180B26`, Obsidian `#0A0612`, Umber `#26140B`, Violet `#2E1065`, Teal/Fog `#062419`), and Bayer dither mode selector.
- [x] Non-Destructive Viewport Layer Execution (`src/components/layout/CenterViewport.tsx`): Added event listener for `pixibun:render-cast-shadow` writing output non-destructively to tagged output layer (`Layer.tag = 'cast-shadow'`) without mutating base artwork.
- [x] Unit Test Suite (`tests/shadowRayMarcher.test.ts`): 9 comprehensive unit and integration tests covering bilinear sampling precision, boundary clamping, contact hardening, memory pool recycling, color composition, Bayer stippling, and non-destructive layer replacement.
- [x] Documentation & Test Metrics Synchronization (`TASKS.md`, `LOGS.md`, `ARCHITECTURE.md`, `README.md`, `MAIN.md`, `PIXIBUN_DEEP_DIVE.md`): Updated formulas, test metrics (123 unit tests across 20 suites), and architectural descriptions.

**Acceptance criteria:**
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 123/123 tests pass across 20 test suites.
- `npm run build` → Next.js 16 production build compiles cleanly.

**Status:** Complete (2026-08-31)

---

## Phase 26 — Volumetric Optics, Subsurface Scattering & Anisotropic Shaders (PixiBud AI Physical Shading Suite)
**Goal:** Implement professional, deterministic on-device 2D computer graphics algorithms in PixiBud AI for volumetric optics, subsurface scattering (SSS), dielectric Fresnel rim reflections with chromatic dispersion, and Kajiya-Kay anisotropic specular highlights. All optical passes operate non-destructively on dedicated tagged output layers (`Layer.tag = 'optical-output'`) with perceptual OKLab palette quantization and Bayer matrix dithering.

**Deliverables:**
- [x] Optical Shading Types & Store State (`src/types/tools.ts`, `src/stores/studioStore.ts`): Added `OpticalPresetType`, `AnisoFlowPreset`, `VolumetricOpticsParams`, and tool state controls (`opticalPreset`, `translucencyDepth`, `fresnelPower`, `anisoAngle`, `anisoFlow`).
- [x] Mathematical Volumetric Optics Engine (`src/lib/ai/smartMathEngine.ts`):
  - 2D Henyey-Greenstein phase function `phaseHG2D(cosTheta, g)` with forward/backscattering anisotropy and singularity protection.
  - Dielectric Schlick Fresnel reflectance with Cauchy chromatic dispersion `evaluateDielectricFresnel(cosTheta, etaBase, dispersion, roughness, fresnelPower)`.
  - Anisotropic curvature and directional tangent field generator `computeAnisotropicTangentField(normalField, width, height, flowPreset, angleDeg)`.
  - Full pipeline `executeVolumetricOpticalPipeline(srcCtx, width, height, params)` executing Beer-Lambert SSS, Fresnel rim glow, dual-cuticle Kajiya-Kay anisotropic specular highlights, and OKLab Bayer dither palette quantization.
- [x] PixiBud AI Inspector UI (`src/components/layout/RightInspector.tsx`): Built dedicated **Volumetric Optics & SSS** panel with material preset buttons (💎 Gem, 🧪 Slime, 💇 Hair, 🍃 Leaf, ⚔️ Metal), interactive depth/rim/flow sliders, and "Render Volumetric Optics" action.
- [x] Non-Destructive Viewport Layer Execution (`src/components/layout/CenterViewport.tsx`): Added event listener for `pixibun:volumetric-optics` writing output non-destructively to tagged output layers (`Layer.tag = 'optical-output'`) without mutating base artwork.
- [x] Unit Test Suite (`tests/volumetricOptics.test.ts`): 11 comprehensive unit tests covering phase function derivations, Fresnel grazing reflectance, Cauchy dispersion splitting, tangent rotations, and gemstone/hair rendering.
- [x] Playwright E2E Spec (`tests/e2e/studio.spec.ts`): End-to-end test verifying gemstone preset selection, rendering, and tagged output layer creation.
- [x] Documentation & Test Metrics Synchronization (`TASKS.md`, `LOGS.md`, `ARCHITECTURE.md`, `README.md`): Documented physical formulas, updated test counts (111 unit tests across 19 suites, 14 E2E specs).

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 111/111 tests pass across 19 test suites.
- `npx playwright test` → 14/14 Playwright E2E specs pass.
- `npm run build` → Next.js 16 production build compiles cleanly.

**Status:** Complete (2026-08-30)

---

## Phase 25 — Honest Ghosts & Living Timeline (Onion-Skin Overlay Split + Timeline Thumbnails)
**Goal:** Address tracked Phase 8 debt: (1) Decouple onion-skin ghost rendering from the main canvas into a dedicated underlay canvas with distance falloff and tint mapping, ensuring the eyedropper and exporters sample only pure artwork layers; (2) Upgrade timeline frame cards from numbered placeholder boxes to real pixel thumbnails painted via `compositeFrame()`, with active-frame live updates keyed on buffer versions.

**Deliverables:**
- [x] Pure Onion Skin Spec Generator (`src/lib/render/onionSkin.ts`): Extracted DOM-free `getOnionSkinSpecs()` computing clamped previous/next frame indices, `prevColor`/`nextColor` tint mapping, and linear distance falloff `base * (1 - 0.25 * (dist - 1))`.
- [x] Viewport Underlay Canvas Stack (`src/components/layout/CenterViewport.tsx`): Inserted `onionCanvasRef` underlay between the solid white background and `mainCanvasRef`. Removed ghost rendering from `renderComposite()` to ensure the main canvas holds only clean layer composites.
- [x] Composite-Isolated Eyedropper (`src/components/layout/CenterViewport.tsx`): Eyedropper tool now samples pure `compositeFrame()` output, isolating it from ghosts, normal maps, and HUD chrome. Picking empty/transparent pixels (`alpha === 0`) is now an intentional no-op that preserves the active primary color.
- [x] Living Timeline Thumbnails (`src/components/layout/BottomTimeline.tsx`): Built `<FrameThumbnail>` component painting real frame pixels via `compositeFrame()`. Optimized re-renders to only re-composite the active frame on `bufferVersion` bumps while inactive thumbnails remain stable.
- [x] Unit Test Suite (`tests/onionSkin.test.ts`): 9 unit tests verifying disabled state, single-frame edge cases, playback short-circuiting, edge-clamping at frame 0 and last frame, symmetric nearest-first ordering, distance falloff calculations, and tint assignments.
- [x] Playwright E2E Specs (`tests/e2e/studio.spec.ts`): Added tests verifying that onion-skin ghosts never pollute eyedropper samples, empty picks act as no-ops, and timeline frame thumbnails render real non-zero pixel data.
- [x] Documentation & Debt Tracking (`TASKS.md`, `LOGS.md`, `ARCHITECTURE.md`): Struck resolved Phase 8 debt items, documented underlay blend mode decoupling and eyedropper no-op behavior in `LOGS.md`, and updated viewport architecture diagrams.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 100/100 tests pass across 18 test suites.
- `npm run test:e2e` → 13/13 Playwright E2E specs pass.
- `npm run build` → Next.js 16 production build compiles cleanly.

**Status:** Complete (2026-08-30)

---

## Phase 24 — Multi-Project Workspace Management (Projects Gallery, Persistence & Lifecycle UX)
**Goal:** Transform PixiBun from a single-scratchpad editor into a full-fledged local-first creative studio by introducing multi-project management. Artists can maintain an unlimited library of sprites and animations stored in IndexedDB (Schema v3) with thumbnail previews, duplication, renaming, deletion, and P0 history stack invalidation on project switches.

**Deliverables:**
- [x] IndexedDB Schema v3 & CRUD Engine (`src/lib/storage/db.ts`): Upgraded Dexie database to schema v3 with `createdAt` index and migration upgrade. Implemented `listAllProjects()`, `getProjectById()`, `saveProject()`, `deleteProject()`, `duplicateProject()`, `renameProject()`, and `createBlankProject()`.
- [x] Dynamic Project ID State & Serialization (`src/stores/studioStore.ts`, `src/lib/project/serialize.ts`): Added `currentProjectId` state to studio store, created lightweight `generateCompositeThumbnail()` from active frame composite buffer, and dynamic project autosaving.
- [x] P0 History Stack Invalidation (`src/components/layout/CenterViewport.tsx`, `src/lib/project/serialize.ts`): Added `pixibun:history-clear` custom event dispatched on project hydration, new project creation, and project switches, wiping 50-step undo/redo engine and flags to eliminate cross-project canvas corruption.
- [x] Projects Gallery & Management Modal (`src/components/modals/ProjectsGalleryModal.tsx`): Built responsive tactile card grid with live thumbnail rendering, resolution/FPS badges, inline renaming, cloning, safe deletion with confirmation, and instant project switching.
- [x] TopHeader Integration (`src/components/layout/TopHeader.tsx`, `src/components/layout/StudioLayout.tsx`): Added "Projects" tactile button and hooked up gallery open/switch/new workflows with autosave flushes.
- [x] Unit Test Suite (`tests/projectsDb.test.ts`): 6 unit tests with `fake-indexeddb` verifying project creation, sorting by `updatedAt`, duplication independence, renaming, and deletion.
- [x] Playwright E2E Spec (`tests/e2e/projects.spec.ts`): End-to-end test verifying gallery opening, drawing stroke, creating new project, asserting undo is disabled immediately (P0), duplicating project, and deleting project.
- [x] Documentation & Drift Pruning: Corrected `ARCHITECTURE.md` storage section (removed phantom `frames` table), updated `PIXIBUN_DEEP_DIVE.md`, and updated `README.md` test metrics (91 unit tests across 17 suites, 11 E2E specs).

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 91/91 tests pass across 17 test suites.
- `npm run test:e2e` → 11/11 Playwright E2E specs pass.
- `npm run build` → Next.js 16 production build compiles cleanly.

**Status:** Complete (2026-08-30)

---

## Phase 23 — Truth-in-Testing, Single CI Truth & Engine Extraction
**Goal:** Make PixiBun's quality claims honest, maintainable, and robust across four core pillars: (1) Assertion-backed E2E testing with pixel-level validation for undo/redo, authentic disconnected page reload for offline hydration, and active service worker controller verification; (2) Unified CI/CD workflow with `deploy.yml` triggered via `workflow_run` on `main`, private artifact storage for Lighthouse CI reports (`lhci-reports/`), and removal of redundant/dead headers from `vercel.json`; (3) Pure, DOM-free `HistoryEngine` extraction (`src/lib/engine/historyEngine.ts`) with fixed 50-step depth and dedicated unit test suite; (4) Clean repo hygiene and architectural doc truthfulness.

**Deliverables:**
- [x] Pure History Engine (`src/lib/engine/historyEngine.ts`): Extracted 50-step undo/redo stack out of `CenterViewport.tsx` refs into a DOM-free, pure TypeScript module with FIFO pruning, redo-tail invalidation, and O(1) state restoration.
- [x] Unit Test Suite (`tests/historyEngine.test.ts`): 8 unit tests verifying push, undo, redo, clear, maxDepth pruning (50), redo invalidation, and empty-stack edge cases.
- [x] Monolith Slimming (`src/components/layout/CenterViewport.tsx`): Replaced ad-hoc undo/redo stack refs with `historyEngineRef` and added `data-testid="main-composite-canvas"` for deterministic testing.
- [x] Assertion-Backed E2E Tests: Hardened `tests/e2e/studio.spec.ts` with pixel-level canvas assertions before/after stroke and undo/redo; hardened `tests/e2e/offline.spec.ts` with real disconnected page reload and SW cache hydration; updated `tests/e2e/pwa.spec.ts` with active `navigator.serviceWorker.controller` verification.
- [x] Private Lighthouse CI: Updated `lighthouserc.json` to upload to local filesystem (`./lhci-reports`), added `lhci-reports/` to `.gitignore`, and added 7-day artifact upload to `.github/workflows/ci.yml`.
- [x] Single CI Truth: Removed duplicate `verify` job from `.github/workflows/deploy.yml` in favor of `workflow_run` trigger on successful `CI` completion on `main`.
- [x] Header Deduplication & Dead Rule Pruning: Removed redundant security headers and dead `/static/(.*)` cache rule from `vercel.json` (`next.config.ts` remains canonical header source).
- [x] Repo Hygiene: Relocated `implementation_plan.md` and `implementation_plan_v2.md` to `docs/plans/` with `docs/plans/README.md`, deleted empty `CLAUDE.md`, and updated `eslint.config.mjs` ignores.
- [x] Architectural Documentation Truthfulness: Synchronized `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, and `README.md` to reflect `HistoryEngine` architecture and updated test metrics (85 unit/component tests, 10 E2E specs).

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 85/85 tests pass across 16 test suites (CI / Node 20).
- `npm run test:e2e` → 10/10 Playwright E2E specs pass.
- `npm run build` → Next.js 16 production build compiles cleanly.
- CI green on `main` (Node 20).

**Status:** Complete (2026-08-30)

---

## Phase 22 — Dead Route Pruning & Architectural Truthfulness
**Goal:** Eliminate dead serverless routes and orphaned backend scripts (`/api/ai/vision`, `testsprite-backend/`, `scripts/write_backend_tests.js`) and synchronize all architectural documentation to honestly reflect PixiBun's 100% deterministic, on-device graphics math identity with zero cloud or API key dependencies.

**Deliverables:**
- [x] Deleted dead route: Removed `src/app/api/ai/vision/route.ts` and orphaned folder `src/app/api/ai/`.
- [x] Deleted dead tests: Removed Python backend suite `testsprite-backend/` (7 tests) and test generator `scripts/write_backend_tests.js`.
- [x] Doc Truthfulness: Updated `MAIN.md`, `SKILL.md`, `README.md`, `TASKS.md`, `LOGS.md`, and `studioStore.ts` removing false Gemini cloud claims and documenting PixiBud's pure on-device graphics math engine.
- [x] Attack Surface Minimization: App contains only one server endpoint (`/api/diagnostics/relay`), fully hardened with SSRF protection.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 77/77 tests pass across 15 test suites.
- `npm run test:e2e` → 9/9 Playwright E2E specs pass.
- `npm run build` → Next.js 16 production build compiles cleanly (no `/api/ai/vision` route).

**Status:** Complete (2026-08-30)

---

## Phase 21 — PixiBun Professionalization: Offline Truth, WCAG 2.2, Test Gates & Privacy-First Observability
**Goal:** Make PixiBun a professional, reliable, and accessible local-first web application across four core pillars: (1) True PWA offline installation with hand-rolled zero-dependency service worker, manifest, precached app shell, offline fallback, and persistent storage protection; (2) Full WCAG 2.2 AA accessibility with keyboard alternatives for drag interactions, focus traps with opener restoration, high-contrast focus rings, minimum target sizes, and error boundaries; (3) Continuous automated quality & performance gates with 73 Happy-DOM unit/component tests, full Playwright E2E browser tests with automated Axe WCAG audits, and Lighthouse CI score budgets; (4) Privacy-first local diagnostics with IndexedDB ring buffer, Core Web Vitals bridge, and one-click JSON export.

**Deliverables:**
- [x] PWA Manifest & Icons: `public/manifest.webmanifest` and pixel-crisp PNG icons (192, 512, maskable, 180 apple touch) in `public/icons/`.
- [x] Hand-Rolled Service Worker (`public/sw.js`): Precached app shell, Stale-While-Revalidate caching for static chunks and assets, network-only for `/api/*`, navigation fallback, and `SKIP_WAITING` support.
- [x] Offline Fallback Page (`public/offline.html`): Self-contained, warm atelier styled static fallback page.
- [x] Service Worker Registrar & Update Toast (`src/components/system/ServiceWorkerRegistrar.tsx`, `PwaUpdateToast.tsx`): Update notification banner with instant reload action.
- [x] Offline Indicator & Storage Persistence (`OfflineIndicator.tsx`, `StudioLayout.tsx`): HUD status pill when offline and `navigator.storage.persist()` guard against eviction.
- [x] WCAG 2.2 AA Conformance & JSX-A11y: Resolved all static a11y violations, added `eslint-plugin-jsx-a11y`, hardened `ModalWrapper.tsx` focus traps and Escape handling.
- [x] Drag Alternatives & Live Region Feedback: Arrow key canvas panning and floating selection nudging (WCAG 2.5.7) and `aria-live="polite"` locked layer feedback.
- [x] Route & Global Error Boundaries: Atelier styled error boundaries in `src/app/error.tsx`, `src/app/global-error.tsx`, and `src/app/studio/error.tsx`.
- [x] Privacy-First Diagnostics & Web Vitals: Dexie schema v2 with 200-entry ring buffer, `web-vitals` listener, export JSON tool, and opt-in relay toggle in `ShortcutsModal.tsx`.
- [x] SSRF Security Remediation: Rewrote `/api/diagnostics/relay` to strictly use operator-configured HTTPS `DIAGNOSTICS_RELAY_URL` environment variable, ignoring all client-supplied target URLs and eliminating open-proxy vulnerabilities.
- [x] Quality Gates & CI: 77 unit/component tests (100% green across 15 suites), 9 Playwright E2E specs with Axe WCAG 2.2 scans, `lighthouserc.json`, and 3-stage GitHub Actions CI.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 77/77 tests pass across 15 test suites.
- `npm run test:e2e` → 9/9 Playwright E2E and Axe WCAG scans pass.
- `npm run build` → Next.js 16 production build compiles cleanly.

**Status:** Complete (2026-08-30)

---

## Phase 20 — Audit Remediation, Security Hardening, Dependency Pruning, Linter Hygiene & CI Enforcement
**Goal:** Remediate all architectural and hygiene findings identified in the deep audit: delete hardcoded PAT tokens, prune dead runtime dependencies, fix linter violations in benchmarks, align blend mode types with the UI and schema, add an MIT license, tighten CSP headers, establish GitHub Actions CI, and synchronize all documentation.

**Deliverables:**
- [x] Security: Deleted `sync_github.mjs` containing the exposed Personal Access Token.
- [x] Dependency Hygiene: Removed unused `isomorphic-git` (1.41.9) from `package.json`.
- [x] Linter Hygiene: Fixed `tests/benchmark.test.ts` unused imports and console calls (`eslint` passes with 0 errors and 0 warnings).
- [x] Blend Mode Alignment: Synchronized `src/types/canvas.ts`, `src/lib/project/schema.ts`, and `RightInspector.tsx` to the 5 verified blend modes (`source-over`, `multiply`, `screen`, `overlay`, `color-dodge`).
- [x] License: Created root `LICENSE` file under MIT terms.
- [x] CI/CD Automation: Created `.github/workflows/ci.yml` running typecheck, lint, vitest, and production build on push/PR.
- [x] Security Headers: Tightened CSP in `next.config.ts` by removing redundant external connect-src.
- [x] Documentation Truthfulness: Synchronized all `.md` files to reflect verified facts (61 tests across 10 suites, 5 blend modes, zero dead deps).

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm run typecheck` → 0 errors.
- `npm test` → 61/61 tests pass across 10 test suites.
- `npm run build` → Next.js 16 production build compiles cleanly.
- `LICENSE` file exists in repo root.
- `isomorphic-git` absent from `package.json`.
- `sync_github.mjs` deleted.

**Status:** Complete (2026-08-30)

---

## Phase 19 — Tag Clip Export Scoping & Multi-Threaded Web Worker GIF Encoding
**Goal:** Implement isolated animation clip exporting (`Export Scope`), DOM-free GIF encoding core, background Web Worker acceleration with zero-copy transferable `ArrayBuffer` objects, animated progress bar feedback in `ExportModal`, and transparent main-thread fallback.

**Deliverables:**
- [x] Tag Clip Export Scope: `ExportModal.tsx` dropdown allows isolating clips (`Walk [1-4]`). Slices target frame arrays, adds scope suffixes to filenames, and $0$-indexes SpriteSheet atlas metadata (`Hero_0`, `Hero_1`, etc.).
- [x] DOM-free GIF Encoder Core (`src/lib/export/gifEncoderCore.ts`): Separated `quantizePixels`, `lzwEncode`, and `encodeGifRawFrames` into a pure, testable module.
- [x] Web Worker Acceleration (`src/lib/export/gifEncoder.worker.ts`): Background thread LZW compression and Median-Cut quantization with `postMessage` transferable buffers.
- [x] Live Worker Progress Bar: Visual progress updates (`X / Y frames (Z%)`) during GIF encoding in `ExportModal.tsx`.
- [x] Transparent Main-Thread Fallback: Automatic fallback in environments without worker support or under strict CSP rules.
- [x] Test Coverage: Added `tests/exportScopeAndWorker.test.ts` verifying multi-clip isolation and progress event callbacks.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm test` → 54/54 tests pass across 9 test suites.
- Manually: export clip "Walk" — produces isolated 4-frame GIF/SpriteSheet with $0$-indexed metadata.
- Manually: export 50-frame animation — worker encodes in background without freezing UI while progress bar animates.

**Status:** Complete (2026-08-30)

---

## Phase 18 — Data Persistence Hardening, Dynamic Undo Limits, Schema Migration & Locked Layer Security
**Goal:** Implement resilient multi-layer local-first persistence safeguards, dynamic resolution-scaled undo memory bounds, full proto-v1 $\to$ v2 schema migration, forward-compatibility version guards, new drawing confirmation dialog, and locked layer raster protection with HUD feedback.

**Deliverables:**
- [x] 2-Strike Autosave Failure Toast & Auto-Recovery: `autoSaveWorkspace` returns status boolean. `StudioLayout` renders persistent warning banner with 1-click Export CTA on $\ge 2$ consecutive failures; auto-dismisses on storage recovery.
- [x] Dynamic Canvas-Scaled Undo Limits: Replaced fixed 50-step stack with resolution-scaled limits ($50$ steps for $\le 64\text{px}$, $35$ steps for $\le 256\text{px}$, $20$ steps for $> 256\text{px}$).
- [x] Full Payload v1 $\to$ v2 Migration Engine (`migrateProjectPayload`): Backfills `customRamps`, `clips`, `onionSkin`, and layer `blendMode`/`opacity`/`visible`/`locked` for legacy and unversioned (`version: undefined`) files.
- [x] Forward-Version Guard: Explicit error message rejecting files from newer PixiBun versions (`input.version > PROJECT_FORMAT_VERSION`).
- [x] "New Drawing" Confirmation Modal: Prevents accidental canvas clearing via `isNewConfirmOpen` modal.
- [x] Locked Layer Security: `handlePointerDown` rejects drawing on locked layers and renders animated HUD toast (`🔒 Active layer is locked`).
- [x] OS Theme Auto-Detection: `themeStore.ts` detects `prefers-color-scheme: light` on cold boot before falling back to dark.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm test` → 51/51 tests pass.
- Schema migration unit tests verify unversioned and v1 projects migrate cleanly to v2.

**Status:** Complete (2026-08-30)

---

## Phase 17 — Compass Convention Light Vector Alignment, Optical Flow Center-Bias & Dynamic Compass Indicator
**Goal:** Align 2.5D photometric lighting with standard artist and Photoshop/Substance compass heading conventions ($0^\circ = \text{North/Top}, 315^\circ = \text{North-West/Top-Left}$), eliminate optical flow ghosting on uniform/transparent macroblocks via quadratic center bias, add a real-time rotating SVG compass needle indicator to the Azimuth slider, and verify with comprehensive directional tests.

**Deliverables:**
- [x] Standard Artist/Compass Light Vector Convention: `Lx = Math.sin(azRad) * Math.cos(elRad)`, `Ly = -Math.cos(azRad) * Math.cos(elRad)` applied across `executePhotometricPipeline`, `executeMinecraftSkinShadingPipeline`, `renderParametric2p5DLighting`, and `generateSelOutData`.
- [x] Optical Flow Zero-Motion Center Bias: Added `(ux*ux + vy*vy) * 0.05` quadratic distance penalty to block-matching SAD calculation in `morphInBetweenFrames`, preventing false motion vectors on solid-color and transparent background tiles.
- [x] Dynamic Rotating SVG Compass Needle: Added animated SVG navigation indicator next to Azimuth slider in `RightInspector.tsx` that visually rotates in real time with `tools.lightAzimuth`.
- [x] Compass Directional Highlight Regression Suite: Added test in `tests/photometricNonDestructive.test.ts` verifying that $315^\circ$ highlights Top-Left, $135^\circ$ highlights Bottom-Right, $45^\circ$ highlights Top-Right, and $225^\circ$ highlights Bottom-Left.

**Acceptance criteria:**
- `npm run lint` → 0 errors, 0 warnings.
- `npm test` → 49/49 tests pass across 8 test suites.
- Manually: set Azimuth to $315^\circ$ — produces crisp Top-Left highlight and Bottom-Right shadow.
- Manually: move Azimuth slider — SVG compass needle smoothly rotates matching the light angle.

**Status:** Complete (2026-08-30)

---

## Phase 16 — Minecraft 3D Photometric Shading Engine, Optical Flow Tweening, Anti-Aliasing & 3x3 Tiling
**Goal:** Implement physically and domain-accurate 3D Minecraft skin recognition and shading (Half-Lambert diffuse wrap, raytraced anatomical contact occlusion, sky hemisphere gradients, and OKLCH warm sunlight/cool indigo hue-shifting), optical flow animation tweening, smart sub-pixel anti-aliasing (De-Jaggy), light-aligned selective outlining (Sel-Out), and live 3x3 seamless pattern matrix preview.

**Deliverables:**
- [x] `detectMinecraftSkin(isOpaque, width, height)` & `computeMinecraftSkinNormalField(width, height)`: 3D normal vector recognition for all 12 UV boxes with smooth 1px edge beveling.
- [x] `executeMinecraftSkinShadingPipeline()`: Domain-specific non-destructive shading with Half-Lambert wrap, anatomical contact AO, sky-hemisphere radiance gradient, and OKLCH hue-shifting.
- [x] `morphInBetweenFrames()`: 2D Block-Matching Optical Flow & Signed Distance Field animation tweening in OKLab space.
- [x] `cleanJaggiesOnCanvas()`: Smart hand-crafted sub-pixel anti-aliasing (De-Jaggy) smoothing 1px staircase corners.
- [x] `generateSelOutData()`: Directional selective outlining recoloring silhouette outlines based on 3D light azimuth $\theta$.
- [x] `showTilePreview`: Live 3x3 seamless pattern matrix surrounding the viewport stage.
- [x] `showIsoGuides`: Sharp 2:1 isometric diamond guide grid.
- [x] `FloatingPreviewWindow` close button propagation stop.

**Acceptance criteria:**
- `npm run lint` → 0 errors.
- `npm test` → 48/48 tests pass.
- `npm run build` → 0 errors (Next.js 16.3.2 Turbopack static output).
- Manually: import Minecraft skin and render photometric lighting — produces warm sunlight highlights, indigo contact shadows, and preserved textures.
- Manually: click `+ In-Between Frame` — interpolates smooth intermediate animation frame.
- Manually: click `3x3` — live mirrors drawing into 8 seamless pattern tiles.

**Status:** Complete (2026-08-30)

---

## Phase 15 — Non-Destructive Photometric Output & Live Preview Signal
**Goal:** Fix the three regressions caused by the photometric pipeline writing destructively into the source layer (pixel loss on light-angle changes, incoherent re-renders, stale live preview) and replace fragile display-name matching with a stable per-layer `tag` identifier system.

**Root cause:** the photometric, auto-shade, specular, sel-out, ground-shadow, and bake-normals pipelines previously called `clearRect` + `drawImage` on the active drawing layer, so each render destroyed the artist's original pixels. There was also no `bufferVersion` signal for buffer-pixel mutations, so the live preview window did not re-render during strokes.

**Deliverables:**
- [x] `Layer.tag?: string` added to `src/types/canvas.ts` for stable machine identification of auto-generated output layers.
- [x] `useStudioStore.addLayer(name?, tag?)` extended; `addLayer` continues to `unshift` so the new layer is at `layers[0]`.
- [x] `useStudioStore.bufferVersion` + `bumpBufferVersion()` action added; bumped on every pixel-mutating path (pen/eraser/dither strokes, bucket fill, color replace, undo/redo, commit/lift/cut/delete selection, and all AI panel handlers).
- [x] `CenterViewport`: helpers `compositeSourceSnapshot(excludeTag)` and `replaceTaggedLayer(name, tag)`; `Render Photometric`, `Auto-Shade`, `Specular`, `Sel-Out`, `Ground Drop Shadow`, and `Bake Normals` now write to dedicated tagged layers and exclude prior outputs from their inputs.
- [x] `Bake Normals` fixed to write to the new `layers[0]` (was using `layers[length-1]` after a 50ms `setTimeout`).
- [x] `FloatingPreviewWindow` subscribes to `bufferVersion`; live preview now updates in real time during strokes and AI renders.
- [x] Dead duplicated `useEffect` block (legacy destructive pattern) removed from `CenterViewport`.
- [x] `applyRiemersmaDither()` Hilbert space-filling implementation in `smartMathEngine.ts`, wired to `pixibun:riemersma-dither`.
- [x] `RightInspector`: removed dead `Bezier Spline` panel button (Bézier is already a drawing tool — the toolbar's `curve` tool); `47-Blob` button disabled with explanatory tooltip (`"Requires tileset atlas (planned). 47-Tile Blob is currently a bitmask computation utility, not a one-click autotiler."`).
- [x] `LOGS.md` updated to clarify 47-Tile Blob is a bitmask utility, not a one-click autotiler.
- [x] Regression tests in `tests/photometricNonDestructive.test.ts`:
   1. Non-destructiveness — 10 photometric renders with varying angles leave the source `ImageData` byte-identical.
   2. Live sync — `bufferVersion` starts at 0 and increments on every `bumpBufferVersion()` call.
   3. Photometric correctness — `Az=0, El=90` produces a non-empty, silhouette-following, left/right-symmetric output with the top at least as bright as the bottom rim.
   4. Bake Normals layer index — `addLayer(name, tag)` inserts at `layers[0]`; `replaceTaggedLayer` keeps a single tagged output layer with base art at the bottom.

**Acceptance criteria:**
- `npx tsc --noEmit` → 0 errors.
- `npx vitest run` → 32/32 tests pass.
- Manually: draw a sprite, run Render Photometric 10× with varying angles — original layer remains byte-identical and the tagged output layer is replaced in place.
- Manually: drawing on the canvas updates the floating live preview in real time.
- Manually: click Riemersma dither with a palette — produces non-worming error-diffusion output.
- Manually: Bézier Spline button is gone; 47-Blob is disabled with the documented tooltip.

**Status:** Complete (2026-08-29)

---

## Phase 14 — 2.5D Photometric Studio, Normal Mapping, Geometry Engine & Mathematical Dithering Suite
**Goal:** Deliver a mathematically rigorous computer graphics and pixel intelligence suite built into the PixiBud inspector and canvas engine: linear-time $O(N)$ Euclidean Distance Transform (EDT), analytical tangent-space normal vector fields with standard blue texture baking $(128, 128, 255)$, Blinn-Phong specular half-vector glints, discrete Laplace cavity ambient occlusion, 5 physical material presets, OKLab perceptual color quantization, and recursive Bayer matrix dither modulation.

**Deliverables:**
- [x] Linear-Time $O(N)$ Separable Euclidean Distance Transform (Felzenszwalb-Huttenlocher algorithm).
- [x] Non-linear height dome inflation ($\gamma = 0.5$) with edge-preserving Bilateral filtering.
- [x] Discrete Sobel partial derivative kernels ($K_x, K_y$) and analytical unit normal vector derivation.
- [x] 1-Click Tangent Normal Map Baker writing standard $(128, 128, 255)$ normal maps directly to a new Layer for game engines (Godot, Unity, Unreal).
- [x] Discrete Laplace operator for Cavity Map / Ambient Occlusion (AO) in surface crevices.
- [x] Full Photometric Lighting equation with Lambert diffuse, Blinn-Phong specular, cavity AO, and inverse square distance attenuation.
- [x] 5 Material Presets: *Matte Clay*, *Polished Metal*, *Glossy Glass*, *Velvet Fabric*, *Gold / Brass*.
- [x] OKLab Perceptual Color Matching ($\Delta E_{\text{OKLab}}$) and recursive Bayer matrix dither offset modulation.
- [x] Rational Bézier curves, Wu's quantized 2:1 isometric lines, RotSprite 8x rotation, and Zhang-Suen 1px skeleton thinning.
- [x] Contextual Tool Options Strip (30px high dynamic toolbar beneath header) and categorized artisan Left Toolbar.
- [x] Live Viewport Normal Map Preview inspection toggle.

**Acceptance criteria:**
- Type-check (`tsc --noEmit`), build (`next build`), and tests pass with 0 errors.
- Normal maps bake cleanly to distinct layers with $(128, 128, 255)$ baseline flat normals.
- Photometric lighting applies physically accurate specular glints, diffuse shading, and clean OKLab Bayer dithering.

**Status:** Complete (2026-08-28)

---

## Phase 13 — Lamplit Identity: De-Slop, Cozy Studio & Hero Landing Page
**Goal:** Replace generic tool-panel feel with an authored identity per FullStackGuide: one signature element (the lamplit desk), a hand-pixelled brand mark, warm human copy everywhere, and a hero landing page that lets visitors draw before they enter.

**Deliverables:**
- [x] Token overhaul: desk/wood-grain surfaces, lamp amber accents, static CSS dither textures, scroll unlocked globally.
- [x] Route restructure: landing at `/`, editor moved to `/studio` with its own metadata; autosave hydration verified through the move.
- [x] Signature element shipped once per scene: `.lamp-pool` overlay on viewport and hero; canvas frame reads as paper under lamp light.
- [x] Bun mascot (`src/components/ui/BunMascot.tsx`): hand-plotted 16x16 SVG, idle/blink/happy poses, reduced-motion-safe blink; header brand plate rebuilt around it.
- [x] Copy de-slop: all eleven inspector feedback strings rewritten emoji-free in craftsperson voice; "1-Click Magic" replaced.
- [x] Landing page: hero + interactive 32x20 DoodlePad, narrative feature story (no bento grid), starter sprite gallery rendered via `paintTemplate`, quiet footer.
- [x] Starter art system: `src/types/landing.ts`, `src/lib/art/starterTemplates.ts` (four hand-authored 16x16 sprites), `src/lib/render/templateRenderer.ts`.
- [x] WCAG focus restored: amber focus-visible rings on TactileButton, doodle swatches, CTAs.
- [x] Tests: `starterTemplates.test.ts`, `templateRenderer.test.ts` (suite now 24 tests).
- [x] DESIGN.md locked: signature element, expanded tokens, texture rules, landing voice guide with banned phrases.

**Status:** Complete (2026-08-25)

---

## Phase 8 — Data Integrity, Truthful Exports & Verification Harness
**Status:** Complete (2026-08-25)
