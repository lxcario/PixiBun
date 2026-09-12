# 🏛️ Architecture & System Design — PixiBun Atelier

```text
  /\_/\   ✦  .  *  .  ✦  *  .  ✦  *  .  ✦  *
 ( o.o )   A R C H I T E C T U R E
  > ^ <    Technical Blueprint & Engineering Reference
```

> **A high-performance, offline-first raster graphics workstation designed for sub-16ms interactive drawing latency and mathematically sound 2.5D computer graphics.**

---

## 1. System Topology Overview

PixiBun is structured as a client-side single-page application built on **Next.js 16 (App Router)** with zero mandatory server dependencies for drawing, animation, synthesis, or exporting.

```mermaid
graph TD
    subgraph UI_Layer ["🎨 UI & Workspace Shell (React 19 + Tailwind v4)"]
        TopNav["TopHeader (File / Edit / View / Export / Resize / Theme)"]
        OptionStrip["ContextOptionsBar (Tool Parameters, Size, Dither Density)"]
        LeftRail["LeftToolbar (Categorized Tool Rails & Dual Color Wells)"]
        ViewportShell["CenterViewport (Dual-Canvas Viewport & HUD Overlay)"]
        RightStudio["RightInspector (Layers / Palettes / PixiBud Math Studio)"]
        TimelineDock["BottomTimeline (Frame Scrubbing, Onion Skin, Clips)"]
        Modals["Modals (Import, Export, Resize, Palette, Shortcuts)"]
    end

    subgraph State_Layer ["⚡ Reactive State & Memory Pipeline (Zustand + Immer)"]
        Store["useStudioStore (Tools, Zoom, Pan, Active Layer, Palette)"]
        Theme["useThemeStore (Dark / Light Mode, Zero-Lag Style Override)"]
        BufferReg["bufferRegistry (OffscreenCanvas Layer Storage)"]
        UndoRedo["historyEngine (50 Undo + 50 Redo DOM-Free History Ring, 100 States Max)"]
    end

    subgraph Core_Engines ["⚙️ Computational & Raster Engines"]
        RasterCore["Artisan Raster Engine (Bresenham, 2:1 Iso Stepper, Bézier)"]
        MathCore["PixiBud Smart Math Engine (Felzenszwalb EDT, Sobel Normals, Blinn-Phong, Laplace AO)"]
        PixelizeCore["Image Synthesis Engine (Gradient Salience, OKLab Median-Cut, Floyd-Steinberg)"]
        DitherCore["Dither Suite (Bayer Matrix, Atkinson, Riemersma Hilbert)"]
        AudioCore["Web Audio Lo-Fi Synthesizer (Vinyl Rain Noise, Rhodes Chords, FFT Analyser)"]
    end

    subgraph Storage_Layer ["💾 Local Storage & Export Pipeline"]
        DexieDB["Dexie.js IndexedDB (Auto-Save, Frame Blobs)"]
        Exporter["Export Engines (Lossless PNG, GIF, Godot, Unity & Phaser 3 JSON)"]
    end

    UI_Layer --> State_Layer
    State_Layer --> Core_Engines
    State_Layer --> Storage_Layer
```

---

## 2. Canvas & Rendering Pipeline

### Multi-Canvas Layered Viewport Stack
To avoid browser layout recalculations, eliminate visual ghost contamination during color picking, and achieve sub-16ms interactive drawing latency, viewport rendering is separated into a hardware-accelerated 6-canvas layered stack (backed by L0 CSS background and topped by the interactive SVG selection gizmo overlay):

```mermaid
graph TD
    subgraph Viewport_Stack ["🖥️ CenterViewport Canvas Stack (Bottom to Top)"]
        L0["0. Solid Background (White #ffffff)"]
        L1["1. Onion Skin Underlay (onionCanvasRef: Tinted Ghosts & Falloff)"]
        L2["2. Playground Tracing Stencil (stencilCanvasRef: Lessons & Guides)"]
        L3["3. Main Artwork Composite (mainCanvasRef: Layers & Normal Map Preview)"]
        L4["4. Interactive Shape Preview (previewCanvasRef: Bézier & Vector Shapes)"]
        L5["5. Precision HUD (gridCanvasRef: Pixel Grid, Iso Guides & Marquee)"]
        L6["6. Brush Ghost Cursor (cursorCanvasRef: Dynamic Brush Reticle)"]
    end
    
    L0 --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
    L5 --> L6
```

### Pure Compositor & Eyedropper Isolation (`src/lib/render/compositor.ts`)
The `compositeFrame()` module serves as the single visual source of truth for pure pixel compositing:
- **Zero Editor Chrome**: Bottom-up compositing honoring layer visibility, opacity, and blend modes without including onion skin ghosts, grid lines, or selection marquees.
- **Eyedropper & Exporters**: The eyedropper samples directly from `compositeFrame()`, making color picking completely immune to normal-map preview modes, HUD guides, and ghost underlays.
- **Living Timeline Thumbnails**: Timeline frame cards render `<FrameThumbnail>` elements backed by `compositeFrame()`, with live re-compositing restricted to the active frame on `bufferVersion` updates to maintain $O(1)$ stroke performance.

### Pure Onion Skinning Engine (`src/lib/render/onionSkin.ts`)
- Pure, DOM-free `getOnionSkinSpecs()` computes clamped previous/next ghost specifications with distance falloff `base * (1 - 0.25 * (dist - 1))` and `prevColor`/`nextColor` tint mapping.
- Tinting is executed offscreen via `source-atop` before blitting to the underlay canvas.

### Direct Buffer Memory Management (`src/lib/engine/bufferRegistry.ts`)
Layers are maintained as raw `HTMLCanvasElement` and `OffscreenCanvas` objects indexed by layer UUID in memory. When the user resizes the canvas:
1. `resizeAllBuffers(newWidth, newHeight, anchor, resample)` shifts and re-allocates existing canvas buffers with 9-point anchor alignment and optional nearest-neighbor resampling.
2. Memory leaks are eliminated by explicitly clearing and discarding dereferenced buffers via `deleteBuffers(layerId)`.

### Pure History Engine (`src/lib/engine/historyEngine.ts`)
The undo/redo pipeline is fully decoupled from the React rendering tree into a pure, DOM-free `HistoryEngine` module:
- Maintains a 50-step FIFO history ring with automatic pruning of oldest steps when capacity is reached.
- Invalidates the redo tail upon any new drawing action or canvas mutation.
- Captures pre-stroke and post-stroke layer `ImageData` snapshots for deterministic $O(1)$ state restoration via `ctx.putImageData`.
- Provides reactive boolean getters (`canUndo`, `canRedo`) synchronized with `useStudioStore`.

---

## 3. PixiBud Smart Math & Computer Graphics Engine (`src/lib/ai/math/`)

The graphics intelligence engine is decomposed into modular, deterministic mathematical modules under `src/lib/ai/math/` and `src/lib/ai/`:
- `edtNormalMap.ts`: Felzenszwalb-Huttenlocher $O(N)$ EDT, non-linear dome inflation ($\gamma = 0.5$), bilateral smoothing, content-aware heightmaps, anatomical part segmentation, frontal face cushion plateau ($N_z \ge 0.85$), independent ear cone ridges, and Sobel tangent normal vector fields.
- `photometricLighting.ts`: Parametric 2.5D Blinn-Phong lighting, feature preservation (eyes/mouth/outlines), stepped OKLCH cel-shading with perceptual hue shifts, and in-place tagged relighting (`Photometric <material>`).
- `photometricAuto.ts`: Canvas art morphology analysis, anatomical classification (`character`, `orb`, `prop`), connected-component feature clustering (eyes, mouth, whiskers), convex lobe ear/horn scanning, and automated lighting parameter inference.
- `shadowAuto.ts`: Canvas sprite geometry analysis, contact baseline detection, and directional shadow parameter inference.
- `shadowRayMarcher.ts`: 2.5D bounded sprite cast shadows with 1-to-1 sheared silhouette projection, classic ground contact drop shadow ellipses (`shadowStyle: 'drop'`), and uniform flat opacity (`ditherMode: 'none'`).
- `colorSpace.ts`: sRGB $\leftrightarrow$ linear $\leftrightarrow$ OKLab $\leftrightarrow$ OKLCH conversions and perceptual hue shifting (`shiftHue`).

```mermaid
graph TD
    RawSprite["2D Pixel Sprite Layer"] --> Mask["Binary Alpha Mask M(x,y)"]
    Mask --> Classify["Anatomical Classification (Character / Orb / Prop)"]
    Mask --> EDT["Linear-Time O(N) EDT (Felzenszwalb-Huttenlocher)"]
    
    Classify -->|Character| Cushion["Frontal Face Cushion Plateau (Nz >= 0.85) & Ear Cones"]
    Classify -->|Orb / Prop| Dome["Power-Law Dome Inflation H(p) = (D/max)^γ"]
    
    Cushion & Dome --> Bilateral["Edge-Preserving Bilateral Smoothing"]
    Bilateral --> Sobel["Sobel Partial Derivatives (Gx, Gy)"]
    Sobel --> Normals["Tangent-Space Normal Vectors N"]
    Normals --> Bake["Bake Normal Map (RGB 128, 128, 255)"]

    Bilateral --> Laplace["Discrete Laplace Operator ∇²H"]
    Laplace --> AO["Cavity Ambient Occlusion Map"]

    Normals & AO & RawSprite --> Protect["Feature Segmentation (Eyes, Mouth, Inks Bypassed)"]
    Protect --> Lighting["Stepped OKLCH Cel-Shading (Cool Skylight / Warm Sun)"]
    Lighting --> FinalOutput["Shaded Pixel Art Output Layer"]
```

### Key Mathematical Formulations:
1. **$O(N)$ Euclidean Distance Transform:**
   Uses separable 1D lower parabolic envelope scans:
   $$D(p) = \min_{q \notin \Omega} \sqrt{(p_x - q_x)^2 + (p_y - q_y)^2}$$
2. **Analytical Tangent Normals & Light Vector (Compass Convention):**
   $$\mathbf{N} = \frac{1}{\sqrt{s_x^2 G_x^2 + s_y^2 G_y^2 + 1}} \begin{pmatrix} -s_x G_x \\ -s_y G_y \\ 1 \end{pmatrix}, \quad \mathbf{L}(\theta, \phi) = \begin{pmatrix} \sin\theta \cos\phi \\ -\cos\theta \cos\phi \\ \sin\phi \end{pmatrix}$$
   *Standard navigation/Photoshop azimuth convention: $0^\circ = \text{North (Top)}, 45^\circ = \text{North-East}, 135^\circ = \text{South-East}, 225^\circ = \text{South-West}, 315^\circ = \text{North-West (Top-Left)}$.*
3. **Frontal Face Cushion Plateau & Feature Normal Stabilization:**
   For character forms, to avoid "bowling-ball" inflation where half the face is plunged into darkness ($N \cdot L < 0$), height within 2.8px of the boundary contour bevels smoothly while the interior reaches a flat plateau:
   $$\text{rimRatio} = \min\left(1.0, \frac{D(p)}{2.8}\right), \quad H_{\text{face}}(p) = \max(D) \cdot \sqrt{\text{rimRatio}}$$
   Normals across the face interior satisfy $N_z \ge 0.85$, confining form shadows to the unlit silhouette edge. Features (eyes, mouth, whiskers) receive camera-facing normals $\mathbf{N} = (0, 0, 1)^T$.
4. **Feature Segmentation & 4-Tone Discrete OKLCH Cel-Shading:**
    Pixels tagged `isFeature = 1` or `isInkLine = 1` bypass lighting multipliers entirely, preserving exact original RGB values. Unshaded base colors receive discrete stepped tone quantization in OKLCH via `buildCelRamp()` (4 tones):
    * **Base Tone:** Original artist color preserved (55%–60% of lit surface)
    * **Unified Shadow:** $L_{\text{shadow}} = \max(0.18, L_{\text{base}} \times 0.78)$, $H_{\text{shadow}} = \text{shiftHue}(H_{\text{base}}, 260^\circ, 14^\circ)$, $C_{\text{shadow}} = \min(0.35, C_{\text{base}} \times 1.05)$ (cool indigo skylight)
    * **Deep Crevice:** $L_{\text{deep}} = \max(0.12, L_{\text{base}} \times 0.60)$, $H_{\text{deep}} = \text{shiftHue}(H_{\text{base}}, 260^\circ, 20^\circ)$, $C_{\text{deep}} = \min(0.35, C_{\text{base}} \times 1.08)$ (concave seams where $AO < 0.60$)
    * **Highlight:** $L_{\text{hi}} = \min(0.98, L_{\text{base}} + (0.98 - L_{\text{base}}) \times 0.28)$, $H_{\text{hi}} = \text{shiftHue}(H_{\text{base}}, 65^\circ, 10^\circ)$, $C_{\text{hi}} = \min(0.35, C_{\text{base}} \times 0.95)$ (warm sunlight, shiny materials only: $k_s > 0.1$ and not matte/fabric)
    * **Shadow Terminator (v1.10.2):** Shadow placement is driven purely by the directional diffuse signal $\text{diffSignal} = \text{wrapNdotL} \times \text{effectiveFalloff}$, thresholded at $0.55$. The ambient contribution is excluded from shadow placement to prevent it from overwhelming the directional terminator ($\text{ambSignal} \approx 1.27$ would otherwise push all pixels above threshold). Optional Bayer matrix dither modulation perturbs the threshold for organic shadow edges.
5. **Blinn-Phong Specular Half-Vector:**
   $$\mathbf{H} = \frac{\mathbf{L} + \mathbf{V}}{\|\mathbf{L} + \mathbf{V}\|}, \quad I_s = k_s (\max(0, \mathbf{N} \cdot \mathbf{H}))^\alpha$$
   In discrete pixel-art ramps, sparse specular highlights are isolated when $I_s > 0.35$.
6. **Discrete Laplace Cavity Occlusion:**
   $$\nabla^2 H \approx H * \begin{bmatrix} 0 & 1 & 0 \\ 1 & -4 & 1 \\ 0 & 1 & 0 \end{bmatrix}, \quad AO(p) = \text{clamp}(1.0 - k_{\text{ao}} \max(0, -\nabla^2 H), 0, 1)$$
7. **2D Subsurface Scattering (Beer-Lambert + Henyey-Greenstein Forward Phase):**
   $$T(\mathbf{x}) = 2\sqrt{\max\left(0, R^2 - D(\mathbf{x})^2\right)}, \quad I_{SSS}(\mathbf{x}) = C_{scatter} \exp\left(-\boldsymbol{\sigma}_t \frac{T(\mathbf{x})}{d_{trans}}\right) \cdot P_{2D}(\mathbf{L}', \mathbf{V}, g)$$
   $$P_{2D}(\theta, g) = \frac{1 - g^2}{2\pi (1 + g^2 - 2g \cos\theta)^{3/2}}$$
   *(Note: Evaluates the 3D Henyey-Greenstein kernel in 2D with a $2\pi$ circumference prefactor as an empirical forward-scattering highlight curve, clamped to $[0, 1.0]$ in the relighting pipeline).*
8. **Dielectric Fresnel Reflectance with Cauchy Chromatic Dispersion:**
   $$F(\theta) = F_0 + (\max(1 - \alpha, F_0) - F_0) \cdot (1 - \cos\theta)^{p_{fresnel}}, \quad \eta_R = \eta_0 - \Delta\eta, \; \eta_B = \eta_0 + \Delta\eta$$
9. **Kajiya-Kay Anisotropic Cylindrical Specular:**
   $$\sin(\mathbf{T}, \mathbf{H}) = \sqrt{\max\left(0, 1 - (\mathbf{T}\cdot\mathbf{H})^2\right)}, \quad I_{aniso} = k_{s1} \sin^{p_1}(\mathbf{T}_1, \mathbf{H}) + k_{s2} \sin^{p_2}(\mathbf{T}_2, \mathbf{H})$$
10. **Bounded 2.5D Sprite Cast Shadows & Ground Drop Shadows (`shadowRayMarcher.ts`):**
    * **1-to-1 Sheared Silhouette Ground Projection:**
      $$h = y_{\text{base}} - y_s \ge 0$$
      $$\text{projX} = \text{round}(x_s + h \cdot \text{shear}_x), \quad \text{projY} = \text{round}(y_{\text{ground}} + h \cdot \text{shear}_y)$$
      Sub-step traversal strictly along the shear vector preserves hollow leg arches and waist indentations without bounding-box bloat.
    * **Ground Contact Drop Shadow Style (`shadowStyle: 'drop'`):**
      Renders a crisp Bresenham pixel ellipse under the character contact baseline ($y_{\text{base}}$):
      $$\frac{(x - x_{\text{center}})^2}{r_x^2} + \frac{(y - y_{\text{base}})^2}{r_y^2} \le 1.0$$
    * **Uniform Flat Pixel Art Opacity (`ditherMode: 'none'`):**
      Shadow pixels receive uniform flat opacity $\text{round}(\text{shadowOpacity} \times 255)$, completely eliminating continuous 256-level float gradients.
    * **Non-Destructive Tagged Output:** Writes directly to `Layer.tag = 'cast-shadow'`.
11. **Interactive On-Canvas Pixel Light Bulb Gizmo & Reticle Mathematics (`PixelLightBulbGizmo.tsx`):**
    * Dynamic azimuth calculation from pointer coordinates orbiting around a stationary subject center reticle:
      $$\theta = \left(\text{atan2}(x_{\text{ptr}} - x_{\text{center}}, -(y_{\text{ptr}} - y_{\text{center}})) \times \frac{180}{\pi} + 360\right) \pmod{360}$$
    * Decoupled focal point reticle handle ($x_{\text{center}}, y_{\text{center}}$) allowing artists to reposition the lighting anchor without altering the light direction angle.
    * 60fps `requestAnimationFrame` throttled preview updates.
12. **Spherical Convex Dome Inflation & Slope AO Decoupling:**
    * Spherical dome height inflation with exact zero derivative at the apex peak:
      $$H(p) = R \sqrt{\max\left(0, 1 - \left(1 - \frac{D(p)}{R}\right)^2\right)}$$
    * Eliminates conical pinch creases on convex primitives while providing true vertical silhouette tangents.
    * Decouples direct key light from cavity ambient occlusion on convex slopes to eliminate center-locked apex highlight glitches.

---

## 4. State Management, Layer Security & Undo Architecture

The application state is managed by Zustand with Immer middleware:
* **`useStudioStore`:** Single source of truth for tool settings, primary/secondary colors, frame lists, layer hierarchies, zoom/pan parameters, and UI visibility.
* **50-Step Circular Ring Buffer Undo History:** Maintains a memory-efficient circular ring buffer of up to 50 `ImageData` snapshots (`createHistoryEngine(50)` matching `SKILL.md:26` and `src/hooks/viewport/useViewportDrawing.ts:33`). Undo/Redo restores the exact layer pixels in $O(1)$ time without re-rendering unrelated layers.
* **History Layer Lifecycle (`createdLayerId`):** When AI operations (`Photometric`, `Specular`, `Cast Shadow`) create a new layer, the history snapshot tracks `createdLayerId`. Undoing the action removes the layer entirely from the frame stack and purges its buffer memory, while redoing cleanly restores it.
* **Locked Layer Drawing Protection:** `handlePointerDown` checks `currentLayer.locked` prior to dispatching raster strokes. When locked, execution returns immediately and triggers an animated HUD warning toast (`Active layer is locked! Unlock it in the Layers panel to draw.`) with `<PixelIcon name="lock" />`.
* **`bufferVersion` Signal & Stroke Decoupling:** Atomic counter throttled via `requestAnimationFrame` strictly for external observers (`BottomTimeline`, `FloatingPreviewWindow`). Decoupled completely from `CenterViewport` to eliminate React reconciliation cascades during pen/eraser strokes (0 re-renders during pointer moves).
* **Layer Merge Down (`mergeLayerDown`):** Blends active layer onto underlying layer respecting opacity and blend modes, deletes upper buffer memory in $O(1)$, and selects lower layer cleanly.

---

## 5. Local-First Storage & Multi-Project Lifecycle (`src/lib/storage/db.ts`, `src/lib/project/schema.ts`)

* **Database Engine:** Dexie.js wrapping browser IndexedDB (`PixiBunDB`, Schema v4).
* **Tables:**
  * `projects`: Indexed by `id, name, updatedAt, createdAt`. Stores serialized `.pixibun` payload (`dataJson`), canvas bounds (`width, height`), `fps`, `createdAt`, `updatedAt`, and a downscaled composite preview (`thumbnailDataUrl`) for instant gallery card rendering.
  * `layerBlobs`: Indexed by `++id, [projectId+layerId+frameIndex], projectId, layerId`. Stores raw binary PNG image `Blob` instances directly, eliminating JSON base64 stringification CPU overhead and reducing autosave storage footprints by ~33%.
  * `diagnostics`: Indexed by `id, kind, timestamp`. Stores local telemetry and crash events in an on-device ring buffer (200 entries max).
* **Multi-Project Workspace Management (`ProjectsGalleryModal.tsx`):**
  * Artists can maintain an unlimited on-device portfolio of sprites and animations.
  * Supports full lifecycle management: instant switching, project duplication (`duplicateProject`), inline renaming (`renameProject`), and safe deletion (`deleteProject`).
* **P0 History Stack Invalidation (`pixibun:history-clear`):**
  * When switching projects, loading an artwork, or creating a new blank project, `hydrateProject` and `resetToNewProject` dispatch `pixibun:history-clear`.
  * `CenterViewport` clears the 50-step `HistoryEngine` and resets `canUndo`/`canRedo` flags, eliminating cross-project undo state corruption.
* **Persistent Storage Failure & Auto-Recovery Banner:** `autoSaveWorkspace` returns a boolean status. If 2 consecutive saves fail (e.g. disk quota exceeded, incognito clearance), a sticky warning banner appears with a 1-click `"Export Drawing"` button. When storage clears and autosave succeeds, the banner auto-dismisses and resets error counts.
* **Full-Fidelity v1 $\to$ v2 Migration Engine (`migrateProjectPayload`):**
  * Auto-detects legacy or unversioned (`version: undefined`) files.
  * Backfills default `customRamps: []`, `clips: []`, `onionSkin`, and per-layer `blendMode: 'source-over'`, `opacity: 1.0`, `visible: true`, `locked: false`.
  * Upgrades `version` to `PROJECT_FORMAT_VERSION = 2`.
* **Forward Compatibility Guard:** Rejects files saved with a newer format (`input.version > PROJECT_FORMAT_VERSION`) with an explicit update prompt: `"This project was saved in format v${input.version}, but this version of PixiBun only supports up to v${PROJECT_FORMAT_VERSION}. Please update PixiBun to open this file."`.

---

## 6. Multi-Engine Export & Web Worker Pipeline (`src/lib/export/`)

* **Tag Clip Export Scoping (`ExportModal.tsx`):** Allows artists to select specific named clips (`Walk [1-4]`, `Attack [5-8]`). Frames are sliced to the clip range, output files are dynamically renamed (`hero_Walk-4x.gif`), and SpriteSheet atlas metadata is cleanly $0$-indexed for Godot/Unity/Phaser.
* **Multi-Threaded Web Worker GIF Encoding (`gifEncoder.worker.ts`):** Offloads CPU-intensive Median-Cut color quantization and variable-length LZW compression to a background Web Worker.
* **Variable Frame Duration Centisecond Timing:** Passes frame-specific delay arrays ($D_i = \max(2, \text{round}(\text{durationMs}_i / 10))$) directly to GIF Graphic Control Extensions, honoring variable hold and transition speeds authored in `BottomTimeline`.
* **Zero-Copy Transferable Objects:** Frame pixel buffers are transferred as `ArrayBuffer` transferables (`postMessage(msg, [buffer])`), eliminating memory copying overhead on $128\times128+$ 50-frame animations.
* **Live Worker Progress Bar:** Dispatches `{ type: 'progress', current, total }` messages, driving real-time progress percentages in the `ExportModal`.
* **Transparent Main-Thread Fallback:** Automatically falls back to synchronous execution in environments without Web Worker support or under strict CSP policies.



## 7. 3D Minecraft Skin Recognition & Domain Shading Engine (`src/lib/ai/math/minecraftSkin.ts`)

When an imported or active sprite canvas has dimensions $64\times64$ or $64\times32$, the photometric lighting system distinguishes between authentic Minecraft 3D player skin texture atlases and single-character / object illustrations before routing normal generation:

```mermaid
graph TD
    Canvas["Canvas Image (64x64 / 64x32)"] --> ModeCheck{"minecraftSkinMode"}
    ModeCheck -->|enabled| ForceSkin["Force Minecraft 3D Pipeline"]
    ModeCheck -->|disabled| Force2p5D["Force 2.5D Sprite Heightmap Pipeline"]
    ModeCheck -->|auto| TopoAnalysis["analyzeMinecraftSkinTopology()"]
    TopoAnalysis --> BoundingBox["Bounding Box Margin Check (Flanks x < 10 & x > 48)"]
    TopoAnalysis --> Limbs["Bilateral Limb Verification (Right Leg x:0..16 & Right Arm x:40..56)"]
    TopoAnalysis --> Voids["Canonical Void Zone Integrity Check (<20% pollution)"]
    TopoAnalysis --> Components["8-Connected Component Silhouette Analysis"]
    BoundingBox & Limbs & Voids & Components --> Decision{"Classification Verdict"}
    Decision -->|Disjoint UV Atlas| UVMap["12-Region Cuboid Face Normal Field N(x,y,z)"]
    Decision -->|Centered Contiguous Sprite| Force2p5D
    UVMap --> HalfLambert["Half-Lambert Wrap Lighting ((N·L + 0.4)/1.4)^1.2"]
    UVMap --> ContactAO["Raytraced Contact Occlusion Map (Neck, Limbs, Layers)"]
    HalfLambert & ContactAO --> SkyDome["Hemispheric Sky Radiance Gradient"]
    SkyDome --> OKLCH["OKLCH Perceptual Hue-Shifting"]
    OKLCH --> FinalSkin["Non-Destructive Minecraft Shaded Output Layer"]
```

### Topological Invariant Discriminator:
1. **Texture Atlas vs. Contiguous 2.5D Silhouette:**
   * **Minecraft Skin Texture Atlas:** Disconnected planar unwrap of geometric cuboid islands separated by empty void channels. Bilateral limbs occupy the extreme lateral flanks ($x \in [0, 16)$ for Right Leg, $x \in [40, 56)$ for Right Arm). Both extremities must be populated for valid skin detection.
   * **Centered 2D Character / Object Sprite:** Single contiguous silhouette centered horizontally with empty lateral flanks ($x < 10$ and $x > 48$). The dominant connected component contains $\ge 68\%$ of all opaque pixels, and lacks bilateral limb islands. Even if an ear or accessory touches the head coordinate quadrant, it is classified as a 2.5D character sprite and shaded with true continuous tangent normals, eliminating flat $(0, 0, 1.0)$ fallback vectors.
2. **Canonical Void Zone Preservation:**
   * Mojang's specification mandates empty rectangular corners at $(0, 0, 8, 8)$, $(24, 0, 8, 8)$, $(32, 0, 8, 8)$, $(56, 0, 8, 8)$, and joint voids at $y = 16$. Void pollution $> 25\%$ immediately rejects the atlas.
3. **User Sovereignty (`PhotometricLightingSection.tsx`):**
   * On $64\times64$ and $64\times32$ canvases, the inspector provides a tactile `Skin 3D Shading: [ Auto | On | Off ]` toggle (`setMinecraftSkinMode`), giving creators manual override over the auto-discriminator.

### Mathematical Formulations:
1. **Half-Lambertian Wrapped Diffuse:**
   $$\text{wrap}(\mathbf{N} \cdot \mathbf{L}) = \left(\frac{\mathbf{N} \cdot \mathbf{L} + 0.4}{1.4}\right)^{1.2}$$
2. **Raytraced Anatomical Contact Ambient Occlusion:**
   $$AO(x, y) = \min(AO_{\text{neck}}, AO_{\text{armpit}}, AO_{\text{thigh}}, AO_{\text{ground}}, AO_{\text{layer}})$$
3. **Perceptual OKLCH Hue-Shifting:**
   * **Highlight:** $H_{\text{new}} = \text{shiftHueToward}(H_{\text{orig}}, 65^\circ, \Delta_{\text{sun}})$ (Sunlight amber)
   * **Shadow:** $H_{\text{new}} = \text{shiftHueToward}(H_{\text{orig}}, 260^\circ, \Delta_{\text{sky}})$ (Cool ambient indigo, never flat gray)

---

## 8. Signed Distance Field (SDF) In-Between Animation Morphing (`src/lib/ai/pixelAiEngine.ts`)

The frame morphing engine generates smooth intermediate tween frames between keyframes via **Separable Euclidean Distance Transform (EDT) Signed Distance Fields (SDF)** combined with multi-source nearest-color sampling:

1. **Signed Distance Field Generation:**
   Continuous distance fields $D_{\text{opaque}}$ and $D_{\text{transparent}}$ are evaluated using 1D separable parabolic envelope scans ($O(W \times H)$ complexity):
   $$\text{SDF}(p) = D_{\text{opaque}}(p) - D_{\text{transparent}}(p)$$
   where $\text{SDF}(p) \le 0$ represents pixels within the active shape boundary and $\text{SDF}(p) > 0$ denotes transparent background.
2. **Intermediate Boundary Tweening at Fraction $t \in [0, 1]$:**
   $$\text{SDF}_t(p) = (1 - t) \cdot \text{SDF}_A(p) + t \cdot \text{SDF}_B(p)$$
   Pixels satisfying $\text{SDF}_t(p) \le 0$ form the morphed silhouette at fractional time $t$.
3. **Multi-Source BFS Nearest-Color Sampling & Cross-Fade:**
   An 8-connected multi-source Breadth-First Search precomputes nearest opaque color seeds for all pixels in $O(W \times H)$ time once per frame. Lit pixels sample nearest seed colors $\mathbf{C}_A$ and $\mathbf{C}_B$ and blend via linear sRGB cross-fading:
   $$\mathbf{C}_t(p) = \operatorname{round}\left( (1 - t) \cdot \mathbf{C}_A(p) + t \cdot \mathbf{C}_B(p) \right)$$

---

## 9. Intelligent Image-to-Pixel-Art Synthesis Pipeline (`src/lib/ai/pixelizeEngine.ts`)

```mermaid
graph TD
    InputImg["Source Image / Texture"] --> BoxDown["Linear Optical Area Box Filter (Gamma-Corrected)"]
    InputImg --> GradSalience["2x2 Forward-Difference Gradient Salience (Edge Preservation)"]
    BoxDown & GradSalience --> SalientDown["Salient Downsampled ImageData"]
    SalientDown --> BGKey["4-Corner Background Keying & 1-Bit Alpha"]
    BGKey --> Quantize["OKLab Median-Cut Partitioning + K-Means++ Refinement"]
    Quantize --> DitherBranch{"Dither Mode"}
    DitherBranch -->|Floyd-Steinberg| SerpentineFS["Serpentine Error Diffusion"]
    DitherBranch -->|Atkinson| AtkDiff["Atkinson 75% Retention"]
    DitherBranch -->|Bayer 4x4| BayerMod["Bayer Threshold Modulation"]
    DitherBranch -->|None| FlatQuant["Direct OKLab Nearest-Color"]
    SerpentineFS & AtkDiff & BayerMod & FlatQuant --> PixelArtOutput["Synthesized Pixel Art Layer"]
```

1. **Linear Optical Gamma Correction:**
   $$C_{\text{linear}} = \begin{cases} C_{\text{sRGB}} / 12.92 & C_{\text{sRGB}} \le 0.04045 \\ \left(\frac{C_{\text{sRGB}} + 0.055}{1.055}\right)^{2.4} & C_{\text{sRGB}} > 0.04045 \end{cases}$$
2. **2x2 Forward-Difference Gradient Salience Weighting:**
   High-frequency edges are extracted using a forward-difference gradient on luminance $Y = 0.2126R + 0.7152G + 0.0722B$:
   $$G_x(x, y) = Y(x + 1, y) - Y(x, y), \quad G_y(x, y) = Y(x, y + 1) - Y(x, y), \quad \|\nabla I(x, y)\| = \sqrt{G_x^2 + G_y^2}$$
   During area box downsampling, edge pixels receive boosted accumulation weights:
   $$W_{\text{salience}}(x, y) = W_{\text{box}}(x, y) \cdot \left(1.0 + \min(2.5, 3.0 \cdot \|\nabla I(x, y)\|)\right)$$
   This prevents delicate 1-pixel line art, silhouettes, and character facial features from blurring away during downscaling.
3. **OKLab Median-Cut & Lloyd K-Means Refinement:**
   Clusters color bounding boxes along the axis of maximal perceptual variance in OKLab space ($L, a, b$), followed by iterative centroid convergence:
   $$\mu_k^{(t+1)} = \frac{1}{|S_k|} \sum_{p \in S_k} p$$

---

## 10. Procedural Web Audio Ambient Radio (`src/lib/audio/lofiRadio.ts`)

```mermaid
graph LR
    subgraph AudioEngine ["Web Audio Synth"]
        NoiseGen["Pink Noise / Vinyl Pops Generator"] --> NoiseFilter["Biquad Lowpass (800Hz)"]
        NoiseFilter --> NoiseGain["Noise Gain Node"]
        
        ChordOsc["Triangle Chords (Rhodes Envelope)"] --> VibratoLFO["LFO Tape Flutter (0.3Hz)"]
        VibratoLFO --> ChordFilter["Biquad Lowpass Sweep (950Hz -> 300Hz)"]
        ChordFilter --> ChordGain["Chord Gain Node"]
        
        SubBass["Sub-Bass Sine (f/2)"] --> BassGain["Bass Gain Node"]
        
        NoiseGain & ChordGain & BassGain --> MasterGain["Master Volume Gain"]
        MasterGain --> Analyser["FFT Analyser (fftSize: 64)"]
        Analyser --> Destination["AudioContext Destination (Speakers)"]
    end
    
    Analyser --> EqualizerBars["Animated Boombox LED Spectrum Bars"]
```

* **Zero-Bandwidth Procedural Synth (`src/lib/audio/tracks.ts`):** Synthesizes warm rain ambiance, subtle vinyl crackles, acoustic felt piano, 25%/50% pulse flutes with delayed vibrato, NES triangle bass, and warm pad chords completely in code without loading external `.mp3` or `.wav` assets. Features 3 complete in-memory procedural arrangements: *"Field of Hopes"*, *"My Castle Town"*, and *"Empty Town"*.
* **Real-Time Spectrum Visualizer:** 4-band FFT frequency analyzer samples frequency buckets ($b_0, b_1, b_2, b_3$) on every animation frame for animated LED spectrum feedback.

---

## 11. Zero-Lag Theme Architecture (`src/stores/themeStore.ts`)

To prevent simultaneous layout recalculations and repaint stutter across thousands of DOM elements during Dark (Cozy Midnight) $\leftrightarrow$ Light (Morning Atelier) switching:
1. **Transition Suppression:** Injects a high-priority stylesheet (`pixibun-theme-transition-killer`) with `transition: none !important` before mutating `data-theme`.
2. **Synchronous Reflow:** Reads `getComputedStyle(css).opacity` to force instantaneous layout evaluation while transitions are disabled.
3. **Clean Teardown:** Removes the temporary stylesheet on the subsequent `requestAnimationFrame` tick, restoring silky micro-interactions without flash or delay.

---

## 12. Zero-GC Memory Management & Buffer Pooling (`src/lib/engine/bufferPool.ts`)

High-frequency mathematical operations (Euclidean Distance Transforms, Bilateral Filters, Laplace Normal Map baking, downsampling) require substantial TypedArray scratch space. To eliminate garbage collection pauses during live canvas interactions:
- **Pool Sizing & Lifecycle:** Pre-allocates and bounds reusable `Float32Array` and `Int32Array` buffers.
- **Resource Borrows:** Callers acquire buffers with `acquireFloat32Buffer(minLen)` and release them in `finally` blocks with `releaseFloat32Buffer(buf)`.
- **Zero-Fill Guarantees:** Buffers are sanitized/cleared on release, preventing cross-frame data corruption.
- **Compositor Canvas Pooling:** `compositeFrame()` leverages a persistent offscreen canvas singleton and accepts an optional `targetCanvas` destination to avoid allocating DOM canvas elements on every render tick.

---

## 13. Multithreaded Worker & Deterministic CG Math Architecture

Compute-bound tasks are balanced between background Web Workers and on-device TypedArray math:
- **Web Worker GIF Encoding (`src/lib/export/gifEncoder.worker.ts`):** LZW compression and median-cut color quantization run off-thread with zero-copy transferable `ArrayBuffer` lists (`postMessage(payload, [buffer])`).
- **Deterministic On-Device Graphics Math (`src/lib/ai/math/`, `src/lib/ai/shadowRayMarcher.ts`):** 2.5D photometric lighting, $O(N)$ EDT, content-aware heightmaps, and bounded sprite cast shadows run synchronously with zero latency using pre-allocated `bufferPool.ts` scratch buffers.

---

## 14. Strongly-Typed Studio Event Bus (`src/lib/events/studioEvents.ts`)

Cross-component triggers (normal map baking, palette quantization, volumetric lighting triggers, raymarched shadows) are managed through a strongly-typed subscriber facade bridging DOM CustomEvents:
- **Discriminated Event Map:** All 32 studio actions are strictly typed in `StudioEventMap` with validated payload schemas.
- **Subscriber Ergonomics:** `CenterViewport` and studio panels subscribe via `studioEvents.on(event, handler)` with automatic unsubscription cleanup and type-safe payload extraction, receiving events dispatched across studio panels via `window.dispatchEvent` or `studioEvents.emit`.

---

## 15. Vercel & CI/CD Deployment Pipeline

* **Framework Engine:** Next.js 16 App Router on Vercel Edge Network.
* **Continuous Deployment:** Every push to `main` triggers automated typechecking (`tsc --noEmit`), linting (`eslint`), unit testing (`vitest`), and static optimization before deploying to production.

---

## 16. P2P Co-Draw Sync Bridge (`src/lib/sync/coDrawBridge.ts`)

The CRDT engine (`src/lib/collab/crdtPixelBuffer.ts`) and WebRTC transport (`src/lib/sync/p2pSync.ts`) are pure, DOM-free modules; the bridge is the single integration point that connects them to the live studio. It is a module-scoped singleton so sessions survive modal unmount and drawing code can reach it without prop drilling.

* **Structure Join:** On connection, the host broadcasts a `STRUCTURE_SYNC` message (`src/lib/sync/p2pSync.ts`, validated by `validateStructurePayload`) so both peers adopt one layer-ID namespace — the prerequisite for routing per-layer CRDT ops. The host owns the layer/frame tree for the session; guest structural edits stay local (documented MVP constraint that keeps identity deterministic).
* **Full-State Antientropy Join:** Following Shapiro et al. (SSS 2011, §4), the host seeds one `CrdtPixelBuffer` per layer from the live canvas pixels and transmits complete per-layer snapshots. A bounded retry loop handles the window where `RTCPeerConnection` reports `connected` before the RFC 8831 data channels are open.
* **Delta Propagation:** On every stroke commit, the pre-stroke history snapshot is diffed against the live buffer (`src/lib/sync/strokeDiff.ts`) and each changed pixel becomes an LWW op broadcast per layer. Receivers apply ops through the HLC clock (bounded drift, deterministic peerId tie-break) and repaint layer buffers in one `getImageData`/`putImageData` pass.
* **Rendering & Persistence Integration:** Applied remote ops dispatch `pixibun:request-composite` (consumed by `CenterViewport.tsx`) and `pixibun:remote-change` (consumed by `StudioLayout.tsx` to schedule the same debounced autosave as local edits).
* **Presence:** Cursor moves broadcast at ~30fps over the unreliable PR-SCTP channel and render through `src/components/studio/RemoteCursorsOverlay.tsx` with staleness pruning.

---

## 17. Diagnostics Relay Hardening (`src/app/api/diagnostics/relay/route.ts`)

* **Rate Limiting:** Token bucket (12 requests/minute, burst 12) keyed by client IP, implemented as a pure module in `src/lib/server/tokenBucket.ts`. State is per-process memory — correct for a single Node instance, a per-instance limit on multi-instance deployments.
* **Input Ceilings:** 64KB request-body ceiling enforced before JSON parsing, and a 100-event cap on forwarded batches, with explicit 413/429 responses.
* **SSRF Guard (unchanged):** Upstream is strictly the operator-configured HTTPS `DIAGNOSTICS_RELAY_URL`; client payloads are forwarded only as a bounded `{ app, version, timestamp, events }` envelope.

---

## 18. Algorithmic Scope Boundaries & Target System Envelope

To maintain sub-16ms interactive drawing latency and prevent runaway complexity, PixiBun's algorithms operate within explicit, mathematically defined envelopes:

* **Target Canvas & Project Envelope:** Purpose-engineered for $16\times16$, $32\times32$, $64\times64$, and $128\times128$ pixel art characters, props, tilesets, and animation loops. Unlike native desktop applications (e.g. Aseprite) optimized for 500+ frame 4K cinematic timelines using native C++ file I/O, PixiBun targets instant zero-install browser crafting with IndexedDB binary blob persistence (`layerBlobs`), zero-copy Web Worker export codecs, and real-time 2.5D photometric cel-shading.
* **WaveFunctionCollapse (`src/lib/procedural/waveFunctionCollapse.ts`):** Implements an overlapping pattern synthesis model with periodic boundary conditions optimized specifically for small pixel art tiles and terrain textures ($16\times16$ to $64\times64$ output dimensions, $N=2$ or $N=3$ neighborhood kernels). Adjacency constraint graphs are bounded to input sample entropy, with deterministic pseudorandom seed stepping.
* **Vector Depixelization (`src/lib/export/depixelizeVector.ts`):** Domain-tailored planar similarity graph ambiguity solver inspired by Kopf-Lischinski (SIGGRAPH 2011) principles, resolving diagonal crossing ambiguities via local 1-hop parity connectivity heuristics, shifting contour corners by $\pm 0.05$, and smoothing cell boundaries via cubic Bézier paths for scalable SVG export.
* **Zero-Egress LAN Default & Network Boundaries:** Core creative features (raster engine, layers, animation timeline, photometric studio, color science, export encoders, and IndexedDB persistence) operate 100% on-device without network access. P2P co-draw defaults to `LAN_ICE_SERVERS = []` for true zero-egress local network collaboration. Public Internet WebRTC STUN NAT traversal and the optional diagnostics relay are the only subsystems that require network access, both requiring explicit user activation.

---

## 19. 2.5D Normal Chisel & Bas-Relief Sculptor (`src/lib/art/normalSculptor.ts`)

* **Tangent-Space Normal Vector Encoding:** Standard OpenGL convention where $+Y$ points Up (green channel increases towards the top of the sprite) and flat perpendicular surfaces encode to $(128, 128, 255)$. Decoded vectors are strictly normalized to unit length $\|(N_x, N_y, N_z)\| = 1$.
* **Analytical Bevel & Chamfer Geometry:** Given compass azimuth $\alpha \in [0, 360^\circ)$ ($0^\circ=\text{North}$, $90^\circ=\text{East}$) and slope incline $\phi \in (0, 90^\circ]$, directional normal vectors are evaluated analytically:
  $$N_x = \sin\phi \sin\alpha, \quad N_{y,\text{OpenGL}} = \sin\phi \cos\alpha, \quad N_z = \cos\phi$$
  Dual-flank V-groove carving calculates bilateral ridge facets perpendicular to brush stroke drag vectors.
* **Flattened Spherical Rivet / Stud Stamp:** For circular stamps of radius $R$, surface normal vectors follow shallow ellipsoid dome geometry parameterized by flattening factor $h \in (0, 1]$:
  $$\mathbf{N} = \text{normalize}\left(h \frac{dx}{R}, h \frac{dy}{R}, \sqrt{1 - \frac{dx^2 + dy^2}{R^2}}\right)$$
  An inversion flag reverses $(N_x, N_y)$ components to carve countersunk screwhole dimples without altering base surface normal depth.
* **Reoriented Normal Mapping (RNM):** Implements Colin Barré-Brisebois & Stephen Hill (2012) quaternion-based normal blending:
  $$\mathbf{t} = (B_x, B_y, B_z + 1), \quad \mathbf{u} = (-D_x, -D_y, D_z), \quad \mathbf{r} = \mathbf{t}(\mathbf{t} \cdot \mathbf{u}) - \mathbf{u} \, t_z, \quad \mathbf{N}_{\text{blended}} = \frac{\mathbf{r}}{\|\mathbf{r}\|}$$
  This rotates the stamped micro-relief into the tangent frame of underlying base normal maps (e.g. generated via Euclidean Distance Transform) without flattening slope angles.
* **Intra-Stroke Envelope Buffer (`ChiselStrokeSession`):** Continuous stroke stamping writes normal vectors and coverage alpha into an intra-stroke envelope session, tracking dirty indices in a Set. The composite pass blends the envelope onto the underlying layer snapshot via RNM in a single pass, eliminating intra-stroke angular accumulation artifacts.
* **Layer Tag Convention (`normal` vs `normal-map`):** Dedicated normal sculptor layers carry the canonical machine identifier `tag = 'normal'` (with `'normal-map'` fully supported as a transparent alias across viewport compositing, photometric shaders, and export pipelines).
* **Pure Tag-Based Compositing & Diffuse Albedo Exclusion:** `compositeSourceSnapshot` explicitly excludes `tag === 'normal'` and `tag === 'normal-map'` (alongside `tag === 'specular'` and `tag === 'photometric'`). Normal maps store $(N_x, N_y, N_z)$ surface normal vectors mapped to RGB colors (e.g. flat perpendicular baseline at `#8080FF`); including them in the diffuse composite would treat vector data as albedo colors and severely corrupt the base sprite texture. Normal maps are composited independently via `compositeNormalMapSnapshot()` and passed into `photometricLighting.ts` as `normalMapData`. All legacy display-name sniffing (`layer.name.toLowerCase().startsWith(...)`) has been completely purged across `useViewportStudioEvents.ts` in favor of strict machine-tag matching (`l.tag === tag`).

| Live Normal Preview (RNM Blended) | 45° vs 225° Relit Difference (32,558 Modified Px) | Rivet Dome Stamping Controls |
|:---:|:---:|:---:|
| ![Live Normal Preview](docs/assets/screenshots/proof_20260908_1215_02_normal_preview_on.png) | ![Relit Diff Heatmap](docs/assets/screenshots/proof_20260908_1215_05_diff_heatmap.png) | ![Rivet Dome Stamping](docs/assets/screenshots/proof_20260908_1215_07_rivet_dome_closeup.png) |

---

## 20. Mark Ferrari 8-Bit Dynamic Palette Cycling Engine (`src/lib/color/paletteCycling.ts`)

* **Amiga IFF ILBM `CRNG` & Commodore Graphicraft `CCRT` Codecs:** Full binary parsing and serialization for legacy 8-byte `CRNG` and 14-byte `CCRT` chunks, including big-endian 16-bit rates ($16384 = 60\text{Hz}$), direction flags, and microsecond intervals.
* **Zero-Allocation 60 FPS LUT Renderer (`updateLivePaletteLUT32`):** Direct update of a preallocated `Uint32Array` LUT packed in little-endian `0xAABBGGRR` format. Applied directly to canvas `ImageData` 32-bit views, eliminating object allocation and garbage collection pauses during active animation.
* **Ping-Pong Fencepost Safety:** Correct triangle-wave folding period $M = 2(S - 1)$ where $S = \text{high} - \text{low} + 1$:
  $$p = \lfloor\text{phase}\rfloor \pmod M; \quad \text{offset} = \begin{cases} p & \text{if } p < S \\ M - p & \text{otherwise} \end{cases}$$
  Guarantees registers visit endpoints once per period without double-dwell glitches.
* **Sub-Step BlendShift:** Linear interpolation of RGB color components at fractional phase offsets:
  $$\mathbf{C}(t) = (1 - \text{frac}) \cdot \mathbf{C}_{\lfloor p \rfloor} + \text{frac} \cdot \mathbf{C}_{\lfloor p \rfloor + 1}$$
* **Harmonic Rational Retuning (`retuneTracksForSeamlessLoop`):** Solves coprime LCM period explosion when exporting loopable APNG or GIF animations. Given target duration $T$, each track's rate is harmonically snapped to the nearest integer cycle count $k = \operatorname{round}(T \cdot \text{rate} / M)$, producing perfectly seamless loop cycles with zero boundary seam pop.
* **Hardware Shader Generation (`src/lib/export/shaderExporter.ts`):** Produces standalone Godot 4 CanvasItem shaders (`.gdshader`) and Unity URP 2D HLSL shaders with nearest-neighbor point filtering and half-texel LUT sampling.

<p align="center">
  <img src="docs/assets/screenshots/proof_20260908_1215_08_palette_cycling_active.png" alt="Mark Ferrari Palette Cycling Live in Studio" width="680" />
</p>

---

## 21. Database & Canvas Teardown Lifecycle Invariants (`src/lib/storage/db.ts`, `tests/e2e/chiselAndPaletteLiveProof.spec.ts`)

To ensure sequential test isolation, prevent cross-run state accumulation, and protect multi-tab sessions:
* **Explicit Connection Teardown (`db.close()`):** Before initiating database deletion or project resets, active Dexie database instances are explicitly closed via `window.__pixibunDb.close()`. This ensures no hanging locks or open transactions block schema drops.
* **Fail-Fast Deletion with `onblocked` Rejection:** Deletion requests via `indexedDB.deleteDatabase('PixiBunDB')` are wrapped in an explicit Promise that immediately rejects upon receiving `req.onblocked = () => reject(new Error('Deletion blocked by open connection'))`. This converts silent asynchronous deadlocks into loud, immediate errors.
* **Post-Reload Store State Assertions:** After browser reload, clean canvas invariants are verified directly against Zustand store state before test execution:
  - `frameCount === 1`
  - `layerCount === 1`
  - `baseLayerName === 'Base Layer'`
  - `hasNormalLayer === false`
  - `showNormalPreview === false`
* **Zero State Leakage:** Prevents concentric-circle stamp accumulation or dirty layer retention across consecutive automated test runs, guaranteeing deterministic ground-truth verification from turn one.

---

## 22. Bitwise Normalization, Hot-Path Viewport Decoupling & Export Pipeline Hardening

* **Signed vs. Unsigned 32-Bit Bitwise Invariant (`src/lib/canvas/floodFill.ts`):** JavaScript bitwise operators coerce values to 32-bit signed integers. When packing RGBA color words via `(a << 24 | b << 16 | g << 8 | r)`, any fully opaque pixel ($a = 255$) sets the sign bit (bit 31), yielding a negative number (e.g. `-16777216`). Direct comparison against values from a `Uint32Array` view (which yields unsigned integers, e.g. `4278190335`) evaluated to `false`, terminating flood fill after a single pixel on opaque regions. All 32-bit color word conversions strictly enforce unsigned casting via the zero-fill right shift operator `>>> 0`. In addition, `Uint32Array` buffer views are constructed with explicit byte offset and aligned byte length parameters `new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2)`.
* **Viewport Hot-Path Decoupling (`src/components/layout/CursorStatusBadge.tsx`):** Moving high-frequency cursor coordinates (`cursorCoords`) out of parent `CenterViewport.tsx` state into a standalone `CursorStatusBadge` subscriber prevents React re-render cascades on every pointer move event during active brush strokes, preserving sub-16ms interactive latency.
* **Deferred Object URL Revocation (`src/components/modals/ExportModal.tsx`):** Synchronously invoking `URL.revokeObjectURL(url)` immediately following `link.click()` creates race conditions in browser download managers (such as Firefox and Safari) where the memory blob is released before the file stream is opened. Revocations are deferred by 1000ms via `setTimeout(() => URL.revokeObjectURL(url), 1000)` across all export codecs.
* **Video Encoding Dimension Alignment (`src/lib/export/mp4Encoder.ts`):** H.264 macroblock encoders and YUV 4:2:0 chroma subsampling require even-numbered dimensions ($2 \times 2$ pixel blocks). Video export canvases pad odd widths and heights to the nearest even integer `(w + 1) & ~1` and `(h + 1) & ~1`.
* **Cross-Platform Canvas Safety Ceilings & Scale Isolation (`ExportModal.tsx`, `PngExportTab.tsx`):** Unchecked upscaling of large canvases (e.g. $512\times512$ @ $32\times = 16,384\times16,384\text{ px}$) allocates $>1\text{ GB}$ of raw 32-bit RGBA pixel memory, causing out-of-memory browser tab crashes on mobile WebKit and iOS Safari. PixiBun establishes strict hard bounds (`MAX_SAFE_CANVAS_DIMENSION = 4096`, `MAX_SAFE_CANVAS_PIXELS = 16_777_216`). Export tabs dynamically disable scaling factors exceeding these ceilings with explanatory tooltips, while per-tab export scale states are fully isolated (preventing GIF/Spritesheet scales from contaminating PNG/SVG export settings).
* **Dynamic WebRTC Layer Antientropy (`src/lib/sync/coDrawBridge.ts`):** Layer tracking (`syncedLayerIds`) detects newly added layers and dimension changes post-connection, dynamically pushing initial state snapshots to peers and pruning obsolete CRDT replicas.

---

## 23. Selection Free-Transform Gizmo, Sprite Sheet Slicer & Web Worker Offloading Engine

* **RotSprite Rotation Algorithm (`src/lib/canvas/rotSprite.ts`):** Implements the landmark rotation algorithm for pixel art by Xenowhirl (2007, as popularized in Aseprite). Standard affine rotation on small sprites produces severe stair-stepping, disconnected diagonals, and color blurring when interpolated. RotSprite resolves this through a three-stage pipeline:
  1. **Scale8x Cascade:** Three sequential passes of the Scale2x (EPX / AdvMAME2x) corner-connectivity operator expand the original sprite by $8\times$ ($2\times \to 4\times \to 8\times$). Scale2x interpolates diagonal slopes using 4-neighborhood comparison without introducing new intermediate color values:
     $$E_0 = (C == A \land C \neq D \land A \neq B) ? A : P$$
  2. **Subpixel Inverse Affine Rotation:** The $8\times$ supersampled buffer is rotated onto a destination grid via backward mapping around the chosen pivot crosshair $(p_x, p_y)$, utilizing nearest-neighbor sampling on the dense grid.
  3. **Parabolic Center-Weighted Majority Voting Filter:** The rotated $8\times$ grid is downscaled back to $1\times$ by analyzing each $8 \times 8$ superpixel block. Rather than arithmetic averaging (which corrupts palette integrity by introducing blended colors), a radially symmetric parabolic center-weighted kernel $w(u, v) = 1.0 + 0.01 \cdot (25 - (u^2 + v^2))$ for $(u, v) \in \{-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5\}^2$ weights votes for each distinct 32-bit color present in the block. The candidate color with the highest aggregated weight is assigned to the output pixel. Feature conservation thresholds preserve 1px thin lines when the center core touches solid pixels, otherwise requiring a solid majority (38%) to prevent outline dilation while preserving palette purity without interpolating artificial intermediate colors.
* **Selection Free-Transform Gizmo & Marching Ants (`src/lib/canvas/selectionUtils.ts`, `src/hooks/viewport/useViewportSelectionTransform.ts`, `src/components/studio/SelectionTransformGizmo.tsx`):**
  - **Orthogonal Boundary Extraction (`extractSelectionBoundarySegments`):** Traverses arbitrary 1-bit binary selection masks and extracts pixel boundary segments along cell edges $(x, y) \to (x+1, y)$ and $(x, y) \to (x, y+1)$ where selection state transitions $0 \leftrightarrow 1$. Converts contiguous edge segments into SVG path strings (`boundarySegmentsToSvgPath`) rendered with dual-pass contrasting strokes (white on black) and animated CSS dashoffset marching ants.
  - **Screen-Space Hitbox Invariance:** 8 transformation handles (4 corners, 4 midpoints) maintain a constant 16x16px screen-space hit area regardless of canvas zoom factor ($100\% - 3200\%$).
  - **Center Pivot Crosshair Reticle ($\oplus$):** Draggable pivot point initialized to selection center $((x_1+x_2)/2, (y_1+y_2)/2)$. Serves as the origin for both interactive scaling and RotSprite affine rotation.
  - **Outer Corner Rotation Zone & HUD:** Corner hit zones extend $20\text{px}$ outside the boundary handles to detect rotational drag. Holding `Shift` snaps rotation to $15^\circ$ increments. A floating degree readout badge displays active angle, and a quick-action HUD bar exposes Flip Horizontal, Flip Vertical, Rotate 90° CW/CCW, Commit, and Cancel actions.
* **Sprite Sheet Slicer Engine (`src/lib/canvas/spritesheetSlicer.ts`, `src/components/modals/ImportModal.tsx`):**
  - High-performance grid computation (`computeGridDimensions`) partitioning arbitrary atlas sheets into uniform cells (presets: 16x16, 24x24, 32x32, 48x48, 64x64, custom).
  - 32-bit alpha scanning (`isCellEmpty`) to optionally filter blank cells.
  - Live interactive cutline preview canvas rendering neon boundary lines and numbered frame badges (`#1`, `#2`, ...).
  - Direct integration into `StudioLayout.tsx` supporting batch frame ingestion for timeline append and timeline replacement workflows.
* **Heavy Compute Web Worker Offloading (`src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`):**
  - Dedicated background Web Worker executing CPU-intensive algorithms: RotSprite $8\times$ transformations, WaveFunctionCollapse (WFC) constraint synthesis, and In-Between frame SDF morphing.
  - Zero-copy data passing via Transferable `ArrayBuffer` objects for input and output pixel buffers.
  - Fault-tolerant graceful degradation: `workerDispatcher` automatically detects Worker and OffscreenCanvas support; in environments where Workers are unavailable (e.g. Node.js/Vitest or restricted browser sandboxes), tasks seamlessly fall back to synchronous execution on the main thread.

---

## 24. Workstation Architectural Upgrades (P2P Host Authority, Structural History, Desktop FS, 47-Blob Autotile & Pure ISOBMFF Muxer)

* **P2P Co-Draw Guest UI Mutation Locking (`src/hooks/useCoDrawStatus.ts`, `src/components/layout/inspector/LayersPanel.tsx`, `src/components/layout/BottomTimeline.tsx`):**
  - Establishes host-authoritative structural protection across WebRTC peer connections.
  - When connected as a guest (`peerRole === 'guest'`), layer creation, duplication, merge-down, deletion, frame creation, deletion, and timeline drag-and-drop reordering are disabled (`opacity-40 cursor-not-allowed`) with informative tooltips.
  - Guarantees predictable UX by preventing guest structural edits from being silently overwritten on the next host `STRUCTURE_SYNC` push.
* **Undo / Redo Structural Command Pattern (`src/types/canvas.ts`, `src/lib/engine/historyEngine.ts`, `src/lib/engine/structuralHistory.ts`):**
  - Upgrades `HistoryEngine` to a hybrid Command Pattern (`HistoryStep = PixelHistoryStep | StructuralHistoryStep`).
  - Destructive structural operations (layer additions, deletions, reorderings, merge-downs, frame insertions, frame deletions) record a `StructuralHistoryStep` containing full multi-frame layer hierarchies and byte-accurate raster pixel backups (`LayerBufferBackup`).
  - Restores both layer/frame structures and layer canvas pixel buffers into the live `bufferRegistry` upon undo and redo.
* **Worker EDT Distance Transform & Normal Map Offloading (`src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `src/lib/ai/math/edtNormalMap.ts`):**
  - Offloads CPU-intensive 2D Euclidean Distance Transform, bilateral Gaussian smoothing, and Sobel normal field baking to `heavyCompute.worker.ts`.
  - Uses zero-copy Transferable ArrayBuffers with defensive buffer slicing (`.slice(0)`) on the outgoing main-thread snapshot to prevent live canvas detachment.
  - Retains synchronous fallback in `runEdtNormalMapInWorker` for headless environments.
* **Native Desktop File System Access API (`src/lib/storage/desktopFileSystem.ts`, `src/components/layout/StudioLayout.tsx`):**
  - Integrates W3C File System Access API (`window.showSaveFilePicker`, `window.showOpenFilePicker`, `FileSystemFileHandle`).
  - Binds `Ctrl+S` to instantaneous in-place disk overwriting without file picker prompts once a file handle is active, and `Ctrl+Shift+S` to explicit Save As dialogs.
  - Provides seamless fallback to browser anchor downloads (`<a download>`) and file inputs in unsupported browsers.
* **47-Blob Autotile Interactive Engine (`src/lib/ai/math/autotileEngine.ts`):**
  - Implements canonical 8-neighbor Moore bitmasking with cardinal-corner dominance, collapsing $2^8 = 256$ neighborhood configurations into 47 Wang/Blob equivalence classes.
  - Utilizes a precomputed $O(1)$ 256-element bitmask lookup table (`BITMASK_TO_47_INDEX: Uint8Array`) and a reactive $3\times3$ Chebyshev dirty neighborhood updater (`updateAutotileAt`) that recalculates only affected adjacent tiles.
  - Includes a zero-dependency procedural 47-tile pixel renderer for instant terrain, wall, and platform synthesis.
* **Pure-TypeScript ISOBMFF Fast-Start MP4 Container Muxer (`src/lib/export/isobmffWriter.ts`, `src/lib/export/mp4Encoder.ts`):**
  - Pure-TS ISO Base Media File Format container writer (`ftyp`, `moov`, `mdat`) eliminating reliance on non-standard browser `MediaRecorder` H.264 implementations.
  - Formats boxes for progressive download Fast-Start playback (`moov` preceding `mdat`) and dynamically back-patches chunk offsets in `stco`.
  - Integrates hardware-accelerated WebCodecs `VideoEncoder` (`avc1.42001f`) with instant off-screen encoding, retaining graceful `MediaRecorder` fallback.

---

## 25. Comprehensive Defensive Hardening & Invariant Architecture

To immunize the client-side graphics workstation against browser anomalies, memory exhaustion, floating-point singularity, and malicious payloads, PixiBun introduces a dedicated, zero-dependency safety substrate (`src/lib/safety/`):

* **Mathematical Viewport Invariants & Line Clipping (`src/lib/safety/mathInvariants.ts`):**
  - **IEEE 754 Floating-Point Invariants:** Grounded in Goldberg (1991) and Knuth (1997), `clampZoom(zoom, fallback)` sanitizes zoom values against `NaN`, `Infinity`, $\le 0$, and bounds to $[0.05, 64.0]$. `safeDivide(n, d, fallback)` prevents zero-division singularities.
  - **Cohen-Sutherland 2D Line Clipping (`clipLineToCanvas`):** Formulates 4-bit outcodes (`INSIDE=0`, `LEFT=1`, `RIGHT=2`, `BOTTOM=4`, `TOP=8`) based on Foley et al. (1990) to clip raster line segments to canvas boundaries $[0, w-1] \times [0, h-1]$ prior to pixel traversal.
* **Safe Canvas Hardware Boundary Clamping (`src/lib/safety/safeCanvas.ts`):**
  - Defensively wraps `createImageData` and `getImageData`. Enforces positive integer dimensions, clamps selection bounds against hardware GPU limits (8192px / 16384px ceiling), and returns safe empty/padded `ImageData` buffers rather than throwing browser-crashing `IndexSizeError` exceptions on zero-area selections.
* **CWE-409 Decompression Bomb & Pixel Bomb Mitigation (`src/lib/safety/imageHeaderProbe.ts`):**
  - Pre-flight parses raw binary file headers (first 64KB) for PNG (`IHDR`), JPEG (`SOF0`/`SOF2`), GIF, and BMP formats. Rejects dimensions $>8192\text{px}$ or pixel areas $>67\text{ MP}$ before memory buffer allocation or `createImageBitmap` invocation.
* **CWE-1321 Prototype Pollution Defense & Safe JSON Parsing (`src/lib/safety/safeJson.ts`, `src/lib/project/schema.ts`):**
  - Recursive JSON sanitizer stripping `__proto__`, `constructor`, and `prototype` keys based on Arteau (2018), enforcing a maximum nesting recursion depth of 32. Hardened project schema asserts explicit ceilings (256 char names, 50 palettes, 100 clips, 500 frames, 100 layers).
* **Storage Resilience & Quota Exhaustion Recovery (`src/lib/safety/storageResilience.ts`, `src/lib/storage/db.ts`):**
  - Standardized cross-engine detection of WHATWG `QuotaExceededError`. Automatically prunes volatile diagnostic telemetry logs and orphaned layer blobs during disk pressure, safeguarding active user project data.
* **WebRTC Token Bucket Traffic Shaping (`src/lib/sync/p2pSync.ts`):**
  - Implements RFC 2212 Token Bucket rate limiting on peer data and presence channels, shielding client threads against packet floods and CPU starvation.

---

## 26. Autonomous Local CI/CD Quality Gate & Git Pre-Push Protection

To decouple development from cloud CI billing constraints while maintaining uncompromising release standards:

* **Zero-Dependency Local Quality Gate Runner (`scripts/runQualityGate.mjs`):**
  - Executes a 3-stage sequential validation pipeline via `npm run gate` in ~16 seconds:
    1. **Stage 1 (Documentation & Sync Audit):** `npm run verify:docs` asserts phase uniqueness in `TASKS.md`, monotonic sections in `ARCHITECTURE.md`, 100% on-disk existence for `CHANGELOG.md` filepaths, truthful `README.md` test counters, and `package.json` version synchronization.
    2. **Stage 2 (Static Type Safety):** `npm run typecheck` (`tsc --noEmit`) enforces 0 TypeScript compilation errors without type-stripping.
    3. **Stage 3 (Defensive Invariant Test Suite):** `npm test` runs all 609 Vitest unit tests across 88 suites.
    4. **Stage 4 (Production Compilation):** `npm run gate:full` runs `next build` verifying clean Turbopack bundling and route trees.
* **Automated Git Pre-Push Gatekeeper (`scripts/installGitHooks.mjs`, `.git/hooks/pre-push`):**
  - Automatically installed via npm `prepare` lifecycle hook (`npm run prepare`).
  - Intercepts `git push` on developer workstations, blocking any push that fails any Quality Gate stage before bytes ever reach a remote repository.
* **Open Source Governance & Ready-to-Use GitLab CI:**
  - Standardized guidelines in `CONTRIBUTING.md` and `SECURITY.md`.
  - Drop-in `.gitlab-ci.yml` pipeline configuration ready for instant repository mirroring or self-hosted runners.









