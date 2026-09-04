# PixiBun

## Problem & Audience
- **Who this is for:** Indie game developers, pixel artists, animators, and digital creators looking for a desktop-grade, tactile 2D pixel art studio and animation suite in the browser.
- **What they're trying to do:** Create precision 2D pixel art, build multi-frame animated sprite sheets, manage color ramps and layers, convert reference art to authentic pixel sprites, and work at a peaceful, cozy desk with procedural lo-fi beats and intelligent computer graphics tools.
- **What success looks like:** A responsive, sub-16ms latency pixel drawing and animation tool with zero-lag integer zoom/pan, layered compositing, onion skinning, game-ready sprite sheet export (PNG + Godot, Unity & Phaser 3 JSON), 2.5D photometric lighting, intelligent image-to-pixel-art synthesis, and a cozy PixiBud companion that provides instant non-destructive auto-shading, palette harmonization, and frame generation.

## Scope
### In scope for v1:
- **High-Performance Canvas Engine:** Dual-layer raster engine with integer zoom (100%–6400%), pan, pixel grid toggle, symmetry rulers (X/Y), 2:1 isometric guides, 3x3 seamless pattern matrix preview mode, non-destructive 1px brush ghost bounding cursor at $\ge 400\%$ zoom, integer keyboard zoom navigation (`Ctrl + + / - / 0 / 1`), and 9-point anchor canvas resizing with aspect-ratio locking and resampling options.
- **Precision Pixel Tools:** Pixel-perfect pen (Bresenham line smoothing, no jaggies), eraser, dithering brushes (Bayer 2x2, 4x4, 8x8, Atkinson, Riemersma), flood fill (with tolerance & contiguous controls), color swap, color picker, shape primitives (line, 2:1 iso line, rational Bézier curve `C`, rectangle, ellipse), and full selection suite (Marquee `M`, Lasso `Q`, Magic Wand `W`, Shift/Alt Union and Subtract modifiers, floating buffer drag, copy/cut/paste, flip H/V).
- **Multi-Layer Stack:** Layers with opacity, blend modes (Normal, Multiply, Screen, Overlay, Color Dodge), visibility, locking, reordering, layer merge down (`mergeLayerDown`), and non-destructive tagged output layers.
- **Animation & Sprite Timeline:** Frame management, per-frame variable duration pacing (`durationMs`), proportional timeline cards ($W_{\text{card}}$), timing hold badges (`+Xms`), FPS scrubber (1–60 FPS), loop/ping-pong playback, customizable onion skinning (prev/next tint & opacity), tag clips (Idle, Walk, Attack), and 2D Optical Flow in-between frame morphing.
- **Intelligent Image-to-Pixel-Art Synthesis Suite:** Linear optical gamma-corrected area box downsampling with Sobel gradient salience edge-preservation, OKLab Median-Cut & K-Means++ color quantization, Serpentine Floyd-Steinberg and Atkinson dithering, 4-corner auto-background removal, and automatic 32-color swatch extraction.
- **PixiBud 2.5D Photometric Studio:** Linear-time $O(N)$ Euclidean Distance Transform, 2D Raymarched Soft Shadows with Sebastian Aaltonen contact-hardening tangent correction and physical area light cone tracing, non-linear dome height inflation, Sobel tangent normal vector field generation, 1-click normal map baking $(128, 128, 255)$ for Godot/Unity/Unreal, Laplace cavity AO, contact ground drop shadows, auto outer stroke, and 5 physical material presets.
- **3D Minecraft Skin Recognition & Dedicated Shading:** Automatic Java/Bedrock UV layout detection ($64\times64$ and $64\times32$), 12-region 3D normal mapping, Half-Lambert diffuse wrap, anatomical contact AO, sky hemisphere gradients, and OKLCH warm sunlight/cool indigo hue-shifting.
- **Smart Pixel Math Suite:** RotSprite precision rotation (exact lossless 90°/180°/270° orthogonal permutations + 3x3 supersampled majority voting for arbitrary angles), Zhang-Suen 1px line thinning, Smart Sub-Pixel Anti-Aliasing (De-Jaggy), Directional Selective Outlining (Sel-Out), Clean Stray Pixels, Atkinson 75% error-diffusion, and Riemersma Hilbert space-filling dithering.
- **Color & Palette Management:** OKLCH/HSV/HEX color picker, preset palettes (Endesga 32, Pico-8, Solarized, Cozy Hearth 16), custom color ramp generator, scan canvas to palette, snap layer to palette, harmonize OKLCH tones, and atmospheric photographic color grading (Sunset, Moonlight, Neon, Game Boy).
- **Procedural Lo-Fi Ambient Radio:** Built-in Web Audio API synthesizer with rain/vinyl pink noise, warm Rhodes chord progressions, sub-bass, and 4-band real-time spectrum visualizer on the desktop boombox.
- **Theme System:** Dual Cozy Midnight (Dark) and Morning Atelier (Light) themes with zero-lag style transition suppression and animated Sun/Moon toggle.
- **Export & Storage Pipeline:** Local-first IndexedDB autosave via Dexie.js (Schema v4 binary `layerBlobs`), project save/load (`.pixibun`), lossless PNG export (1x–32x), animated GIF export with per-frame centisecond delays, packed sprite sheet export + Godot 4, Unity, and Phaser 3 JSON metadata.
- **P2P Collaboration:** Collaborative canvas editing is supported in v1 via local peer-to-peer WebRTC and LWW-CRDT synchronization.

### Explicitly out of scope for v1:
- Centralized server-hosted WebSockets collaboration (reserved for v2; collaborative canvas editing is supported in v1 via local peer-to-peer WebRTC and LWW-CRDT synchronization).
- Native 3D mesh voxel conversions.
- Full multi-track digital audio workstation (DAW) or custom sound effect synthesizer (the built-in lo-fi ambient background radio is included for atmosphere; external audio creation tools are out of scope).

## Stack (with rationale)
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | Stable React Compiler, Turbopack default bundler, modern SSR/client boundaries, and zero client bundle bloat. |
| Canvas & Raster Engine | **Custom HTML5 2D Canvas + OffscreenCanvas Compositor** | Direct pixel buffer access (`ImageData`), zero-overhead nearest-neighbor integer scaling, custom Bresenham/DDA line interpolation. |
| State & History | **Zustand + Immer** | Zero-re-render canvas stroke pipeline, fast undo/redo history snapshotting, and predictable decoupled state for layers and timeline. |
| Image Synthesis | **Custom OKLab & Sobel Pipeline (`pixelizeEngine.ts`)** | Gamma-corrected downsampling, salience preservation, OKLab median-cut, Floyd-Steinberg/Atkinson dithering. |
| Procedural Audio | **Web Audio API Engine (`lofiRadio.ts`)** | Zero-network ambient vinyl rain noise, warm chord progressions, and real-time spectrum analysis with 0 external audio files. |
| Styling & Design Tokens | **Tailwind CSS v4** | CSS-first configuration (`@theme`), OKLCH color space native support, container queries, and custom tactile pixel utility classes. |
| Tactile Motion | **Motion (`motion/react`)** | Fluid micro-interactions, floating cozy tool dock transitions, dialogs, and drawer animations without layout thrashing. |
| Storage & Autosave | **Dexie.js (IndexedDB Schema v4)** | Local-first, continuous auto-save with dedicated binary `layerBlobs` table (zero base64 JSON stringify overhead), offline support, and schema-validated project file serialization. |
| Smart Graphics Intelligence | **Deterministic On-Device Math Engine (`smartMathEngine.ts`)** | 2.5D Felzenszwalb EDT lighting, Sobel normal maps, Minecraft 3D skin shading, and optical flow morphing with 0 cloud dependencies, 0 latency, and 100% offline privacy. |

## Repo & Environments
- **GitHub repo:** Private (Planned Open Source MIT release)
- **Environments:** 
  - `dev`: Local development (`localhost:3000`) and static PWA build with 100% offline capability
  - `production`: Vercel edge deployment with secure server-side environment variables

## Related Docs
- Design System & Tokens → [`DESIGN.md`](./DESIGN.md)
- AI Agent Constraints & Rules → [`SKILL.md`](./SKILL.md)
- Phased Implementation Plan → [`TASKS.md`](./TASKS.md)
- Build Logs → [`LOGS.md`](./LOGS.md)
