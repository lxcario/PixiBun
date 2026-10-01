/** Native-resolution character fixture with colored ink and facial details. */
export function purpleCharacterPixels(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(32 * 32 * 4);
  const put = (x: number, y: number, color: number[]) => data.set([...color, 255], (y * 32 + x) * 4);
  const ink = [58, 46, 76], purple = [164, 99, 190];
  const spans = [
    [7, 12], [6, 25], [5, 26], [4, 27], [4, 27], [4, 27], [5, 26], [6, 25],
    [7, 24], [7, 24], [6, 25], [6, 25], [7, 24], [8, 23], [10, 21], [11, 20],
    [10, 21], [8, 23], [7, 24], [7, 24], [8, 23], [8, 23], [8, 23], [7, 24],
    [6, 25], [5, 26], [4, 27], [4, 27], [5, 26], [8, 23],
  ];
  for (let y = 1; y <= 30; y++) {
    const [left, right] = spans[y - 1];
    for (let x = left; x <= right; x++) {
      const above = spans[y - 2], below = spans[y];
      const border = x === left || x === right || !above || !below ||
        x < above[0] || x > above[1] || x < below[0] || x > below[1];
      put(x, y, border ? ink : purple);
    }
  }
  for (let y = 8; y < 12; y++) for (const x of [12, 19]) put(x, y, ink);
  for (let x = 14; x <= 17; x++) put(x, 13, ink);
  for (let y = 20; y <= 25; y++) for (const x of [12, 19]) put(x, y, ink);
  return data;
}
