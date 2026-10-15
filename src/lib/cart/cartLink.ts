/**
 * Cart links: the cart travels in the link itself, after the #.
 * Browsers never send the part after # to a server, so the link is the file.
 * The making-of track is left out to keep links short.
 */
import { CartError, decodeCartData, encodeCartData, type CartRecord } from './cartFormat';

export const CART_LINK_PREFIX = 'c1.';
/** Many chat apps and posts cut links longer than this. */
export const CART_LINK_COMFORTABLE = 2000;
/** Longer links are refused; share the card instead. */
export const CART_LINK_MAX = 32_000;

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new CartError('This cart link is damaged.');
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

/** The part after #, for a cart without its making-of track. */
export async function cartLinkFragment(cart: CartRecord): Promise<string> {
  const { receipt, ...rest } = cart;
  const slim: CartRecord = receipt ? { ...rest, receipt: { strokes: receipt.strokes, activeMs: receipt.activeMs } } : rest;
  return CART_LINK_PREFIX + toBase64Url(await encodeCartData(slim));
}

export async function cartLink(cart: CartRecord, origin: string): Promise<string> {
  const fragment = await cartLinkFragment(cart);
  const link = `${origin.replace(/\/$/, '')}/open#${fragment}`;
  if (link.length > CART_LINK_MAX) throw new CartError('This drawing is too big for a link. Share the card instead.');
  return link;
}

/** Read the cart from a location hash ("#c1...."). Throws a CartError when it is not a cart link. */
export async function cartFromFragment(hash: string): Promise<CartRecord> {
  const fragment = hash.replace(/^#/, '');
  if (!fragment.startsWith(CART_LINK_PREFIX)) throw new CartError('This link does not carry a cart.');
  if (fragment.length > CART_LINK_MAX) throw new CartError('This cart link is too long to open.');
  return decodeCartData(fromBase64Url(fragment.slice(CART_LINK_PREFIX.length)));
}
