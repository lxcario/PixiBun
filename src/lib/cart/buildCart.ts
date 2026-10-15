/** Make a cart from the drawing on the desk. Browser only. */
import { buildProjectFileAsync } from '@/lib/project/serialize';
import { compositeFrame } from '@/lib/render/compositor';
import { useStudioStore } from '@/stores/studioStore';
import { CART_FORMAT, CART_VERSION, cartId, writeCart, type CartLicense, type CartReceipt, type CartRecord } from './cartFormat';
import { renderCartCard, type CardStock } from './cartCard';
import { cartParentsFor } from './cartOrigin';
import { currentCartLight } from './applyCart';

export interface CartOptions {
  title: string;
  maker?: string;
  note?: string;
  license: CartLicense;
  stock: CardStock;
  receipt?: CartReceipt;
}

export interface BuiltCart {
  record: CartRecord;
  card: HTMLCanvasElement;
  png: Uint8Array<ArrayBuffer>;
}

/** CSS font families the card uses, read from the page's own font variables. */
export function cardFonts(): { display?: string; body?: string } {
  if (typeof document === 'undefined') return {};
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue('--font-silkscreen').trim();
  const body = css.getPropertyValue('--font-jakarta').trim();
  return { ...(display ? { display } : {}), ...(body ? { body } : {}) };
}

/** The active frame as the drawing looks now. */
export function currentArt(): HTMLCanvasElement {
  const state = useStudioStore.getState();
  const art = compositeFrame(state.frames, state.activeFrameIndex, state.canvasWidth, state.canvasHeight);
  if (!art) throw new Error('The drawing could not be read. Try again in a moment.');
  return art;
}

/** Fonts must be loaded before canvas text uses them. */
async function fontsReady() {
  try { await document.fonts?.ready; } catch { /* Fall back to system fonts. */ }
}

/** Draw just the card face for a live preview, without packing the drawing. */
export async function previewCard(options: CartOptions, id: string): Promise<HTMLCanvasElement> {
  await fontsReady();
  const state = useStudioStore.getState();
  return renderCartCard({
    art: currentArt(), title: options.title, id, maker: options.maker, note: options.note, license: options.license,
    receipt: options.receipt, parents: cartParentsFor(state.currentProjectId), lit: true, stock: options.stock, fonts: cardFonts(),
  });
}

function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) { reject(new Error('The card could not be drawn.')); return; }
    void blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)), reject);
  }, 'image/png'));
}

/** The cart record for the drawing on the desk, without drawing the card. */
export async function buildCartRecord(options: CartOptions, signal?: AbortSignal): Promise<CartRecord> {
  const state = useStudioStore.getState();
  const project = await buildProjectFileAsync(signal);
  const id = await cartId(project);
  return {
    format: CART_FORMAT,
    version: CART_VERSION,
    title: options.title.trim() || project.name || 'Untitled cart',
    ...(options.maker?.trim() ? { maker: options.maker.trim() } : {}),
    ...(options.note?.trim() ? { note: options.note.trim() } : {}),
    license: options.license,
    createdAt: Date.now(),
    light: currentCartLight(),
    ...(options.receipt ? { receipt: options.receipt } : {}),
    lineage: { id, parents: cartParentsFor(state.currentProjectId) },
    project,
  };
}

export async function buildCart(options: CartOptions, signal?: AbortSignal): Promise<BuiltCart> {
  const record = await buildCartRecord(options, signal);
  const id = record.lineage.id;
  await fontsReady();
  const card = renderCartCard({
    art: currentArt(), title: record.title, id, maker: record.maker, note: record.note, license: record.license,
    receipt: record.receipt, parents: record.lineage.parents, lit: true, stock: options.stock, fonts: cardFonts(),
  });
  const png = await writeCart(await canvasPng(card), record);
  return { record, card, png };
}

/** A friendly file name: "lantern-by-rowan.cart.png". */
export function cartFileName(record: Pick<CartRecord, 'title' | 'maker'>): string {
  const slug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const name = [slug(record.title) || 'pixibun', record.maker ? `by-${slug(record.maker)}` : ''].filter(Boolean).join('-');
  return `${name}.cart.png`;
}
