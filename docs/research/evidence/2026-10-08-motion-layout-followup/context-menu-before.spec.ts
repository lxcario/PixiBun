import { test, expect } from '@playwright/test';
test('choosing a right-click tool preserves artwork', async ({ page }) => {
 await page.goto('/studio?template=hearth-ghost'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
 const canvas=page.getByTestId('main-composite-canvas');
 const pixels=()=>canvas.evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
 const before=await pixels(); const box=(await canvas.boundingBox())!;
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2,{button:'right'});
 await page.getByTitle('Eraser (Click or Right-Click to choose)',{exact:true}).click();
 await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
 expect(await pixels()).toEqual(before);
});
