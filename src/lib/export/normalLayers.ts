import type { Layer } from '@/types/canvas';

/** Manual facets and baked maps share the same stored tangent-space convention. */
export function isNormalLayer(layer: Layer): boolean {
  return layer.tag === 'normal' || layer.tag === 'normal-map' || layer.effect?.kind === 'normal-map';
}

export function hasNeutralNormalLayer(layers: Layer[]): boolean {
  const normals = layers.filter(isNormalLayer);
  return normals.length === 1 && normals[0].opacity === 1 && normals[0].blendMode === 'source-over';
}
