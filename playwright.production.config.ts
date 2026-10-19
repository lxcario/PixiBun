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
  // Keep desktop geometry but use the actual port's UA. Desktop Safari's macOS
  // emulation hid Linux WebKit from the H.264 refusal guard and froze MP4 panels.
  // Codec qualification must identify the browser/OS that is actually encoding.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], userAgent: undefined, channel: 'chromium' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], userAgent: undefined } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], userAgent: undefined } }],
  webServer: { command: `node node_modules/next/dist/bin/next start -p ${productionPort}`, url: productionOrigin, reuseExistingServer: false, timeout: 60_000 },
});
