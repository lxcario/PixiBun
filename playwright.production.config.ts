import { defineConfig, devices } from '@playwright/test';

const productionPort = Number(process.env.PIXIBUN_PRODUCTION_PORT ?? 3100);
if (!Number.isInteger(productionPort) || productionPort < 1024 || productionPort > 65535) throw new Error('PIXIBUN_PRODUCTION_PORT must be an integer from 1024 to 65535.');
const productionOrigin = `http://localhost:${productionPort}`;

export default defineConfig({
  testDir: './tests/production',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: productionPort === 3100 ? 'test-results/production' : `artifacts/playwright-production-${productionPort}`,
  use: { baseURL: productionOrigin, colorScheme: 'dark', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  // Match development qualification with the full browser; shell crash traces remain retained.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }],
  webServer: { command: `node node_modules/next/dist/bin/next start -p ${productionPort}`, url: productionOrigin, reuseExistingServer: false, timeout: 60_000 },
});
