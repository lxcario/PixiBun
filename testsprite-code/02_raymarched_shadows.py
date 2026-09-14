import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        # @@ts-step {"i":1,"type":"action","action":"navigate","selector":null,"desc":"Navigate to VAR_{url}","input":"VAR_{url}","field":null}
        await page.goto("VAR_{url}")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # Navigate to Studio workspace
        studio_link = page.locator("a[href*='studio']").or_(page.get_by_role("link", name="Studio")).first
        if await studio_link.is_visible():
            await studio_link.click(timeout=10000)
        else:
            await page.goto(page.url.rstrip('/') + '/studio')
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'PixiBud AI' tab on the right panel to reveal Raymarched Soft Shadows
        tab_ai = page.get_by_test_id("tab-ai").or_(page.locator("button:has-text('PixiBud AI')")).first
        await tab_ai.click(timeout=10000)
        await page.wait_for_timeout(500)
        
        # --> Assertions to verify final state
        elem = page.locator("text=Raymarched Soft Shadows").first
        await elem.scroll_into_view_if_needed()
        assert await elem.is_visible(), "The Studio Inspector should list 'Raymarched Soft Shadows' as an available shadow engine."

        # Switch to Manual mode to reveal detailed controls
        manual_btn = page.locator("button:has-text('Manual')").first
        if await manual_btn.is_visible():
            await manual_btn.click()
            await page.wait_for_timeout(300)

        # Assert shadow style options
        elem = page.locator("text=Directional Cast").or_(page.locator("text=Cast Shadow")).or_(page.locator("text=Raymarched")).first
        await elem.scroll_into_view_if_needed()
        assert await elem.is_visible(), "Directional Cast shadow option should be available."

        # Assert shadow color preset
        elem = page.locator("button:has-text('Obsidian')").or_(page.locator("button:has-text('Indigo')")).or_(page.locator("text=Shadow Tint")).first
        await elem.scroll_into_view_if_needed()
        assert await elem.is_visible(), "Shadow color preset (Obsidian/Indigo) should be visible."

        # Assert dither options
        elem = page.locator("button:has-text('2x2')").or_(page.locator("button:has-text('4x4')")).or_(page.locator("text=Dither")).first
        await elem.scroll_into_view_if_needed()
        assert await elem.is_visible(), "Ordered dither options should be visible."
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
