/** Draw a cart's frames without the Studio: decode each layer and stack them like the compositor. Browser only. */
import { rawLayerPng } from '@/lib/project/rawLayerPng';
import type { ProjectFile } from '@/types/project';

export interface CartFrames {
  width: number;
  height: number;
  frames: HTMLCanvasElement[];
  durations: number[];
}

const NORMAL_TAGS = new Set(['normal', 'normal-map']);

function base64Blob(base64: string): Blob {
  const binary = atob(base64.replace(/^data:image\/png;base64,/, ''));
  return new Blob([Uint8Array.from(binary, ch => ch.charCodeAt(0))], { type: 'image/png' });
}

export async function renderCartFrames(project: ProjectFile): Promise<CartFrames> {
  const { width, height } = project;
  const decoded = new Map<string, ImageBitmap>();
  try {
    const frames: HTMLCanvasElement[] = [];
    for (const frame of project.frames) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      // layers[0] is the top layer, so draw from the bottom up.
      for (const layer of frame.layers.slice().reverse()) {
        if (!layer.visible || !layer.pngBase64 || (layer.tag && NORMAL_TAGS.has(layer.tag))) continue;
        let bitmap = decoded.get(layer.pngBase64);
        if (!bitmap) {
          bitmap = await createImageBitmap(await rawLayerPng(base64Blob(layer.pngBase64)), { colorSpaceConversion: 'none' });
          decoded.set(layer.pngBase64, bitmap);
        }
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(bitmap, 0, 0);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      frames.push(canvas);
    }
    return { width, height, frames, durations: project.frames.map(frame => Math.max(16, frame.durationMs || 100)) };
  } finally {
    for (const bitmap of decoded.values()) bitmap.close();
  }
}
