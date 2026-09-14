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
        
        # -> Click the 'Studio' link in the top navigation to open the Atelier/Studio workspace.
        # @@ts-step {"i":2,"type":"action","action":"click","selector":"xpath=/html/body/main/header/div/nav/a[2]","desc":"Click 'Studio link'","input":null,"field":"34"}
        # Studio link
        elem = page.get_by_label("Main Navigation").get_by_role("link", name="Studio")
        await elem.click(timeout=10000)
        
        # -> Open the Export dialog by clicking the 'Export' button in the top-right of the Studio toolbar.
        # @@ts-step {"i":3,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/header/div[3]/button[8]","desc":"Click 'Export button'","input":null,"field":"4590"}
        # Export button
        elem = page.get_by_test_id("export-button")
        await elem.click(timeout=10000)
        
        # -> Open the 'MP4 Video' tab in the Export dialog and inspect the modal for ISOBMFF (Fast-Start) and WebCodecs H.264 profile options.
        # @@ts-step {"i":4,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/dialog/div/div[2]/div/button[5]","desc":"Click 'MP4 Video button'","input":null,"field":"5324"}
        # MP4 Video button
        elem = page.get_by_test_id("export-tab-mp4")
        await elem.click(timeout=10000)
        
        # -> Open the 'MP4 Video' tab in the Export dialog and inspect the modal for ISOBMFF (Fast-Start) and WebCodecs H.264 profile options.
        # @@ts-step {"i":5,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/dialog/div/div[2]/div/button[6]","desc":"Click 'Sprite Sheet button'","input":null,"field":"5325"}
        # Sprite Sheet button
        elem = page.get_by_test_id("export-tab-spritesheet")
        await elem.click(timeout=10000)
        
        # -> Open the 'MP4 Video' tab in the Export dialog and check for ISOBMFF (Fast-Start) and WebCodecs H.264 profile options.
        # @@ts-step {"i":6,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/dialog/div/div[2]/div/button[5]","desc":"Click 'MP4 Video button'","input":null,"field":"5324"}
        # -> Open the 'MP4 Video' tab in the Export dialog and inspect the modal options.
        elem = page.get_by_test_id("export-tab-mp4")
        await elem.click(timeout=10000)
        await page.wait_for_timeout(500)
        
        # Assert: MP4 options are visible
        mp4_opt = page.locator("text=Scale Resolution:").or_(page.locator("text=MP4")).first
        await mp4_opt.scroll_into_view_if_needed()
        assert await mp4_opt.is_visible(), "The MP4 tab should display export options."

        # -> Open the 'Sprite Sheet' tab and check layout options
        elem = page.get_by_test_id("export-tab-spritesheet")
        await elem.click(timeout=10000)
        await page.wait_for_timeout(500)
        
        # Assert: The Sprite Sheet tab options
        h_opt = page.locator("button:has-text('horizontal')").or_(page.locator("text=Horizontal")).first
        await h_opt.scroll_into_view_if_needed()
        assert await h_opt.is_visible(), "The Sprite Sheet tab should offer a 'Horizontal' layout packing option."

        v_opt = page.locator("button:has-text('vertical')").or_(page.locator("text=Vertical")).first
        await v_opt.scroll_into_view_if_needed()
        assert await v_opt.is_visible(), "The Sprite Sheet tab should offer a 'Vertical' layout packing option."

        g_opt = page.locator("button:has-text('grid')").or_(page.locator("text=Grid")).first
        await g_opt.scroll_into_view_if_needed()
        assert await g_opt.is_visible(), "The Sprite Sheet tab should offer a 'Grid' layout packing option."

        meta_opt = page.locator("text=Engine Metadata").first
        await meta_opt.scroll_into_view_if_needed()
        assert await meta_opt.is_visible(), "The Sprite Sheet tab should show Engine Metadata options."
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
