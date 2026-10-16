import { create } from 'zustand';
import type { MaterialType } from '@/types/tools';

/**
 * The live light's look while the light bar is open: its tint, the fill (ambient) level and
 * the surface material. The photometric session seeds it from the layer being edited; the bar
 * changes it and sends it with each live update; Apply saves it with the effect.
 */
export interface LightLook {
  lightColor: string;
  ambientIntensity: number;
  material: MaterialType;
}

export const DEFAULT_LIGHT_LOOK: LightLook = { lightColor: '#FFFFFF', ambientIntensity: 0.48, material: 'matte' };

export const useLightLook = create<LightLook>(() => ({ ...DEFAULT_LIGHT_LOOK }));

/** Named light tints for the bar's swatches. Daylight is the engine's neutral white. */
export const LIGHT_TINTS: ReadonlyArray<{ id: string; label: string; color: string }> = [
  { id: 'daylight', label: 'Daylight', color: '#FFFFFF' },
  { id: 'candle', label: 'Candle', color: '#FFD49A' },
  { id: 'sunset', label: 'Sunset', color: '#FFA07A' },
  { id: 'moon', label: 'Moonlight', color: '#B8CCFF' },
  { id: 'neon', label: 'Neon', color: '#E6A6FF' },
  { id: 'forest', label: 'Forest', color: '#CFF5B0' },
];
