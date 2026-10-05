import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({ test: { environment: 'happy-dom', include: ['docs/research/evidence/2026-10-05-deep-audit/probes.test.ts'], setupFiles: ['./tests/setup.ts'] }, resolve: { alias: { '@': path.resolve('./src') } } });
