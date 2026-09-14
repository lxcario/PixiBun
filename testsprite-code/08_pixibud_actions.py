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

        # 1. Draw a pixel mark on canvas
        canvas = page.get_by_role("application", name="Pixel art drawing canvas. Use").or_(page.locator("#center-canvas-area")).first
        await canvas.click(force=True, timeout=10000)
        await page.wait_for_timeout(300)

        # 2. Open PixiBud AI tab
        tab_ai = page.get_by_test_id("tab-ai").or_(page.locator("button:has-text('PixiBud AI')")).first
        await tab_ai.click(timeout=10000)
        await page.wait_for_timeout(500)

        # 3. Click 'Analyze & Light Bulb'
        analyze_btn = page.locator("button[data-testid='analyze-light-bulb']").or_(page.locator("button:has-text('Analyze & Light Bulb')")).first
        if await analyze_btn.is_visible():
            await analyze_btn.click(timeout=10000)
            await page.wait_for_timeout(500)

        # 4. Click 'De-Jaggy'
        dejaggy_btn = page.locator("button:has-text('De-Jaggy')").first
        await dejaggy_btn.scroll_into_view_if_needed()
        assert await dejaggy_btn.is_visible(), "Expected 'De-Jaggy' button to be visible."
        await dejaggy_btn.click(timeout=10000)
        await page.wait_for_timeout(500)

        # 5. Click 'Sunset'
        sunset_btn = page.locator("button:has-text('Sunset')").first
        await sunset_btn.scroll_into_view_if_needed()
        assert await sunset_btn.is_visible(), "Expected 'Sunset' button to be visible."
        await sunset_btn.click(timeout=10000)
        await page.wait_for_timeout(500)

        # 6. Assertions
        assert await canvas.is_visible(), "Expected the pixel art drawing canvas to be visible."
        assert await dejaggy_btn.is_visible(), "Expected 'De-Jaggy' button to remain visible."
        assert await sunset_btn.is_visible(), "Expected 'Sunset' button to remain visible."

        await asyncio.sleep(1)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
