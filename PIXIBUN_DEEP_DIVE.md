# 🐇 PixiBun: Comprehensive Technical, Mathematical & Architectural Reference

`	ext
  /\_/\   ✦  .  *  .  ✦  *  .  ✦  *  .  ✦  *
 ( o.o )   P I X I B U N   D E E P   D I V E
  > ^ <    Engineering, Computer Graphics & Architecture Reference
`

> **This document provides an in-depth technical explanation of PixiBun's raster drawing engine, 2.5D photometric mathematics laboratory, optical color quantization algorithms, Web Audio synthesizer, memory management, and tactile design system.**

---

# 1. Directory & File Architecture

PixiBun is built on Next.js 16 (App Router), React 19, Tailwind CSS v4, Zustand + Immer, and Dexie.js (IndexedDB) as a modular, desktop-grade raster graphics studio:

`	ext
src/
├── app/
│   ├── api/diagnostics/relay/route.ts # SSRF-guarded diagnostics proxy (optional, zero telemetry)
│   ├── globals.css                  # Tailwind v4 @theme, OKLCH variables, tactile shadows, dither patterns
│   ├── layout.tsx                   # Root layout (Silkscreen, Plus Jakarta Sans, JetBrains Mono fonts)
│   ├── page.tsx                     # Landing Page (Living desk scene, diorama, artisan story)
│   └── studio/page.tsx              # Main studio drawing editor and workspace
├── components/
│   ├── landing/                     # Landing components (AtelierDeskScene, PixelVines, PixelCursor etc.)
│   ├── layout/                      # Studio shell (TopHeader, LeftToolbar, CenterViewport, RightInspector + modular inspector subpanels, BottomTimeline, ContextOptionsBar)
│   ├── modals/                      # Dialog windows (ImportModal, ExportModal, CanvasResizeModal, ColorPickerModal, ShortcutsModal, CoDrawModal)
│   ├── studio/                      # Floating windows & gizmos (FloatingPreviewWindow, PixelLightBulbGizmo, ViewportLensFilters)
│   └── ui/                          # Atomic tactile components (TactileButton, PixelIcon, BunMascot, ThemeToggle, ModalWrapper)
├── lib/
│   ├── ai/
│   │   ├── math/                    # Modular graphics math laboratory
│   │   │   ├── edtNormalMap.ts      # O(N) EDT, dome inflation, content-aware heightmaps, frontal cushion
│   │   │   ├── photometricLighting.ts# Blinn-Phong lighting, feature protection, stepped OKLCH cel-shading
│   │   │   ├── photometricAuto.ts   # Art morphology analysis, anatomical classification (character/orb/prop)
│   │   │   ├── shadowAuto.ts        # Sprite bounds, ground contact detection, shadow parameter inference
│   │   │   ├── colorSpace.ts        # sRGB/OKLab/OKLCH conversions and perceptual hue-shifting
│   │   │   ├── dithering.ts         # Atkinson and Riemersma error-diffusion dithering
│   │   │   ├── rotSprite.ts         # Xenowhirl 8x Scale2X RotSprite rotation engine and thinning
│   │   │   └── minecraftSkin.ts     # Minecraft player skin UV detection and normal mapping
│   │   ├── pixelAiEngine.ts         # Optical flow tweening, jaggy cleanup, ground shadow, outline
│   │   ├── pixelizeEngine.ts        # Image-to-pixel: Sobel salience, OKLab Median-Cut + K-Means++
│   │   └── shadowRayMarcher.ts      # Bounded 2.5D sprite cast shadow projection, drop shadow, Aaltonen cone tracing
│   ├── art/                         # Starter templates (Hearth Ghost, Desk Mushroom, Bun, Little Lantern)
│   ├── audio/
│   │   └── lofiRadio.ts             # Web Audio API procedural lo-fi synth (Pink noise, Rhodes chords, FFT analyzer)
│   ├── canvas/                      # Raster fundamentals: Bresenham, Wu 2:1 iso, Bezier, Flood Fill, Dither matrices
│   ├── engine/                      # Memory management: bufferRegistry (OffscreenCanvas store), ID generator, bufferPool
│   ├── events/                      # Typed event bus (studioEvents.ts)
│   ├── export/                      # Export pipeline: spriteSheetPacker, gifEncoder, webmEncoder, mp4Encoder, apngEncoder
│   ├── project/                     # Project serialization: schema.ts (validator), serialize.ts (.pixibun IO)
│   ├── render/                      # Pure compositor (compositor.ts) and template renderer (templateRenderer.ts)
│   └── storage/
│       └── db.ts                    # Dexie.js (IndexedDB Schema v4) local database and continuous autosave
├── stores/
│   ├── studioStore.ts               # Zustand + Immer studio state manager (Tools, Layers, Frames, Palettes)
│   └── themeStore.ts                # Dual theme manager and Zero-Lag CSS transition suppressor
└── types/                           # TypeScript definitions (canvas, tools, animation, project, theme)
`

---

# 2. Memory Architecture & Dual-Layer Drawing Pipeline

React's Virtual DOM is unsuitable for high-frequency pixel-level operations (120+ cursor events per second). PixiBun uses React state strictly for metadata, managing pixel buffers in external memory:

`mermaid
sequenceDiagram
    participant Mouse as Stylus / Cursor
    participant Viewport as CenterViewport (Display Canvas)
    participant Registry as bufferRegistry (OffscreenCanvas Layer Store)
    participant Compositor as Master Compositor (Blending Engine)
    participant Signal as bufferVersion (Atomic Signal)
    participant LivePop as FloatingPreviewWindow (1x/2x/4x Live Preview)

    Mouse->>Viewport: PointerMove (Screen X, Y)
    Viewport->>Viewport: Integer Grid Transform: floor((x - panX) / zoom)
    Viewport->>Registry: Direct Write to Active Layer ImageData (Bresenham, etc.)
    Viewport->>Compositor: Composite all visible layers with blend modes
    Compositor->>Viewport: Nearest-Neighbor Integer Blit to Viewport
    Viewport->>Signal: bumpBufferVersion()
    Signal-->>LivePop: Refresh Live Preview (Zero React Re-renders)
`

### 1. `bufferRegistry.ts` (Layer Buffer Store)
* Layer pixels are stored in a `Map<string, { canvas: HTMLCanvasElement | OffscreenCanvas, ctx: CanvasRenderingContext2D }>`.
* When a layer is created (`getOrCreateBuffer`), an independent OffscreenCanvas is allocated at canvas dimensions.
* **Memory Safety:** When a layer is deleted, `deleteBuffers(layerId)` cleans up references immediately.
* **9-Point Anchor Resizing (`resizeAllBuffers`):** Canvas dimensions resize relative to 9 anchor points (`top-left`, center, `bottom-right`, etc.) with nearest-neighbor resampling options.

### 2. `bufferVersion` Reactive Signal
* On stroke completion, fill, or smart shading pass, `bumpBufferVersion()` notifies subscribers.
* FloatingPreviewWindow listens to this integer counter, updating live previews without triggering React re-renders.

### 3. Undo/Redo History Engine
* src/lib/engine/historyEngine.ts maintains a 50-deep HistoryStep FIFO ring (createHistoryEngine(50)).
* Prior to each stroke, ctx.getImageData(0, 0, width, height) captures a layer snapshot for (1)$ pixel restoration.

---

# 3. Raster, Geometry & Canvas Algorithms

Mathematical algorithms in src/lib/canvas/ are optimized for retro pixel precision:

### 1. Pixel-Perfect Bresenham (ilterPixelPerfect)
Standard Bresenham produces duplicate "L" corner pixels on rapid turns. A 3-point state machine prunes redundant intermediary pixels:

\text{If } (x_i = x_{i-1} \lor y_i = y_{i-1}) \land (x_{i+1} \ne x_i \land y_{i+1} \ne y_i) \implies \text{Prune middle pixel}

### 2. Wu's Quantized 2:1 Isometric Line (`getIsometric2p1Line`)
For standard $26.565^\circ$ isometric projections:

y_{\text{iso}} = y_0 + \text{sign}(dy) \cdot \left\lfloor \frac{|x - x_0|}{2} \right\rfloor

### 3. Rational Bezier Curves (`getQuadraticBezierPoints`)
Calculates integer de Casteljau curves across 3 control points ($P_0, P_1, P_2$):

B(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2, \quad t \in [0, 1]

### 4. Flood Fill (performFloodFill)
* Compares colors as 32-bit integers using Uint32Array buffer views ((a << 24) | (b << 16) | (g << 8) | r).
* Employs an index-based BFS queue to eliminate GC allocations during traversal.

---

# 4. PixiBud 2.5D Photometric Studio

src/lib/ai/smartMathEngine.ts generates analytical 3D lighting and normal maps from 2D pixel drawings:

`mermaid
graph TD
    Mask["Binary Alpha Mask M(x,y)"] --> EDT["O(N) Separable EDT (Felzenszwalb)"]
    EDT --> Dome["Dome Profile Inflation H = (D/Dmax)^0.5"]
    Dome --> Bilateral["Bilateral Filter"]
    Bilateral --> Sobel["Sobel Gradient Kernels (Gx, Gy)"]
    Sobel --> NormalVec["Analytical Tangent Normals N(x,y,z)"]
    NormalVec --> BakeNorm["Normal Map Baking (RGB 128,128,255)"]
    
    Bilateral --> Laplace["Discrete Laplace Cavity AO"]
    Laplace --> CavityAO["Cavity Ambient Occlusion"]

    NormalVec & CavityAO --> BlinnPhong["Blinn-Phong Shading"]
    BlinnPhong --> BayerMod["Bayer Matrix Dither Modulation"]
    BayerMod --> FinalLayer["Shaded Output Layer"]
`

### 1. (N)$ Linear-Time Euclidean Distance Transform (EDT)
Uses Felzenszwalb-Huttenlocher separable squared parabolic lower envelopes along rows and columns:

D(x, y) = \min_{x'} \left( (x - x')^2 + D_{\text{col}}(x', y) \right)

### 2. Dome Profile Inflation & Bilateral Filtering
Distance values are converted to volumetric dome heights via $\gamma = 0.5$ power curve:

H(x, y) = \left(\frac{D(x, y)}{\max D}\right)^{0.5}

### 3. Analytical Tangent-Space Normals & Sobel Gradients
Discrete $3\times3$ Sobel kernels derive directional gradients ($G_x, G_y$):

\mathbf{N}(x, y) = \frac{1}{\sqrt{s_x^2 G_x^2 + s_y^2 G_y^2 + 1}} \begin{pmatrix} -s_x G_x \\ -s_y G_y \\ 1 \end{pmatrix}

### 4. Normal Map Baking
Unit vectors $\mathbf{N} = (N_x, N_y, N_z)$ map directly to RGB $[0, 255]$ for Godot, Unity, and Unreal:

R = \lfloor (N_x \cdot 0.5 + 0.5) \cdot 255 \rfloor, \quad G = \lfloor (N_y \cdot 0.5 + 0.5) \cdot 255 \rfloor, \quad B = \lfloor (N_z \cdot 0.5 + 0.5) \cdot 255 \rfloor

### 5. Content-Aware Frontal Face Cushion & Anatomical Feature Isolation
For character sprites, naive hemispherical dome inflation creates extreme slope gradients across the face ($N_x > 0.8$), causing directional light to plunge half the character's face into shadow.
* **Frontal Cushion Plateau:** Within 2.8px of the boundary contour, height bevels smoothly down while the face interior reaches a flat plateau facing the camera ($N_z \ge 0.85$). Form shadows naturally hug only the unlit 1–2px silhouette edge.
* **Independent Ear Cones:** Distinct convex lobes in the silhouette retain independent 3D height peaks without arbitrary pixel caps.
* **Feature Preservation:** Connected components corresponding to eyes, mouth, snout, and lateral whiskers are tagged as `isFeature` and `isInkLine`. They bypass diffuse and ambient multipliers completely, preserving 100% artist color fidelity across up to 32 clusters.
* **Stepped OKLCH Cel-Shading:** Unshaded flat base colors receive stepped tone quantization with cool skylight shifts toward 260° in shadow and warm sunlight shifts toward 65° in highlights.

### 6. Interactive On-Canvas Pixel Light Bulb Gizmo & Reticle Architecture
* **Decoupled Orbit and Focus Reticle:** A draggable bulb token orbits smoothly around a draggable middle focus reticle (`stageCentroid`). Dragging the bulb rotates light azimuth ($\theta = \text{atan2}(dx, -dy)$) and elevation without mutating the center anchor position.
* **60fps Throttled Direct Pipeline:** Renders in-place preview frames during pointer movement using `requestAnimationFrame` with zero UI latency.
* **Spherical Dome Normal Math Calibration:** Calibrated dome inflation ($z = R\sqrt{1 - (1 - d/R)^2}$) provides an exact zero derivative at the apex peak to prevent conical creases and center-locked highlights on spherical primitives.

---

# 5. 3D Minecraft Skin Recognition & Dedicated Shading

Minecraft skins (\times64$ or \times32$) require domain-specific 3D cuboid normal mapping:

`mermaid
graph LR
    Texture["Minecraft Skin (64x64 / 64x32)"] --> Detect["UV Void Mask Detection"]
    Detect --> UVMap["12-Region 3D Face Normal Mapping"]
    UVMap --> HalfLambert["Half-Lambert Diffuse Wrap"]
    UVMap --> ContactAO["Anatomical Contact AO (Armpits, Chin, Legs)"]
    HalfLambert & ContactAO --> OKLCH["OKLCH Warm Sunlight / Indigo Shift"]
    OKLCH --> LayerOut["Non-Destructive Tagged Output Layer"]
`

1. **UV Pattern Detection (detectMinecraftSkin):** Scans transparent void coordinates and head/torso layout to verify Java/Bedrock layout.
2. **12-Region 3D Normal Mapping:** Assigns analytical 3D normals for Head, Hat, Torso, Jacket, Arms, and Legs.
3. **Half-Lambert Wrap:**

\text{wrap}(\mathbf{N}\cdot\mathbf{L}) = \left(\frac{\mathbf{N}\cdot\mathbf{L} + 0.4}{1.4}\right)^{1.2}

4. **Anatomical Contact AO:** Applies contact shadowing under chin (.80$), armpits (.82$), and inner limbs (.85$).

---

# 6. Optical Flow In-Between Animation Synthesis

src/lib/ai/pixelAiEngine.ts implements 2D block-matching motion estimation with zero-motion bias:

\mathbf{v}(x, y) = \arg\min_{(u, v) \in \mathcal{W}} \left( \sum_{p \in \mathcal{B}} |I_A(p) - I_B(p + (u, v))| + 0.05 \cdot (u^2 + v^2) \right)

Interpolation at  = 0.5$ blends colors in perceptual OKLab space to prevent ghosting and tearing.

---

# 7. Image-to-Pixel Synthesis (pixelizeEngine.ts)

1. **Linear Optical Gamma Correction:** Downsamples in linear energy space to avoid dark fringe artifacts.
2. **Sobel Salience Edge Preservation:** Weights high-frequency facial and weapon contours:

W_{\text{salience}}(x, y) = W_{\text{box}} \cdot (1.0 + 0.05 \cdot \|\nabla I(x, y)\|)

3. **OKLab Median-Cut + K-Means++:** Quantizes palettes along maximum perceptual variance axes.
4. **Serpentine Floyd-Steinberg & Atkinson Dithering:** Alternating scan direction prevents worming artifacts.

---

# 8. Procedural Web Audio Lo-Fi Synthesizer (lofiRadio.ts)

* **Pink Noise & Vinyl Rain:** Synthesizes rain/vinyl crackle through an 800Hz lowpass filter with zero network audio assets.
* **Tape Flutter:** 0.3Hz LFO introduces $\pm 1.5\text{ Hz}$ subtle analog pitch waver.
* **Equalizer Spectrum:** 4-band real-time FFT analyzer powers boombox visualizer bars.
* **Pentatonic Progressions:** Features 3 distinct jazz/lo-fi chord progressions.

---

# 9. Storage, Serialization & Game Engine Exports

### 1. IndexedDB Workspace (db.ts, Schema v4)
* Dexie-backed multi-project workspace with dedicated binary `layerBlobs` table storing raw PNG blobs directly (eliminating base64 serialization overhead).
* Asynchronous autosave snapshots layers, palettes, and thumbnails without main-thread stalls.

### 2. Game Engine Export Pipeline (spriteSheetPacker.ts)
* **Godot 4:** Generates valid .tres SpriteFrames text resources with AtlasTexture sub-resources.
* **TexturePacker / Unity:** Emits standard TexturePacker Array JSON format compatible with Unity and game engine importers.
* **Phaser 3:** Generates Phaser multiatlas JSON structures.

### 3. GIF89a LZW Encoder (gifEncoderCore.ts)
* Lightweight, multithreaded worker encoder with per-frame Local Color Tables and Uint8Array stream buffering.

---

# 10. Bounded 2.5D Sprite Cast Shadows & Ground Drop Shadows (shadowRayMarcher.ts)

### 1. Exact 1-to-1 Sheared Silhouette Projection
Rather than tracing an unbounded 2D planar wedge across the floor, the engine projects sprite pixels directly onto the ground plane:
$$h = y_{\text{base}} - y_s \ge 0$$
$$\text{projX} = \text{round}(x_s + h \cdot \text{shear}_x), \quad \text{projY} = \text{round}(y_{\text{ground}} + h \cdot \text{shear}_y)$$
Sub-step sampling strictly along the shear vector prevents pinhole gaps without expanding bounding spans, preserving hollow leg arches and waist indentations.

### 2. Ground Contact Drop Shadows (shadowStyle: 'drop')
For classic top-down RPG style (*The Legend of Zelda*, *Pokémon*), renders a crisp stylized Bresenham pixel ellipse anchored at the contact base:
$$\frac{(x - x_{\text{center}})^2}{r_x^2} + \frac{(y - y_{\text{base}})^2}{r_y^2} \le 1.0$$

### 3. Authentic Uniform Flat Opacity (ditherMode: 'none')
When `ditherMode === 'none'`, shadows render with crisp uniform flat opacity $\text{round}(\text{shadowOpacity} \times 255)$, completely eliminating continuous 256-level float gradients. Optional Bayer matrix stippling is available via `2x2`, `4x4`, and `8x8` modes.
