import { describe, it, expect } from 'vitest';
import { getOnionSkinSpecs } from '@/lib/render/onionSkin';
import type { OnionSkinSettings } from '@/types/animation';

const defaultSettings: OnionSkinSettings = {
  enabled: true,
  prevFrames: 2,
  nextFrames: 2,
  prevColor: '#80e0a7',
  nextColor: '#d97be8',
  opacity: 0.5,
};

describe('getOnionSkinSpecs', () => {
  it('returns empty array when disabled', () => {
    const specs = getOnionSkinSpecs(5, 2, { ...defaultSettings, enabled: false });
    expect(specs).toEqual([]);
  });

  it('returns empty array when frameCount <= 1', () => {
    const specs1 = getOnionSkinSpecs(1, 0, defaultSettings);
    expect(specs1).toEqual([]);
    const specs0 = getOnionSkinSpecs(0, 0, defaultSettings);
    expect(specs0).toEqual([]);
  });

  it('returns empty array when isPlaying is true', () => {
    const specs = getOnionSkinSpecs(5, 2, defaultSettings, true);
    expect(specs).toEqual([]);
  });

  it('clamps previous frames at frame 0 (only emits next frames)', () => {
    const specs = getOnionSkinSpecs(5, 0, defaultSettings);
    expect(specs).toHaveLength(2);
    expect(specs[0]).toEqual({
      frameIndex: 1,
      tint: '#d97be8',
      alpha: 0.5,
    });
    expect(specs[1]).toEqual({
      frameIndex: 2,
      tint: '#d97be8',
      alpha: 0.5 * 0.75, // 0.375
    });
  });

  it('clamps next frames at the last frame (only emits prev frames)', () => {
    const specs = getOnionSkinSpecs(5, 4, defaultSettings);
    expect(specs).toHaveLength(2);
    expect(specs[0]).toEqual({
      frameIndex: 3,
      tint: '#80e0a7',
      alpha: 0.5,
    });
    expect(specs[1]).toEqual({
      frameIndex: 2,
      tint: '#80e0a7',
      alpha: 0.5 * 0.75, // 0.375
    });
  });

  it('emits symmetric ghosts ordered nearest-first for a mid frame', () => {
    const specs = getOnionSkinSpecs(5, 2, defaultSettings);
    expect(specs).toHaveLength(4);
    // dist 1
    expect(specs[0]).toEqual({
      frameIndex: 1,
      tint: '#80e0a7',
      alpha: 0.5,
    });
    expect(specs[1]).toEqual({
      frameIndex: 3,
      tint: '#d97be8',
      alpha: 0.5,
    });
    // dist 2
    expect(specs[2]).toEqual({
      frameIndex: 0,
      tint: '#80e0a7',
      alpha: 0.375,
    });
    expect(specs[3]).toEqual({
      frameIndex: 4,
      tint: '#d97be8',
      alpha: 0.375,
    });
  });

  it('computes distance falloff correctly up to distance 5', () => {
    const settings: OnionSkinSettings = {
      enabled: true,
      prevFrames: 5,
      nextFrames: 0,
      prevColor: '#00ff00',
      nextColor: '#ff00ff',
      opacity: 1.0,
    };
    const specs = getOnionSkinSpecs(10, 5, settings);
    expect(specs).toHaveLength(5);
    expect(specs[0].alpha).toBeCloseTo(1.0 * (1 - 0.25 * 0)); // dist 1: 1.0
    expect(specs[1].alpha).toBeCloseTo(1.0 * (1 - 0.25 * 1)); // dist 2: 0.75
    expect(specs[2].alpha).toBeCloseTo(1.0 * (1 - 0.25 * 2)); // dist 3: 0.50
    expect(specs[3].alpha).toBeCloseTo(1.0 * (1 - 0.25 * 3)); // dist 4: 0.25
    expect(specs[4].alpha).toBeCloseTo(1.0 * (1 - 0.25 * 4)); // dist 5: 0.0
  });

  it('respects different tints for prevColor and nextColor', () => {
    const settings: OnionSkinSettings = {
      ...defaultSettings,
      prevColor: '#112233',
      nextColor: '#445566',
    };
    const specs = getOnionSkinSpecs(3, 1, settings);
    expect(specs).toHaveLength(2);
    expect(specs[0].tint).toBe('#112233');
    expect(specs[1].tint).toBe('#445566');
  });

  it('clamps alpha between 0 and 1 even if opacity is outside [0, 1]', () => {
    const settingsOver: OnionSkinSettings = {
      ...defaultSettings,
      opacity: 1.5,
    };
    const specsOver = getOnionSkinSpecs(3, 1, settingsOver);
    expect(specsOver[0].alpha).toBe(1.0);

    const settingsUnder: OnionSkinSettings = {
      ...defaultSettings,
      opacity: -0.5,
    };
    const specsUnder = getOnionSkinSpecs(3, 1, settingsUnder);
    expect(specsUnder[0].alpha).toBe(0.0);
  });
});
