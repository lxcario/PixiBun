import type { AnimationFrame, Layer } from '@/types/canvas';

/** Legacy documents have independent stacks; never infer correspondence from stack order. */
export function resolveFrameLayerTargets(frames: AnimationFrame[], sourceIndex: number, layerId: string):
  { ok: true; layers: Layer[] } | { ok: false; message: string } {
  const source = frames[sourceIndex]?.layers.find(layer => layer.id === layerId);
  if (!source) return { ok: false, message: 'Select a layer before editing across frames.' };
  const layers: Layer[] = [];
  for (let index = 0; index < frames.length; index++) {
    const candidates = index === sourceIndex ? [source]
      : frames[index].layers.filter(layer => layer.name === source.name && layer.tag === source.tag);
    if (candidates.length !== 1) return {
      ok: false,
      message: `Frame ${index + 1} needs one matching "${source.name}" layer. Give its counterpart the same unique name, or choose This frame.`,
    };
    layers.push(candidates[0]);
  }
  return { ok: true, layers };
}
