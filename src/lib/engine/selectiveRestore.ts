/**
 * Co-draw undo/redo that only takes back your own pixels.
 *
 * `restoreTo` is the layer before the change, `expected` is the layer right
 * after it. A pixel is restored only where the change touched it (the two
 * differ) AND the live layer still shows the changed value. If a partner has
 * painted that pixel since, theirs stays. Untouched pixels keep their live value.
 */
export function selectiveRestore(
  live: Uint8ClampedArray,
  restoreTo: Uint8ClampedArray,
  expected: Uint8ClampedArray,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(live);
  const n = Math.min(live.length, restoreTo.length, expected.length);
  for (let i = 0; i < n; i += 4) {
    const touched = restoreTo[i] !== expected[i] || restoreTo[i + 1] !== expected[i + 1] || restoreTo[i + 2] !== expected[i + 2] || restoreTo[i + 3] !== expected[i + 3];
    if (!touched) continue;
    const stillOurs = live[i] === expected[i] && live[i + 1] === expected[i + 1] && live[i + 2] === expected[i + 2] && live[i + 3] === expected[i + 3];
    if (!stillOurs) continue;
    out[i] = restoreTo[i];
    out[i + 1] = restoreTo[i + 1];
    out[i + 2] = restoreTo[i + 2];
    out[i + 3] = restoreTo[i + 3];
  }
  return out;
}
