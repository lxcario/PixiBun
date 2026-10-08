import { defineConfig } from '@playwright/test';
import base from '../playwright.config';
export default defineConfig({...base,testDir:'.',testMatch:'context-menu-before.spec.ts',workers:1,retries:0,reporter:[['list']],outputDir:'../artifacts/context-menu-before',use:{...base.use,baseURL:'http://localhost:3000',trace:'retain-on-failure'},webServer:undefined});
