import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'public', 'icons');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 16x16 Pixel Grid of Bun Mascot
// 0: #140C1E (background), 1: #C792DF (lavender fur), 2: #3A2E4C (dark eye/mouth), 3: #F0BE7C (warm gold cheeks/accent)
const GRID_16 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 3, 1, 1, 1, 1, 1, 1, 3, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const PALETTE = {
  0: [20, 12, 30, 255],     // #140C1E
  1: [199, 146, 223, 255],  // #C792DF
  2: [58, 46, 76, 255],     // #3A2E4C
  3: [240, 190, 124, 255],  // #F0BE7C
};

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const toCrc = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(toCrc), 8 + len);
  return chunk;
}

function createPng(width, height, isMaskable = false) {
  // Create RGBA image buffer
  const rawScanlines = [];
  const paddingRatio = isMaskable ? 0.15 : 0.05;
  const padPixels = Math.floor(width * paddingRatio);
  const activeW = width - padPixels * 2;
  const activeH = height - padPixels * 2;

  for (let y = 0; y < height; y++) {
    const scanline = Buffer.alloc(1 + width * 4);
    scanline[0] = 0; // Filter: none

    for (let x = 0; x < width; x++) {
      let color = PALETTE[0]; // background

      if (
        x >= padPixels &&
        x < width - padPixels &&
        y >= padPixels &&
        y < height - padPixels
      ) {
        const gridX = Math.floor(((x - padPixels) / activeW) * 16);
        const gridY = Math.floor(((y - padPixels) / activeH) * 16);
        const pixelVal = GRID_16[Math.min(15, gridY)][Math.min(15, gridX)];
        color = PALETTE[pixelVal] || PALETTE[0];
      }

      const offset = 1 + x * 4;
      scanline[offset] = color[0];
      scanline[offset + 1] = color[1];
      scanline[offset + 2] = color[2];
      scanline[offset + 3] = color[3];
    }
    rawScanlines.push(scanline);
  }

  const uncompressed = Buffer.concat(rawScanlines);
  const compressed = zlib.deflateSync(uncompressed);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(outDir, 'maskable-512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('Successfully generated PWA icons in public/icons/');
