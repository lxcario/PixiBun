import { describe, expect, it } from 'vitest';
import {
  CART_CHUNK, CART_FORMAT, CART_VERSION, CartError, cartId, decodeCartData, deflate, encodeCartData, hasCartChunk,
  readCart, validateCart, writeCart, type CartRecord,
} from '@/lib/cart/cartFormat';
import { crc32, encodeChunk, findChunk, PNG_SIGNATURE, readPngChunks, withChunk } from '@/lib/cart/pngChunks';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import { validateProjectFile } from '@/lib/project/schema';

function project(name = 'Lantern'): ProjectFile {
  return {
    format: PROJECT_FORMAT_ID, version: PROJECT_FORMAT_VERSION, name, width: 16, height: 16, fps: 12,
    createdAt: 1000, updatedAt: 2000, loopMode: 'repeat',
    onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, opacity: 0.35, prevColor: '#7fae6b', nextColor: '#c792df' },
    customRamps: [], clips: [],
    palettes: [{ id: 'p', name: 'Cozy', colors: ['#000000', '#ffffff', '#ffb347'] }],
    currentPaletteId: 'p',
    frames: [{ id: 'f1', durationMs: 120, layers: [{ id: 'l1', name: 'Ink', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
  };
}

/** A real 1×1 RGBA PNG. */
async function tinyPng(): Promise<Uint8Array> {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 1); view.setUint32(4, 1);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const idat = await deflate(Uint8Array.of(0, 255, 180, 70, 255));
  const parts = [PNG_SIGNATURE, encodeChunk('IHDR', ihdr), encodeChunk('IDAT', idat), encodeChunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

async function cart(overrides: Partial<CartRecord> = {}): Promise<CartRecord> {
  const p = project();
  return {
    format: CART_FORMAT, version: CART_VERSION, title: 'Lantern', maker: 'Rowan', license: 'cc-by', createdAt: 5,
    light: { azimuth: 300, elevation: 40, brightness: 1.2, radius: 64 },
    receipt: { strokes: 412, activeMs: 38 * 60000 },
    lineage: { id: await cartId(p), parents: [] },
    project: p,
    ...overrides,
  };
}

describe('PNG chunks', () => {
  it('computes the PNG CRC', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });

  it('adds one private chunk before IEND and keeps the image readable', async () => {
    const png = await tinyPng();
    const once = withChunk(png, CART_CHUNK, Uint8Array.of(1, 2, 3));
    const twice = withChunk(once, CART_CHUNK, Uint8Array.of(9));
    expect(readPngChunks(twice).map(chunk => chunk.type)).toEqual(['IHDR', 'IDAT', CART_CHUNK, 'IEND']);
    expect(Array.from(findChunk(twice, CART_CHUNK)!)).toEqual([9]);
  });

  it('refuses damaged files instead of guessing', async () => {
    const png = await tinyPng();
    const bad = png.slice(); bad[bad.length - 20] ^= 0xff;
    expect(() => readPngChunks(bad)).toThrow(/damaged/);
    expect(() => readPngChunks(png.slice(0, 20))).toThrow();
    expect(() => readPngChunks(Uint8Array.of(1, 2, 3))).toThrow(/not a PNG/);
  });
});

describe('carts', () => {
  it('round-trips the drawing, light, receipt, license and maker', async () => {
    const original = await cart();
    const card = await writeCart(await tinyPng(), original);
    expect(hasCartChunk(card)).toBe(true);
    const opened = (await readCart(card))!;
    const normalized = validateProjectFile(original.project);
    expect(normalized.ok && opened.project).toEqual(normalized.ok && normalized.value);
    expect(opened).toMatchObject({ title: 'Lantern', maker: 'Rowan', license: 'cc-by', light: original.light, receipt: original.receipt });
    expect(opened.lineage.id).toBe(original.lineage.id);
  });

  it('is an ordinary image when there is no cart', async () => {
    expect(await readCart(await tinyPng())).toBeNull();
    expect(hasCartChunk(await tinyPng())).toBe(false);
  });

  it('gives the same drawing the same id, and recomputes a claimed id', async () => {
    expect(await cartId(project())).toBe(await cartId({ ...project(), updatedAt: 99 }));
    expect(await cartId(project('Other'))).not.toBe(await cartId(project()));
    const forged = await validateCart({ ...(await cart()), lineage: { id: 'ffffffffffffffff', parents: [] } });
    expect(forged.lineage.id).toBe(await cartId(project()));
  });

  it('cleans untrusted text and drops unknown or malformed fields', async () => {
    const opened = await validateCart({
      ...(await cart()),
      title: 'Bad\u0007 title' + 'x'.repeat(200),
      license: 'mine-forever',
      light: { azimuth: 'west' },
      evil: '<script>',
      lineage: { id: 'x', parents: [{ id: 'not-an-id' }, { id: '0123456789abcdef', title: 'Seed', maker: 'Ash' }] },
    });
    expect(opened.title.includes(String.fromCharCode(7))).toBe(false);
    expect(opened.title.length).toBeLessThanOrEqual(80);
    expect(opened.license).toBe('all-rights-reserved');
    expect(opened.light).toBeUndefined();
    expect('evil' in opened).toBe(false);
    expect(opened.lineage.parents).toEqual([{ id: '0123456789abcdef', title: 'Seed', maker: 'Ash' }]);
  });

  it('refuses carts that are not carts, are too new, or carry a bad drawing', async () => {
    await expect(validateCart({ format: 'something-else' })).rejects.toThrow(CartError);
    await expect(validateCart({ ...(await cart()), version: 2 })).rejects.toThrow(/newer PixiBun/);
    await expect(validateCart({ ...(await cart()), project: { ...project(), width: -4 } })).rejects.toThrow(/drawing could not be opened/);
    await expect(decodeCartData(Uint8Array.of(7, 1, 2))).rejects.toThrow(/newer PixiBun/);
    await expect(decodeCartData(Uint8Array.of(1, 1, 2, 3, 4))).rejects.toThrow(/damaged/);
  });

  it('stops inflating a cart bomb before it fills memory', async () => {
    const bomb = await deflate(new Uint8Array(60 * 1024 * 1024));
    const data = new Uint8Array(bomb.length + 1); data[0] = 1; data.set(bomb, 1);
    await expect(decodeCartData(data)).rejects.toThrow(/unpacks to more/);
  });

  it('keeps a small drawing small', async () => {
    expect((await encodeCartData(await cart())).length).toBeLessThan(1500);
  });
});

describe('opening a cart file', () => {
  it('opens the drawing inside, with the card details beside it', async () => {
    const { readImportFile } = await import('@/lib/project/importFile');
    const card = await writeCart(await tinyPng(), await cart());
    const payload = await readImportFile(new File([card], 'lantern.png', { type: 'image/png' }));
    expect(payload.type).toBe('project');
    expect((payload.projectJson as ProjectFile).name).toBe('Lantern');
    expect(payload.cart).toMatchObject({ title: 'Lantern', maker: 'Rowan', license: 'cc-by' });
    expect(payload.cart && 'project' in payload.cart).toBe(false);
  });

  it('explains a damaged cart instead of importing the card as a picture', async () => {
    const { readImportFile, importErrorMessage } = await import('@/lib/project/importFile');
    const card = withChunk(await tinyPng(), CART_CHUNK, Uint8Array.of(1, 9, 9, 9));
    const failure = await readImportFile(new File([card], 'broken.png', { type: 'image/png' })).catch(error => error);
    expect(failure).toBeInstanceOf(CartError);
    expect(importErrorMessage(failure)).toMatch(/damaged/);
  });
});
