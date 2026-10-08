import type { PixelBuffer } from '@/lib/canvas/rotSprite';

/** Original synthetic artwork, freely reusable; no game sprites or study participants. */
export function motionFixtures(): Array<{ name: string; source: PixelBuffer }> {
  const fixture = (name: string, paint: (set: (x: number, y: number, rgba: readonly number[]) => void) => void) => {
    const data = new Uint8ClampedArray(17 * 17 * 4);
    paint((x, y, rgba) => data.set(rgba, (y * 17 + x) * 4));
    return { name, source: { width: 17, height: 17, data } };
  };
  const ink = [24, 20, 36, 255], skin = [233, 160, 102, 255];
  return [
    fixture('face-with-single-pixel-eyes', set => {
      for (let y = 4; y < 12; y++) for (let x = 4; x < 13; x++) set(x, y, x === 4 || x === 12 || y === 4 || y === 11 ? ink : skin);
      set(6, 7, ink); set(10, 7, ink); set(8, 9, [140, 54, 64, 255]);
    }),
    fixture('one-pixel-diagonal-and-separated-details', set => {
      for (let i = 3; i < 14; i++) set(i, i, ink);
      set(5, 11, [230, 64, 70, 255]); set(11, 5, [50, 140, 220, 255]);
    }),
    fixture('fractional-alpha-and-close-shades', set => {
      const shades = [[205, 191, 223, 64], [188, 170, 203, 128], [180, 161, 196, 192], [102, 75, 104, 255]];
      for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) set(x, y, shades[Math.floor((x - 4) / 2)]);
    }),
    fixture('two-contact-feet-and-disconnected-part', set => {
      for (let y = 4; y < 11; y++) for (let x = 6; x < 11; x++) set(x, y, skin);
      for (let y = 11; y < 14; y++) { set(6, y, ink); set(10, y, ink); }
      set(5, 13, ink); set(11, 13, ink); set(3, 5, [50, 140, 220, 255]);
    }),
  ];
}
