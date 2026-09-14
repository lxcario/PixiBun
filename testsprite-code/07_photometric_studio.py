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

        # 1. Draw a silhouette on the canvas
        canvas = page.get_by_role("application", name="Pixel art drawing canvas. Use").or_(page.locator("#center-canvas-area")).first
        await canvas.click(force=True, timeout=10000)
        await page.wait_for_timeout(300)

        # 2. Switch to PixiBud AI tab
        tab_ai = page.get_by_test_id("tab-ai").or_(page.locator("button:has-text('PixiBud AI')")).first
        await tab_ai.click(timeout=10000)
        await page.wait_for_timeout(500)

        # 3. Switch to Manual lighting mode if present
        manual_btn = page.locator("button:has-text('Manual')").first
        if await manual_btn.is_visible():
            await manual_btn.click(timeout=5000)
            await page.wait_for_timeout(300)

        # 4. Click 'Bake Normal Map'
        bake_btn = page.locator("button:has-text('Bake Normal Map')").first
        await bake_btn.scroll_into_view_if_needed()
        assert await bake_btn.is_visible(), "Expected 'Bake Normal Map' button to be visible."
        await bake_btn.click(timeout=10000)
        await page.wait_for_timeout(1000)

        # 5. Switch to Layers tab
        tab_layers = page.get_by_test_id("tab-layers").or_(page.locator("button:has-text('Layers')")).first
        await tab_layers.click(timeout=10000)
        await page.wait_for_timeout(500)

        # 6. Verify 'Normal Map' layer was generated in Layers list
        normal_map_layer = page.locator("button:has-text('Normal Map')").or_(page.locator("button[aria-label*='Normal Map']")).first
        await normal_map_layer.scroll_into_view_if_needed()
        assert await normal_map_layer.is_visible(), "Expected 'Normal Map' layer to be created in the Layers list after baking."

        # Verify drawing canvas is still visible
        assert await canvas.is_visible(), "Expected the pixel art drawing canvas to be visible."

        await asyncio.sleep(1)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
