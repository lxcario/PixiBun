/**
 * The desk shelf: carts kept in this browser for later. Plain IndexedDB, apart
 * from the projects database, so keeping a cart never touches a drawing.
 */
import { decodeCartData, encodeCartData, type CartRecord } from './cartFormat';

const DB_NAME = 'pixibun-shelf';
const STORE = 'carts';
const MAX_KEPT = 48;

export interface ShelfEntry {
  id: string;
  title: string;
  maker?: string;
  keptAt: number;
  /** Packed cart, as in the PNG chunk. */
  data: Uint8Array;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep carts.')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The shelf could not be opened.'));
  });
}

function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = body(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('The shelf could not be updated.')); };
  }));
}

export async function listShelf(): Promise<ShelfEntry[]> {
  const entries = await run<ShelfEntry[]>('readonly', store => store.getAll() as IDBRequest<ShelfEntry[]>);
  return entries.sort((a, b) => b.keptAt - a.keptAt);
}

/** Keep a cart (the same drawing replaces its older copy). The oldest fall off past 48. */
export async function keepOnShelf(cart: CartRecord): Promise<void> {
  const entry: ShelfEntry = {
    id: cart.lineage.id, title: cart.title, ...(cart.maker ? { maker: cart.maker } : {}), keptAt: Date.now(),
    data: await encodeCartData(cart),
  };
  await run('readwrite', store => store.put(entry));
  const all = await listShelf();
  for (const old of all.slice(MAX_KEPT)) await run('readwrite', store => store.delete(old.id));
}

export async function removeFromShelf(id: string): Promise<void> {
  await run('readwrite', store => store.delete(id));
}

export function cartFromShelf(entry: ShelfEntry): Promise<CartRecord> {
  return decodeCartData(entry.data);
}
