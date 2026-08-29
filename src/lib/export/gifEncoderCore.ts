// Pure DOM-free GIF89a encoder core for Web Worker and main thread fallback

export interface RawFrameData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function quantizePixels(pixels: Uint8ClampedArray, pixelCount: number): {
  palette: number[][];
  indexedPixels: Uint8Array;
  transparentIndex: number;
} {
  const colors = new Map<number, number>();
  let hasTransparent = false;

  for (let i = 0; i < pixelCount; i++) {
    const a = pixels[i * 4 + 3];
    if (a < 128) {
      hasTransparent = true;
      continue;
    }
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const rgb = (r << 16) | (g << 8) | b;
    colors.set(rgb, (colors.get(rgb) || 0) + 1);
  }

  const colorKeys = Array.from(colors.keys());
  let palette: number[][];

  if (colorKeys.length + (hasTransparent ? 1 : 0) <= 256) {
    palette = colorKeys.map((c) => [(c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF]);
  } else {
    // Median Cut algorithm
    interface Box {
      colors: number[];
    }
    const boxes: Box[] = [{ colors: colorKeys }];

    const maxColors = 256 - (hasTransparent ? 1 : 0);
    while (boxes.length < maxColors) {
      let splitBoxIdx = -1;
      let maxRange = -1;
      let splitAxis = 0; // 0=r, 1=g, 2=b

      for (let i = 0; i < boxes.length; i++) {
        const boxColors = boxes[i].colors;
        if (boxColors.length < 2) continue;

        let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
        for (const c of boxColors) {
          const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
          if (r < minR) minR = r; if (r > maxR) maxR = r;
          if (g < minG) minG = g; if (g > maxG) maxG = g;
          if (b < minB) minB = b; if (b > maxB) maxB = b;
        }

        const rRange = maxR - minR;
        const gRange = maxG - minG;
        const bRange = maxB - minB;
        const m = Math.max(rRange, gRange, bRange);
        if (m > maxRange) {
          maxRange = m;
          splitBoxIdx = i;
          splitAxis = rRange === m ? 0 : (gRange === m ? 1 : 2);
        }
      }

      if (splitBoxIdx === -1) break;

      const target = boxes[splitBoxIdx];
      boxes.splice(splitBoxIdx, 1);

      target.colors.sort((c1, c2) => {
        const v1 = (c1 >> (16 - splitAxis * 8)) & 0xFF;
        const v2 = (c2 >> (16 - splitAxis * 8)) & 0xFF;
        return v1 - v2;
      });

      const mid = Math.floor(target.colors.length / 2);
      boxes.push({ colors: target.colors.slice(0, mid) });
      boxes.push({ colors: target.colors.slice(mid) });
    }

    palette = boxes.map((b) => {
      let rSum = 0, gSum = 0, bSum = 0;
      for (const c of b.colors) {
        rSum += (c >> 16) & 0xFF;
        gSum += (c >> 8) & 0xFF;
        bSum += c & 0xFF;
      }
      return [
        Math.round(rSum / b.colors.length),
        Math.round(gSum / b.colors.length),
        Math.round(bSum / b.colors.length),
      ];
    });
  }

  let transparentIndex = -1;
  if (hasTransparent) {
    palette.push([0, 0, 0]);
    transparentIndex = palette.length - 1;
  }

  const indexedPixels = new Uint8Array(pixelCount);
  const colorMap = new Map<number, number>();

  for (let i = 0; i < pixelCount; i++) {
    const a = pixels[i * 4 + 3];
    if (a < 128) {
      indexedPixels[i] = transparentIndex;
      continue;
    }
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const rgb = (r << 16) | (g << 8) | b;

    if (colorMap.has(rgb)) {
      indexedPixels[i] = colorMap.get(rgb)!;
    } else {
      let closestIdx = 0;
      let minDist = Infinity;
      const limit = hasTransparent ? palette.length - 1 : palette.length;
      for (let j = 0; j < limit; j++) {
        const dr = palette[j][0] - r;
        const dg = palette[j][1] - g;
        const db = palette[j][2] - b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          closestIdx = j;
        }
      }
      colorMap.set(rgb, closestIdx);
      indexedPixels[i] = closestIdx;
    }
  }

  return { palette, indexedPixels, transparentIndex };
}

export function lzwEncode(pixels: Uint8Array, colorDepth: number): number[] {
  const minCodeSize = Math.max(2, colorDepth);
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let dictSize = clearCode + 2;

  const dict = new Map<number, number>();

  const out: number[] = [];
  out.push(minCodeSize);

  let bitBuffer = 0;
  let bitCount = 0;
  const block: number[] = [];

  const flushBlock = () => {
    if (block.length > 0) {
      out.push(block.length);
      for (let i = 0; i < block.length; i++) out.push(block[i]);
      block.length = 0;
    }
  };

  const writeBits = (code: number, size: number) => {
    bitBuffer |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      block.push(bitBuffer & 0xFF);
      bitBuffer >>= 8;
      bitCount -= 8;
      if (block.length === 255) flushBlock();
    }
  };

  writeBits(clearCode, codeSize);

  if (pixels.length > 0) {
    let prefix = pixels[0];

    for (let i = 1; i < pixels.length; i++) {
      const c = pixels[i];
      const key = (prefix << 8) | c;
      if (dict.has(key)) {
        prefix = dict.get(key)!;
      } else {
        writeBits(prefix, codeSize);

        if (dictSize < 4096) {
          dict.set(key, dictSize++);
          if (dictSize === (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeBits(clearCode, codeSize);
          dict.clear();
          dictSize = clearCode + 2;
          codeSize = minCodeSize + 1;
          dict.set(key, dictSize++);
        }
        prefix = c;
      }
    }
    writeBits(prefix, codeSize);
  }

  writeBits(eoiCode, codeSize);

  while (bitCount > 0) {
    block.push(bitBuffer & 0xFF);
    bitBuffer >>= 8;
    bitCount -= 8;
    if (block.length === 255) flushBlock();
  }
  flushBlock();
  out.push(0);

  return out;
}

export function encodeGifRawFrames(
  frames: RawFrameData[],
  fps: number,
  onProgress?: (current: number, total: number) => void
): Uint8Array {
  if (frames.length === 0) {
    throw new Error('encodeGifRawFrames requires at least 1 frame.');
  }

  const width = frames[0].width;
  const height = frames[0].height;
  const delay = Math.round(100 / Math.max(1, fps));
  const buffer: number[] = [];

  const writeByte = (b: number) => buffer.push(b & 0xFF);
  const writeShort = (s: number) => {
    buffer.push(s & 0xFF);
    buffer.push((s >> 8) & 0xFF);
  };
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) buffer.push(str.charCodeAt(i));
  };
  const writeBytes = (arr: number[]) => {
    for (let i = 0; i < arr.length; i++) buffer.push(arr[i]);
  };

  // Header
  writeString('GIF89a');

  // Logical Screen Descriptor
  writeShort(width);
  writeShort(height);
  // Global Color Table Flag = 1, Color Resolution = 8 bits, Size of GCT = 256
  writeByte(0xF7);
  writeByte(0); // Background Color Index
  writeByte(0); // Pixel Aspect Ratio

  // Global Color Table (256 entries of 0)
  for (let i = 0; i < 256 * 3; i++) writeByte(0);

  // Netscape Application Extension for looping
  writeByte(0x21); // Extension Introducer
  writeByte(0xFF); // Application Extension Label
  writeByte(11);   // Block Size
  writeString('NETSCAPE2.0');
  writeByte(3);    // Sub-block Size
  writeByte(1);    // Sub-block ID
  writeShort(0);   // Loop count (0 = infinite)
  writeByte(0);    // Block Terminator

  // Encode each frame
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const { palette, indexedPixels, transparentIndex } = quantizePixels(frame.data, width * height);

    // Graphics Control Extension
    writeByte(0x21); // Extension Introducer
    writeByte(0xF9); // Graphic Control Label
    writeByte(4);    // Block Size
    const transparentFlag = transparentIndex !== -1 ? 1 : 0;
    writeByte((2 << 2) | transparentFlag); // Disposal Method = 2 (Restore to background)
    writeShort(delay);
    writeByte(transparentIndex !== -1 ? transparentIndex : 0);
    writeByte(0); // Block Terminator

    // Image Descriptor
    writeByte(0x2C); // Image Separator
    writeShort(0);   // Left
    writeShort(0);   // Top
    writeShort(width);
    writeShort(height);
    writeByte(0x87); // Local Color Table Flag = 1, Size = 256

    // Local Color Table
    for (let j = 0; j < 256; j++) {
      if (j < palette.length) {
        writeByte(palette[j][0]);
        writeByte(palette[j][1]);
        writeByte(palette[j][2]);
      } else {
        writeByte(0);
        writeByte(0);
        writeByte(0);
      }
    }

    // LZW Compression
    const colorDepth = Math.max(2, Math.ceil(Math.log2(palette.length || 2)));
    const lzwData = lzwEncode(indexedPixels, colorDepth);
    writeBytes(lzwData);

    onProgress?.(i + 1, frames.length);
  }

  // Trailer
  writeByte(0x3B);

  return new Uint8Array(buffer);
}
