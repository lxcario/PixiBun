// Pure stroke diff for CRDT op extraction.
//
// Given the pre-stroke ImageData captured by the history engine and the
// post-stroke layer buffer, emits one delta per changed pixel. These deltas
// feed CrdtPixelBuffer.setPixel so local artwork modifications become
// LWW-CRDT operations (Shapiro et al., "Conflict-Free Replicated Data Types,"
// SSS 2011 — delta propagation from state-based replicas).
//
// Kept DOM-free and structurally typed so it is unit-testable without a
// canvas implementation.

export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface PixelDelta {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export function diffImageDataToOps(before: ImageDataLike, after: ImageDataLike): PixelDelta[] {
  if (before.width !== after.width || before.height !== after.height) {
    // Dimensions changed (resize): a pixel diff is meaningless; callers must
    // re-sync via full snapshot instead.
    return [];
  }
  if (before.data.length !== after.data.length) return [];

  const deltas: PixelDelta[] = [];
  const a = before.data;
  const b = after.data;
  for (let y = 0; y < before.height; y++) {
    const rowOffset = y * before.width;
    for (let x = 0; x < before.width; x++) {
      const i = (rowOffset + x) * 4;
      if (
        a[i] !== b[i] ||
        a[i + 1] !== b[i + 1] ||
        a[i + 2] !== b[i + 2] ||
        a[i + 3] !== b[i + 3]
      ) {
        deltas.push({ x, y, r: b[i], g: b[i + 1], b: b[i + 2], a: b[i + 3] });
      }
    }
  }
  return deltas;
}