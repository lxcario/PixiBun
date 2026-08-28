// Game-ready Sprite Sheet Packer for Godot, Unity, and Phaser

export interface SpriteSheetConfig {
  layout: 'horizontal' | 'vertical' | 'grid';
  scale: number;
  padding: number;
  columns?: number;
}

export interface PackedSpriteSheet {
  canvas: HTMLCanvasElement;
  metadata: {
    godotJson: string;
    unityJson: string;
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
  const scaledWidth = frameWidth * config.scale;
  const scaledHeight = frameHeight * config.scale;
  const pad = config.padding;

  let cols = count;
  let rows = 1;

  if (config.layout === 'vertical') {
    cols = 1;
    rows = count;
  } else if (config.layout === 'grid') {
    cols = config.columns || Math.ceil(Math.sqrt(count));
    rows = Math.ceil(count / cols);
  }

  const sheetWidth = cols * scaledWidth + (cols + 1) * pad;
  const sheetHeight = rows * scaledHeight + (rows + 1) * pad;

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetWidth;
  sheetCanvas.height = sheetHeight;
  const ctx = sheetCanvas.getContext('2d');
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

  // Generate Godot SpriteFrames Metadata
  const godotMetadata = {
    resource_type: 'SpriteFrames',
    animations: [
      {
        name: 'default',
        speed: fps,
        loop: true,
        frames: frameRects.map((f) => ({
          region: [f.x, f.y, f.w, f.h],
          duration: 1.0,
        })),
      },
    ],
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
  };

  // Generate Phaser 3 Atlas Metadata
  const phaserMetadata = {
    textures: [
      {
        image: `${projectName}.png`,
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
      godotJson: JSON.stringify(godotMetadata, null, 2),
      unityJson: JSON.stringify(unityMetadata, null, 2),
      phaserJson: JSON.stringify(phaserMetadata, null, 2),
      width: sheetWidth,
      height: sheetHeight,
      frameWidth: scaledWidth,
      frameHeight: scaledHeight,
      totalFrames: count,
    },
  };
}
