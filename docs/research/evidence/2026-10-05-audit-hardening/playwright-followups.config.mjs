import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.', testMatch: ['gradient-diagnostic.spec.ts', 'palette-cycle-compiled.spec.ts'],
  timeout: 60_000, expect: { timeout: 10_000 }, workers: 1, retries: 0, reporter: [['list']],
  outputDir: '../../../../artifacts/playwright-hardening-followups',
  use: { baseURL: 'http://localhost:3134', colorScheme: 'dark', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].map(name => ({ name, use: { ...devices[{ chromium: 'Desktop Chrome', firefox: 'Desktop Firefox', webkit: 'Desktop Safari' }[name]] } })),
  webServer: { command: 'node node_modules/next/dist/bin/next start -p 3134', cwd: fileURLToPath(new URL('../../../../', import.meta.url)), url: 'http://localhost:3134', reuseExistingServer: false, timeout: 60_000 },
});
