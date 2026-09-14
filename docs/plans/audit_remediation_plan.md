# Implementation Plan: Fix All Audit Findings from PIXIBUN_AUDIT_RESULTS.md (Amended)

Resolve all Critical, High, and Medium findings identified in [`PIXIBUN_AUDIT_RESULTS.md`](file:///d:/PixiBun/PIXIBUN_AUDIT_RESULTS.md), establishing strict invariant boundaries across the canvas envelope, hardening safety routines against edge cases, synchronizing runtime versions, and updating documentation metrics.

## Proposed Changes

### 1. Canvas Envelope Unification [Critical]
Currently, 5 subsystems maintain diverging canvas boundaries:
- `schema.ts`: 2048px / 500 frames / 100 layers
- `p2pSync.ts`: 4096px / 4096 frames / 256 layers / 4096px pixel ops
- `PngExportTab.tsx`: 4096px / 16.7MP (local constants)
- `ExportModal.tsx`: 4096px / 16.7MP (duplicate local constants)
- `imageHeaderProbe.ts`: 8192px / 67.1MP
- `safeCanvas.ts`: 8192px default / 268MP area

#### [NEW] [canvasLimits.ts](file:///d:/PixiBun/src/config/canvasLimits.ts)
- Define canonical `WORKSPACE_ENVELOPE` constants object:
  - `MAX_CANVAS_DIMENSION = 2048` (Maximum allowed creation/project canvas dimension)
  - `MAX_CANVAS_FRAMES = 500` (Maximum animation frames in a project or synced structure)
  - `MAX_CANVAS_LAYERS = 100` (Maximum layers per frame)
  - `MAX_EXPORT_DIMENSION = 4096` (Maximum scaled export resolution)
  - `MAX_EXPORT_PIXELS = 16_777_216` (16.7MP WebKit/Safari texture limit)
  - `MAX_PROBE_DIMENSION = 8192` (Maximum external reference image probe size)
  - `MAX_PROBE_PIXELS = 67_108_864` (67.1MP external probe limit)
  - `MAX_HARDWARE_PIXEL_AREA = 16384 * 16384` (Hardware WebGL texture area ceiling)
- Export convenience aliases:
  - `MAX_SAFE_CANVAS_DIMENSION = MAX_EXPORT_DIMENSION`
  - `MAX_SAFE_CANVAS_PIXELS = MAX_EXPORT_PIXELS`

#### [MODIFY] [schema.ts](file:///d:/PixiBun/src/lib/project/schema.ts)
- Import `WORKSPACE_ENVELOPE` and bind `normalized.width` / `height` checks (2048), frame limits (500), and layer limits (100) to the canonical envelope.

#### [MODIFY] [p2pSync.ts](file:///d:/PixiBun/src/lib/sync/p2pSync.ts)
- In `validateStructurePayload`:
  - Align width/height bounds with `WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION` (2048).
  - Align frames bound with `WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES` (500).
  - Align layers bound with `WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS` (100).
- In `isValidPixelOp`:
  - Align coordinate boundary checks `x < WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION` (2048) and `y < WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION` (2048).

#### [MODIFY] [PngExportTab.tsx](file:///d:/PixiBun/src/components/modals/export/PngExportTab.tsx)
- Re-export `MAX_SAFE_CANVAS_DIMENSION` and `MAX_SAFE_CANVAS_PIXELS` from `@/config/canvasLimits`.

#### [MODIFY] [ExportModal.tsx](file:///d:/PixiBun/src/components/modals/ExportModal.tsx)
- Replace local `MAX_SAFE_CANVAS_DIMENSION = 4096` and `MAX_SAFE_CANVAS_PIXELS = 16_777_216` declarations with imports from `@/config/canvasLimits`.

#### [MODIFY] [safeCanvas.ts](file:///d:/PixiBun/src/lib/safety/safeCanvas.ts)
- Bind `DEFAULT_SAFE_DIM` to `WORKSPACE_ENVELOPE.MAX_PROBE_DIMENSION` (8192).
- Bind `MAX_SAFE_PIXEL_AREA` to `WORKSPACE_ENVELOPE.MAX_HARDWARE_PIXEL_AREA` (16384 * 16384).

#### [MODIFY] [imageHeaderProbe.ts](file:///d:/PixiBun/src/lib/safety/imageHeaderProbe.ts)
- Bind `MAX_ALLOWED_DIMENSION` to `WORKSPACE_ENVELOPE.MAX_PROBE_DIMENSION` (8192).
- Bind `MAX_ALLOWED_PIXELS` to `WORKSPACE_ENVELOPE.MAX_PROBE_PIXELS` (67_108_864).

---

### 2. SafeJson Byte Length & Sanitization Hardening [High]

#### [MODIFY] [safeJson.ts](file:///d:/PixiBun/src/lib/safety/safeJson.ts)
- **UTF-8 Byte Length:** Replace `rawJson.length > this.MAX_PAYLOAD_BYTES` with a zero-heap-allocation UTF-8 byte counter (`getUtf8ByteLength(rawJson)`), preventing multibyte strings from bypassing the 50MB ceiling.
- **Plain Object Sanitization:** In `sanitizeObject()`, return standard plain objects (`{}`) rather than `Object.create(null)` so callers retain standard `Object.prototype` methods (`hasOwnProperty`, `toString`, etc.), while still stripping `__proto__`, `constructor`, and `prototype` keys.

---

### 3. ImageHeaderProbe Segment Paging & Distinct Error [High]

#### [MODIFY] [imageHeaderProbe.ts](file:///d:/PixiBun/src/lib/safety/imageHeaderProbe.ts)
- **Blob / File Paging:** Expand initial probe window to 256KB. Implement segment-by-segment window paging when skipping variable-length markers (e.g., large EXIF, XMP, or embedded preview segments) that exceed the current window.
- **ArrayBuffer & Uint8Array:** Search in-memory buffers in their entirety without arbitrary 65KB cutoff.
- **Distinct Error:** If SOS (`0xDA`), EOI (`0xD9`), or the traversal search limit is reached without finding SOF0/1/2, throw a distinct, actionable error:
  `[ImageHeaderProbe] SOF_BEYOND_PROBE_WINDOW: Start of frame not found within probe window`.

---

### 4. SafeCanvas `byteOffset` Support [High]

#### [MODIFY] [safeCanvas.ts](file:///d:/PixiBun/src/lib/safety/safeCanvas.ts)
- In `extractClampedRect`, pass `byteOffset` and element counts when creating typed array views:
  ```ts
  const srcU32 = new Uint32Array(
    sampleData.data.buffer,
    sampleData.data.byteOffset,
    interW * interH
  );
  const dstU32 = new Uint32Array(
    result.data.buffer,
    result.data.byteOffset,
    normW * normH
  );
  ```
  This prevents incorrect memory copying when `ImageData` data buffers have non-zero offsets.

---

### 5. Version Single Source of Truth to 1.13.1 [High]

#### [NEW] [version.ts](file:///d:/PixiBun/src/config/version.ts)
- Define and export canonical application version:
  ```ts
  export const APP_VERSION = '1.13.1';
  ```

#### [MODIFY] [capture.ts](file:///d:/PixiBun/src/lib/diagnostics/capture.ts)
- Import `APP_VERSION` from `@/config/version` instead of hardcoding `'1.13.0'`.

#### [MODIFY] [route.ts](file:///d:/PixiBun/src/app/api/diagnostics/relay/route.ts)
- Import `APP_VERSION` from `@/config/version` and use as fallback in `upstreamPayload.version`.

#### [MODIFY] [package-lock.json](file:///d:/PixiBun/package-lock.json)
- Synchronize root `"version": "1.13.1"` and `packages."".version: "1.13.1"` with `package.json`.

---

### 6. Documentation Metric Reconciliation [Medium/Low]

#### [MODIFY] [CONTRIBUTING.md](file:///d:/PixiBun/CONTRIBUTING.md)
- Line 27: Update measured gate timing from "~8-12 seconds" to `~16-19 seconds`.
- Line 47: Update test count claim to reflect verified test suites and tests.

#### [MODIFY] [ARCHITECTURE.md](file:///d:/PixiBun/ARCHITECTURE.md)
- Line 556: Clarify probe axis default (`8192px`) vs area constant (`16384 * 16384` px²).
- Line 558: Clarify `.pixibun` schema canvas ceiling (`2048px/axis`).
- Line 576: Update test count to reflect verified test suites and tests.

#### [MODIFY] [TASKS.md](file:///d:/PixiBun/TASKS.md)
- Line 20: Update test count claim to reflect verified test suites and tests.

#### [CLEANUP] Untracked root audit files
- Remove temporary `audit_*.txt` files from repository root.

---

## Verification Plan

### Automated Tests
1. **Cross-boundary envelope test** (`tests/crossBoundaryEnvelope.test.ts`):
   - Import max-envelope project (2048x2048, 500 frames, 100 layers) through schema validation.
   - Pass structure through P2P structure validation.
   - Verify export scale bounds clamp logic (1x valid, 2x exact ceiling, 3x exceeds ceiling).
   - Verify coordinate boundary checks in `isValidPixelOp` for 2047 (valid) vs 2048 (rejected).
2. **P2P rejection tests** (`tests/structurePayload.test.ts` & `tests/p2pValidation.test.ts`):
   - Reject 2049px width/height (`null`).
   - Reject 501 frames (`null`).
   - Reject 101 layers (`null`).
   - Reject pixel op coordinates `x >= 2048` or `y >= 2048` (`false`).
3. **Late-SOF & probe paging tests** (`tests/safetyHardening.test.ts`):
   - Verify `SOF_BEYOND_PROBE_WINDOW` error thrown when JPEG headers exhaust without SOF.
   - Verify multi-window `Blob` paging succeeds when SOF appears past the first chunk.
   - Verify `SafeJson` zero-allocation UTF-8 byte counter with multibyte strings.
   - Verify `SafeJson.sanitizeObject` preserves standard `Object.prototype` methods.
   - Verify `SafeCanvas` partial blit with simulated non-zero `byteOffset`.
4. **Version equality test** (`tests/diagnostics.test.ts`):
   - Assert `APP_VERSION === packageJson.version`.
   - Assert `APP_VERSION === packageLockJson.version`.
   - Assert telemetry captured entry uses canonical `APP_VERSION`.
5. **Quality Gates**:
   - `node scripts/verifyDocIntegrity.mjs` — passes all integrity assertions.
   - `npm run typecheck` — 0 TypeScript errors.
   - `npm run lint` — 0 ESLint errors and warnings.
   - `npm test` — all Vitest suites pass.
   - `npm run build` — Next.js build succeeds.
   - `npm run gate:full` — full test suite passes.
