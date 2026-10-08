import { defineConfig } from '@playwright/test';
import base from '../playwright.production.config';
export default defineConfig({...base,testDir:'.',testMatch:'publication-odd-pivot-browser.spec.ts',outputDir:'publication-odd-pivot-browser-before',use:{...base.use,baseURL:'http://localhost:3248'},webServer:{...base.webServer as object,command:'node node_modules/next/dist/bin/next start -p 3248',url:'http://localhost:3248',reuseExistingServer:true}});
