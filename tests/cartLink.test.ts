import { describe, expect, it } from 'vitest';
import { CART_FORMAT, CART_VERSION, CartError, cartId, type CartRecord } from '@/lib/cart/cartFormat';
import { cartFromFragment, cartLink, cartLinkFragment, fromBase64Url, toBase64Url } from '@/lib/cart/cartLink';
import { lampFromPointer, snapLamp } from '@/lib/cart/relight';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';

const project: ProjectFile = {
  format: PROJECT_FORMAT_ID, version: PROJECT_FORMAT_VERSION, name: 'Lantern', width: 16, height: 16, fps: 12,
  createdAt: 1, updatedAt: 2, loopMode: 'repeat',
  onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, opacity: 0.35, prevColor: '#7fae6b', nextColor: '#c792df' },
  customRamps: [], clips: [], palettes: [{ id: 'p', name: 'Cozy', colors: ['#000000'] }], currentPaletteId: 'p',
  frames: [{ id: 'f', durationMs: 100, layers: [{ id: 'l', name: 'Ink', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
};

async function cart(): Promise<CartRecord> {
  return {
    format: CART_FORMAT, version: CART_VERSION, title: 'Lantern', maker: 'Rowan', license: 'cc0', createdAt: 1,
    receipt: { strokes: 12, activeMs: 60000, track: 'A'.repeat(5000) },
    lineage: { id: await cartId(project), parents: [] }, project,
  };
}

describe('cart links', () => {
  it('round-trip base64url', () => {
    const bytes = Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 255);
    const text = toBase64Url(bytes);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Array.from(fromBase64Url(text))).toEqual(Array.from(bytes));
    expect(() => fromBase64Url('not base64!')).toThrow(CartError);
  });

  it('carry the drawing after the # and leave the making-of track out', async () => {
    const link = await cartLink(await cart(), 'https://pixibun.example/');
    expect(link.startsWith('https://pixibun.example/open#c1.')).toBe(true);
    expect(link.length).toBeLessThan(2000);
    const opened = await cartFromFragment(new URL(link).hash);
    expect(opened).toMatchObject({ title: 'Lantern', maker: 'Rowan', license: 'cc0', receipt: { strokes: 12, activeMs: 60000 } });
    expect(opened.receipt?.track).toBeUndefined();
    expect(opened.lineage.id).toBe(await cartId(project));
  });

  it('refuse links that are not carts or are damaged', async () => {
    await expect(cartFromFragment('#hello')).rejects.toThrow(/does not carry a cart/);
    await expect(cartFromFragment('#c1.AAAA')).rejects.toThrow(CartError);
    const good = await cartLinkFragment(await cart());
    await expect(cartFromFragment(`#${good.slice(0, -12)}`)).rejects.toThrow(CartError);
  });
});

describe('the player lamp', () => {
  it('points the light where the finger is, lower toward the edges', () => {
    expect(lampFromPointer(0, -10, 100).azimuth).toBeCloseTo(0);
    expect(lampFromPointer(10, 0, 100).azimuth).toBeCloseTo(90);
    expect(lampFromPointer(0, 10, 100).azimuth).toBeCloseTo(180);
    expect(lampFromPointer(-10, 0, 100).azimuth).toBeCloseTo(270);
    expect(lampFromPointer(0, -1, 100).elevation).toBeGreaterThan(lampFromPointer(0, -100, 100).elevation);
    expect(lampFromPointer(0, -500, 100).elevation).toBe(15);
  });

  it('snaps to 15° steps for the relight cache', () => {
    expect(snapLamp({ azimuth: 359, elevation: 90 })).toEqual({ azimuth: 0, elevation: 75 });
    expect(snapLamp({ azimuth: 52, elevation: 3 })).toEqual({ azimuth: 45, elevation: 15 });
  });
});
