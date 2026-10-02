import { expect, it } from 'vitest';
import { readNativePng } from './helpers/readNativePng';

// Fixed RGB/RGBA vectors with one row per PNG filter (0–4), independently checked in Pillow.
it.each([
  [3, 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAAFCAIAAADg0arLAAAAI0lEQVR4nGPgEpHTMLJh5JdUlpOTY2IFA2Z+EUkhISEWCA8AMJkCMFc2lmgAAAAASUVORK5CYII='],
  [4, 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAAFCAYAAABvsz2cAAAAJklEQVR4nGPgEpHTMLJxC2Dkl1TW1QACJlYoYOYXkZQTBwIWmAgAZ9cDkSMjx+kAAAAASUVORK5CYII='],
] as const)('decodes %i-channel fixed native samples through all five filters', (channels, encoded) => {
  const expected: number[] = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 2; x++) {
    expected.push(...[0, 1, 2].map(c => 10 + (x * channels + c) * 10 + y * 5), channels === 4 ? 40 + x * 40 + y * 5 : 255);
  }
  expect(readNativePng(Buffer.from(encoded, 'base64'))).toEqual({ width: 2, height: 5, data: expected });
});
