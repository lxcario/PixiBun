import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BLOOM, MORPH_H, MORPH_W, SNAP, cssSpring, dampingRatio, sampleSpring, spring } from '@/lib/motion/springs';
import { placePanel } from '@/components/ui/surfaces/FloatingPanel';
import { originToward } from '@/components/ui/surfaces/SpringSurface';

const css = fs.readFileSync(path.resolve(__dirname, '../src/app/surfaces.css'), 'utf8');
const cssVar = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe('shared surface springs', () => {
  it('reuse the Dynamic island physics', () => {
    expect(MORPH_W).toEqual({ stiffness: 420, damping: 31, mass: 1 });
    expect(MORPH_H).toEqual({ stiffness: 460, damping: 25, mass: 1 });
    expect(BLOOM).toEqual({ stiffness: 600, damping: 26, mass: 0.9 });
    expect(SNAP).toEqual({ stiffness: 300, damping: 25, mass: 0.9 });
    expect(dampingRatio(MORPH_W)).toBeCloseTo(0.756, 2);
    expect(dampingRatio(MORPH_H)).toBeCloseTo(0.583, 2);
    expect(spring(MORPH_H)).toMatchObject({ type: 'spring', stiffness: 460, damping: 25, mass: 1 });
  });

  it('settle at the target, overshooting more the lower the damping ratio', () => {
    const peak = (points: { x: number }[]) => Math.max(...points.map(point => point.x));
    const height = sampleSpring(MORPH_H);
    const width = sampleSpring(MORPH_W);
    expect(height.at(-1)!.x).toBeCloseTo(1, 2);
    expect(width.at(-1)!.x).toBeCloseTo(1, 2);
    expect(peak(height)).toBeGreaterThan(peak(width));
    // A critically damped spring never passes its target.
    expect(peak(sampleSpring({ stiffness: 400, damping: 40, mass: 1 }))).toBeLessThanOrEqual(1.0005);
  });

  it('turn into CSS linear() curves that start at 0, end at 1 and keep the bounce', () => {
    const { easing, duration } = cssSpring(MORPH_H);
    const stops = easing.slice('linear('.length, -1).split(', ').map(Number);
    expect(stops[0]).toBe(0);
    expect(stops.at(-1)).toBe(1);
    expect(Math.max(...stops)).toBeGreaterThan(1.05);
    expect(duration).toBeGreaterThan(300);
    expect(duration).toBeLessThan(900);
  });

  it('match the curves written into surfaces.css', () => {
    for (const [name, spec] of [['spring-morph-h', MORPH_H], ['spring-snap', SNAP], ['spring-bloom', BLOOM]] as const) {
      const generated = cssSpring(spec);
      expect(cssVar(name), name).toBe(generated.easing);
      expect(cssVar(`${name}-duration`), name).toBe(`${generated.duration}ms`);
    }
  });

  it('respect reduced motion in every CSS-driven surface', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const selector of ['.pb-tile', '.pb-switch::after', '.pb-disclosure-chevron', 'details::details-content', '::picker(select)']) {
      expect(reduced, selector).toContain(selector);
    }
  });
});

describe('popover placement', () => {
  const viewport = { width: 1440, height: 900 };
  const anchor = (top: number, left = 1000, width = 80, height = 24) => ({ top, left, bottom: top + height, right: left + width });

  it('opens below and aligned to the trigger’s end by default', () => {
    expect(placePanel(anchor(18), viewport, 'bottom-end', 320)).toEqual({ top: 48, right: 360, maxHeight: 900 - 48 - 12 });
  });

  it('flips above when the trigger sits low on screen', () => {
    const placed = placePanel(anchor(820), viewport, 'bottom-start', 320);
    expect(placed.top).toBeUndefined();
    expect(placed.bottom).toBe(900 - 820 + 6);
    expect(placed.left).toBe(1000);
  });

  it('keeps start-aligned panels on screen', () => {
    expect(placePanel(anchor(18, 1400), viewport, 'bottom-start', 320).left).toBe(1440 - 320 - 8);
  });

  it('aims the bloom at the trigger centre in the panel’s own coordinates', () => {
    expect(originToward({ left: 1000, top: 18, width: 80, height: 24 }, { left: 760, top: 48, width: 320, height: 400 })).toBe('280px -18px');
  });
});
