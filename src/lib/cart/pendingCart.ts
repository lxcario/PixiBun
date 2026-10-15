/**
 * Handing a cart from the player to Studio in the same tab: the packed cart
 * waits in sessionStorage, and Studio offers it once it loads.
 */
import { decodeCartData, encodeCartData, type CartRecord } from './cartFormat';
import { fromBase64Url, toBase64Url } from './cartLink';

const KEY = 'pixibun-pending-cart';
export const PENDING_CART_QUERY = 'cart';

export async function setPendingCart(cart: CartRecord): Promise<boolean> {
  try {
    window.sessionStorage.setItem(KEY, toBase64Url(await encodeCartData(cart)));
    return true;
  } catch {
    return false;
  }
}

/** The waiting cart, once: reading it clears it. */
export async function takePendingCart(): Promise<CartRecord | null> {
  let packed: string | null = null;
  try {
    packed = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  return packed ? decodeCartData(fromBase64Url(packed)) : null;
}
