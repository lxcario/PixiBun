import { describe, expect, it, vi } from 'vitest';
import { cardArtScale, cardCaptionLines, dominantColors } from '@/lib/cart/cartCard';

vi.mock('@/lib/project/serialize', () => ({ buildProjectFileAsync: vi.fn() }));
vi.mock('@/lib/render/compositor', () => ({ compositeFrame: vi.fn() }));

describe('cart card', () => {
  it('scales art by whole numbers toward about 320 px, never blurring big drawings', () => {
    expect(cardArtScale(16, 16)).toBe(20);
    expect(cardArtScale(32, 32)).toBe(10);
    expect(cardArtScale(64, 48)).toBe(5);
    expect(cardArtScale(400, 200)).toBe(1);
    expect(cardArtScale(1, 1)).toBe(32);
  });

  it('lists the most used opaque colors first', () => {
    const px = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
    const data = new Uint8ClampedArray([...px(255, 0, 0), ...px(0, 0, 255), ...px(0, 0, 255), ...px(9, 9, 9, 0), ...px(0, 0, 255)]);
    expect(dominantColors(data)).toEqual(['#0000ff', '#ff0000']);
    expect(dominantColors(data, 1)).toEqual(['#0000ff']);
  });

  it('writes the maker, the making-of and the remix credit in plain words', () => {
    expect(cardCaptionLines({})).toEqual([]);
    expect(cardCaptionLines({
      maker: 'Rowan',
      receipt: { strokes: 1412, activeMs: 38 * 60000 },
      parents: [{ id: '0123456789abcdef', title: 'Seed', maker: 'Ash' }, { id: 'fedcba9876543210' }],
    })).toEqual(['by Rowan', '1,412 strokes · 38 min of drawing', 'remixed from Seed · Ash +1']);
    expect(cardCaptionLines({ parents: [{ id: '0123456789abcdef' }] })).toEqual(['remixed from #01234567']);
  });
});

describe('cart file names', () => {
  it('are friendly and safe', async () => {
    const { cartFileName } = await import('@/lib/cart/buildCart');
    expect(cartFileName({ title: 'Hearth Ghost', maker: 'Rowan' })).toBe('hearth-ghost-by-rowan.cart.png');
    expect(cartFileName({ title: '../../ëvil?*' })).toBe('evil.cart.png');
    expect(cartFileName({ title: '???' })).toBe('pixibun.cart.png');
  });
});
