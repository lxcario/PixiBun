import { expect, it } from 'vitest';
import { isNormalLayer, hasNeutralNormalLayer } from '@/lib/export/normalLayers';
import type { Layer } from '@/types/canvas';
const layer = (tag?: string): Layer => ({ id: 'n', name: 'Surface', visible: false, locked: false, opacity: 1, blendMode: 'source-over', tag });
it.each(['normal', 'normal-map'])('admits a single hidden or visible %s layer', tag => {
  expect(isNormalLayer(layer(tag))).toBe(true); expect(hasNeutralNormalLayer([layer(), layer(tag)])).toBe(true);
  expect(hasNeutralNormalLayer([{ ...layer(tag), visible: true }])).toBe(true);
});
it('rejects missing, ambiguous, faded and non-neutral normals', () => {
  expect(hasNeutralNormalLayer([layer()])).toBe(false);
  expect(hasNeutralNormalLayer([layer('normal'), layer('normal-map')])).toBe(false);
  expect(hasNeutralNormalLayer([{ ...layer('normal'), opacity: 0.5 }])).toBe(false);
  expect(hasNeutralNormalLayer([{ ...layer('normal'), blendMode: 'multiply' }])).toBe(false);
});
