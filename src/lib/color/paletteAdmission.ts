import type { ColorRamp, PaletteCycleTrack } from '@/types/palette';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';

export const MAX_PROJECT_PALETTES = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_PALETTES;
export const MAX_PALETTE_COLORS = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_COLORS_PER_PALETTE;
export const MAX_PALETTE_CYCLE_TRACKS = 64;
export const MAX_PALETTE_NAME_LENGTH = RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH;
const MAX_NAME_LENGTH = MAX_PALETTE_NAME_LENGTH;
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function paletteEntryError(name: string, colors: string[]): string | null {
  if (typeof name !== 'string' || name.length > MAX_NAME_LENGTH) {
    return `Palette names must be at most ${MAX_NAME_LENGTH} characters.`;
  }
  if (!Array.isArray(colors) || colors.length === 0 || colors.length > MAX_PALETTE_COLORS) {
    return `Palettes must contain 1–${MAX_PALETTE_COLORS} colors.`;
  }
  if (!colors.every((color) => typeof color === 'string' && HEX_COLOR.test(color))) {
    return 'Palette colors must be valid hex values.';
  }
  return null;
}

export function paletteCycleTrackError(track: PaletteCycleTrack, colorCount: number): string | null {
  if (
    !track || typeof track.id !== 'string' || track.id.length === 0 ||
    track.id.length > MAX_NAME_LENGTH ||
    (track.name !== undefined && (typeof track.name !== 'string' || track.name.length > MAX_NAME_LENGTH)) ||
    !Number.isInteger(track.low) || !Number.isInteger(track.high) ||
    track.low < 0 || track.high < track.low || track.high >= colorCount ||
    !Number.isFinite(track.rate) || track.rate < 0 || track.rate > 1000 ||
    !['forward', 'reverse', 'ping-pong'].includes(track.direction) ||
    typeof track.blendShift !== 'boolean' || typeof track.enabled !== 'boolean'
  ) {
    return 'Cycle track settings must use a valid palette range and rate.';
  }
  return null;
}

export function customRampsError(ramps: ColorRamp[]): string | null {
  if (
    !Array.isArray(ramps) ||
    ramps.length > RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_CUSTOM_RAMPS ||
    !ramps.every((ramp) =>
      ramp && typeof ramp.baseColor === 'string' && HEX_COLOR.test(ramp.baseColor) &&
      Array.isArray(ramp.shades) &&
      ramp.shades.length <= RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_SHADES_PER_RAMP &&
      ramp.shades.every((shade) => typeof shade === 'string' && HEX_COLOR.test(shade))
    )
  ) {
    return 'Custom ramps exceed the project limit or contain invalid colors.';
  }
  return null;
}
