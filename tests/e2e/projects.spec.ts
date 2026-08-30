import { test, expect } from '@playwright/test';

test.describe('Projects Gallery & Workspace Management', () => {
  test('opens projects gallery, switches projects, and invalidates undo history (P0)', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="application"]')).toBeVisible();

    // Settle React hydration
    await page.waitForTimeout(400);

    // 1. Open Projects Gallery via TopHeader button
    const projectsBtn = page.getByRole('button', { name: /Projects Gallery|Projects/i });
    await expect(projectsBtn).toBeVisible();
    await projectsBtn.click();

    // Verify Gallery modal appears
    await expect(page.getByText(/Atelier Projects & Gallery/i)).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByText(/Atelier Projects & Gallery/i)).not.toBeVisible();

    // 2. Draw a stroke on the canvas to produce an undoable action
    const canvas = page.getByTestId('main-composite-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 30);
      await page.mouse.up();
    }

    // Allow stroke & debounce to register
    await page.waitForTimeout(300);

    // Verify undo button is enabled after drawing
    const undoBtn = page.getByRole('button', { name: /Undo/i });
    await expect(undoBtn).toBeEnabled();

    // 3. Create a new drawing via Projects Gallery
    await projectsBtn.click();
    const modal = page.getByRole('dialog', { name: /Atelier Projects & Gallery/i });
    await expect(modal).toBeVisible();

    const newDrawingBtn = modal.getByRole('button', { name: 'New Drawing' });
    await newDrawingBtn.click();
    await expect(modal).not.toBeVisible();

    // P0 ASSERTION: Verify Undo button is immediately disabled after creating/switching projects
    await expect(undoBtn).toBeDisabled();

    // 4. Open gallery and verify multiple projects exist
    await projectsBtn.click();
    await expect(modal).toBeVisible();

    // Test Duplication / Clone action
    const cloneButtons = modal.getByRole('button', { name: 'Clone' });
    const initialCloneCount = await cloneButtons.count();
    expect(initialCloneCount).toBeGreaterThanOrEqual(1);

    await cloneButtons.first().click();
    await page.waitForTimeout(200);

    // Verify cloned project appears
    const updatedCloneCount = await modal.getByRole('button', { name: 'Clone' }).count();
    expect(updatedCloneCount).toBe(initialCloneCount + 1);

    // Test Delete action scoped inside modal
    const deleteButtons = modal.getByRole('button', { name: 'Delete' });
    await deleteButtons.first().click();

    // Confirm deletion prompt
    const confirmDeleteBtn = modal.getByRole('button', { name: 'Yes' });
    await expect(confirmDeleteBtn).toBeVisible();
    await confirmDeleteBtn.click();

    await page.waitForTimeout(200);
    const finalCloneCount = await modal.getByRole('button', { name: 'Clone' }).count();
    expect(finalCloneCount).toBe(updatedCloneCount - 1);
  });
});
