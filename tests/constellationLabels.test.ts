import { expect, it } from 'vitest';
import { nextConstellationName, placeConstellationLabels, type LabelBox } from '@/components/landing/night/constellationLabels';

const overlaps = (a: LabelBox, b: LabelBox) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

it('keeps names unique through repeated drawings and retention eviction', () => {
  let retained: string[] = [];
  for (let i = 0; i < 100; i++) {
    const name = nextConstellationName(retained);
    expect(retained).not.toContain(name);
    retained = [...retained, name].slice(-6);
  }
});

it.each([260, 390, 1024, 1280, 1920])('fits measured names around copy without overlap at %i px', width => {
  const bounds = { x: 8, y: 80, width: width - 16, height: 460 };
  const copy = { x: 24, y: 144, width: Math.min(576, width - 48), height: 370 };
  const labels = Array.from({ length: 4 }, (_, id) => ({ id, x: 70, y: 180, width: 210, height: 17 }));
  const placed = [...placeConstellationLabels(labels, bounds, [copy]).values()];
  expect(placed.length).toBeGreaterThan(0);
  for (const [i, box] of placed.entries()) {
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.y).toBeGreaterThanOrEqual(bounds.y);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    expect(overlaps(box, copy)).toBe(false);
    for (const other of placed.slice(i + 1)) expect(overlaps(box, other)).toBe(false);
  }
});

it('hides names when no measured slot fits', () => {
  const bounds = { x: 0, y: 0, width: 180, height: 100 };
  expect(placeConstellationLabels([{ id: 1, x: 90, y: 50, width: 200, height: 17 }], bounds, []).size).toBe(0);
  expect(placeConstellationLabels([{ id: 1, x: 90, y: 50, width: 100, height: 17 }], bounds, [bounds]).size).toBe(0);
});
