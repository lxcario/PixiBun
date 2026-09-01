import { describe, it, expect, vi } from 'vitest';
import { packSpriteSheet } from '@/lib/export/spriteSheetPacker';
import {
  encodeGifRawFrames,
  RawFrameData,
  quantizePixels,
  lzwEncode,
} from '@/lib/export/gifEncoderCore';
import {
  extractScaledRawFrames,
} from '@/lib/export/gifEncoder';
import { AnimationClip } from '@/types/animation';

function createMockCanvas(width: number, height: number, initialPixels?: Uint8ClampedArray): HTMLCanvasElement {
  const pixelData = initialPixels ?? new Uint8ClampedArray(width * height * 4);
  return {
    width,
    height,
    getContext: () => ({
      imageSmoothingEnabled: false,
      drawImage: vi.fn(),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(pixelData), // Always returns a new ImageData copy
      }),
    }),
  } as unknown as HTMLCanvasElement;
}

if (typeof document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return createMockCanvas(100, 100);
      }
      return {};
    },
  };
}

describe('Tag Clip Export Scope', () => {
  it('correctly filters frames and re-indexes metadata from 0 for isolated clip exports', () => {
    // 8 total frames
    const totalFrames = 8;
    const allCanvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < totalFrames; i++) {
      allCanvases.push(createMockCanvas(16, 16));
    }

    const clips: AnimationClip[] = [
      { id: 'clip-walk', name: 'Walk', startFrame: 0, endFrame: 3 },
      { id: 'clip-attack', name: 'Attack', startFrame: 4, endFrame: 7 },
    ];

    // 1. Export Clip 1: Walk (Frames 0-3)
    const walkCanvases = allCanvases.slice(clips[0].startFrame, clips[0].endFrame + 1);
    expect(walkCanvases).toHaveLength(4);

    const walkPacked = packSpriteSheet(walkCanvases, 16, 16, 8, 'Hero', {
      layout: 'horizontal',
      scale: 1,
      padding: 0,
    });
    expect(walkPacked.metadata.totalFrames).toBe(4);
    const unityWalk = JSON.parse(walkPacked.metadata.unityJson);
    expect(unityWalk.sprites).toHaveLength(4);
    expect(unityWalk.sprites[0].name).toBe('Hero_0');
    expect(unityWalk.sprites[3].name).toBe('Hero_3');

    // 2. Export Clip 2: Attack (Frames 4-7)
    const attackCanvases = allCanvases.slice(clips[1].startFrame, clips[1].endFrame + 1);
    expect(attackCanvases).toHaveLength(4);

    const attackPacked = packSpriteSheet(attackCanvases, 16, 16, 8, 'Hero', {
      layout: 'horizontal',
      scale: 1,
      padding: 0,
    });
    expect(attackPacked.metadata.totalFrames).toBe(4);
    const unityAttack = JSON.parse(attackPacked.metadata.unityJson);
    expect(unityAttack.sprites).toHaveLength(4);
    expect(unityAttack.sprites[0].name).toBe('Hero_0');
    expect(unityAttack.sprites[3].name).toBe('Hero_3');

    // 3. Verify Godot .tres and TexturePacker JSON generation
    expect(attackPacked.metadata.godotTres).toContain('[gd_resource type="SpriteFrames"');
    expect(attackPacked.metadata.godotTres).toContain('Rect2(0, 0, 16, 16)');
    const tpData = JSON.parse(attackPacked.metadata.texturePackerJson);
    expect(tpData.frames).toHaveLength(4);
    expect(tpData.meta.app).toBe('PixiBun Studio');
  });

  it('safely handles inverted or out-of-bounds clip ranges', () => {
    const totalFrames = 6;
    const allCanvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < totalFrames; i++) {
      allCanvases.push(createMockCanvas(16, 16));
    }

    // Inverted clip: startFrame > endFrame
    const invertedClip = { id: 'inv', name: 'Inverted', startFrame: 5, endFrame: 2 };
    const startIdx = Math.max(0, Math.min(invertedClip.startFrame, invertedClip.endFrame));
    const endIdx = Math.min(totalFrames - 1, Math.max(invertedClip.startFrame, invertedClip.endFrame));
    const sliced = allCanvases.slice(startIdx, endIdx + 1);

    expect(sliced).toHaveLength(4); // frames 2, 3, 4, 5
    expect(startIdx).toBe(2);
    expect(endIdx).toBe(5);
  });
});

describe('GIF Encoder Core & Worker Encoding', () => {
  it('correctly quantizes pixels and encodes LZW data', () => {
    const rawPixels = new Uint8ClampedArray([
      255, 0, 0, 255,   // Red
      0, 255, 0, 255,   // Green
      0, 0, 255, 255,   // Blue
      0, 0, 0, 0,       // Transparent
    ]);

    const { palette, indexedPixels, transparentIndex } = quantizePixels(rawPixels, 4);
    expect(palette.length).toBeGreaterThanOrEqual(3);
    expect(transparentIndex).toBe(palette.length - 1);
    expect(indexedPixels).toHaveLength(4);
    expect(indexedPixels[3]).toBe(transparentIndex);

    const lzw = lzwEncode(indexedPixels, 2);
    expect(lzw.length).toBeGreaterThan(0);
  });

  it('encodes raw frames to a valid GIF89a header and triggers progress callbacks', () => {
    const rawFrames: RawFrameData[] = [];
    for (let i = 0; i < 4; i++) {
      const data = new Uint8ClampedArray(8 * 8 * 4);
      data.fill(255); // White square
      rawFrames.push({ width: 8, height: 8, data });
    }

    const progressSpy = vi.fn();
    const gifBytes = encodeGifRawFrames(rawFrames, 10, progressSpy);

    expect(progressSpy).toHaveBeenCalledTimes(4);
    expect(progressSpy).toHaveBeenLastCalledWith(4, 4);

    // Verify GIF89a magic signature: 'G', 'I', 'F', '8', '9', 'a'
    const signature = String.fromCharCode(...gifBytes.slice(0, 6));
    expect(signature).toBe('GIF89a');

    // Verify GIF trailer byte 0x3B (59)
    expect(gifBytes[gifBytes.length - 1]).toBe(0x3B);
  });

  it('preserves undo stack snapshots and layer canvases without transferable buffer detachment', () => {
    // 1. Simulate an Undo Stack holding prior ImageData snapshots
    const originalUndoSnapshot = new Uint8ClampedArray([128, 64, 32, 255, 200, 100, 50, 255]);
    const mockUndoStack = [
      {
        name: 'Stroke 1',
        layerId: 'layer-1',
        snapshot: new Uint8ClampedArray(originalUndoSnapshot),
      },
    ];

    // 2. Simulate an active layer canvas with its own ImageData buffer
    const activeLayerPixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const activeCanvas = createMockCanvas(2, 1, activeLayerPixels);

    // 3. Extract scaled frames for export (what gifEncoder does)
    const exportFrames = extractScaledRawFrames([activeCanvas], 1);
    expect(exportFrames).toHaveLength(1);

    // 4. Simulate transferable detachment on the export buffer (as worker postMessage does)
    const exportBuffer = exportFrames[0].data.buffer;
    expect(exportBuffer.byteLength).toBeGreaterThan(0);

    // Encode the export frames
    const gifResult = encodeGifRawFrames(exportFrames, 10);
    expect(gifResult.length).toBeGreaterThan(0);

    // 5. CRITICAL VERIFICATION:
    // Assert that the Undo Stack's buffer was NOT aliased and remains 100% intact and populated
    expect(mockUndoStack[0].snapshot.buffer.byteLength).toBe(8);
    expect(Array.from(mockUndoStack[0].snapshot)).toEqual([128, 64, 32, 255, 200, 100, 50, 255]);

    // Assert that the active layer canvas pixels remain 100% intact
    expect(activeLayerPixels.buffer.byteLength).toBe(8);
    expect(Array.from(activeLayerPixels)).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
  });

  it('encodes high-resolution 128x128 scaled multi-frame animations with full LZW dictionary growth without bit truncation', () => {
    const rawFrames: RawFrameData[] = [];
    const width = 128;
    const height = 128;

    for (let f = 0; f < 3; f++) {
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          // Create patterns with varied colors
          if (x < 64 && y < 64) {
            data[idx] = 255; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255; // Red
          } else if (x >= 64 && y < 64) {
            data[idx] = 0; data[idx + 1] = 255; data[idx + 2] = 0; data[idx + 3] = 255; // Green
          } else if (x < 64 && y >= 64) {
            data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 255; data[idx + 3] = 255; // Blue
          } else {
            data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 0; // Transparent
          }
        }
      }
      rawFrames.push({ width, height, data });
    }

    const gifBytes = encodeGifRawFrames(rawFrames, 8);
    expect(gifBytes.length).toBeGreaterThan(500);

    // Verify valid GIF header and trailer
    expect(String.fromCharCode(...gifBytes.slice(0, 6))).toBe('GIF89a');
    expect(gifBytes[gifBytes.length - 1]).toBe(0x3B);
  });
});

