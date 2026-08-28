import { describe, it, expect } from 'vitest';
import { validateProjectFile } from '@/lib/project/schema';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';

function validProjectFixture() {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Walk Cycle',
    width: 32,
    height: 32,
    fps: 12,
    loopMode: 'repeat',
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      prevColor: '#C792DF',
      nextColor: '#DCABDF',
      opacity: 0.45,
    },
    palettes: [
      { id: 'pal-1', name: 'Cozy', colors: ['#3A2E4C', '#C792DF', '#DDDFDF'] },
    ],
    currentPaletteId: 'pal-1',
    customRamps: [],
    clips: [],
    frames: [
      {
        id: 'frame-a',
        durationMs: 100,
        layers: [
          {
            id: 'layer-a',
            name: 'Base',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      },
    ],
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  };
}

describe('validateProjectFile', () => {
  it('accepts a well-formed project and echoes normalized data', () => {
    const result = validateProjectFile(validProjectFixture());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.frames).toHaveLength(1);
      expect(result.value.frames[0].layers[0].id).toBe('layer-a');
    }
  });

  it('rejects non-objects and wrong formats with readable errors', () => {
    expect(validateProjectFile(null).ok).toBe(false);
    expect(validateProjectFile('nope').ok).toBe(false);
    const wrongFormat = validateProjectFile({ ...validProjectFixture(), format: 'other-app' });
    expect(wrongFormat.ok).toBe(false);
    if (!wrongFormat.ok) expect(wrongFormat.error).toMatch(/not saved by PixiBun/i);
  });

  it('rejects files from newer format versions', () => {
    const future = validateProjectFile({ ...validProjectFixture(), version: PROJECT_FORMAT_VERSION + 1 });
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.error).toMatch(/cannot read/i);
  });

  it('rejects projects without frames', () => {
    const empty = { ...validProjectFixture(), frames: [] };
    const result = validateProjectFile(empty);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no animation frames/i);
  });

  it('calls out the exact frame when a layer uses an unknown blend mode', () => {
    const fixture = validProjectFixture();
    fixture.frames[0].layers[0].blendMode = 'difference';
    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Frame 1');
  });

  it('rejects palettes holding non-hex colors', () => {
    const fixture = validProjectFixture();
    fixture.palettes[0].colors.push('purple');
    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/palette/i);
  });
});
