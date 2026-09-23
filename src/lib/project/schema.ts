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
import type { LayerEffectRecipe, SmartEffectKind, SmartEffectParameter } from '@/types/canvas';
import { SafeJson, type SafeJsonParseOptions } from '@/lib/safety/safeJson';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import { validateProjectResourceBudget, safeMultiply } from './resourceBudget';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';
import {
  type EnvelopeViolation,
  type EnvelopeViolationCode,
  type FrameLayerViolationDetail,
  type RecoveryReasonCode,
} from '@/lib/recovery/recoveryTypes';

const BLEND_MODES = new Set(['source-over', 'multiply', 'screen', 'overlay', 'color-dodge']);
const LOOP_MODES = new Set(['repeat', 'ping-pong', 'once']);
const SMART_EFFECT_KINDS = new Set<SmartEffectKind>([
  'photometric',
  'auto-shade',
  'cast-shadow',
  'ground-shadow',
  'volumetric-optics',
  'normal-map',
  'specular',
  'sel-out',
  'outline',
  'autotile',
  'wfc',
]);
const EFFECT_SOURCE_MODES = new Set(['composite-excluding-self', 'active-layer', 'selection']);

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

export function validateLayerEffect(input: unknown): LayerEffectRecipe | string | undefined {
  if (input === undefined) return undefined;
  if (!isPlainObject(input)) return 'has malformed effect metadata.';
  if (typeof input.id !== 'string' || input.id.length === 0 || input.id.length > 128) {
    return 'has an invalid effect identifier.';
  }
  if (typeof input.kind !== 'string' || !SMART_EFFECT_KINDS.has(input.kind as SmartEffectKind)) {
    return 'uses an unknown smart effect.';
  }
  if (input.version !== 1 || typeof input.sourceMode !== 'string' || !EFFECT_SOURCE_MODES.has(input.sourceMode)) {
    return 'uses an unsupported effect recipe.';
  }
  if (!isPlainObject(input.params) || Object.keys(input.params).length > 64) {
    return 'has malformed effect parameters.';
  }
  const params: Record<string, SmartEffectParameter> = {};
  for (const [key, value] of Object.entries(input.params)) {
    if (key.length > 64 || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) return 'has an invalid effect parameter name.';
    if (Array.isArray(value)) {
      if (value.length > 256 || !value.every((item) => typeof item === 'string' && item.length <= 64)) {
        return 'has an invalid list effect parameter.';
      }
      params[key] = value.slice();
      continue;
    }
    if (value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return 'has an invalid effect parameter.';
    }
    if (typeof value === 'number' && !Number.isFinite(value)) return 'has a non-finite effect parameter.';
    params[key] = value as SmartEffectParameter;
  }

  let analysis: LayerEffectRecipe['analysis'];
  if (input.analysis !== undefined) {
    if (!isPlainObject(input.analysis)) return 'has malformed effect analysis.';
    analysis = {
      formType:
        input.analysis.formType === 'character' || input.analysis.formType === 'orb' || input.analysis.formType === 'prop'
          ? input.analysis.formType
          : undefined,
      sourceLightAzimuth:
        typeof input.analysis.sourceLightAzimuth === 'number' && Number.isFinite(input.analysis.sourceLightAzimuth)
          ? input.analysis.sourceLightAzimuth
          : undefined,
      sourceLightElevation:
        typeof input.analysis.sourceLightElevation === 'number' && Number.isFinite(input.analysis.sourceLightElevation)
          ? input.analysis.sourceLightElevation
          : undefined,
      cueStrength:
        typeof input.analysis.cueStrength === 'number' && Number.isFinite(input.analysis.cueStrength)
          ? Math.max(0, Math.min(1, input.analysis.cueStrength))
          : typeof input.analysis.confidence === 'number' && Number.isFinite(input.analysis.confidence)
          ? Math.max(0, Math.min(1, input.analysis.confidence))
          : undefined,
      rationale: typeof input.analysis.rationale === 'string' ? input.analysis.rationale.slice(0, 1000) : undefined,
    };
  }

  if (!isIntegerInRange(input.updatedAt, 0, Number.MAX_SAFE_INTEGER)) return 'has an invalid effect timestamp.';
  return {
    id: input.id,
    kind: input.kind as SmartEffectKind,
    version: 1,
    sourceMode: input.sourceMode as LayerEffectRecipe['sourceMode'],
    params,
    analysis,
    updatedAt: input.updatedAt,
  };
}

export type ValidationEnvelopeMode = 'strict' | 'collect-recoverable';

export interface ValidationPolicyOptions {
  envelopeMode: ValidationEnvelopeMode;
}

export type ProjectValidationWithPolicyResult =
  | {
      ok: true;
      value: ProjectFile;
      violations: EnvelopeViolation[];
      reasonCodes: EnvelopeViolationCode[];
    }
  | {
      ok: false;
      error: string;
      reasonCode?: RecoveryReasonCode;
      details?: string;
      foundVersion?: number;
    };

interface FrameValidationResult {
  frame?: SerializedFrame;
  error?: string;
  reasonCode?: RecoveryReasonCode;
  exceedsEnvelope?: boolean;
}

function validateFrame(
  input: unknown,
  frameIndex: number,
  mode: ValidationEnvelopeMode
): FrameValidationResult {
  if (!isPlainObject(input)) {
    return {
      error: `Frame ${frameIndex + 1} is not structured the way PixiBun expects.`,
      reasonCode: 'INVALID_FRAME_STRUCTURE',
    };
  }
  if (typeof input.id !== 'string' || input.id.length === 0 || input.id.length > 128) {
    return {
      error: `Frame ${frameIndex + 1} has an invalid or missing identifier.`,
      reasonCode: 'INVALID_FRAME_STRUCTURE',
    };
  }
  if (!isIntegerInRange(input.durationMs, 1, 60_000)) {
    return {
      error: `Frame ${frameIndex + 1} has an out-of-range duration.`,
      reasonCode: 'INVALID_FRAME_STRUCTURE',
    };
  }

  if (!Array.isArray(input.layers) || input.layers.length === 0) {
    return {
      error: `Frame ${frameIndex + 1} carries no layers — the file may have been truncated.`,
      reasonCode: 'INVALID_FRAME_STRUCTURE',
    };
  }

  let frameExceedsEnvelope = false;
  if (mode === 'strict') {
    if (input.layers.length > WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS) {
      return {
        error: `Frame ${frameIndex + 1} exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS} layer ceiling.`,
        reasonCode: 'ENVELOPE_MAX_LAYERS_PER_FRAME',
      };
    }
  } else {
    // collect-recoverable mode: enforce recovery inspection ceiling
    if (input.layers.length > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_LAYERS_PER_FRAME) {
      return {
        error: `Frame ${frameIndex + 1} layer count (${input.layers.length}) exceeds recovery layer inspection ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_LAYERS_PER_FRAME}).`,
        reasonCode: 'INSPECTION_CEILING_EXCEEDED',
      };
    }
    if (input.layers.length > WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS) {
      frameExceedsEnvelope = true;
    }
  }

  const layers: SerializedFrame['layers'] = [];
  for (let i = 0; i < input.layers.length; i++) {
    const rawLayer = input.layers[i];
    if (!isPlainObject(rawLayer)) {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} is malformed.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    if (typeof rawLayer.id !== 'string' || rawLayer.id.length === 0 || rawLayer.id.length > 128) {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} has an invalid identifier.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    if (typeof rawLayer.name !== 'string' || rawLayer.name.length > 128) {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} has an invalid name.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    if (typeof rawLayer.visible !== 'boolean' || typeof rawLayer.locked !== 'boolean') {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} has corrupted visibility or lock flags.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    if (!isUnitInterval(rawLayer.opacity)) {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} has an opacity outside 0-100%.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    if (typeof rawLayer.blendMode !== 'string' || !BLEND_MODES.has(rawLayer.blendMode)) {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} uses a blend mode PixiBun does not know.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    if (rawLayer.pngBase64 !== undefined && typeof rawLayer.pngBase64 !== 'string') {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} carries unreadable pixel data.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    if (rawLayer.tag !== undefined && (typeof rawLayer.tag !== 'string' || rawLayer.tag.length > 128)) {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} has an invalid tag.`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }
    const effect = validateLayerEffect(rawLayer.effect);
    if (typeof effect === 'string') {
      return {
        error: `Frame ${frameIndex + 1}, layer ${i + 1} ${effect}`,
        reasonCode: 'INVALID_LAYER_STRUCTURE',
      };
    }

    let blendMode: SerializedFrame['layers'][number]['blendMode'] = 'source-over';
    if (
      rawLayer.blendMode === 'source-over' ||
      rawLayer.blendMode === 'multiply' ||
      rawLayer.blendMode === 'screen' ||
      rawLayer.blendMode === 'overlay' ||
      rawLayer.blendMode === 'color-dodge'
    ) {
      blendMode = rawLayer.blendMode;
    }

    layers.push({
      id: rawLayer.id,
      name: rawLayer.name,
      visible: rawLayer.visible,
      locked: rawLayer.locked,
      opacity: rawLayer.opacity,
      blendMode,
      pngBase64: typeof rawLayer.pngBase64 === 'string' ? rawLayer.pngBase64 : undefined,
      tag: typeof rawLayer.tag === 'string' ? rawLayer.tag : undefined,
      effect,
    });
  }

  return {
    frame: {
      id: input.id,
      durationMs: input.durationMs,
      layers,
    },
    exceedsEnvelope: frameExceedsEnvelope,
  };
}

/**
 * Upgrades legacy project payloads (such as v1 files) to the current format specification
 * by backfilling safe default values for newly introduced fields (clips, customRamps,
 * onionSkin settings, layer blendMode, opacity, lock flags, and effect recipes).
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

/**
 * Module-private core validator operating on already-sanitized project payloads.
 * Callers must route untrusted inputs through public entry points validateProjectWithPolicy
 * or validateProjectJsonWithPolicy.
 */
function validateSanitizedProjectCore(
  cleanInput: Record<string, unknown>,
  options: ValidationPolicyOptions
): ProjectValidationWithPolicyResult {
  if (!isPlainObject(cleanInput)) {
    return {
      ok: false,
      error: 'That file does not look like a PixiBun project.',
      reasonCode: 'INVALID_ROOT_TYPE',
    };
  }

  const isStrict = options.envelopeMode === 'strict';

  if (cleanInput.format !== PROJECT_FORMAT_ID) {
    return {
      ok: false,
      error: 'This file was not saved by PixiBun, so it cannot be opened here.',
      reasonCode: 'INVALID_FORMAT_ID',
    };
  }

  // Validate the original tag before migration. Only a missing tag is treated
  // as legacy; strings, fractions, negatives, and zero must not be normalized
  // into a valid current project.
  if (
    cleanInput.version !== undefined &&
    !isIntegerInRange(cleanInput.version, 1, PROJECT_FORMAT_VERSION)
  ) {
    if (typeof cleanInput.version === 'number' && cleanInput.version > PROJECT_FORMAT_VERSION) {
      return {
        ok: false,
        error: `This project was saved in format v${cleanInput.version}, but this version of PixiBun only supports up to v${PROJECT_FORMAT_VERSION}. Please update PixiBun to open this file.`,
        reasonCode: 'UNSUPPORTED_FUTURE_VERSION',
        details: `Saved version ${cleanInput.version} exceeds max supported version ${PROJECT_FORMAT_VERSION}`,
        foundVersion: cleanInput.version,
      };
    }
    return {
      ok: false,
      error: `This project uses an invalid format version (${String(cleanInput.version)}).`,
      reasonCode: 'INVALID_VERSION_FORMAT',
    };
  }

  // Backward-compatibility: migrate legacy/unversioned payloads before validation
  const normalized = migrateProjectPayload(cleanInput);
  if (!isIntegerInRange(normalized.version, 1, PROJECT_FORMAT_VERSION)) {
    return {
      ok: false,
      error: `This project uses an invalid format version (${String(cleanInput.version)}).`,
      reasonCode: 'INVALID_VERSION_FORMAT',
    };
  }
  if (typeof normalized.name !== 'string' || normalized.name.trim().length === 0) {
    return {
      ok: false,
      error: 'The project inside this file has no usable name.',
      reasonCode: 'INVALID_NAME',
    };
  }
  if (normalized.name.length > RECOVERY_INSPECTION_CEILINGS.MAX_PROJECT_NAME_LENGTH) {
    return {
      ok: false,
      error: `The project name exceeds the ${RECOVERY_INSPECTION_CEILINGS.MAX_PROJECT_NAME_LENGTH} character limit.`,
      reasonCode: 'INVALID_NAME',
    };
  }
  const validatedName: string = normalized.name;

  if (
    !isIntegerInRange(normalized.width, 1, WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION) ||
    !isIntegerInRange(normalized.height, 1, WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION)
  ) {
    return {
      ok: false,
      error: 'The project canvas dimensions are out of range.',
      reasonCode: 'INVALID_DIMENSIONS',
    };
  }
  const validatedWidth: number = normalized.width;
  const validatedHeight: number = normalized.height;

  if (!isIntegerInRange(normalized.fps, 1, 60)) {
    return {
      ok: false,
      error: 'The project playback speed is out of range.',
      reasonCode: 'INVALID_FPS',
    };
  }
  const validatedFps: number = normalized.fps;

  let validatedLoopMode: ProjectFile['loopMode'] = 'repeat';
  if (normalized.loopMode === 'repeat' || normalized.loopMode === 'ping-pong' || normalized.loopMode === 'once') {
    validatedLoopMode = normalized.loopMode;
  } else {
    return {
      ok: false,
      error: 'The project loop mode is not recognized.',
      reasonCode: 'INVALID_LOOP_MODE',
    };
  }

  if (!isPlainObject(normalized.onionSkin)) {
    return {
      ok: false,
      error: 'The onion skin settings are missing or malformed.',
      reasonCode: 'INVALID_ONION_SKIN',
    };
  }
  const skin = normalized.onionSkin;
  if (
    typeof skin.enabled !== 'boolean' ||
    !isIntegerInRange(skin.prevFrames, 0, 5) ||
    !isIntegerInRange(skin.nextFrames, 0, 5) ||
    !isUnitInterval(skin.opacity) ||
    typeof skin.prevColor !== 'string' ||
    typeof skin.nextColor !== 'string'
  ) {
    return {
      ok: false,
      error: 'The onion skin settings are corrupted.',
      reasonCode: 'INVALID_ONION_SKIN',
    };
  }
  const validatedOnionSkin: ProjectFile['onionSkin'] = {
    enabled: skin.enabled,
    prevFrames: skin.prevFrames,
    nextFrames: skin.nextFrames,
    opacity: skin.opacity,
    prevColor: skin.prevColor,
    nextColor: skin.nextColor,
  };

  if (!Array.isArray(normalized.palettes) || normalized.palettes.length === 0) {
    return {
      ok: false,
      error: 'The file carries no color palettes.',
      reasonCode: 'INVALID_PALETTES',
    };
  }
  if (normalized.palettes.length > 50) {
    return {
      ok: false,
      error: 'The project exceeds the 50 color palette limit.',
      reasonCode: 'INVALID_PALETTES',
    };
  }

  const validatedPalettes: ProjectFile['palettes'] = [];
  const paletteIds = new Set<string>();
  for (let i = 0; i < normalized.palettes.length; i++) {
    const pal = normalized.palettes[i];
    if (
      !isPlainObject(pal) ||
      typeof pal.id !== 'string' ||
      typeof pal.name !== 'string' ||
      !Array.isArray(pal.colors)
    ) {
      return {
        ok: false,
        error: `Palette ${i + 1} is malformed.`,
        reasonCode: 'INVALID_PALETTES',
      };
    }

    // In recovery mode only, enforce unique palette IDs, length and color count bounds for safe pruning
    if (!isStrict) {
      if (paletteIds.has(pal.id)) {
        return {
          ok: false,
          error: `Palette ${i + 1} has duplicate identifier (${pal.id}).`,
          reasonCode: 'DUPLICATE_PALETTE_ID',
        };
      }
      if (
        pal.id.length === 0 ||
        pal.id.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
        pal.name.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
        (pal.author !== undefined &&
          (typeof pal.author !== 'string' || pal.author.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH))
      ) {
        return {
          ok: false,
          error: `Palette ${i + 1} is malformed.`,
          reasonCode: 'INVALID_PALETTES',
        };
      }
      if (pal.colors.length > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_COLORS_PER_PALETTE) {
        return {
          ok: false,
          error: `Palette ${i + 1} exceeds recovery color inspection ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_COLORS_PER_PALETTE} colors).`,
          reasonCode: 'INSPECTION_CEILING_EXCEEDED',
        };
      }
    }

    if (!pal.colors.every(isHexColor)) {
      return {
        ok: false,
        error: `Palette "${pal.name}" holds colors PixiBun cannot read.`,
        reasonCode: 'INVALID_PALETTES',
      };
    }

    paletteIds.add(pal.id);
    validatedPalettes.push({
      id: pal.id,
      name: pal.name,
      author: typeof pal.author === 'string' ? pal.author : undefined,
      colors: pal.colors.slice(),
    });
  }

  if (typeof normalized.currentPaletteId !== 'string') {
    return {
      ok: false,
      error: 'The file does not say which palette is active.',
      reasonCode: 'INVALID_ACTIVE_PALETTE',
    };
  }
  // In recovery mode only: require active palette to resolve to an existing palette
  if (!isStrict && !paletteIds.has(normalized.currentPaletteId)) {
    return {
      ok: false,
      error: 'The active palette reference does not match any palette in the project.',
      reasonCode: 'INVALID_ACTIVE_PALETTE',
    };
  }
  const validatedCurrentPaletteId: string = normalized.currentPaletteId;

  if (!Array.isArray(normalized.customRamps)) {
    return {
      ok: false,
      error: 'The custom ramp list is malformed.',
      reasonCode: 'INVALID_CUSTOM_RAMPS',
    };
  }
  if (
    normalized.customRamps.length > 100 ||
    !normalized.customRamps.every(
      (r) =>
        isPlainObject(r) &&
        isHexColor(r.baseColor) &&
        Array.isArray(r.shades) &&
        r.shades.length <= 256 &&
        r.shades.every(isHexColor)
    )
  ) {
    return {
      ok: false,
      error: 'The custom ramp entries are malformed or too large.',
      reasonCode: 'INVALID_CUSTOM_RAMPS',
    };
  }
  const validatedCustomRamps: ProjectFile['customRamps'] = normalized.customRamps.map((r) => ({
    baseColor: (r as { baseColor: string }).baseColor,
    shades: ((r as { shades: string[] }).shades).slice(),
  }));

  if (!Array.isArray(normalized.clips)) {
    return {
      ok: false,
      error: 'The animation clip list is malformed.',
      reasonCode: 'INVALID_CLIPS',
    };
  }
  if (normalized.clips.length > 100) {
    return {
      ok: false,
      error: 'The project exceeds the 100 animation clip limit.',
      reasonCode: 'INVALID_CLIPS',
    };
  }

  const clipIds = new Set<string>();
  const validatedClips: ProjectFile['clips'] = [];
  for (let i = 0; i < normalized.clips.length; i++) {
    const clip = normalized.clips[i];
    if (
      !isPlainObject(clip) ||
      typeof clip.id !== 'string' ||
      typeof clip.name !== 'string' ||
      !isIntegerInRange(clip.startFrame, 0, Number.MAX_SAFE_INTEGER) ||
      !isIntegerInRange(clip.endFrame, 0, Number.MAX_SAFE_INTEGER)
    ) {
      return {
        ok: false,
        error: `Animation clip ${i + 1} is malformed.`,
        reasonCode: 'INVALID_CLIPS',
      };
    }

    // In recovery mode only, enforce unique clip IDs, bounded string lengths, and relational bounds
    if (!isStrict) {
      if (
        clip.id.length === 0 ||
        clip.id.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH ||
        clip.name.length > RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH
      ) {
        return {
          ok: false,
          error: `Animation clip ${i + 1} has an invalid or oversized identifier/name.`,
          reasonCode: 'INVALID_CLIPS',
        };
      }
      if (clipIds.has(clip.id)) {
        return {
          ok: false,
          error: `Animation clip ${i + 1} has duplicate identifier (${clip.id}).`,
          reasonCode: 'DUPLICATE_CLIP_ID',
        };
      }
      clipIds.add(clip.id);
      if (clip.startFrame > clip.endFrame) {
        return {
          ok: false,
          error: `Animation clip ${i + 1} has inverted frame range (startFrame > endFrame).`,
          reasonCode: 'MALFORMED_CLIP_RANGE',
        };
      }
    }

    const start =
      typeof clip.startFrame === 'number'
        ? clip.startFrame
        : typeof clip.fromFrame === 'number'
        ? clip.fromFrame
        : 0;
    const end =
      typeof clip.endFrame === 'number'
        ? clip.endFrame
        : typeof clip.toFrame === 'number'
        ? clip.toFrame
        : start;

    const color = typeof clip.color === 'string' && isHexColor(clip.color) ? clip.color : '#F0BE7C';
    let loopMode: 'forward' | 'reverse' | 'ping-pong' = 'forward';
    if (clip.loopMode === 'reverse' || clip.loopMode === 'ping-pong') {
      loopMode = clip.loopMode;
    }

    validatedClips.push({
      id: clip.id,
      name: clip.name,
      startFrame: start,
      endFrame: end,
      fromFrame: start,
      toFrame: end,
      color,
      loopMode,
    });
  }

  if (!Array.isArray(normalized.frames) || normalized.frames.length === 0) {
    return {
      ok: false,
      error: 'This project has no animation frames to open.',
      reasonCode: 'INVALID_FRAME_STRUCTURE',
    };
  }

  let framesExceedEnvelope = false;
  if (isStrict) {
    if (normalized.frames.length > WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES) {
      return {
        ok: false,
        error: `The project exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES} animation frame limit.`,
        reasonCode: 'ENVELOPE_MAX_FRAMES',
      };
    }
  } else {
    // collect-recoverable mode: enforce recovery frame inspection ceiling
    if (normalized.frames.length > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_FRAMES) {
      return {
        ok: false,
        error: `Project frame count (${normalized.frames.length}) exceeds recovery frame inspection ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_FRAMES}).`,
        reasonCode: 'INSPECTION_CEILING_EXCEEDED',
      };
    }
    if (normalized.frames.length > WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES) {
      framesExceedEnvelope = true;
    }
  }

  const frames: SerializedFrame[] = [];
  const frameIds = new Set<string>();
  const layerIds = new Set<string>();
  let totalLayerCount = 0;
  let affectedFramesCount = 0;
  let maxLayersInAnyFrame = 0;
  const frameViolationDetails: FrameLayerViolationDetail[] = [];

  for (let i = 0; i < normalized.frames.length; i++) {
    const frameResult = validateFrame(normalized.frames[i], i, options.envelopeMode);
    if (frameResult.error) {
      return {
        ok: false,
        error: frameResult.error,
        reasonCode: frameResult.reasonCode ?? 'INVALID_FRAME_STRUCTURE',
      };
    }
    const frame = frameResult.frame!;
    if (frameIds.has(frame.id)) {
      return {
        ok: false,
        error: 'Duplicate frame identifier.',
        reasonCode: 'DUPLICATE_FRAME_ID',
      };
    }
    frameIds.add(frame.id);

    for (let l = 0; l < frame.layers.length; l++) {
      const layer = frame.layers[l];
      if (layerIds.has(layer.id)) {
        return {
          ok: false,
          error: 'Duplicate layer identifier.',
          reasonCode: 'DUPLICATE_LAYER_ID',
        };
      }
      layerIds.add(layer.id);
    }

    if (frameResult.exceedsEnvelope) {
      affectedFramesCount += 1;
      if (frame.layers.length > maxLayersInAnyFrame) {
        maxLayersInAnyFrame = frame.layers.length;
      }
      if (frameViolationDetails.length < RECOVERY_INSPECTION_CEILINGS.MAX_RECORDED_FRAME_VIOLATION_DETAILS) {
        frameViolationDetails.push({
          frameIndex: i,
          actualLayers: frame.layers.length,
          allowedLayers: WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS,
        });
      }
    }

    totalLayerCount += frame.layers.length;
    if (
      !isStrict &&
      totalLayerCount > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_TOTAL_LAYERS
    ) {
      return {
        ok: false,
        error: `Project total layer count (${totalLayerCount}) exceeds recovery total layer inspection ceiling (${RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_TOTAL_LAYERS}).`,
        reasonCode: 'INSPECTION_CEILING_EXCEEDED',
      };
    }

    frames.push(frame);
  }

  // In recovery mode only, verify clip frame ranges against actual frame count
  if (!isStrict) {
    for (let i = 0; i < validatedClips.length; i++) {
      const clip = validatedClips[i];
      if (clip.startFrame < 0 || clip.startFrame > clip.endFrame || clip.endFrame >= frames.length) {
        return {
          ok: false,
          error: `Animation clip ${i + 1} ("${clip.name}") has frame range (${clip.startFrame}..${clip.endFrame}) outside project frame count (${frames.length}).`,
          reasonCode: 'MALFORMED_CLIP_RANGE',
        };
      }
    }
  }

  // Aggregate resource calculation with overflow-safe arithmetic
  const pxPerFrame = safeMultiply(validatedWidth, validatedHeight);
  if (pxPerFrame === null) {
    return {
      ok: false,
      error: 'The project canvas dimensions are out of range.',
      reasonCode: 'ARITHMETIC_OVERFLOW',
    };
  }

  const materializableRasterPixels = safeMultiply(totalLayerCount, pxPerFrame);
  if (materializableRasterPixels === null) {
    return {
      ok: false,
      error: 'Project aggregate pixel footprint causes arithmetic overflow.',
      reasonCode: 'ARITHMETIC_OVERFLOW',
    };
  }

  const baseRawRgbaBytes = safeMultiply(materializableRasterPixels, 4);
  if (baseRawRgbaBytes === null) {
    return {
      ok: false,
      error: 'Project aggregate memory footprint causes arithmetic overflow.',
      reasonCode: 'ARITHMETIC_OVERFLOW',
    };
  }

  if (isStrict) {
    const budgetResult = validateProjectResourceBudget(validatedWidth, validatedHeight, frames);
    if (!budgetResult.ok) {
      const isTotalLayers = totalLayerCount > WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS;
      return {
        ok: false,
        error: budgetResult.error,
        reasonCode: isTotalLayers ? 'ENVELOPE_MAX_TOTAL_LAYERS' : 'ENVELOPE_MAX_MEGAPIXELS',
      };
    }
  }

  if (
    !isIntegerInRange(normalized.createdAt, 0, Number.MAX_SAFE_INTEGER) ||
    !isIntegerInRange(normalized.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  ) {
    return {
      ok: false,
      error: 'The project timestamps are missing or corrupted.',
      reasonCode: 'INVALID_TIMESTAMPS',
    };
  }
  const validatedCreatedAt: number = normalized.createdAt;
  const validatedUpdatedAt: number = normalized.updatedAt;

  // Fully typed construction of ProjectFile without any 'as ProjectFile' assertions
  const validatedProject: ProjectFile = {
    format: PROJECT_FORMAT_ID,
    version: normalized.version,
    name: validatedName,
    width: validatedWidth,
    height: validatedHeight,
    fps: validatedFps,
    loopMode: validatedLoopMode,
    onionSkin: validatedOnionSkin,
    palettes: validatedPalettes,
    currentPaletteId: validatedCurrentPaletteId,
    customRamps: validatedCustomRamps,
    clips: validatedClips,
    frames,
    createdAt: validatedCreatedAt,
    updatedAt: validatedUpdatedAt,
  };

  // Summarized violation collection in canonical deterministic order:
  // 1. ENVELOPE_MAX_FRAMES
  // 2. ENVELOPE_MAX_LAYERS_PER_FRAME
  // 3. ENVELOPE_MAX_TOTAL_LAYERS
  // 4. ENVELOPE_MAX_MEGAPIXELS
  const violations: EnvelopeViolation[] = [];
  const reasonCodes: EnvelopeViolationCode[] = [];

  if (!isStrict) {
    if (framesExceedEnvelope) {
      violations.push({
        code: 'ENVELOPE_MAX_FRAMES',
        message: `Project exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES} animation frame limit (${normalized.frames.length} frames).`,
        actual: normalized.frames.length,
        allowed: WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES,
      });
      reasonCodes.push('ENVELOPE_MAX_FRAMES');
    }

    if (affectedFramesCount > 0) {
      violations.push({
        code: 'ENVELOPE_MAX_LAYERS_PER_FRAME',
        message: `${affectedFramesCount} frame(s) exceed the ${WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS} layer ceiling (peak: ${maxLayersInAnyFrame} layers).`,
        actual: maxLayersInAnyFrame,
        allowed: WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS,
        affectedFramesCount,
        detailsTruncated: affectedFramesCount > frameViolationDetails.length,
        frameDetails: frameViolationDetails,
      });
      reasonCodes.push('ENVELOPE_MAX_LAYERS_PER_FRAME');
    }

    if (totalLayerCount > WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS) {
      violations.push({
        code: 'ENVELOPE_MAX_TOTAL_LAYERS',
        message: `Project exceeds total layer limit (${totalLayerCount.toLocaleString()} layers across all frames; maximum allowed is ${WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS.toLocaleString()}).`,
        actual: totalLayerCount,
        allowed: WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS,
      });
      reasonCodes.push('ENVELOPE_MAX_TOTAL_LAYERS');
    }

    if (materializableRasterPixels > WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS) {
      const mpx = (materializableRasterPixels / 1_000_000).toFixed(1);
      const maxMpx = (WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS / 1_000_000).toFixed(1);
      const mib = Math.round(baseRawRgbaBytes / (1024 * 1024));
      violations.push({
        code: 'ENVELOPE_MAX_MEGAPIXELS',
        message: `Project exceeds conservative resource complexity ceiling (${mpx} MP worst-case footprint, ~${mib} MiB base RGBA; maximum allowed is ${maxMpx} MP).`,
        actual: materializableRasterPixels,
        allowed: WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS,
      });
      reasonCodes.push('ENVELOPE_MAX_MEGAPIXELS');
    }
  }

  return {
    ok: true,
    value: validatedProject,
    violations,
    reasonCodes,
  };
}

/**
 * Public policy validator for `.pixibun` project objects.
 * Unconditionally sanitizes untrusted input objects against prototype pollution before validation.
 */
export function validateProjectWithPolicy(
  input: unknown,
  options: ValidationPolicyOptions
): ProjectValidationWithPolicyResult {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      error: 'That file does not look like a PixiBun project.',
      reasonCode: 'INVALID_ROOT_TYPE',
    };
  }
  const clean = SafeJson.sanitizeObject(input) as Record<string, unknown>;
  return validateSanitizedProjectCore(clean, options);
}

/**
 * Public policy validator for raw `.pixibun` project JSON strings.
 * Safely parses and sanitizes the JSON payload in a single bounded pass via SafeJson.parse
 * before validating against the requested policy. Typed SafeJson errors propagate to the caller.
 */
export function validateProjectJsonWithPolicy(
  rawJson: string,
  validationOptions: ValidationPolicyOptions,
  safeJsonOptions?: SafeJsonParseOptions
): ProjectValidationWithPolicyResult {
  if (typeof rawJson !== 'string') {
    return {
      ok: false,
      error: 'That file does not look like a PixiBun project.',
      reasonCode: 'INVALID_ROOT_TYPE',
    };
  }
  const parsed = SafeJson.parse<unknown>(rawJson, safeJsonOptions);
  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      error: 'That file does not look like a PixiBun project.',
      reasonCode: 'INVALID_ROOT_TYPE',
    };
  }
  return validateSanitizedProjectCore(parsed as Record<string, unknown>, validationOptions);
}

/**
 * Validates untrusted input strictly against PixiBun's standard workspace envelope.
 * Preserves exact pre-Phase-1B caller signature, behavior, and user-facing error reporting.
 */
export function validateProjectFile(input: unknown): ProjectValidationResult {
  const result = validateProjectWithPolicy(input, { envelopeMode: 'strict' });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, value: result.value };
}
