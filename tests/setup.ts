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

if (typeof (globalThis as unknown as { ErrorEvent?: unknown }).ErrorEvent === 'undefined') {
  class MockErrorEvent extends Event {
    message: string;
    constructor(type: string, init?: { message?: string }) {
      super(type);
      this.message = init?.message ?? '';
    }
  }
  Object.defineProperty(globalThis, 'ErrorEvent', {
    value: MockErrorEvent,
    configurable: true,
    writable: true,
  });
}

// Web Animations: cancelling rejects `finished` with AbortError and marks that promise
// handled, so browsers never report it. happy-dom leaves it unhandled; match the spec here so
// motion stopping a native animation (a surface closing mid-entrance) is not a test failure.
const AnimationClass = (globalThis as unknown as { Animation?: { prototype: { cancel: () => void; finished?: Promise<unknown> } } }).Animation;
if (AnimationClass && !(AnimationClass.prototype as { __handledCancel?: boolean }).__handledCancel) {
  const cancel = AnimationClass.prototype.cancel;
  AnimationClass.prototype.cancel = function cancelHandled(this: { finished?: Promise<unknown> }) {
    this.finished?.catch(() => {});
    return cancel.call(this);
  };
  (AnimationClass.prototype as { __handledCancel?: boolean }).__handledCancel = true;
}

afterEach(() => {
  storage.clear();
});
