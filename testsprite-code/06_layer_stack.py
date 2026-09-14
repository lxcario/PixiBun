import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        context = await browser.new_context()
        context.set_default_timeout(15000)
        page = await context.new_page()

        await page.goto("VAR_{url}")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # Navigate to Studio
        studio_link = page.locator("a[href*='studio']").or_(page.get_by_role("link", name="Studio")).first
        if await studio_link.is_visible():
            await studio_link.click(timeout=10000)
        else:
            await page.goto(page.url.rstrip('/') + '/studio')
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass

        # Close preview window if open
        close_preview = page.locator("button[aria-label='Close Preview Window']").first
        if await close_preview.is_visible():
            await close_preview.click(timeout=3000)
            await page.wait_for_timeout(300)

        # 1. Verify Base Layer exists
        base_layer = page.locator("button[aria-label*='Base Layer']").or_(page.locator("text=Base Layer")).first
        await base_layer.scroll_into_view_if_needed()
        assert await base_layer.is_visible(), "Expected Base Layer to be visible initially."

        # 2. Add New Layer (Layer 2)
        add_layer_btn = page.locator("button[aria-label='Add New Layer']").or_(page.get_by_role("button", name="Add New Layer")).first
        await add_layer_btn.click(timeout=10000)
        await page.wait_for_timeout(500)

        layer2 = page.locator("button[aria-label*='Layer 2']").or_(page.locator("text=Layer 2")).first
        assert await layer2.is_visible(), "Expected Layer 2 to be created."

        # 3. Draw on canvas
        canvas = page.get_by_role("application", name="Pixel art drawing canvas. Use").or_(page.locator("#center-canvas-area")).first
        await canvas.click(force=True, timeout=10000)
        await page.wait_for_timeout(300)

        # 4. Modify Opacity slider
        opacity_slider = page.locator("input[aria-label='Layer opacity']").or_(page.get_by_role("slider", name="Layer opacity")).first
        if await opacity_slider.is_visible():
            await opacity_slider.fill("0.5")
            await page.wait_for_timeout(300)

        # 5. Modify Blend Mode dropdown
        blend_select = page.locator("select[aria-label='Layer blend mode']").first
        if await blend_select.is_visible():
            await blend_select.select_option("multiply")
            await page.wait_for_timeout(300)
            await blend_select.select_option("overlay")
            await page.wait_for_timeout(300)

        # 6. Lock Layer 2
        lock_btn = page.locator("button[aria-label*='Lock layer Layer 2']").or_(page.locator("button[title*='Lock Layer']")).first
        await lock_btn.click(timeout=10000)
        await page.wait_for_timeout(500)

        # Verify Unlock button is now present
        unlock_btn = page.locator("button[aria-label*='Unlock layer Layer 2']").or_(page.locator("button[title*='Unlock Layer']")).first
        assert await unlock_btn.is_visible(), "Expected Unlock button to be visible after locking."

        # 7. Unlock Layer 2
        await unlock_btn.click(timeout=10000)
        await page.wait_for_timeout(500)

        # 8. Merge Down Layer 2
        merge_btn = page.locator("button[aria-label*='Merge down layer Layer 2']").or_(page.locator("button[title*='Merge Down']")).first
        await merge_btn.click(timeout=10000)
        await page.wait_for_timeout(500)

        # Confirm Merge Down
        confirm_merge_btn = page.locator("button[aria-label*='Confirm merge down layer Layer 2']").or_(page.locator("button[title*='Click again to confirm merge']")).first
        await confirm_merge_btn.click(timeout=10000)
        await page.wait_for_timeout(800)

        # 9. Verify Base Layer remains and Layer 2 is removed
        await base_layer.scroll_into_view_if_needed()
        assert await base_layer.is_visible(), "Expected Base Layer to be visible after merge down."

        layer2_count = await page.locator("button[aria-label*='Select layer Layer 2']").count()
        assert layer2_count == 0, f"Expected Layer 2 to be deleted after merge down, but found {layer2_count} instances."

        await asyncio.sleep(1)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
