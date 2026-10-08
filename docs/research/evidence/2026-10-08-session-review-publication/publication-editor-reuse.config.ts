import { defineConfig } from '@playwright/test';
import base from '../playwright.config';
export default defineConfig({ ...base, testDir: '../tests/e2e', workers: 1, retries: 0, reporter: [['list']], outputDir: '../artifacts/publication-editor-final', use: { ...base.use, baseURL: 'http://localhost:3000' }, webServer: undefined });
