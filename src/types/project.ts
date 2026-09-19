import type { BlendMode } from './canvas';
import type { ColorPalette, ColorRamp } from './palette';
import type { AnimationClip, LoopMode, OnionSkinSettings } from './animation';

export const PROJECT_FORMAT_VERSION = 2;
export const PROJECT_FORMAT_ID = 'pixibun-project' as const;

export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  tag?: string;
  /** Lossless PNG encoding of this layer's pixel buffer, base64-encoded. */
  pngBase64?: string;
}

export interface SerializedFrame {
  id: string;
  durationMs: number;
  layers: SerializedLayer[];
}

/**
 * The `.pixibun` on-disk contract. Every field required to rebuild the studio
 * exactly: metadata, timing, palettes, clips, and per-layer pixel payloads.
 */
export interface ProjectFile {
  format: typeof PROJECT_FORMAT_ID;
  version: number;
  name: string;
  width: number;
  height: number;
  fps: number;
  loopMode: LoopMode;
  onionSkin: OnionSkinSettings;
  palettes: ColorPalette[];
  currentPaletteId: string;
  customRamps: ColorRamp[];
  clips: AnimationClip[];
  frames: SerializedFrame[];
  createdAt: number;
  updatedAt: number;
}

export type ProjectValidationResult =
  | { ok: true; value: ProjectFile }
  | { ok: false; error: string };
