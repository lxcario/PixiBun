# PixiBun — Product scope

Current engineering verification and remaining release checks are recorded in the [current status](docs/current-status.md).

For artists: [illustrated handbook](docs/guides/README.md) and [complete feature index](docs/features.md).

PixiBun is a browser studio for small pixel-art drawings, sprites, tiles and animation loops. Its audience includes pixel artists, beginners and people making art for games. The visual direction is a quiet desk: readable tools, restrained motion and warm Cozy Classic colors.

## Problem & Audience

Artists need to draw, revise colors, compare animation poses and keep editable work without an account or a mandatory cloud service. Success means a usable drawing workflow, understandable previews, reversible edits and exports that preserve the chosen format's supported pixels and timing. Integrated stroke latency, long-session behavior and artist usefulness still need measurement; no sub-16ms result is established.

## Scope

### In scope for v1

| Workflow | Current capability | Details and limits |
| --- | --- | --- |
| Draw and edit | Pixel pen, shapes, fill, selection, layers, history and canvas resizing | [Architecture](ARCHITECTURE.md), [shortcuts](docs/contracts/shortcuts.md) |
| Animate | Drawn frames, per-frame holds, onion skin, clips, playback, bounded in-between tools and one rigid-part motion workflow | [Motion rigs](docs/guides/artist-workspace.md#save-a-motion-rig), [exports](docs/contracts/exports.md), [current status](docs/current-status.md); motion supports solo color artwork, saved poses and reversible cel baking |
| Choose colors | Named palettes, canvas scans of at most six main colors, ramps and selected color-cycle ranges | [Palette authoring (local archive)](docs/archives.md#record-docs-research-palette-creator-2026-10-01-md), [cycling](docs/contracts/exports.md#scope-holds-and-cycling) |
| Try a new look | Image conversion, previewed cleanup, stylized lighting, normal sculpting and bounded research previews | [Rendering](docs/contracts/rendering.md); inferred shape/material is heuristic |
| Rotate artwork | Direct quarter-turn mappings, RotSprite v2 candidate/scoring/restoration heuristics and integer-sampled Paeth rotation | [Algorithm scope](docs/contracts/rendering.md#pixel-art-rotation-rotsprite-v2); clipping and arbitrary-angle quality remain operation/fixture specific |
| Make tiles | Repeat previews, exact unique-tile PNG/map bundles, contour review and bounded small tile-scene studies | [Tile guide](docs/guides/pixitools-cleanup-and-tiles.md); exact size/alpha and stale-result checks apply; a complete 47-tile atlas and general world generation are not shipped |
| Keep and share work | Local saves, portable backups, recovery, image/animation exports and game-delivery formats | [Artwork safety](docs/guides/artwork-safety.md), [exports](docs/contracts/exports.md); named consumer tests do not qualify every engine/version |
| Draw together | One host and one guest share pixels through WebRTC; the host owns structure | [Current status](docs/current-status.md); real two-machine and stress qualification remain pending |
| Learn and personalize | Separate desktop practice with save-before-entry, Return and explicit Keep; task-based PixiTools, searchable actions and Atelier/Cozy Classic light/dark themes | [Learning contract](docs/contracts/learning.md), [design](DESIGN.md) |

### Explicitly out of scope for v1

- A hosted account/cloud-sync service or centralized WebSocket collaboration.
- A native desktop package, shipped neural model or general automatic character rigging.
- Native 3D mesh/voxel conversion, music production or sound-design tools.

## Practical Limits

The [storage contract](docs/contracts/storage.md#admission-and-optional-metadata) owns the canvas, per-frame, total-layer and aggregate-raster limits. These limits apply together; their maxima cannot all be reached independently. [Rendering](docs/contracts/rendering.md#memory-ownership) explains estimated memory admission, and [exports](docs/contracts/exports.md#resource-boundaries-and-evidence) defines separate output limits.

## Stack (with rationale)

| Layer | Choice | Purpose |
| --- | --- | --- |
| Application shell | Next.js 16, React 19, TypeScript | Routes, hosting and typed UI |
| Raster work | Browser Canvas, typed arrays and project-authored graphics algorithms | Pixel editing, compositing and conversion |
| State and history | Zustand, Immer and detached raster buffers | Reactive metadata and bounded reversible edits |
| Persistence | Dexie / IndexedDB | Local projects, revision checks and recovery records |
| Interface | Tailwind CSS v4 and Motion | Shared visual tokens and interaction feedback |
| Background work | Web Workers with operation-specific fallbacks | Bounded heavy processing and owned result publication |

`src/lib/ai/` is a legacy directory name for predominantly deterministic graphics code. It does not establish a shipped learned model. Detailed algorithms belong in [the deep dive (local archive)](docs/archives.md#record-pixibun-deep-dive-md); ownership and integration belong in [architecture](ARCHITECTURE.md).

## Repo & Environments

- **Source:** [lxcario/PixiBun](https://github.com/lxcario/PixiBun), licensed under [MIT](LICENSE). Cloning requires access granted by the repository's GitHub settings; the license does not change those access controls. No future public-launch date is promised here.
- **Development:** Local Next.js server, normally at `localhost:3000`.
- **Production:** A Next.js-capable runtime with operator-controlled configuration. A Git push or local check is not a deployment receipt; identify the live revision in a [release record](docs/guides/deployment.md).
- **Offline:** Core editing after a successful online load/cache; browser storage and caches can be evicted.

## Related Docs

[Documentation map](docs/README.md) · [Current status](docs/current-status.md) · [Design](DESIGN.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [Future proposals](V2_VISION.md)
