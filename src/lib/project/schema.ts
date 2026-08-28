// Structural validator for the `.pixibun` project format. Hand-rolled on
// purpose: importing unvetted JSON straight into the store let malformed
// files corrupt session state, so every field is checked before hydration.

import {
  PROJECT_FORMAT_ID,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
  type ProjectValidationResult,
  type SerializedFrame,
} from '@/types/project';

const BLEND_MODES = new Set(['source-over', 'multiply', 'screen', 'overlay', 'color-dodge']);
const LOOP_MODES = new Set(['repeat', 'ping-pong', 'once']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function validateFrame(input: unknown, frameIndex: number): SerializedFrame | string {
  if (!isPlainObject(input)) return `Frame ${frameIndex + 1} is not structured the way PixiBun expects.`;
  if (typeof input.id !== 'string' || input.id.length === 0) return `Frame ${frameIndex + 1} is missing its identifier.`;
  if (!isIntegerInRange(input.durationMs, 1, 60_000)) return `Frame ${frameIndex + 1} has an out-of-range duration.`;

  if (!Array.isArray(input.layers) || input.layers.length === 0) {
    return `Frame ${frameIndex + 1} carries no layers — the file may have been truncated.`;
  }

  const layers: SerializedFrame['layers'] = [];
  for (let i = 0; i < input.layers.length; i++) {
    const rawLayer = input.layers[i];
    if (!isPlainObject(rawLayer)) return `Frame ${frameIndex + 1}, layer ${i + 1} is malformed.`;
    if (typeof rawLayer.id !== 'string' || rawLayer.id.length === 0) {
      return `Frame ${frameIndex + 1}, layer ${i + 1} is missing its identifier.`;
    }
    if (typeof rawLayer.name !== 'string') return `Frame ${frameIndex + 1}, layer ${i + 1} has no name.`;
    if (typeof rawLayer.visible !== 'boolean' || typeof rawLayer.locked !== 'boolean') {
      return `Frame ${frameIndex + 1}, layer ${i + 1} has corrupted visibility or lock flags.`;
    }
    if (!isUnitInterval(rawLayer.opacity)) return `Frame ${frameIndex + 1}, layer ${i + 1} has an opacity outside 0-100%.`;
    if (typeof rawLayer.blendMode !== 'string' || !BLEND_MODES.has(rawLayer.blendMode)) {
      return `Frame ${frameIndex + 1}, layer ${i + 1} uses a blend mode PixiBun does not know.`;
    }
    if (rawLayer.pngBase64 !== undefined && typeof rawLayer.pngBase64 !== 'string') {
      return `Frame ${frameIndex + 1}, layer ${i + 1} carries unreadable pixel data.`;
    }
    layers.push({
      id: rawLayer.id,
      name: rawLayer.name,
      visible: rawLayer.visible,
      locked: rawLayer.locked,
      opacity: rawLayer.opacity,
      blendMode: rawLayer.blendMode as SerializedFrame['layers'][number]['blendMode'],
      pngBase64: rawLayer.pngBase64,
    });
  }

  return { id: input.id, durationMs: input.durationMs, layers };
}

export function validateProjectFile(input: unknown): ProjectValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, error: 'That file does not look like a PixiBun project.' };
  }
  if (input.format !== PROJECT_FORMAT_ID) {
    return { ok: false, error: 'This file was not saved by PixiBun, so it cannot be opened here.' };
  }
  if (!isIntegerInRange(input.version, 1, PROJECT_FORMAT_VERSION)) {
    return {
      ok: false,
      error: `This project uses format v${String(input.version)}, which this version of PixiBun cannot read.`,
    };
  }
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    return { ok: false, error: 'The project inside this file has no usable name.' };
  }
  if (!isIntegerInRange(input.width, 1, 2048) || !isIntegerInRange(input.height, 1, 2048)) {
    return { ok: false, error: 'The project canvas dimensions are out of range.' };
  }
  if (!isIntegerInRange(input.fps, 1, 60)) return { ok: false, error: 'The project playback speed is out of range.' };
  if (typeof input.loopMode !== 'string' || !LOOP_MODES.has(input.loopMode)) {
    return { ok: false, error: 'The project loop mode is not recognized.' };
  }

  if (!isPlainObject(input.onionSkin)) return { ok: false, error: 'The onion skin settings are missing or malformed.' };
  const skin = input.onionSkin;
  if (
    typeof skin.enabled !== 'boolean' ||
    !isIntegerInRange(skin.prevFrames, 0, 5) ||
    !isIntegerInRange(skin.nextFrames, 0, 5) ||
    !isUnitInterval(skin.opacity) ||
    typeof skin.prevColor !== 'string' ||
    typeof skin.nextColor !== 'string'
  ) {
    return { ok: false, error: 'The onion skin settings are corrupted.' };
  }

  if (!Array.isArray(input.palettes) || input.palettes.length === 0) {
    return { ok: false, error: 'The file carries no color palettes.' };
  }
  for (let i = 0; i < input.palettes.length; i++) {
    const pal = input.palettes[i];
    if (!isPlainObject(pal) || typeof pal.id !== 'string' || typeof pal.name !== 'string' || !Array.isArray(pal.colors)) {
      return { ok: false, error: `Palette ${i + 1} is malformed.` };
    }
    if (!pal.colors.every(isHexColor)) {
      return { ok: false, error: `Palette "${pal.name}" holds colors PixiBun cannot read.` };
    }
  }
  if (typeof input.currentPaletteId !== 'string') {
    return { ok: false, error: 'The file does not say which palette is active.' };
  }
  if (!Array.isArray(input.customRamps)) return { ok: false, error: 'The custom ramp list is malformed.' };

  if (!Array.isArray(input.clips)) return { ok: false, error: 'The animation clip list is malformed.' };
  for (let i = 0; i < input.clips.length; i++) {
    const clip = input.clips[i];
    if (
      !isPlainObject(clip) ||
      typeof clip.id !== 'string' ||
      typeof clip.name !== 'string' ||
      !isIntegerInRange(clip.startFrame, 0, Number.MAX_SAFE_INTEGER) ||
      !isIntegerInRange(clip.endFrame, 0, Number.MAX_SAFE_INTEGER)
    ) {
      return { ok: false, error: `Animation clip ${i + 1} is malformed.` };
    }
  }

  if (!Array.isArray(input.frames) || input.frames.length === 0) {
    return { ok: false, error: 'This project has no animation frames to open.' };
  }
  const frames: SerializedFrame[] = [];
  for (let i = 0; i < input.frames.length; i++) {
    const result = validateFrame(input.frames[i], i);
    if (typeof result === 'string') return { ok: false, error: result };
    frames.push(result);
  }

  if (
    !isIntegerInRange(input.createdAt, 0, Number.MAX_SAFE_INTEGER) ||
    !isIntegerInRange(input.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  ) {
    return { ok: false, error: 'The project timestamps are missing or corrupted.' };
  }

  return {
    ok: true,
    value: {
      format: PROJECT_FORMAT_ID,
      version: input.version,
      name: input.name,
      width: input.width,
      height: input.height,
      fps: input.fps,
      loopMode: input.loopMode as ProjectFile['loopMode'],
      onionSkin: {
        enabled: skin.enabled,
        prevFrames: skin.prevFrames,
        nextFrames: skin.nextFrames,
        prevColor: skin.prevColor,
        nextColor: skin.nextColor,
        opacity: skin.opacity,
      },
      palettes: input.palettes.map(pal => ({
        id: pal.id as string,
        name: pal.name as string,
        author: typeof pal.author === 'string' ? pal.author : undefined,
        colors: (pal.colors as string[]).slice(),
      })),
      currentPaletteId: input.currentPaletteId,
      customRamps: input.customRamps as ProjectFile['customRamps'],
      clips: input.clips.map(clip => ({
        id: clip.id as string,
        name: clip.name as string,
        startFrame: clip.startFrame as number,
        endFrame: clip.endFrame as number,
        color: typeof clip.color === 'string' ? clip.color : undefined,
      })),
      frames,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    },
  };
}

