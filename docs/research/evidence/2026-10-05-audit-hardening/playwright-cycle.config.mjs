import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: '../../../../tests/e2e',
  testMatch: 'paletteCycleExport.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../../../artifacts/playwright-cycle-hardening',
  use: { baseURL: 'http://localhost:3000', colorScheme: 'dark', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].map(name => ({ name, use: { ...devices[{ chromium: 'Desktop Chrome', firefox: 'Desktop Firefox', webkit: 'Desktop Safari' }[name]] } })),
  // Reuse this checkout's existing development server without interrupting it.
  webServer: { command: 'node node_modules/next/dist/bin/next dev --turbopack -p 3000', cwd: fileURLToPath(new URL('../../../../', import.meta.url)), url: 'http://localhost:3000', reuseExistingServer: true, timeout: 60_000 },
});
