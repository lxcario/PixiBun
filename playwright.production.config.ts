import { defineConfig, devices } from '@playwright/test';

const productionPort = Number(process.env.PIXIBUN_PRODUCTION_PORT ?? 3100);
if (!Number.isInteger(productionPort) || productionPort < 1024 || productionPort > 65535) throw new Error('PIXIBUN_PRODUCTION_PORT must be an integer from 1024 to 65535.');
const productionOrigin = `http://localhost:${productionPort}`;
// Playwright's WebKit launcher also defaults to a macOS UA on Linux, even when
// no device descriptor is used. Identify the actual CI port while retaining
// the installed descriptor's Safari/WebKit versions and desktop geometry.
const linuxWebKitUserAgent = devices['Desktop Safari'].userAgent.replace(/\(Macintosh;[^)]+\)/, '(X11; Linux x86_64)');

export default defineConfig({
  testDir: './tests/production',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: productionPort === 3100 ? 'test-results/production' : `artifacts/playwright-production-${productionPort}`,
  use: { baseURL: productionOrigin, colorScheme: 'dark', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  // Keep desktop geometry but identify the actual port. Playwright's macOS
  // default hid Linux WebKit from the H.264 refusal guard and froze MP4 panels.
  // Codec qualification must identify the browser/OS that is actually encoding.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], userAgent: undefined, channel: 'chromium' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], userAgent: undefined } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], userAgent: process.platform === 'linux' ? linuxWebKitUserAgent : undefined } }],
  webServer: { command: `node node_modules/next/dist/bin/next start -p ${productionPort}`, url: productionOrigin, reuseExistingServer: false, timeout: 60_000 },
});
