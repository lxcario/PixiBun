import { afterEach } from 'vitest';

/**
 * Lightweight localStorage polyfill for Vitest test environment.
 * Prevents Node v26 experimental localStorage warnings when running tests.
 */
const storage = new Map<string, string>();

const mockStorage: Storage = {
  getItem: (key: string): string | null => (storage.has(String(key)) ? storage.get(String(key))! : null),
  setItem: (key: string, value: string): void => {
    storage.set(String(key), String(value));
  },
  removeItem: (key: string): void => {
    storage.delete(String(key));
  },
  clear: (): void => {
    storage.clear();
  },
  key: (index: number): string | null => Array.from(storage.keys())[index] ?? null,
  get length(): number {
    return storage.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  configurable: true,
  writable: true,
  enumerable: true,
});

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  } catch {
    // window.localStorage might be non-configurable in some environments
  }
}

afterEach(() => {
  storage.clear();
});
