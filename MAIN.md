# PixiBun — Product scope

Current engineering verification and remaining release checks are recorded in the [current status](docs/current-status.md).

For artists: [illustrated handbook](docs/guides/README.md) and [complete feature index](docs/features.md).

PixiBun is a browser studio for small pixel-art drawings, sprites, tiles and animation loops. Its audience includes pixel artists, beginners and people making art for games. The visual direction is a readable drawing desk across twelve styles, each with Night and Day palettes. Scene styles add animated pixel backgrounds; Graphite and Plum keep flat backgrounds.

Scene themes also offer [Studio Labs](src/experimental/README.md): optional alternative controls for the tool bar, inspector tabs, sliders and tool rail, palette and quick effects. They are experimental presentation choices; Graphite and Plum keep classic controls. They do not add a second drawing engine or change export contracts.

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
| Rotate artwork | Direct quarter-turn mappings, contour-aware RotSprite v3 (silhouette, outline-ring, interior and detail layers) and integer-sampled Paeth rotation | [Algorithm scope](docs/contracts/rendering.md#pixel-art-rotation-rotsprite-v3); clipping and arbitrary-angle quality remain operation/fixture specific |
| Make tiles | Repeat previews, exact unique-tile PNG/map bundles, contour review and bounded small tile-scene studies | [Tile guide](docs/guides/pixitools-cleanup-and-tiles.md); exact size/alpha and stale-result checks apply; a complete 47-tile atlas and general world generation are not shipped |
| Keep and share work | Local saves, portable backups, recovery, image/animation exports, game-delivery formats, project-carrying PNG carts, phone player, Light Sweep and optional making-of receipts | [Artwork safety](docs/guides/artwork-safety.md), [exports](docs/contracts/exports.md), [carts](docs/contracts/carts.md); named consumer tests do not qualify every engine/version or sharing platform |
| Draw together | One host and one guest share pixels through WebRTC; the host owns structure | [Current status](docs/current-status.md); real two-machine and stress qualification remain pending |
| Learn and personalize | Twelve coached desktop lessons with save-before-entry, Return and explicit Keep; eight Pocket lessons and a free pad; task-based PixiTools, searchable actions, twelve Night/Day studio styles and a first-run welcome with level-based tips | [Learning contract](docs/contracts/learning.md), [design](DESIGN.md) |

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

### Nibbli developer companion

The repository includes Nibbli Tester, bounded Artist planning and Hands editing through the real PixiBun UI. Tester owns scripted expectations. Artist takes a goal, validates a plan, executes it, observes screenshots/pixels and requests a critique or correction. The existing conversation supplies decisions; local mocks exercise the pipeline without paid services. Provider-neutral adapters do not select a model automatically, and no independently running model service or Studio chat panel is shipped.

Hands currently admits qualified 32×32 Move, disjoint Copy/Paste, Flip H/V and exact quarter-turn operations with source, history and protected-content checks. Larger projects, general cross-layer edits and creative motion planning remain future work. Functional correctness and artistic quality have separate verdicts. See the [agent contract](docs/guides/nibbli-agent.md), [milestones](docs/plans/nibbli.md) and [source publication](docs/releases/2026-10-13-studio-and-nibbli.md).

### Running environments

- **Source:** [lxcario/PixiBun](https://github.com/lxcario/PixiBun), licensed under [MIT](LICENSE). Cloning requires access granted by the repository's GitHub settings; the license does not change those access controls. No future public-launch date is promised here.
- **Development:** Local Next.js server, normally at `localhost:3000`.
- **Production:** A Next.js-capable runtime with operator-controlled configuration. A Git push or local check is not a deployment receipt; identify the live revision in a [release record](docs/guides/deployment.md).
- **Offline:** Core editing after a successful online load/cache; browser storage and caches can be evicted.

## Related Docs

[Documentation map](docs/README.md) · [Current status](docs/current-status.md) · [Design](DESIGN.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [Future proposals](V2_VISION.md)
