import { describe, it, expect } from 'vitest';
import { validateStructurePayload } from '@/lib/sync/p2pSync';

const validPayload = {
  width: 32,
  height: 32,
  frames: [
    {
      id: 'frame-1',
      durationMs: 100,
      layers: [
        {
          id: 'layer-1',
          name: 'Base Layer',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
        },
      ],
    },
  ],
};

describe('validateStructurePayload: STRUCTURE_SYNC payload validation', () => {
  it('accepts a well-formed payload and normalizes it', () => {
    const result = validateStructurePayload(validPayload);
    expect(result).not.toBeNull();
    expect(result?.width).toBe(32);
    expect(result?.frames[0].layers[0].blendMode).toBe('source-over');
  });

  it('accepts an optional tag field', () => {
    const result = validateStructurePayload({
      ...validPayload,
      frames: [
        {
          ...validPayload.frames[0],
          layers: [{ ...validPayload.frames[0].layers[0], tag: 'photometric' }],
        },
      ],
    });
    expect(result?.frames[0].layers[0].tag).toBe('photometric');
  });

  it('rejects out-of-range dimensions', () => {
    expect(validateStructurePayload({ ...validPayload, width: 0 })).toBeNull();
    expect(validateStructurePayload({ ...validPayload, width: 5000 })).toBeNull();
    expect(validateStructurePayload({ ...validPayload, height: 3.5 })).toBeNull();
  });

  it('rejects invalid opacity, blend modes, and structures', () => {
    expect(
      validateStructurePayload({
        ...validPayload,
        frames: [
          {
            ...validPayload.frames[0],
            layers: [{ ...validPayload.frames[0].layers[0], opacity: 1.5 }],
          },
        ],
      })
    ).toBeNull();

    expect(
      validateStructurePayload({
        ...validPayload,
        frames: [
          {
            ...validPayload.frames[0],
            layers: [{ ...validPayload.frames[0].layers[0], blendMode: 'difference' }],
          },
        ],
      })
    ).toBeNull();

    expect(
      validateStructurePayload({
        ...validPayload,
        frames: [{ ...validPayload.frames[0], layers: [] }],
      })
    ).toBeNull();

    expect(validateStructurePayload({ ...validPayload, frames: [] })).toBeNull();
    expect(validateStructurePayload(null)).toBeNull();
    expect(validateStructurePayload('nope')).toBeNull();
  });
});