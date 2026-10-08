import { defineConfig } from '@playwright/test';
import base from '../playwright.config';
export default defineConfig({ ...base, testDir: '../tests/e2e', workers: 1, retries: 0, reporter: [['list']], outputDir: '../artifacts/publication-editor', use: { ...base.use, baseURL: 'http://localhost:3246' }, webServer: { cwd: process.cwd(), command: 'node node_modules/next/dist/bin/next dev --turbopack -p 3246', url: 'http://localhost:3246', reuseExistingServer: false, timeout: 120000 } });
