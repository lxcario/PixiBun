import { defineConfig } from '@playwright/test';
import base from '../playwright.production.config';
export default defineConfig({...base,testDir:'.',testMatch:'context-menu-accessibility.spec.ts',outputDir:'../artifacts/context-menu-accessibility',use:{...base.use,baseURL:'http://127.0.0.1:3228'},webServer:undefined});
