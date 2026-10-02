import { inflateSync } from 'node:zlib';

/** Test-only native PNG sample decoder. Never converts ICC/display colors. */
export function readNativePng(bytes: Buffer) {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Invalid PNG signature');
  let width = 0, height = 0, channels = 0; const compressed: Buffer[] = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString(), start = offset + 8;
    if (start + length + 4 > bytes.length) throw new Error('Truncated PNG');
    if (type === 'IHDR') {
      width = bytes.readUInt32BE(start); height = bytes.readUInt32BE(start + 4);
      channels = bytes[start + 9] === 6 ? 4 : bytes[start + 9] === 2 ? 3 : 0;
      if (length !== 13 || bytes[start + 8] !== 8 || !channels || bytes[start + 10] || bytes[start + 11] || bytes[start + 12] || !width || !height || width * height > 4_000_000) throw new Error('Unsupported test PNG geometry/encoding');
    }
    if (type === 'IDAT') compressed.push(bytes.subarray(start, start + length));
    offset += length + 12;
    if (type === 'IEND') break;
  }
  if (!channels || !compressed.length) throw new Error('Incomplete PNG');
  const stride = width * channels, raw = inflateSync(Buffer.concat(compressed), { maxOutputLength: (stride + 1) * height });
  if (raw.length !== (stride + 1) * height) throw new Error('Incorrect PNG scanline length');
  const decoded = Buffer.alloc(stride * height), rgba = new Uint8Array(width * height * 4);
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; if (filter > 4) throw new Error('Invalid PNG filter');
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x, left = x >= channels ? decoded[at - channels] : 0, up = y ? decoded[at - stride] : 0, corner = y && x >= channels ? decoded[at - stride - channels] : 0;
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, corner);
      decoded[at] = raw[y * (stride + 1) + 1 + x] + prediction;
    }
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * channels, target = (y * width + x) * 4;
      rgba.set(decoded.subarray(at, at + 3), target); rgba[target + 3] = channels === 4 ? decoded[at + 3] : 255;
    }
  }
  return { width, height, data: Array.from(rgba) };
}
