import { describe, it, expect } from 'vitest';
import { createId } from '@/lib/engine/id';

describe('createId', () => {
  it('produces unique ids across rapid successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      ids.add(createId('layer'));
    }
    expect(ids.size).toBe(10_000);
  });

  it('keeps the requested prefix', () => {
    expect(createId('frame').startsWith('frame-')).toBe(true);
    expect(createId('clip').startsWith('clip-')).toBe(true);
  });

  it('carries counter and random segments beyond the timestamp', () => {
    const id = createId('msg');
    // prefix - timestamp(base36) - counter(base36) - random(base36)
    expect(id.split('-').length).toBeGreaterThanOrEqual(4);
  });
});
