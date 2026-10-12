import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
const root = process.env.NIBBLI_ARTIST_ROOT;
if (!root) throw new Error('Use npm run nibbli:artist to retain source/build identity');
const port = Number(process.env.NIBBLI_PORT ?? 3197);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid Artist port');
export default defineConfig({
  testDir: './tests/nibbliArtist', testMatch: '**/*.artist.ts', timeout: 660_000, expect: { timeout: 10_000 },
  workers: 1, retries: 0, forbidOnly: true, outputDir: path.join(root, 'playwright'),
  reporter: [['list'], ['json', { outputFile: path.join(root, 'browser-results.json') }]],
  use: { baseURL: `http://localhost:${port}`, viewport: { width: 1600, height: 1100 }, colorScheme: 'dark',
    actionTimeout: 15_000, navigationTimeout: 30_000, trace: 'on', video: 'on', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium', viewport: { width: 1600, height: 1100 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1600, height: 1100 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1600, height: 1100 } } },
  ],
  webServer: { command: `node node_modules/next/dist/bin/next start -p ${port}`, url: `http://localhost:${port}`, reuseExistingServer: false, timeout: 60_000 },
});
