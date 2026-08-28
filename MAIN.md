# PixiBun

## Problem & Audience
- **Who this is for:** Indie game developers, pixel artists, animators, and digital creators looking for a desktop-grade, tactile 2D pixel art studio and animation suite in the browser.
- **What they're trying to do:** Create precision 2D pixel art, build multi-frame animated sprite sheets, manage color ramps and layers, and collaborate with a real-time multimodal AI co-creator that understands their canvas strokes.
- **What success looks like:** A responsive, sub-16ms latency pixel drawing and animation tool with zero-lag integer zoom/pan, layered compositing, onion skinning, game-ready sprite sheet export (PNG + Godot/Unity JSON), and a cozy Gemini AI companion that provides instant auto-shading, palette harmonization, and frame generation.

## Scope
### In scope for v1:
- **High-Performance Canvas Engine:** Dual-layer raster engine with integer zoom (100%–6400%), pan, pixel grid toggle, symmetry rulers (X/Y/radial), tile preview mode.
- **Precision Pixel Tools:** Pixel-perfect pen (Bresenham line smoothing, no jaggies), eraser, dithering brushes (Bayer 2x2, 4x4, 8x8), flood fill (with tolerance & contiguous controls), color swap, color picker, shape primitives (line, rectangle, ellipse), selection wand/lasso/box.
- **Multi-Layer Stack:** Layers with opacity, blend modes (Normal, Multiply, Screen, Overlay), visibility, locking, reordering, merge down.
- **Animation & Sprite Timeline:** Frame management, FPS scrubber (1–60 FPS), loop/ping-pong playback, customizable onion skinning (prev/next tint & opacity), tag clips (Idle, Walk, Attack).
- **Gemini AI Co-Creator Companion:** Live canvas vision snapshot, natural-language creative assistance, 1-click Auto-Shade layer generator, Palette Harmonizer, Frame in-between generator, and Jaggy/Double-pixel cleaner.
- **Color & Palette Management:** OKLCH/HSV/HEX color picker, preset palettes (Endesga 32, Pico-8, Solarized, Cozy Hearth 16), custom color ramp generator.
- **Export & Storage Pipeline:** Local-first IndexedDB autosave via Dexie.js, project save/load (`.pixibun`), lossless PNG export, animated GIF export, packed sprite sheet export + JSON metadata.

### Explicitly out of scope for v1:
- Collaborative multi-user real-time canvas editing over WebSockets (reserved for v2).
- Native 3D mesh voxel conversions.
- Audio / SFX editor.

## Stack (with rationale)
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | Stable React Compiler, Turbopack default bundler, modern SSR/client boundaries, and seamless API routes for Gemini AI proxying. |
| Canvas & Raster Engine | **Custom HTML5 2D Canvas + OffscreenCanvas Compositor** | Direct pixel buffer access (`ImageData`), zero-overhead nearest-neighbor integer scaling, custom Bresenham/DDA line interpolation. |
| State & History | **Zustand + Immer** | Zero-re-render canvas stroke pipeline, fast undo/redo history snapshotting, and predictable decoupled state for layers and timeline. |
| Styling & Design Tokens | **Tailwind CSS v4** | CSS-first configuration (`@theme`), OKLCH color space native support, container queries, and custom tactile pixel utility classes. |
| Tactile Motion | **Motion (`motion/react`)** | Fluid micro-interactions, floating cozy tool dock transitions, dialogs, and drawer animations without layout thrashing. |
| Storage & Autosave | **Dexie.js (IndexedDB)** | Local-first, zero-latency continuous auto-save, offline support, and seamless project file serialization. |
| AI Multimodal Perception | **Google Gemini 2.0 / 1.5 Flash Vision via Serverless Route** | Fast visual canvas comprehension, low latency, structured JSON output for layer generation and palette suggestion. |

## Repo & Environments
- **GitHub repo:** Private
- **Environments:** 
  - `dev`: Local development (`localhost:3000`) with mock or live Gemini API
  - `production`: Vercel edge deployment with secure server-side environment variables

## Related Docs
- Design System & Tokens → [`DESIGN.md`](./DESIGN.md)
- AI Agent Constraints & Rules → [`SKILL.md`](./SKILL.md)
- Phased Implementation Plan → [`TASKS.md`](./TASKS.md)
- Build Logs → [`LOGS.md`](./LOGS.md)
