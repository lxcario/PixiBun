// Game-ready Sprite Sheet Packer for Godot, Unity, and Phaser

export interface SpriteSheetConfig {
  animation?: import('./animationModel').ExportAnimationModel;
  textureFilename?: string;
  layout: 'horizontal' | 'vertical' | 'grid';
  scale: number;
  padding: number;
  columns?: number;
  maxDimension?: number;
  maxPixels?: number;
}

export interface SpriteSheetGeometry {
  sheetWidth: number;
  sheetHeight: number;
  cols: number;
  rows: number;
  totalPixels: number;
  scaledWidth: number;
  scaledHeight: number;
}

import {
  validateExportGeometry,
  type ExportGeometryValidation,
  type ExportGeometryLimits,
} from './exportGeometryValidation';
import { buildAnimationModel, godotSpriteFramesResource } from './animationModel';

export {
  validateExportGeometry,
  type ExportGeometryValidation,
  type ExportGeometryLimits,
};

/**
 * Computes exact sprite sheet geometry, column/row layout, and total pixel area
 * without allocating any canvas or image bitmaps.
 */
export function calculateSpriteSheetGeometry(
  frameCount: number,
  frameWidth: number,
  frameHeight: number,
  config: SpriteSheetConfig = { layout: 'horizontal', scale: 1, padding: 0 }
): SpriteSheetGeometry {
  const count = Math.max(0, frameCount);
  const scale = Number.isFinite(config.scale) && config.scale > 0 ? config.scale : 1;
  const pad = Number.isFinite(config.padding) && config.padding >= 0 ? config.padding : 0;
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;

  let cols = count;
  let rows = count > 0 ? 1 : 0;

  if (config.layout === 'vertical') {
    cols = count > 0 ? 1 : 0;
    rows = count;
  } else if (config.layout === 'grid') {
    cols = count > 0 ? (config.columns && config.columns > 0 ? config.columns : Math.ceil(Math.sqrt(count))) : 0;
    rows = cols > 0 ? Math.ceil(count / cols) : 0;
  }

  const sheetWidth = cols > 0 ? cols * scaledWidth + (cols + 1) * pad : 0;
  const sheetHeight = rows > 0 ? rows * scaledHeight + (rows + 1) * pad : 0;
  const totalPixels = sheetWidth * sheetHeight;

  return {
    sheetWidth,
    sheetHeight,
    cols,
    rows,
    totalPixels,
    scaledWidth,
    scaledHeight,
  };
}

export interface PackedSpriteSheet {
  canvas: HTMLCanvasElement;
  metadata: {
    godotTres: string;
    godotJson: string;
    unityJson: string;
    texturePackerJson: string;
    phaserJson: string;
    width: number;
    height: number;
    frameWidth: number;
    frameHeight: number;
    totalFrames: number;
  };
}

export function packSpriteSheet(
  frameCanvases: HTMLCanvasElement[],
  frameWidth: number,
  frameHeight: number,
  fps: number,
  projectName: string,
  config: SpriteSheetConfig = { layout: 'horizontal', scale: 1, padding: 0 }
): PackedSpriteSheet {
  const count = frameCanvases.length;
  if (count === 0) {
    throw new RangeError('Cannot pack sprite sheet: no frames provided.');
  }

  const geometry = calculateSpriteSheetGeometry(count, frameWidth, frameHeight, config);
  const validation = validateExportGeometry(geometry.sheetWidth, geometry.sheetHeight, {
    maxDimension: config.maxDimension,
    maxPixels: config.maxPixels,
  });

  if (!validation.valid) {
    throw new RangeError(`Sprite sheet export aborted: ${validation.error}`);
  }

  const { sheetWidth, sheetHeight, cols, scaledWidth, scaledHeight } = geometry;
  const pad = Number.isFinite(config.padding) && config.padding >= 0 ? config.padding : 0;

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetWidth;
  sheetCanvas.height = sheetHeight;
  const ctx = sheetCanvas.getContext('2d');
  if (!ctx) throw new Error('The sprite sheet canvas is unavailable.');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }

  const frameRects: { x: number; y: number; w: number; h: number; index: number }[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const destX = pad + col * (scaledWidth + pad);
    const destY = pad + row * (scaledHeight + pad);

    frameRects.push({
      index: i,
      x: destX,
      y: destY,
      w: scaledWidth,
      h: scaledHeight,
    });

    if (ctx && frameCanvases[i]) {
      ctx.drawImage(frameCanvases[i], destX, destY, scaledWidth, scaledHeight);
    }
  }

  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 64) || 'sprite';
  const textureFilename = config.textureFilename ?? `${sanitizedName}_spritesheet.png`;
  if (!/^[a-zA-Z0-9_.-]+\.png$/.test(textureFilename)) throw new Error('Invalid sprite sheet asset filename.');
  const animation = config.animation ?? buildAnimationModel(frameRects.map((_, i) => ({
    id: `frame_${i}`, durationMs: Math.max(1, Math.round(1000 / fps)), layers: [],
  })), [], 'repeat');
  if (animation.frames.length !== count) throw new Error('Animation timing does not match the sprite sheet.');

  // Generate authentic Godot 4 SpriteFrames .tres resource
  const godotTres = godotSpriteFramesResource(animation, frameRects, textureFilename);

  // Generate Godot SpriteFrames Metadata (JSON format)
  const godotMetadata = {
    resource_type: 'SpriteFrames',
    animations: animation.clips.map(clip => ({ name: clip.name, speed: 1000, loop: clip.loop,
      frames: clip.frames.map(i => ({ region: [frameRects[i].x, frameRects[i].y, frameRects[i].w, frameRects[i].h], duration: animation.frames[i].durationMs })),
    })),
  };

  // Standard TexturePacker Array format (natively supported by Unity, Phaser, PixiJS, Godot TP Importer)
  const texturePackerMetadata = {
    frames: frameRects.map((f, idx) => ({
      filename: `frame_${idx.toString().padStart(3, '0')}.png`,
      duration: animation.frames[idx].durationMs,
      frame: { x: f.x, y: f.y, w: f.w, h: f.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
      sourceSize: { w: f.w, h: f.h },
      pivot: { x: 0.5, y: 0.5 },
    })),
    meta: {
      app: 'PixiBun Studio',
      version: '1.0',
      image: textureFilename,
      format: 'RGBA8888',
      size: { w: sheetWidth, h: sheetHeight },
      scale: config.scale.toString(),
      animations: animation.clips,
    },
  };

  // Generate Unity Metadata
  const unityMetadata = {
    textureName: `${projectName}_spritesheet`,
    width: sheetWidth,
    height: sheetHeight,
    pixelsPerUnit: 16 * config.scale,
    sprites: frameRects.map((f, idx) => ({
      name: `${projectName}_${idx}`,
      rect: { x: f.x, y: sheetHeight - f.y - f.h, width: f.w, height: f.h },
      pivot: { x: 0.5, y: 0.5 },
      alignment: 0,
    })),
    animation,
  };

  // Generate Phaser 3 Atlas Metadata
  const phaserMetadata = {
    textures: [
      {
        image: textureFilename,
        size: { w: sheetWidth, h: sheetHeight },
        frames: frameRects.map((f, idx) => ({
          filename: `frame_${idx.toString().padStart(3, '0')}`,
          frame: { x: f.x, y: f.y, w: f.w, h: f.h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
          sourceSize: { w: f.w, h: f.h },
        })),
      },
    ],
    meta: {
      app: 'PixiBun Studio',
      version: '1.0',
      format: 'RGBA8888',
      scale: config.scale.toString(),
    },
  };

  return {
    canvas: sheetCanvas,
    metadata: {
      godotTres,
      godotJson: JSON.stringify(godotMetadata, null, 2),
      unityJson: JSON.stringify(unityMetadata, null, 2),
      texturePackerJson: JSON.stringify(texturePackerMetadata, null, 2),
      phaserJson: JSON.stringify(phaserMetadata, null, 2),
      width: sheetWidth,
      height: sheetHeight,
      frameWidth: scaledWidth,
      frameHeight: scaledHeight,
      totalFrames: count,
    },
  };
}
