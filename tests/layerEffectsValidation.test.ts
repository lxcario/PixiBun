import { describe, it, expect } from 'vitest';
import { validateLayerEffect, sanitizeEffectParameter, validateProjectFile } from '@/lib/project/schema';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';

describe('Layer Effects Validation & Clamping Suite (Milestone C3)', () => {
  it('passes valid effect parameters without distortion', () => {
    const validEffect = {
      id: 'eff-1',
      kind: 'photometric',
      version: 1,
      sourceMode: 'composite-excluding-self',
      params: {
        lightAzimuth: 135,
        lightElevation: 45,
        lightBrightness: 1.2,
        cavityStrength: 0.8,
        ditherModulation: 0.25,
        shadingBands: 4,
      },
      analysis: {
        sourceLightAzimuth: 120,
        sourceLightElevation: 40,
        cueStrength: 0.9,
      },
      updatedAt: 1700000000000,
    };

    const result = validateLayerEffect(validEffect);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.params.lightAzimuth).toBe(135);
      expect(result.params.lightElevation).toBe(45);
      expect(result.params.shadingBands).toBe(4);
      expect(result.analysis?.cueStrength).toBe(0.9);
    }
  });

  it('clamps extreme and negative angles to [0, 360]', () => {
    expect(sanitizeEffectParameter('lightAzimuth', -45)).toBe(0);
    expect(sanitizeEffectParameter('lightAzimuth', 720)).toBe(360);
    expect(sanitizeEffectParameter('anisoAngle', -10)).toBe(0);
    expect(sanitizeEffectParameter('anisoAngle', 500)).toBe(360);
  });

  it('clamps elevation angles to [0, 90]', () => {
    expect(sanitizeEffectParameter('lightElevation', -15)).toBe(0);
    expect(sanitizeEffectParameter('lightElevation', 120)).toBe(90);
  });

  it('clamps normalized and physical modulation factors safely', () => {
    expect(sanitizeEffectParameter('ditherModulation', -0.5)).toBe(0);
    expect(sanitizeEffectParameter('ditherModulation', 2.5)).toBe(1);
    expect(sanitizeEffectParameter('cavityStrength', 5)).toBe(2);
    expect(sanitizeEffectParameter('cavityStrength', -1)).toBe(0);
    expect(sanitizeEffectParameter('lightBrightness', 50)).toBe(10);
    expect(sanitizeEffectParameter('lightRadius', 1000)).toBe(256);
    expect(sanitizeEffectParameter('lightRadius', 0)).toBe(1);
  });

  it('clamps discrete steps and bands to safe integer envelopes', () => {
    expect(sanitizeEffectParameter('shadingBands', 0)).toBe(1);
    expect(sanitizeEffectParameter('shadingBands', 128)).toBe(32);
    expect(sanitizeEffectParameter('celTones', 0.8)).toBe(1);
    expect(sanitizeEffectParameter('celTones', 99)).toBe(32);
    expect(sanitizeEffectParameter('thickness', -5)).toBe(1);
    expect(sanitizeEffectParameter('thickness', 500)).toBe(64);
  });

  it('clamps analysis attributes safely during effect validation', () => {
    const rawEffect = {
      id: 'eff-extreme',
      kind: 'photometric',
      version: 1,
      sourceMode: 'composite-excluding-self',
      params: {
        lightAzimuth: 999,
        lightElevation: -50,
      },
      analysis: {
        sourceLightAzimuth: 1000,
        sourceLightElevation: 200,
        cueStrength: 5.5,
      },
      updatedAt: 1700000000000,
    };

    const validated = validateLayerEffect(rawEffect);
    expect(typeof validated).toBe('object');
    if (typeof validated === 'object') {
      expect(validated.params.lightAzimuth).toBe(360);
      expect(validated.params.lightElevation).toBe(0);
      expect(validated.analysis?.sourceLightAzimuth).toBe(360);
      expect(validated.analysis?.sourceLightElevation).toBe(90);
      expect(validated.analysis?.cueStrength).toBe(1);
    }
  });

  it('rejects non-finite values (NaN, Infinity) gracefully', () => {
    const nanEffect = {
      id: 'eff-nan',
      kind: 'photometric',
      version: 1,
      sourceMode: 'composite-excluding-self',
      params: {
        lightAzimuth: NaN,
      },
      updatedAt: 1700000000000,
    };

    const result = validateLayerEffect(nanEffect);
    expect(result).toBe('has a non-finite effect parameter.');
  });

  it('sanitizes effect parameters inside full project file validation', () => {
    const rawProject = {
      format: PROJECT_FORMAT_ID,
      version: PROJECT_FORMAT_VERSION,
      name: 'Project with Effect',
      width: 32,
      height: 32,
      fps: 12,
      loopMode: 'repeat',
      palettes: [{ id: 'p1', name: 'Default', colors: ['#000000', '#ffffff'] }],
      currentPaletteId: 'p1',
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Shaded',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
              effect: {
                id: 'eff-2',
                kind: 'cast-shadow',
                version: 1,
                sourceMode: 'composite-excluding-self',
                params: {
                  lightRadius: 500,
                  shadowOpacity: 2.0,
                },
                updatedAt: 1700000000000,
              },
            },
          ],
        },
      ],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const res = validateProjectFile(rawProject);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const layerEffect = res.value.frames[0].layers[0].effect;
      expect(layerEffect).toBeDefined();
      expect(layerEffect?.params.lightRadius).toBe(256);
      expect(layerEffect?.params.shadowOpacity).toBe(1);
    }
  });
});
