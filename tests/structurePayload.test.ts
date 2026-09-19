import { describe, it, expect } from 'vitest';
import { validateStructurePayload } from '@/lib/sync/p2pSync';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';

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

  it('enforces canonical workspace envelope dimensions (max 2048px)', () => {
    expect(validateStructurePayload({ ...validPayload, width: 0 })).toBeNull();
    expect(validateStructurePayload({ ...validPayload, width: 2049 })).toBeNull();
    expect(validateStructurePayload({ ...validPayload, height: 2049 })).toBeNull();
    expect(validateStructurePayload({ ...validPayload, width: 5000 })).toBeNull();
    expect(validateStructurePayload({ ...validPayload, height: 3.5 })).toBeNull();

    const maxDimPayload = validateStructurePayload({
      ...validPayload,
      width: WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION,
      height: WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION,
    });
    expect(maxDimPayload).not.toBeNull();
    expect(maxDimPayload?.width).toBe(2048);
    expect(maxDimPayload?.height).toBe(2048);
  });

  it('enforces canonical workspace envelope frame limit (max 500 frames)', () => {
    const frameTemplate = validPayload.frames[0];
    const frames500 = Array.from({ length: 500 }, (_, i) => ({
      ...frameTemplate,
      id: `frame-${i + 1}`,
      layers: frameTemplate.layers.map((layer, j) => ({ ...layer, id: `layer-${i}-${j}` })),
    }));
    expect(validateStructurePayload({ ...validPayload, frames: frames500 })).not.toBeNull();

    const frames501 = Array.from({ length: 501 }, (_, i) => ({
      ...frameTemplate,
      id: `frame-${i + 1}`,
      layers: frameTemplate.layers.map((layer, j) => ({ ...layer, id: `layer-${i}-${j}` })),
    }));
    expect(validateStructurePayload({ ...validPayload, frames: frames501 })).toBeNull();
  });

  it('enforces canonical workspace envelope layer limit (max 100 layers)', () => {
    const layerTemplate = validPayload.frames[0].layers[0];
    const layers100 = Array.from({ length: 100 }, (_, i) => ({
      ...layerTemplate,
      id: `layer-${i + 1}`,
    }));
    const payload100 = {
      ...validPayload,
      frames: [{ ...validPayload.frames[0], layers: layers100 }],
    };
    expect(validateStructurePayload(payload100)).not.toBeNull();

    const layers101 = Array.from({ length: 101 }, (_, i) => ({
      ...layerTemplate,
      id: `layer-${i + 1}`,
    }));
    const payload101 = {
      ...validPayload,
      frames: [{ ...validPayload.frames[0], layers: layers101 }],
    };
    expect(validateStructurePayload(payload101)).toBeNull();
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