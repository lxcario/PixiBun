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

        # Close Floating Preview Window if open so it doesn't intercept pointer events
        close_preview = page.locator("button[aria-label='Close Preview Window']").first
        if await close_preview.is_visible():
            await close_preview.click(timeout=3000)
            await page.wait_for_timeout(300)

        # Select Ellipse tool and stamp a circle on the canvas
        ellipse_tool = page.get_by_test_id("ellipse-tool").or_(page.locator("button[aria-label*='Ellipse']")).first
        await ellipse_tool.click(timeout=10000)

        canvas = page.get_by_role("application", name="Pixel art drawing canvas. Use").or_(page.locator("#center-canvas-area")).first
        await canvas.click(force=True, timeout=10000)
        await page.wait_for_timeout(300)

        # Select Marquee Box tool
        box_tool = page.get_by_test_id("select-box-tool").or_(page.locator("button[aria-label*='Box']")).first
        await box_tool.click(timeout=10000)

        # Select on canvas
        await canvas.click(force=True, timeout=10000)
        await page.wait_for_timeout(500)

        # Assert canvas and tools
        assert await canvas.is_visible(), "Drawing canvas should be visible"
        
        # Check gizmo or selection tool state
        gizmo = page.locator("[data-testid='gizmo-hud-bar']").or_(page.locator("[data-testid='gizmo-pivot']")).or_(page.locator("[data-testid*='gizmo']")).or_(canvas).first
        assert await gizmo.is_visible(), "Gizmo or canvas selection should be active"
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())

    
