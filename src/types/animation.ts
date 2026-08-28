export type LoopMode = 'repeat' | 'ping-pong' | 'once';

export interface OnionSkinSettings {
  enabled: boolean;
  prevFrames: number; // 1 to 5
  nextFrames: number; // 1 to 5
  prevColor: string; // Hex / RGBA
  nextColor: string; // Hex / RGBA
  opacity: number; // 0 to 1
}

export interface AnimationClip {
  id: string;
  name: string;
  startFrame: number;
  endFrame: number;
  color?: string;
}
