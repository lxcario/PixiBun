import { decodeGifLzw } from './decodeGifLzw';

/** Independent downloaded-GIF reader, including transparency and frame disposal. */
export function readAnimatedGif(bytes: Buffer) {
  if (!/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())) throw new Error('Invalid GIF signature');
  const width = bytes.readUInt16LE(6), height = bytes.readUInt16LE(8);
  if (!width || !height || width * height > 4_194_304) throw new Error('Unsupported test GIF dimensions');
  let offset = 13;
  const table = (size: number) => { const start = offset; offset += size * 3; if (offset > bytes.length) throw new Error('Truncated GIF palette'); return bytes.subarray(start, offset); };
  const global = bytes[10] & 128 ? table(2 << (bytes[10] & 7)) : Buffer.alloc(0);
  const blocks = () => { const data: Buffer[] = []; while (offset < bytes.length && bytes[offset]) { const count = bytes[offset++]; data.push(bytes.subarray(offset, offset + count)); offset += count; } if (offset >= bytes.length) throw new Error('Truncated GIF blocks'); offset++; return Buffer.concat(data); };
  let canvas = new Uint8ClampedArray(width * height * 4), delayMs = 0, transparent = -1, disposal = 0;
  const frames: { data: number[]; delayMs: number }[] = [];
  while (offset < bytes.length && bytes[offset] !== 0x3b) {
    const kind = bytes[offset++];
    if (kind === 0x21) {
      const label = bytes[offset++], data = blocks();
      if (label === 0xf9) { if (data.length !== 4) throw new Error('Invalid GIF control'); disposal = (data[0] >> 2) & 7; delayMs = data.readUInt16LE(1) * 10; transparent = data[0] & 1 ? data[3] : -1; }
      continue;
    }
    if (kind !== 0x2c) throw new Error('Invalid GIF image marker');
    const x = bytes.readUInt16LE(offset), y = bytes.readUInt16LE(offset + 2), w = bytes.readUInt16LE(offset + 4), h = bytes.readUInt16LE(offset + 6), packed = bytes[offset + 8]; offset += 9;
    if (!w || !h || x + w > width || y + h > height) throw new Error('GIF image exceeds canvas');
    const palette = packed & 128 ? table(2 << (packed & 7)) : global, minimumCodeSize = bytes[offset++];
    const blockStart = offset; blocks();
    const indices = decodeGifLzw([minimumCodeSize, ...bytes.subarray(blockStart, offset)], w * h).pixels;
    const previous = new Uint8ClampedArray(canvas);
    const rows: number[] = [];
    if (packed & 64) for (const [start, stride] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let row = start; row < h; row += stride) rows.push(row);
    else for (let row = 0; row < h; row++) rows.push(row);
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      const index = indices[row * w + col]; if (index === transparent) continue;
      if (index * 3 + 2 >= palette.length) throw new Error('GIF palette index missing');
      const dest = ((y + rows[row]) * width + x + col) * 4;
      canvas.set([palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2], 255], dest);
    }
    frames.push({ data: Array.from(canvas), delayMs });
    if (disposal === 2) for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
      const background = bytes[11] * 3;
      canvas.set(transparent >= 0 ? [0, 0, 0, 0] : [global[background] ?? 0, global[background + 1] ?? 0, global[background + 2] ?? 0, 255], (row * width + col) * 4);
    }
    else if (disposal === 3) canvas = previous;
    delayMs = 0; transparent = -1; disposal = 0;
  }
  if (bytes[offset] !== 0x3b || !frames.length) throw new Error('Incomplete GIF stream');
  return { width, height, frames };
}
