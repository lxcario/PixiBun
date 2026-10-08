import { defineConfig } from 'vitest/config';
import base from '../vitest.config.mjs';
export default defineConfig({...base,test:{...base.test,include:['artifacts/publication-odd-pivot-diagnostic.test.ts']}});
