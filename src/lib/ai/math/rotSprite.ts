/**
 * RotSprite Distortion-Free Pixel Art Rotation Engine.
 *
 * Citations:
 * 1. Xenowoz (Xenowhirl), "RotSprite: An algorithm for scaling and rotating pixel art", 2007.
 * 2. Eric Johnston, "Scale2x / EPX (Eric's Pixel Expansion) algorithm", LucasArts, 1992.
 *
 * Uses 3-pass Scale2X (1x -> 2x -> 4x -> 8x) upscaling combined with continuous inverse rotation,
 * center-preserving subpixel sampling, and 1px feature presence conservation.
 */

export function rotateWithRotSprite(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDeg: number
): HTMLCanvasElement {
  const w = width;
  const h = height;
  const sData = srcCtx.getImageData(0, 0, w, h).data;

  // 1. Lossless integer fast-path for exact 90-degree orthogonal multiples
  const normAngle = ((Math.round(angleDeg) % 360) + 360) % 360;
  if (normAngle === 0) {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = w;
    outputCanvas.height = h;
    const outCtx = outputCanvas.getContext('2d')!;
    const outImgData = outCtx.createImageData(w, h);
    outImgData.data.set(sData);
    outCtx.putImageData(outImgData, 0, 0);
    return outputCanvas;
  }

  if (normAngle === 180) {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = w;
    outputCanvas.height = h;
    const outCtx = outputCanvas.getContext('2d')!;
    const outImgData = outCtx.createImageData(w, h);
    const outData = outImgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstX = w - 1 - x;
        const dstY = h - 1 - y;
        const dstIdx = (dstY * w + dstX) * 4;
        outData[dstIdx] = sData[srcIdx];
        outData[dstIdx + 1] = sData[srcIdx + 1];
        outData[dstIdx + 2] = sData[srcIdx + 2];
        outData[dstIdx + 3] = sData[srcIdx + 3];
      }
    }
    outCtx.putImageData(outImgData, 0, 0);
    return outputCanvas;
  }

  if (normAngle === 90) {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = h;
    outputCanvas.height = w;
    const outCtx = outputCanvas.getContext('2d')!;
    const outImgData = outCtx.createImageData(h, w);
    const outData = outImgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstX = h - 1 - y;
        const dstY = x;
        const dstIdx = (dstY * h + dstX) * 4;
        outData[dstIdx] = sData[srcIdx];
        outData[dstIdx + 1] = sData[srcIdx + 1];
        outData[dstIdx + 2] = sData[srcIdx + 2];
        outData[dstIdx + 3] = sData[srcIdx + 3];
      }
    }
    outCtx.putImageData(outImgData, 0, 0);
    return outputCanvas;
  }

  if (normAngle === 270) {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = h;
    outputCanvas.height = w;
    const outCtx = outputCanvas.getContext('2d')!;
    const outImgData = outCtx.createImageData(h, w);
    const outData = outImgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstX = y;
        const dstY = w - 1 - x;
        const dstIdx = (dstY * h + dstX) * 4;
        outData[dstIdx] = sData[srcIdx];
        outData[dstIdx + 1] = sData[srcIdx + 1];
        outData[dstIdx + 2] = sData[srcIdx + 2];
        outData[dstIdx + 3] = sData[srcIdx + 3];
      }
    }
    outCtx.putImageData(outImgData, 0, 0);
    return outputCanvas;
  }

  // 2. Exact Xenowhirl 8x Scale2X (EPX) Cascade with Color Similarity
  function colorDist(c1: number, c2: number): number {
    if (c1 === c2) return 0;
    const a1 = (c1 >>> 24) & 0xff;
    const a2 = (c2 >>> 24) & 0xff;
    if (a1 < 16 && a2 < 16) return 0;
    if (Math.abs(a1 - a2) > 64) return 10000;
    const r1 = c1 & 0xff, g1 = (c1 >>> 8) & 0xff, b1 = (c1 >>> 16) & 0xff;
    const r2 = c2 & 0xff, g2 = (c2 >>> 8) & 0xff, b2 = (c2 >>> 16) & 0xff;
    return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
  }

  function applyScale2x(
    src: Uint8ClampedArray,
    curW: number,
    curH: number,
    similarityThreshold = 28
  ): { data: Uint8ClampedArray; w: number; h: number } {
    const outW = curW * 2;
    const outH = curH * 2;
    const out = new Uint8ClampedArray(outW * outH * 4);
    const src32 = new Uint32Array(src.buffer, src.byteOffset, curW * curH);
    const out32 = new Uint32Array(out.buffer, out.byteOffset, outW * outH);

    const getPx = (x: number, y: number): number => {
      if (x < 0 || x >= curW || y < 0 || y >= curH) return 0;
      return src32[y * curW + x];
    };

    for (let y = 0; y < curH; y++) {
      for (let x = 0; x < curW; x++) {
        const P = src32[y * curW + x];
        const B = getPx(x, y - 1);
        const D = getPx(x - 1, y);
        const F = getPx(x + 1, y);
        const H = getPx(x, y + 1);

        let e0 = P, e1 = P, e2 = P, e3 = P;
        // Xenowhirl similarity check: smooth if opposite pairs differ while adjacent pairs match/are similar
        if (colorDist(B, H) > similarityThreshold && colorDist(D, F) > similarityThreshold) {
          if (colorDist(D, B) <= similarityThreshold) e0 = (colorDist(D, P) <= colorDist(B, P)) ? D : B;
          if (colorDist(B, F) <= similarityThreshold) e1 = (colorDist(B, P) <= colorDist(F, P)) ? B : F;
          if (colorDist(D, H) <= similarityThreshold) e2 = (colorDist(D, P) <= colorDist(H, P)) ? D : H;
          if (colorDist(H, F) <= similarityThreshold) e3 = (colorDist(H, P) <= colorDist(F, P)) ? H : F;
        }

        const outBase = (y * 2) * outW + (x * 2);
        out32[outBase] = e0;
        out32[outBase + 1] = e1;
        out32[outBase + outW] = e2;
        out32[outBase + outW + 1] = e3;
      }
    }
    return { data: out, w: outW, h: outH };
  }

  const p1 = applyScale2x(sData, w, h);
  const p2 = applyScale2x(p1.data, p1.w, p1.h);
  const p3 = applyScale2x(p2.data, p2.w, p2.h);
  const s8 = p3.data;
  const s8_32 = new Uint32Array(s8.buffer, s8.byteOffset, p3.w * p3.h);
  const w8 = p3.w;
  const h8 = p3.h;

  // 3. Exact Subpixel Center-Preserving Xenowhirl RotSprite with 8x8 Block Voting
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = w;
  outputCanvas.height = h;
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(w, h);
  const outData = outImgData.data;
  const out32 = new Uint32Array(outData.buffer, outData.byteOffset, w * h);

  const cx = w / 2;
  const cy = h / 2;
  const rad = (-angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // 8x8 subpixel sample coordinates across each 1x pixel cell
  const SUB_OFFSETS = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      const votes = new Map<number, number>();
      let nonTransparentWeight = 0;
      let totalWeight = 0;
      let centerCoreWeight = 0;

      for (let vi = 0; vi < 8; vi++) {
        const v = SUB_OFFSETS[vi];
        for (let ui = 0; ui < 8; ui++) {
          const u = SUB_OFFSETS[ui];

          // Continuous inverse rotation to 1x source coordinates
          const dx = px + u / 8 - cx;
          const dy = py + v / 8 - cy;
          const sx = cos * dx - sin * dy + cx;
          const sy = sin * dx + cos * dy + cy;

          // Map to 8x scale raster with epsilon to eliminate floating-point floor jitter
          const sx8 = Math.floor(sx * 8 + 1e-9);
          const sy8 = Math.floor(sy * 8 + 1e-9);

          // Radially symmetric center-weighted kernel:
          // Invariant under horizontal reflection, vertical reflection, diagonal reflection, and 90° rotation.
          // Subpixels near center (u^2 + v^2 = 0.5) receive slightly higher weight than corner subpixels (u^2 + v^2 = 24.5).
          const distSq = u * u + v * v;
          const weight = 1.0 + 0.01 * (25 - distSq);
          totalWeight += weight;

          let color = 0;
          if (sx8 >= 0 && sx8 < w8 && sy8 >= 0 && sy8 < h8) {
            color = s8_32[sy8 * w8 + sx8];
          }

          if (color !== 0) {
            votes.set(color, (votes.get(color) || 0) + weight);
            nonTransparentWeight += weight;
            if ((ui === 3 || ui === 4) && (vi === 3 || vi === 4)) {
              centerCoreWeight += weight;
            }
          }
        }
      }

      // Feature conservation threshold:
      // If the 2x2 center core touches solid color, allow fine 1px line/dot preservation (threshold 0.20).
      // Otherwise, require full perimeter threshold (0.38) to strictly prevent boundary dilation, pimples, or color bleeding.
      const dynamicThreshold = centerCoreWeight > 0 ? 0.20 : 0.38;
      if (nonTransparentWeight >= totalWeight * dynamicThreshold && votes.size > 0) {
        let bestColor = 0;
        let maxVote = -1;

        votes.forEach((vote, color) => {
          if (vote > maxVote) {
            maxVote = vote;
            bestColor = color;
          }
        });

        out32[y * w + x] = bestColor;
      } else {
        out32[y * w + x] = 0;
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}
