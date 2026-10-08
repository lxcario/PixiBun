import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
for (const theme of ['atelier','cozy-classic']) for (const mode of ['dark','light']) test(`canvas tools popup scan ${theme} ${mode}`, async ({page},info)=>{
 await page.setViewportSize({width:1280,height:900}); await page.goto('/studio?template=hearth-ghost'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
 await page.getByRole('button',{name:'Studio options',exact:true}).click(); await page.getByTestId(`theme-option-${theme}`).click(); await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Studio options',exact:true}).click(); await page.getByTestId(`scheme-option-${mode}`).click(); await page.keyboard.press('Escape');
 await page.locator('#center-canvas-area').focus(); await page.keyboard.press('Shift+F10'); await expect(page.getByRole('dialog',{name:'Canvas tools',exact:true})).toBeVisible();
 const result=await new AxeBuilder({page}).include('[role="dialog"][aria-label="Canvas tools"]').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 await writeFile(info.outputPath('axe-findings.json'),JSON.stringify(result.violations,null,2)); expect(result.violations).toEqual([]);
});

