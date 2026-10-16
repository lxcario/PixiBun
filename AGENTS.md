<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Project status and documentation contracts: [docs/current-status.md](docs/current-status.md) and [docs/README.md](docs/README.md). Keep dated evidence separate from operating instructions.

Current engineering status: [current status](docs/current-status.md); corpus reconciliation: [15 October review](docs/releases/2026-10-15-codebase-and-documentation.md); subsequent corrections and current screenshot qualification: [audit follow-up](docs/plans/2026-10-15-audit-follow-up.md). Retain source/build revision labels and original failure verdicts when maintaining documentation.

Keep raw evidence and completed audits local under [the archive policy](docs/archives.md); never add ignored archives to Git.

For Nibbli testing, agent-driven drawing or Artist planning, read the [Nibbli skill](.agents/skills/nibbli/SKILL.md) and its [agent contract](docs/guides/nibbli-agent.md). Keep functional expectations separate from artistic opinions and preserve failed attempts.

Current Studio Labs motion and documentation disposition: [15 October Labs update](docs/releases/2026-10-15-studio-labs-motion.md), refined by the [island and Liquid controls record](docs/releases/2026-10-15-labs-liquid-controls.md). Preserve earlier audit/source/build verdicts when updating this record.

Studio modals, popovers, menus, selects, disclosures and toasts share one motion system and look ([16 October surfaces record](docs/releases/2026-10-16-studio-surfaces.md)): build new ones on `src/components/ui/surfaces/` and `src/lib/motion/springs.ts` rather than adding ad-hoc transitions. Every control's press comes from `src/lib/motion/pressMotion.ts` ([follow-up record](docs/releases/2026-10-16-studio-follow-up.md)); do not add `active:` translate/scale presses, and mark controls that must not move with `data-no-press`.
