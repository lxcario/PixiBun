# Contributing to PixiBun Atelier 🎨🐇

Thank you for your interest in contributing to **PixiBun Atelier**! PixiBun is a high-performance, in-browser pixel art and animation workstation built with a strict **zero-dependency, local-first, mathematically rigorous** engineering philosophy.

---

## 🏛️ Core Engineering Principles

1. **Zero External Runtime Dependencies:**
   All core pixel art algorithms—including the 2D Euclidean Distance Transform (Felzenszwalb-Huttenlocher), photometric normal map generation, 47-blob Wang autotiling, APNG/GIF decoders, and ISOBMFF Fast-Start MP4 muxing—are authored from scratch in pure TypeScript using TypedArrays and Web Platform standards. We do not accept PRs introducing third-party algorithmic bloat or unnecessary npm dependencies.

2. **Defensive Invariant Hardening:**
   All canvas operations, viewport transformations, and file deserialization routines must strictly respect mathematical invariants:
   - Clamp all zoom/pan operations against `NaN`, `Infinity`, or zero-division using `src/lib/safety/mathInvariants.ts`.
   - Prevent canvas `IndexSizeError` and clipping crashes using `src/lib/safety/safeCanvas.ts`.
   - Protect binary parsers against decompression bombs (CWE-409) using `src/lib/safety/imageHeaderProbe.ts`.
   - Protect JSON deserializers against prototype pollution (CWE-1321) using `src/lib/safety/safeJson.ts`.
   - Gracefully handle storage exhaustion using `src/lib/safety/storageResilience.ts`.

3. **Autonomous Quality Gate:**
   Every commit and pull request must pass the automated, multi-stage Quality Gate before merging.

---

## 🛡️ The Local Quality Gate

We enforce an autonomous, zero-cost Quality Gate that runs in ~16-19 seconds on standard developer hardware.

### Running the Quality Gate

To run the standard pre-release validation:
```bash
npm run gate
```

To run the full suite including Next.js production compilation:
```bash
npm run gate:full
```

### The 4 Verification Stages

| Stage | Command | Purpose |
| :--- | :--- | :--- |
| **Stage 1** | `npm run verify:docs` | Verifies phase uniqueness in `TASKS.md`, section monotonicity in `ARCHITECTURE.md`, truthfulness of test counts in `README.md`, and version synchronization in `package.json`. |
| **Stage 2** | `npm run typecheck` | Enforces 100% strict TypeScript typing with zero compiler errors across the codebase. |
| **Stage 3** | `npm test` | Runs all 639 unit and invariant tests across 90 test suites via Vitest. |
| **Stage 4** | `npm run build` | *(In `gate:full`)* Validates Next.js production bundling, route trees, and code splitting. |

---

## 🪝 Automated Pre-Push Git Hook

PixiBun includes an automatic Git hook that intercepts `git push` on your local machine and executes `npm run gate`. If any type error, failing test, or doc inconsistency is detected, the push is blocked before it leaves your workstation.

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

## 🧪 Testing Standards

- **Unit & Logic Tests:** Located in `tests/`. Every new algorithm, safety guard, or utility function must include comprehensive unit tests testing nominal, boundary, and pathological inputs.
- **E2E & Accessibility Tests:** Located in `tests/e2e/`. Critical workstation workflows and accessibility benchmarks (via `@axe-core/playwright`) are tested end-to-end.
- **Test Metrics Integrity:** Never hardcode or inflate test counters in documentation. All numbers are verified against live Vitest runs via `verifyDocIntegrity.mjs`.

---

## 📝 Pull Request Checklist

Before submitting a Pull Request:
1. Run `npm run gate` and verify that all stages pass green (✓).
2. Ensure no untyped `any` or `@ts-ignore` flags are introduced.
3. If new features or phases are added, document them cleanly in `ARCHITECTURE.md` and `CHANGELOG.md`.
4. Run `npm run verify:docs` to ensure zero documentation drift.
