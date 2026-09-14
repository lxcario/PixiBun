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

        # Draw mark on Frame 1
        canvas = page.get_by_role("application", name="Pixel art drawing canvas. Use").or_(page.locator("#center-canvas-area")).first
        await canvas.click(force=True, timeout=10000)
        await page.wait_for_timeout(300)

        # Add Frame 2
        add_frame = page.get_by_test_id("add-frame-button").or_(page.locator("button:has-text('Frame')")).first
        await add_frame.click(timeout=10000)
        await page.wait_for_timeout(500)

        # Draw mark on Frame 2
        await canvas.click(force=True, timeout=10000)
        await page.wait_for_timeout(300)

        # Select Frame 1
        frame1 = page.locator("button[aria-label*='frame 1']").or_(page.locator("button[aria-label*='Frame 1']")).or_(page.locator("button:has-text('1')")).first
        if await frame1.is_visible():
            await frame1.click(timeout=10000)
            await page.wait_for_timeout(300)

        # Open PixiBud AI tab
        tab_ai = page.get_by_test_id("tab-ai").or_(page.locator("button:has-text('PixiBud AI')")).first
        await tab_ai.click(timeout=10000)
        await page.wait_for_timeout(500)

        # Assert: In-Between Frame (Morph) button is visible
        morph_btn = page.locator("button:has-text('In-Between Frame')").or_(page.locator("text=+ In-Between Frame (Morph)")).first
        await morph_btn.scroll_into_view_if_needed()
        assert await morph_btn.is_visible(), "Expected '+ In-Between Frame (Morph)' button to be visible."

        # Click + In-Between Frame (Morph)
        await morph_btn.click(timeout=10000)
        await page.wait_for_timeout(800)

        # Assert timeline has frames
        frames = page.locator("button[aria-label*='frame']")
        count = await frames.count()
        assert count >= 2, f"Expected at least 2 or 3 frames in timeline, got {count}"
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
