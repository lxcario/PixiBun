import type { PaletteCycleTrack } from '@/lib/color/paletteCycling';

export type { PaletteCycleTrack };

export interface ColorPalette {
  id: string;
  name: string;
  author?: string;
  colors: string[]; // hex codes
  cycleTracks?: PaletteCycleTrack[];
}

export interface ColorRamp {
  baseColor: string;
  shades: string[]; // shadow to highlight
}
