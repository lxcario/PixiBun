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

/**
 * Upgrades legacy project payloads (such as v1 files) to the current format specification
 * by backfilling safe default values for newly introduced fields (clips, customRamps,
 * onionSkin settings, layer blendMode, opacity, lock flags).
 */
export function migrateProjectPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const migrated: Record<string, unknown> = { ...raw };

  // 1. Backfill customRamps
  if (!Array.isArray(migrated.customRamps)) {
    migrated.customRamps = [];
  }

  // 2. Backfill clips
  if (!Array.isArray(migrated.clips)) {
    migrated.clips = [];
  }

  // 3. Backfill loopMode
  if (typeof migrated.loopMode !== 'string' || !LOOP_MODES.has(migrated.loopMode)) {
    migrated.loopMode = 'repeat';
  }

  // 4. Backfill onionSkin
  if (!isPlainObject(migrated.onionSkin)) {
    migrated.onionSkin = {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      opacity: 0.35,
      prevColor: '#7fae6b',
      nextColor: '#c792df',
    };
  }

  // 5. Backfill frame & layer properties
  if (Array.isArray(migrated.frames)) {
    migrated.frames = (migrated.frames as unknown[]).map((f) => {
      if (!isPlainObject(f)) return f;
      const frameObj = { ...f };
      if (frameObj.durationMs === undefined) {
        frameObj.durationMs = 100;
      }
      if (Array.isArray(frameObj.layers)) {
        frameObj.layers = (frameObj.layers as unknown[]).map((l) => {
          if (!isPlainObject(l)) return l;
          const layerObj = { ...l };
          if (layerObj.visible === undefined) layerObj.visible = true;
          if (layerObj.locked === undefined) layerObj.locked = false;
          if (layerObj.opacity === undefined) layerObj.opacity = 1.0;
          if (layerObj.blendMode === undefined) layerObj.blendMode = 'source-over';
          return layerObj;
        });
      }
      return frameObj;
    });
  }

  // Upgrade version tag
  migrated.version = PROJECT_FORMAT_VERSION;
  return migrated;
}

export function validateProjectFile(input: unknown): ProjectValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, error: 'That file does not look like a PixiBun project.' };
  }
  if (input.format !== PROJECT_FORMAT_ID) {
    return { ok: false, error: 'This file was not saved by PixiBun, so it cannot be opened here.' };
  }

  // 1. Forward-compatibility guard: reject files saved with a newer PixiBun format
  if (typeof input.version === 'number' && input.version > PROJECT_FORMAT_VERSION) {
    return {
      ok: false,
      error: `This project was saved in format v${input.version}, but this version of PixiBun only supports up to v${PROJECT_FORMAT_VERSION}. Please update PixiBun to open this file.`,
    };
  }

  // 2. Backward-compatibility: migrate legacy/unversioned payloads before validation
  const normalized = migrateProjectPayload(input);
  if (!isIntegerInRange(normalized.version, 1, PROJECT_FORMAT_VERSION)) {
    return {
      ok: false,
      error: `This project uses an invalid format version (${String(input.version)}).`,
    };
  }
  if (typeof normalized.name !== 'string' || normalized.name.trim().length === 0) {
    return { ok: false, error: 'The project inside this file has no usable name.' };
  }
  if (!isIntegerInRange(normalized.width, 1, 2048) || !isIntegerInRange(normalized.height, 1, 2048)) {
    return { ok: false, error: 'The project canvas dimensions are out of range.' };
  }
  if (!isIntegerInRange(normalized.fps, 1, 60)) return { ok: false, error: 'The project playback speed is out of range.' };
  if (typeof normalized.loopMode !== 'string' || !LOOP_MODES.has(normalized.loopMode)) {
    return { ok: false, error: 'The project loop mode is not recognized.' };
  }

  if (!isPlainObject(normalized.onionSkin)) return { ok: false, error: 'The onion skin settings are missing or malformed.' };
  const skin = normalized.onionSkin;
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

  if (!Array.isArray(normalized.palettes) || normalized.palettes.length === 0) {
    return { ok: false, error: 'The file carries no color palettes.' };
  }
  for (let i = 0; i < normalized.palettes.length; i++) {
    const pal = normalized.palettes[i];
    if (!isPlainObject(pal) || typeof pal.id !== 'string' || typeof pal.name !== 'string' || !Array.isArray(pal.colors)) {
      return { ok: false, error: `Palette ${i + 1} is malformed.` };
    }
    if (!pal.colors.every(isHexColor)) {
      return { ok: false, error: `Palette "${pal.name}" holds colors PixiBun cannot read.` };
    }
  }
  if (typeof normalized.currentPaletteId !== 'string') {
    return { ok: false, error: 'The file does not say which palette is active.' };
  }
  if (!Array.isArray(normalized.customRamps)) return { ok: false, error: 'The custom ramp list is malformed.' };

  if (!Array.isArray(normalized.clips)) return { ok: false, error: 'The animation clip list is malformed.' };
  for (let i = 0; i < normalized.clips.length; i++) {
    const clip = normalized.clips[i];
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

  if (!Array.isArray(normalized.frames) || normalized.frames.length === 0) {
    return { ok: false, error: 'This project has no animation frames to open.' };
  }
  const frames: SerializedFrame[] = [];
  for (let i = 0; i < normalized.frames.length; i++) {
    const result = validateFrame(normalized.frames[i], i);
    if (typeof result === 'string') return { ok: false, error: result };
    frames.push(result);
  }

  if (
    !isIntegerInRange(normalized.createdAt, 0, Number.MAX_SAFE_INTEGER) ||
    !isIntegerInRange(normalized.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  ) {
    return { ok: false, error: 'The project timestamps are missing or corrupted.' };
  }

  return {
    ok: true,
    value: {
      format: PROJECT_FORMAT_ID,
      version: normalized.version as number,
      name: normalized.name as string,
      width: normalized.width as number,
      height: normalized.height as number,
      fps: normalized.fps as number,
      loopMode: normalized.loopMode as ProjectFile['loopMode'],
      onionSkin: {
        enabled: skin.enabled as boolean,
        prevFrames: skin.prevFrames as number,
        nextFrames: skin.nextFrames as number,
        prevColor: skin.prevColor as string,
        nextColor: skin.nextColor as string,
        opacity: skin.opacity as number,
      },
      palettes: (normalized.palettes as Record<string, unknown>[]).map((pal) => ({
        id: pal.id as string,
        name: pal.name as string,
        author: typeof pal.author === 'string' ? pal.author : undefined,
        colors: (pal.colors as string[]).slice(),
      })),
      currentPaletteId: normalized.currentPaletteId as string,
      customRamps: normalized.customRamps as ProjectFile['customRamps'],
      clips: (normalized.clips as Record<string, unknown>[]).map((clip) => {
        const start = typeof clip.startFrame === 'number' ? clip.startFrame : (typeof clip.fromFrame === 'number' ? clip.fromFrame : 0);
        const end = typeof clip.endFrame === 'number' ? clip.endFrame : (typeof clip.toFrame === 'number' ? clip.toFrame : start);
        return {
          id: clip.id as string,
          name: clip.name as string,
          startFrame: start,
          endFrame: end,
          fromFrame: start,
          toFrame: end,
          color: typeof clip.color === 'string' ? clip.color : '#F0BE7C',
          loopMode: (clip.loopMode === 'reverse' || clip.loopMode === 'ping-pong') ? clip.loopMode : 'forward',
        };
      }),
      frames,
      createdAt: normalized.createdAt as number,
      updatedAt: normalized.updatedAt as number,
    },
  };
}

