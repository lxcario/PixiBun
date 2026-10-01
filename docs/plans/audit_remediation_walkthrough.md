# Audit Remediation Walkthrough: PIXIBUN_AUDIT_RESULTS.md

> **Historical Artifact Notice:** This walkthrough documents the historical Phase 1A remediation pass completed at version `v1.13.1` (637 unit tests / 90 suites, 20 E2E tests). It does not reflect later developments (Phases 1B.1–1B.7, v1.14.1, 1085 unit tests / 116 suites, 52 E2E tests) or the full scope of `PIXIBUN_AUDIT_RESULTS+DEEP.md`. It is preserved here unaltered as an immutable engineering milestone record.

All Critical, High, and Medium audit findings, user-reviewed amendments, and post-audit invariant reconciliations have been fully resolved, verified, and certified across the codebase and pushed to `main`.

---

## ️ Executive Verification Summary

| Verification Stage | Command | Result | Details |
|---|---|---|---|
| **Docs Integrity** | `node scripts/verifyDocIntegrity.mjs` | **PASSED (6/6)**  | 52 unique phases, 1–28 monotonic ARCHITECTURE, 199/199 filepaths verified, 772 lines CenterViewport, 637 unit / 90 suites + 20 E2E / 8 suites verified, package.json v1.13.1 synchronized. |
| **Static Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **PASSED**  | 0 TypeScript errors. |
| **Linter Invariants** | `npm run lint` (`eslint src tests`) | **PASSED**  | 0 errors, 0 warnings. |
| **Unit & Invariant Tests** | `npm test` (`vitest run`) | **PASSED**  | **90 test files passed, 637 tests passed (100% green)**. |
| **Production Build** | `npm run build` (Next.js Turbopack) | **PASSED**  | Compiled cleanly, all routes generated without issues. |
| **Pre-Push Quality Gate** | `git push origin main` | **PASSED**  | Pre-push hook executed local gate in ~18s and pushed cleanly to remote. |

---

## ️ Implemented Fixes by Subsystem

### 1. Canvas Envelope Unification Across Subsystems [Critical]
- **Single Source of Truth (`src/config/canvasLimits.ts`):** Canonical limits exported:
  - `WORKSPACE_ENVELOPE`: `MAX_CANVAS_DIMENSION = 2048`, `MAX_CANVAS_FRAMES = 500`, `MAX_CANVAS_LAYERS = 100`
  - `EXPORT_ENVELOPE`: `MAX_EXPORT_DIMENSION = 4096`, `MAX_EXPORT_PIXELS = 16_777_216` (16.7MP)
  - `PROBE_ENVELOPE`: `MAX_PROBE_DIMENSION = 8192`, `MAX_PROBE_PIXELS = 67_108_864` (67.1MP)
  - `HARDWARE_LIMITS`: `MAX_HARDWARE_DIMENSION = 16384`, `MAX_HARDWARE_PIXEL_AREA = 16384 * 16384`
- **Subsystem Integration:**
  - `src/lib/project/schema.ts`: Bound dimensions (2048), frame limits (500), and layer limits (100).
  - `src/lib/sync/p2pSync.ts`: Bound `validateStructurePayload` dimensions (2048), frames (500), layers (100) and `isValidPixelOp` (x, y < 2048).
  - `src/components/modals/export/PngExportTab.tsx`: Imported and re-exported `MAX_SAFE_CANVAS_DIMENSION` and `MAX_SAFE_CANVAS_PIXELS` from `@/config/canvasLimits`.
  - `src/components/modals/ExportModal.tsx`: Bound export scaling to `@/config/canvasLimits`.
  - `src/lib/safety/safeCanvas.ts`: Bound `DEFAULT_SAFE_DIM` and `MAX_SAFE_PIXEL_AREA` to `WORKSPACE_ENVELOPE`.
  - `src/lib/safety/imageHeaderProbe.ts`: Bound `MAX_ALLOWED_DIMENSION` and `MAX_ALLOWED_PIXELS` to `WORKSPACE_ENVELOPE`.

---

### 2. SafeJson UTF-8 Byte Counter & Prototype Retention [High]
- **File:** [safeJson.ts](../../src/lib/safety/safeJson.ts)
- **Zero-Heap Allocation UTF-8 Counter:** Replaced UTF-16 `.length` with zero-allocation `TextEncoder.encodeInto` byte counting, guarding the 50MB ceiling against multibyte evasion.
- **Prototype Retention:** In `sanitizeObject()`, return standard plain `{}` rather than `Object.create(null)` while stripping `__proto__`, `constructor`, and `prototype` keys. This preserves standard `Object.prototype` methods (`hasOwnProperty`, `toString`, etc.).

---

### 3. ImageHeaderProbe Window Paging & Distinct Error [High]
- **File:** [imageHeaderProbe.ts](../../src/lib/safety/imageHeaderProbe.ts)
- **Blob / File Paging:** Increased initial window to 256KB and added `ensureBytes` streaming slice paging for massive pre-SOF metadata.
- **Distinct Error:** When headers finish without finding SOF, throws distinct `SOF_BEYOND_PROBE_WINDOW`.

---

### 4. SafeCanvas `byteOffset` Support & Accurate Method References [High]
- **File:** [safeCanvas.ts](../../src/lib/safety/safeCanvas.ts)
- Updated `SafeCanvas.getImageData()` to pass source and destination `byteOffset` and `length` to `new Uint32Array(...)`.
- Replaced non-existent `extractClampedRect` doc references with `SafeCanvas.getImageData()`.

---

### 5. Canonical Version Single Source of Truth [High]
- **File:** [version.ts](../../src/config/version.ts)
- Exported canonical `APP_VERSION = '1.13.1'`, consumed by diagnostics capture and relay.
- Synchronized `package-lock.json` with `package.json` at `1.13.1`.

---

### 6. Photometric Studio Drag Caching & Dynamic Appendage Stabilization [Perf & Precision]
- **Files:** [edtNormalMap.ts](../../src/lib/ai/math/edtNormalMap.ts), [photometricLighting.ts](../../src/lib/ai/math/photometricLighting.ts), [usePhotometricEvents.ts](../../src/hooks/viewport/events/usePhotometricEvents.ts)
- Decoupled static pixel geometry (heavy separable EDT, connected components, composite heightmaps, bilateral filtering, Laplace AO) from light-direction-coupled appendage normal stabilization.
- `applyAppendageStabilization` dynamically updates normals on narrow appendages (ears, horns, whiskers) in <0.01ms per frame using `baseNormalField` and candidate pixel metadata.
- Preserves 60 FPS silky-smooth live light dragging while achieving **100.000% byte-for-byte identity** with fresh single-shot recomputation at any azimuth (0 pixel difference, 0 channel drift).
- `handlePhotometricGizmoCommitEvent` explicitly paints with the final committed azimuth and elevation before invoking `commitSnapshot()`.
- Verified in `tests/photometricNonDestructive.test.ts` with 15 automated tests (including live azimuth sweeps from 45° to 225° and back on an anatomical cat sprite).

---

### 7. Documentation Invariant Synchronization
- Reconciled dual-layer vs 6-layer viewport canvas stack in `MAIN.md`.
- Corrected onion skin hold scaling claim to distance falloff in `DESIGN.md`.
- Mopped up all remaining legacy references to nonexistent `extractClampedRect` across `TASKS.md` and `docs/plans/audit_remediation_plan.md` in favor of `SafeCanvas.getImageData()`.
- Synchronized test metrics (**637 unit tests across 90 suites**) across `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `BENCHMARKS.md`, `TASKS.md`, `LOGS.md`, `CHANGELOG.md`, `V2_VISION.md`, and `PIXIBUN_AUDIT_RESULTS.md`.
- Mirrored walkthrough into `docs/plans/audit_remediation_walkthrough.md` for permanent repository version control.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

This document retains its dated findings and verification scope. The latest studio follow-up keeps File, drawing controls, adjacent Mirror/Zoom/Fit/View, Studio and Export on one desktop header row. The live bulb offers Off/Soft/Crisp glints with a brighter pixel core and stepped edge, preserves outlines and alpha, and supports Cancel, Apply and exact Undo/Redo. See the [UI/UX record](../research/session-ui-ux-2026-10-01.md) and [glint research, screenshots and evidence](../research/specular-glint-2026-10-01.md).

The latest full gate passed documentation, types, lint, **1,482 unit/integration tests across 144 suites**, and the production build. Three focused Chromium glint scenarios passed; the current discovered editor inventory is **149 tests in 33 files**, plus 39 separate compiled-production scenarios. Earlier full-run results retain their dates and scope. The user requested Git publication of this checkpoint; it does not authorize deployment or replace the existing release sign-off. [Delivered work and open validation](../research/session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
