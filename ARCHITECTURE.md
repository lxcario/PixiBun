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
        UndoRedo["historyEngine (50-Step DOM-Free History Ring)"]
    end

    subgraph Core_Engines ["⚙️ Computational & Raster Engines"]
        RasterCore["Artisan Raster Engine (Bresenham, Wu 2:1 Iso, Bézier)"]
        MathCore["PixiBud Smart Math Engine (Felzenszwalb EDT, Sobel Normals, Blinn-Phong, Laplace AO)"]
        PixelizeCore["Image Synthesis Engine (Sobel Salience, OKLab Median-Cut, Floyd-Steinberg)"]
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
To avoid browser layout recalculations, eliminate visual ghost contamination during color picking, and achieve sub-16ms interactive drawing latency, viewport rendering is separated into a hardware-accelerated 5-layer stack:

```mermaid
graph TD
    subgraph Viewport_Stack ["🖥️ CenterViewport Canvas Stack (Bottom to Top)"]
        L0["0. Solid Background (White #ffffff)"]
        L1["1. Onion Skin Underlay (onionCanvasRef: Tinted Ghosts & Falloff)"]
        L2["2. Main Artwork Composite (mainCanvasRef: Layers & Normal Map Preview)"]
        L3["3. Interactive Shape Preview (previewCanvasRef: Bézier & Vector Shapes)"]
        L4["4. Precision HUD (gridCanvasRef: Pixel Grid, Iso Guides & Marquee)"]
    end
    
    L0 --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4
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
   $$\text{ratio} = \min\left(1.0, \frac{D(p)}{2.8}\right), \quad H_{\text{face}}(p) = H(p) \cdot (0.6 + 0.4 \cdot \text{ratio})$$
   Normals across the face interior satisfy $N_z \ge 0.85$, confining form shadows to the unlit silhouette edge. Features (eyes, mouth, whiskers) receive camera-facing normals $\mathbf{N} = (0, 0, 1)^T$.
4. **100% Feature Preservation & Stepped OKLCH Cel-Shading:**
   Pixels tagged `isFeature = 1` or `isInkLine = 1` bypass lighting multipliers entirely, preserving exact original RGB values. Unshaded base colors receive discrete stepped tone quantization in OKLCH:
   * **Shadow:** $L_{\text{shadow}} = L_{\text{base}} \times 0.72$, $H_{\text{shadow}} = \text{shiftHue}(H_{\text{base}}, 260^\circ, 18^\circ)$ (Skylight cool indigo)
   * **Highlight:** $L_{\text{highlight}} = \min(1, L_{\text{base}} \times 1.18)$, $H_{\text{highlight}} = \text{shiftHue}(H_{\text{base}}, 65^\circ, 15^\circ)$ (Sunlight warm amber)
5. **Blinn-Phong Specular Half-Vector with View-Alignment Masking:**
   $$\mathbf{H} = \frac{\mathbf{L} + \mathbf{V}}{\|\mathbf{L} + \mathbf{V}\|}, \quad I_s = k_s (\max(0, \mathbf{N} \cdot \mathbf{H}))^\alpha \cdot \min\left(1, \frac{\mathbf{N} \cdot \mathbf{V}}{0.35}\right)$$
6. **Discrete Laplace Cavity Occlusion:**
   $$\nabla^2 H \approx H * \begin{bmatrix} 0 & 1 & 0 \\ 1 & -4 & 1 \\ 0 & 1 & 0 \end{bmatrix}, \quad AO(p) = \text{clamp}(1.0 - k_{\text{ao}} \max(0, -\nabla^2 H), 0, 1)$$
7. **2D Subsurface Scattering (Beer-Lambert + Henyey-Greenstein Forward Phase):**
   $$T(\mathbf{x}) = 2\sqrt{\max\left(0, R^2 - D(\mathbf{x})^2\right)}, \quad I_{SSS}(\mathbf{x}) = C_{scatter} \exp\left(-\boldsymbol{\sigma}_t \frac{T(\mathbf{x})}{d_{trans}}\right) \cdot P_{2D}(\mathbf{L}', \mathbf{V}, g)$$
   $$P_{2D}(\theta, g) = \frac{1 - g^2}{2\pi (1 + g^2 - 2g \cos\theta)^{3/2}}$$
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
* **Dynamic Canvas-Scaled Undo History:** Replaces static memory limits with an integer-pixel-scaled ring buffer of `ImageData` snapshots:
  * $\le 64\times64$ ($4096\text{ px}$): 50 steps ($\sim 800\text{ KB}$)
  * $\le 256\times256$ ($65536\text{ px}$): 35 steps ($\sim 8.9\text{ MB}$)
  * $> 256\times256$ ($262144\text{ px}$): 20 steps ($\sim 20\text{ MB}$)
  Undo/Redo restores the exact layer pixels in $O(1)$ time without re-rendering unrelated layers.
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



## 7. 3D Minecraft Skin Recognition & Domain Shading Engine

When an imported or active sprite matches the standard Java/Bedrock $64\times64$ or $64\times32$ UV bounding template, the engine bypasses 2.5D heightmap inflation and routes directly into the dedicated **3D Minecraft Skin Photometric Shading Engine**:

```mermaid
graph TD
    Skin["Minecraft Skin Texture (64x64 / 64x32)"] --> Detect["UV Template Void Pattern Classifier"]
    Detect --> UVMap["12-Region Cuboid Face Normal Field N(x,y,z)"]
    UVMap --> HalfLambert["Half-Lambert Wrap Lighting ((N·L + 0.4)/1.4)^1.2"]
    UVMap --> ContactAO["Raytraced Contact Occlusion Map (Neck, Limbs, Layers)"]
    HalfLambert & ContactAO --> SkyDome["Hemispheric Sky Radiance Gradient"]
    SkyDome --> OKLCH["OKLCH Perceptual Hue-Shifting"]
    OKLCH --> FinalSkin["Non-Destructive Minecraft Shaded Output Layer"]
```

### Mathematical Formulations:
1. **Half-Lambertian Wrapped Diffuse:**
   $$\text{wrap}(\mathbf{N} \cdot \mathbf{L}) = \left(\frac{\mathbf{N} \cdot \mathbf{L} + 0.4}{1.4}\right)^{1.2}$$
2. **Raytraced Anatomical Contact Ambient Occlusion:**
   $$AO(x, y) = \min(AO_{\text{neck}}, AO_{\text{armpit}}, AO_{\text{thigh}}, AO_{\text{ground}}, AO_{\text{layer}})$$
3. **Perceptual OKLCH Hue-Shifting:**
   * **Highlight:** $H_{\text{new}} = \text{shiftHueToward}(H_{\text{orig}}, 65^\circ, \Delta_{\text{sun}})$ (Sunlight amber)
   * **Shadow:** $H_{\text{new}} = \text{shiftHueToward}(H_{\text{orig}}, 260^\circ, \Delta_{\text{sky}})$ (Cool ambient indigo, never flat gray)

---

## 8. Optical Flow In-Between Animation Morphing

The frame morphing engine (`src/lib/ai/pixelAiEngine.ts`) implements **2D Block-Matching Optical Flow & Signed Distance Field (SDF)** interpolation:

1. **Motion Displacement Field (with Zero-Motion Center Bias):**
   $$\mathbf{v}(x, y) = \arg\min_{(u, v) \in \mathcal{W}} \left( \sum_{p \in \mathcal{B}} |I_A(p) - I_B(p + (u, v))| + 0.05 \cdot (u^2 + v^2) \right)$$
   *The quadratic displacement penalty $0.05 \cdot (u^2 + v^2)$ provides tie-break stabilization, preventing false ghosting artifacts across uniform, solid color, or transparent background regions.*
2. **Intermediate Synthesis at $t = 0.5$:**
   Pixels are displaced along trajectory vectors $\mathbf{x} - t \mathbf{v}$ and blended in OKLab perceptual color space, producing clean tween frames between keyframes without ghosting or tearing.

---

## 9. Intelligent Image-to-Pixel-Art Synthesis Pipeline (`src/lib/ai/pixelizeEngine.ts`)

```mermaid
graph TD
    InputImg["Source Image / Texture"] --> BoxDown["Linear Optical Area Box Filter (Gamma-Corrected)"]
    InputImg --> SobelSalience["Sobel Gradient Magnitude Map (Edge Preservation)"]
    BoxDown & SobelSalience --> SalientDown["Salient Downsampled ImageData"]
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
2. **Sobel Salience Weighting:**
   $$W_{\text{salience}}(x, y) = W_{\text{area}} \cdot (1.0 + 0.05 \cdot \|\nabla I(x, y)\|)$$
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

* **Zero-Bandwidth:** Synthesizes warm rain ambiance, subtle vinyl crackles, Rhodes chords, and sub-bass completely in code without loading external `.mp3` or `.wav` assets.
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
- **Pool Sizing & Lifecycle:** Pre-allocates and bounds reusable `Float32Array`, `Int32Array`, and `Uint8ClampedArray` buffers.
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
* **Vector Depixelization (`src/lib/export/depixelizeVector.ts`):** Domain-tailored planar graph ambiguity solver based on Kopf-Lischinski (SIGGRAPH 2011) principles, converting 2D pixel clusters into valence-aware polygonal boundaries with Catmull-Rom cubic Bézier smoothing specifically for scalable SVG sprite sheet export.
* **Zero-Egress LAN Default & Network Boundaries:** Core creative features (raster engine, layers, animation timeline, photometric studio, color science, export encoders, and IndexedDB persistence) operate 100% on-device without network access. P2P co-draw defaults to `LAN_ICE_SERVERS = []` for true zero-egress local network collaboration. Public Internet WebRTC STUN NAT traversal and the optional diagnostics relay are the only subsystems that require network access, both requiring explicit user activation.



