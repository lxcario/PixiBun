# Contributing to PixiBun Atelier 

> **Session verification reference — 2026-10-01:** The supported local runtime is Node 22. Production browser checks use `npm run test:e2e:production`; `PIXIBUN_PRODUCTION_PORT` can select an unused local port, with proxies following that address. Document discovered test counts separately from executed evidence and preserve failed-run/rerun history. For this session, the user chose local verification, without TestSprite uploads or tunnels. See the [session completion record](docs/research/session-completion-2026-10-01.md).

Thank you for your interest in contributing to **PixiBun Atelier**! PixiBun is an in-browser pixel art and animation workstation built with a local-first approach and in-repository graphics algorithms. The app uses framework, UI, and storage dependencies listed in `package.json`.

---

## Core Engineering Principles

1. **Zero Third-Party Algorithmic Dependencies:**
   All core pixel art and computer graphics algorithms—including the 2D Euclidean Distance Transform (Felzenszwalb-Huttenlocher), photometric normal map generation, 47-blob Wang autotiling, APNG/GIF encoders, and ISOBMFF Fast-Start MP4 muxing—are authored from scratch in pure TypeScript using TypedArrays and Web Platform standards (framework dependencies like React, Next.js, Zustand, Immer, and Dexie handle UI and storage plumbing). We do not accept PRs introducing third-party algorithmic bloat or unnecessary math packages.

2. **Defensive Invariant Hardening:**
   All canvas operations, viewport transformations, and file deserialization routines must strictly respect mathematical invariants:
   - Clamp all zoom/pan operations against `NaN`, `Infinity`, or zero-division using `src/lib/safety/mathInvariants.ts`.
   - Use `src/lib/safety/safeCanvas.ts` for selection image extraction and apply equivalent bounds checks to other canvas readback paths.
   - Protect binary parsers against decompression bombs (CWE-409) using `src/lib/safety/imageHeaderProbe.ts`.
   - Protect JSON deserializers against prototype pollution (CWE-1321) using `src/lib/safety/safeJson.ts`.
   - Gracefully handle storage exhaustion using `src/lib/safety/storageResilience.ts`.

3. **Autonomous Quality Gate:**
   Every commit and pull request must pass the automated, multi-stage Quality Gate before merging.

---

## Interface and graphics regression evidence

For lighting changes, compare real canvas pixels in the full preview workflow, check ink/alpha and source preservation, and verify Apply/Cancel/Undo/Redo. The matte-character glint regression requires visible contrast, rather than merely different bytes. For toolbar changes, check the complete row and workspace bounds at compact and wide desktop widths, plus keyboard focus and affected real-artwork actions. Save screenshots with the precise run scope; a focused pass is not a full-browser sign-off. [Current examples](docs/research/specular-glint-2026-10-01.md).

## The Local Quality Gate

The local Quality Gate took 64.18 seconds (`npm run gate`) and 77.95 seconds (`npm run gate:full`) in the 2026-09-26 reference runs. Hardware, commands, cache state, and per-stage timings are recorded in `BENCHMARKS.md` §7; timing varies by machine and suite size.

### Running the Quality Gate

To run the standard pre-release validation:
```bash
npm run gate
```

To run the full suite including Next.js production compilation:
```bash
npm run gate:full
```

### Four standard stages and an optional build

| Stage | Command | Purpose |
| :--- | :--- | :--- |
| **Stage 1** | `npm run verify:docs` | Checks owned local links/headings, generated inventory, selected source contracts, phase/section rules and version parity. |
| **Stage 2** | `npm run typecheck` | Checks strict project TypeScript compilation; skipLibCheck, casts, JavaScript dependencies and runtime inputs remain separate boundaries. |
| **Stage 3** | `npm run lint` | Checks source, tests, scripts, configs, and accessibility rules. |
| **Stage 4** | `npm test` | Runs the current unit and invariant test suite via Vitest. |
| **Stage 5** | `npm run build` | *(In `gate:full`)* Validates Next.js production bundling, route trees, and code splitting. |

---

##  Automated Pre-Push Git Hook

PixiBun includes a convenience Git hook that checks the working tree before `git push` on your local machine and executes `npm run gate`. A failing configured check aborts that invocation. Hooks are bypassable and do not prove the pushed commits match the tested working tree. Installation resolves Git paths and preserves unrelated hooks; see [testing and evidence](docs/guides/testing.md).

### Hook Setup

The hook is automatically installed when running:
```bash
npm run prepare
```
Or directly via:
```bash
node scripts/installGitHooks.mjs
```

---

##  Testing Standards

- **Unit & Logic Tests:** Located in `tests/`. Every new algorithm, safety guard, or utility function must include comprehensive unit tests testing nominal, boundary, and pathological inputs.
- **E2E & Accessibility Tests:** Located in `tests/e2e/`. Critical workstation workflows and accessibility benchmarks (via `@axe-core/playwright`) are tested end-to-end.
- **Test Metrics Integrity:** Never hardcode or inflate test counters in documentation. `verifyDocIntegrity.mjs` checks owned local links/headings, generated live inventory, selected source contracts and phase/section/path/version rules. It does not verify every number, narrative claim, performance result, or test outcome.

---

##  Pull Request Checklist

Before submitting a Pull Request:
1. Run `npm run gate` and verify that all stages pass green ([x]).
2. Ensure no untyped `any` or `@ts-ignore` flags are introduced.
3. If new features or phases are added, document them cleanly in `ARCHITECTURE.md` and `CHANGELOG.md`.
4. Run `npm run verify:docs` to check the implemented documentation rules and review affected prose.
