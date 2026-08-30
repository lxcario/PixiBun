import type { OnionSkinSettings } from '@/types/animation';

export interface OnionGhostSpec {
  frameIndex: number; // frame whose layers compose this ghost
  tint: string; // hex color applied via 'source-atop' (prevColor / nextColor)
  alpha: number; // opacity scaled by distance falloff: base * (1 - 0.25 * (dist - 1))
}

/** Pure, DOM-free computation of which frames get ghosts, in what tint, at what alpha. */
export function getOnionSkinSpecs(
  frameCount: number,
  activeFrameIndex: number,
  settings: OnionSkinSettings,
  isPlaying: boolean = false
): OnionGhostSpec[] {
  if (!settings.enabled || frameCount <= 1 || isPlaying) {
    return [];
  }

  const specs: OnionGhostSpec[] = [];
  const maxDistance = Math.max(settings.prevFrames, settings.nextFrames);

  for (let dist = 1; dist <= maxDistance; dist++) {
    const falloff = Math.max(0, 1 - 0.25 * (dist - 1));
    const alpha = Math.min(1, Math.max(0, settings.opacity * falloff));

    // Previous ghost
    if (dist <= settings.prevFrames) {
      const prevIdx = activeFrameIndex - dist;
      if (prevIdx >= 0 && prevIdx < frameCount) {
        specs.push({
          frameIndex: prevIdx,
          tint: settings.prevColor,
          alpha,
        });
      }
    }

    // Next ghost
    if (dist <= settings.nextFrames) {
      const nextIdx = activeFrameIndex + dist;
      if (nextIdx >= 0 && nextIdx < frameCount) {
        specs.push({
          frameIndex: nextIdx,
          tint: settings.nextColor,
          alpha,
        });
      }
    }
  }

  return specs;
}
