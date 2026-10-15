/**
 * Remix memory: which cart a drawing was opened from, so a cart made from it
 * prints "remixed from ..." and carries the chain of makers. Kept in this
 * browser only, beside the drawing's id; nothing leaves the device.
 */
import type { CartAncestor, CartRecord } from './cartFormat';

const KEY = 'pixibun-cart-origins';
const MAX_PROJECTS = 64;
const MAX_PARENTS = 16;

type Origins = Record<string, { parents: CartAncestor[]; at: number }>;

function read(): Origins {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw && raw.length < 256 * 1024 ? JSON.parse(raw) as unknown : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Origins : {};
  } catch {
    return {};
  }
}

function write(origins: Origins) {
  const newest = Object.entries(origins).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_PROJECTS);
  try { window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(newest))); } catch { /* Storage full or blocked: remixes just skip credits. */ }
}

/** Remember that `projectId` started as `cart`. */
export function rememberCartOrigin(projectId: string, cart: Pick<CartRecord, 'title' | 'maker' | 'lineage'>): void {
  if (typeof window === 'undefined' || !projectId) return;
  const self: CartAncestor = { id: cart.lineage.id, title: cart.title, ...(cart.maker ? { maker: cart.maker } : {}) };
  const parents = [self, ...cart.lineage.parents.filter(parent => parent.id !== self.id)].slice(0, MAX_PARENTS);
  write({ ...read(), [projectId]: { parents, at: Date.now() } });
}

/** The carts this drawing descends from, nearest first. */
export function cartParentsFor(projectId: string): CartAncestor[] {
  if (typeof window === 'undefined' || !projectId) return [];
  const entry = read()[projectId];
  return Array.isArray(entry?.parents) ? entry.parents.slice(0, MAX_PARENTS) : [];
}
