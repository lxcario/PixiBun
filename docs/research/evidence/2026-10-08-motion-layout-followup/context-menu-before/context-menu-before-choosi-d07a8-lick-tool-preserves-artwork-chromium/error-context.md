# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: context-menu-before.spec.ts >> choosing a right-click tool preserves artwork
- Location: artifacts\context-menu-before.spec.ts:2:5

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: getByTestId('eraser-tool')
Expected pattern: /pixel-primary-btn/
Received string:  "w-9 h-9 rounded-[2px] flex items-center justify-center cursor-pointer transition-all pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)]"
Timeout: 5000ms

Call log:
  - Expect "toHaveClass" with timeout 5000ms
  - waiting for getByTestId('eraser-tool')
    14 × locator resolved to <button title="Eraser (E)" aria-label="Eraser" aria-pressed="false" data-testid="eraser-tool" data-tutorial="eraser-tool" class="w-9 h-9 rounded-[2px] flex items-center justify-center cursor-pointer transition-all pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)]">…</button>
       - unexpected value "w-9 h-9 rounded-[2px] flex items-center justify-center cursor-pointer transition-all pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)]"

```

```yaml
- button "Eraser":
  - img
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | test('choosing a right-click tool preserves artwork', async ({ page }) => {
  3  |  await page.goto('/studio?template=hearth-ghost'); await expect(page.locator('[data-restoration-phase="active"]')).toBeVisible();
  4  |  const canvas=page.getByTestId('main-composite-canvas');
  5  |  const pixels=()=>canvas.evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
  6  |  const before=await pixels(); const box=(await canvas.boundingBox())!;
  7  |  await page.mouse.click(box.x+box.width/2,box.y+box.height/2,{button:'right'});
  8  |  await page.getByTitle('Eraser (Click or Right-Click to choose)',{exact:true}).click();
> 9  |  await expect(page.getByTestId('eraser-tool')).toHaveClass(/pixel-primary-btn/);
     |                                                ^ Error: expect(locator).toHaveClass(expected) failed
  10 |  expect(await pixels()).toEqual(before);
  11 | });
  12 | 
```