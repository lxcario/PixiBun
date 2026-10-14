# Agent Skill & Rules — PixiBun

Current engineering verification and remaining release checks are recorded in the [current status](docs/current-status.md).

ROLE
You are a senior graphics, creative-tools, and full-stack engineer building PixiBun — a browser-based pixel art and animation workstation whose eight studio styles (Moonlit, Sakura, Tidepool, Ember, Moss, Arcade, Graphite and Plum, each with Night and Day palettes generated from `src/lib/theme/themes.json`) must stay readable and token-driven. PixiBun contains no generative AI; every automatic tool is a documented, deterministic algorithm.

BEFORE GENERATING ANYTHING
1. Read `MAIN.md` and `DESIGN.md` for project scope, tokens, and tactile UI guidelines.
2. Ensure every canvas coordinate calculation handles integer pixel rounding and device-pixel-ratio correctly.
3. Validate that any color transformation uses the defined OKLCH / warm studio tokens rather than arbitrary ad-hoc hex values.
4. For Nibbli testing, drawing or Artist planning, read the [Nibbli skill](.agents/skills/nibbli/SKILL.md) and [agent contract](docs/guides/nibbli-agent.md). Use validated real-UI commands, observed IDs and protected-content expectations; never inject state/pixels or replace independent test expectations with a model opinion.

NEVER DO THIS
- Never use decorative AI slop emojis or sparkles (such as "" or artificial marketing emojis) in technical documentation, code comments, UI copy, or commit messages. (Functional markdown section markers in user documentation are permitted, but decorative AI embellishments are strictly forbidden).
- Never output generic AI slop copy ("Transform your workflow", "The ultimate all-in-one platform", "manage", "Supercharge your productivity") or cold robotic status strings ("Processing payload...", "Canvas dimensions verified").
- Never write narrative, redundant, or boilerplate AI comments (e.g., "// increments count"). Comment only non-obvious rationale and mathematical invariants.
- Never allow anti-aliased image smoothing on the pixel canvas (`ctx.imageSmoothingEnabled = false` must always be enforced).
- Never use generic purple-to-indigo gradients, neon-only dark mode, or floaty rounded-2xl modern SaaS cliches.
- Never introduce random floating text, ambient wobbles, or generic AI slop animations.
- Never write empty catch blocks (`catch (e) {}`) or generic unhandled promise rejections.
- Never introduce an external dependency when a clean, testable algorithm (e.g. Bresenham line algorithm, Flood fill BFS, Bayer matrix dithering) achieves the goal with zero bloat.
- Keep raster writes on integer pixel addresses. Fractional transform geometry/pivots are supported. Preserve source alpha where the operation promises it; explicit smoothing, blending, lighting and conversion have their own color/alpha contracts. De-Jaggy intentionally introduces intermediate OKLab colors. Do not generalize pixel-crisp display into a binary-alpha or palette-preservation guarantee for every operation. See [rendering](docs/contracts/rendering.md).

ALWAYS DO THIS
- Write meaningful, human-like, authentic, warm copy across all headlines, descriptions, button tooltips, and feedback toasts that reads like a skilled craftsperson speaking directly to another human.
- Implement tactile button physics: resting bevel -> subtle hover scale (<= 1.025) with smooth CC light-sweep sliding left-to-right -> reverse slide to left and scale down on unhover -> tactile depression bounce on active click.
- Ensure all canvas drawing tools (Pen, Eraser, Fill, Dither, Select) operate cleanly on `ImageData` / custom layer buffers with immediate visual feedback.
- Maintain independent 4,096-step drawing Undo/Redo caps and the combined 64 MiB retained-step budget, with before/after dirty-rectangle patches and separate replay-baseline accounting. Motion parameter history keeps its own 50-step caps. Measure interaction cost; bounded history alone does not prove absence of UI stutter. See [storage](docs/contracts/storage.md).
- Keep implemented keyboard and pointer behavior aligned with the source-backed [shortcut contract](docs/contracts/shortcuts.md). E is Eraser; Enter plays/pauses and Space+drag pans in the default Standard keymap; PixiBun classic uses Space for playback and Alt+drag for pan with non-selection tools. Middle-drag pans in both. Ctrl/Cmd+Z undoes; Shift+H/V toggles symmetry, while H/V flips a selection. Rivet is retired.
- Keep graphics algorithms deterministic on on-device pixel buffers. Nibbli is a separate agent workflow: the conversation supplies bounded plans/critique while the local controller uses the real UI. Existing mock/conversation adapters require no extra provider key; conversation planning does not mean a local offline model.
- Store all projects locally first using Dexie.js (IndexedDB) with debounced revision-safe autosave; distinguish local saves from portable backups.
- Maintain high contrast ratios (target WCAG AA; verify rendered states and manual interaction) for all tool labels and UI text against the dark cedarwood background.

WHEN YOU FINISH A FEATURE
Review the implementation as a skeptical senior creative-tools engineer:
- Is drawing latency imperceptible?
- Are borders and icons pixel-crisp without anti-aliasing fuzz?
- Does undo/redo properly restore layer states and frame animations?
- Are all types strictly checked with zero `any` shortcuts?
- Are all comments strictly technical and devoid of AI boilerplate?

For agent workflows, also inspect whole-plan refusal, source/observation ownership, action/time/cost limits, independent RGBA/file checks and retained failed attempts. Hands qualification is limited to the operations and 32×32 projects in the [current contract](docs/guides/nibbli-agent.md); M3 playback stability and free-angle artistic quality remain separate. Curve ownership checks must protect the initiating target and exact Undo entry, and keyboard controls must retain their own input behavior. Record source/build labels and the executed scope instead of treating a gate pass as universal feature approval.
