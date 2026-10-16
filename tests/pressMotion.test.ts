// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { pressScale, pressTarget } from '@/lib/motion/pressMotion';
import { RELEASE, cssSpring, sampleSpring } from '@/lib/motion/springs';

describe('press motion', () => {
  it('takes about the same few pixels off every control, so wide rows barely move', () => {
    expect(pressScale(36, 36)).toBe(0.95);
    expect(pressScale(120, 28)).toBeCloseTo(1 - 3.5 / 120, 5);
    expect(pressScale(320, 40)).toBe(0.988);
  });

  it('springs back with one soft overshoot that settles in well under a second', () => {
    const points = sampleSpring(RELEASE);
    const peak = Math.max(...points.map(point => point.x));
    expect(peak).toBeGreaterThan(1.05);
    expect(peak).toBeLessThan(1.2);
    expect(cssSpring(RELEASE).duration).toBeLessThan(800);
  });

  it('presses buttons and button-like roles but leaves the canvas, fields and disabled controls still', () => {
    document.body.innerHTML = `
      <button id="plain"><span id="inner">Save</span></button>
      <div role="tab" id="tab">Layers</div>
      <button id="off" disabled>Off</button>
      <div id="center-canvas-area"><button id="gizmo">Rotate</button></div>
      <input id="field" />
      <div data-no-press><button id="opted-out">Keep still</button></div>`;
    const byId = (id: string) => document.getElementById(id);
    expect(pressTarget(byId('inner'))?.id).toBe('plain');
    expect(pressTarget(byId('tab'))?.id).toBe('tab');
    expect(pressTarget(byId('off'))).toBeNull();
    expect(pressTarget(byId('gizmo'))).toBeNull();
    expect(pressTarget(byId('field'))).toBeNull();
    expect(pressTarget(byId('opted-out'))).toBeNull();
  });
});
