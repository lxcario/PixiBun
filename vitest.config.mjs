import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDirname = path.dirname(fileURLToPath(import.meta.url));

// Lightweight localStorage polyfill for Node v26 experimental warning suppression
{
  const store = new Map();
  const mockStorage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(String(key)); },
    clear: () => { store.clear(); },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  } catch {
    // ignore
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    maxWorkers: 2,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/types/**'],
      reporter: ['text', 'json', 'html'],
      // About a point under measured coverage (18 October: 62.1 / 57.3 / 57.4 / 63.6), so
      // coverage cannot quietly slide back. Raise these as coverage grows.
      thresholds: {
        statements: 61,
        branches: 56,
        functions: 56,
        lines: 62,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDirname, './src'),
    },
  },
});
