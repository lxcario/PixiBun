import { describe, it, expect } from 'vitest';
import { validateProjectFile } from '@/lib/project/schema';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';

function validBaseFixture() {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Hardened Project',
    width: 32,
    height: 32,
    fps: 12,
    loopMode: 'repeat',
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      prevColor: '#7fae6b',
      nextColor: '#c792df',
      opacity: 0.35,
    },
    palettes: [
      { id: 'pal-1', name: 'Cozy', colors: ['#3A2E4C', '#C792DF', '#DDDFDF'] },
    ],
    currentPaletteId: 'pal-1',
    customRamps: [],
    clips: [],
    frames: [
      {
        id: 'frame-1',
        durationMs: 100,
        layers: [
          {
            id: 'layer-1',
            name: 'Base',
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'source-over',
          },
        ],
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

describe('Project Schema Defensive Hardening Suite', () => {
  it('strips prototype pollution payloads from untrusted project JSON', () => {
    const maliciousPayload = {
      ...validBaseFixture(),
      __proto__: { isAdmin: true },
      nested: {
        constructor: { evil: true },
      },
    };

    const result = validateProjectFile(maliciousPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.prototype.hasOwnProperty.call(result.value, '__proto__')).toBe(false);
      expect(Reflect.get(Object.prototype, 'isAdmin')).toBeUndefined();
    }
  });

  it('rejects project names exceeding 256 characters', () => {
    const oversizedName = 'A'.repeat(257);
    const fixture = {
      ...validBaseFixture(),
      name: oversizedName,
    };

    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/exceeds the 256 character limit/);
    }
  });

  it('rejects project palettes exceeding 50 palette ceiling', () => {
    const manyPalettes = Array.from({ length: 51 }, (_, i) => ({
      id: `pal-${i}`,
      name: `Pal ${i}`,
      colors: ['#000000', '#ffffff'],
    }));

    const fixture = {
      ...validBaseFixture(),
      palettes: manyPalettes,
    };

    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/exceeds the 50 color palette limit/);
    }
  });

  it('rejects animation clips exceeding 100 clip ceiling', () => {
    const manyClips = Array.from({ length: 101 }, (_, i) => ({
      id: `clip-${i}`,
      name: `Clip ${i}`,
      startFrame: 0,
      endFrame: 1,
    }));

    const fixture = {
      ...validBaseFixture(),
      clips: manyClips,
    };

    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/exceeds the 100 animation clip limit/);
    }
  });

  it('rejects animation frames exceeding 500 frame ceiling', () => {
    const manyFrames = Array.from({ length: 501 }, (_, i) => ({
      id: `frame-${i}`,
      durationMs: 100,
      layers: [
        {
          id: `layer-${i}`,
          name: 'Base',
          visible: true,
          locked: false,
          opacity: 1.0,
          blendMode: 'source-over',
        },
      ],
    }));

    const fixture = {
      ...validBaseFixture(),
      frames: manyFrames,
    };

    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/exceeds the 500 animation frame limit/);
    }
  });

  it('rejects frame with more than 100 layers', () => {
    const manyLayers = Array.from({ length: 101 }, (_, i) => ({
      id: `layer-${i}`,
      name: `Layer ${i}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: 'source-over',
    }));

    const fixture = {
      ...validBaseFixture(),
      frames: [
        {
          id: 'frame-overloaded',
          durationMs: 100,
          layers: manyLayers,
        },
      ],
    };

    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/exceeds the 100 layer ceiling/);
    }
  });
});
