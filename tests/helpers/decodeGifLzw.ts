/** Independent test-only GIF89a LZW reader: rejects invalid codes and truncated
 * streams rather than accepting a plausible header with corrupted raster data. */
export function decodeGifLzw(encoded: number[] | Uint8Array, pixelCount: number) {
  const minimum = encoded[0], clear = 1 << minimum, end = clear + 1;
  const bytes: number[] = [];
  for (let offset = 1; encoded[offset];) {
    const count = encoded[offset++];
    bytes.push(...Array.from(encoded.slice(offset, offset + count))); offset += count;
  }
  let bit = 0, bits = minimum + 1, next = end + 1, clearCodes = 0, maxBits = bits;
  let table: number[][] = [], previous: number[] | null = null;
  const output = new Uint8Array(pixelCount); let written = 0;
  const reset = () => {
    table = Array.from({ length: clear }, (_, i) => [i]);
    next = end + 1; bits = minimum + 1; previous = null;
  };
  reset();
  while (bit + bits <= bytes.length * 8) {
    let code = 0;
    for (let i = 0; i < bits; i++, bit++) code |= ((bytes[bit >> 3] >> (bit & 7)) & 1) << i;
    if (code === clear) { clearCodes++; reset(); continue; }
    if (code === end) {
      if (written !== pixelCount) throw new Error(`Incomplete GIF raster: ${written}/${pixelCount}`);
      return { pixels: output, clearCodes, maxBits };
    }
    const word: number[] | undefined = table[code] ?? (code === next && previous ? [...previous, previous[0]] : undefined);
    if (!word) throw new Error(`Invalid GIF LZW code ${code}; next is ${next}, pixel ${written}`);
    if (written + word.length > pixelCount) throw new Error('GIF raster exceeds image dimensions');
    output.set(word, written); written += word.length;
    if (previous && next < 4096) {
      table[next++] = [...previous, word[0]];
      if (next === (1 << bits) && bits < 12) { bits++; maxBits = Math.max(maxBits, bits); }
    }
    previous = word;
  }
  throw new Error('GIF stream is missing its end code');
}
