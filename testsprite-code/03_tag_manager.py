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
        
        # -> Click the 'Studio' link in the top navigation to open the Studio page.
        # @@ts-step {"i":2,"type":"action","action":"click","selector":"xpath=/html/body/main/header/div/nav/a[2]","desc":"Click 'Studio link'","input":null,"field":"29"}
        # Studio link
        elem = page.get_by_label("Main Navigation").get_by_role("link", name="Studio")
        await elem.click(timeout=10000)
        
        # -> Open the Tag and Clip Manager by clicking the 'Manage Tags' button in the timeline.
        # @@ts-step {"i":3,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/footer/div[2]/div/button[3]","desc":"Click 'Manage Tags button'","input":null,"field":"5037"}
        # Manage Tags button
        elem = page.get_by_test_id("manage-tags-button")
        await elem.click(timeout=10000)
        
        # -> Fill 'Walk Cycle' into the New tag name field, click '+ Add Tag', then click 'Done' to close the Tag Manager modal.
        # @@ts-step {"i":4,"type":"action","action":"fill","selector":"xpath=/html/body/div[3]/div/footer/dialog/div/div[2]/div/form/div/input","desc":"Fill 'Walk Cycle' into New tag name text field","input":"Walk Cycle","field":"5329"}
        # New tag name text field
        elem = page.get_by_role("textbox", name="New tag name")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Walk Cycle")
        
        # -> Fill 'Walk Cycle' into the New tag name field, click '+ Add Tag', then click 'Done' to close the Tag Manager modal.
        # @@ts-step {"i":5,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/footer/dialog/div/div[2]/div/form/div/button","desc":"Click 'Add Tag button'","input":null,"field":"5331"}
        # Add Tag button
        elem = page.get_by_role("button", name="Add Tag")
        await elem.click(timeout=10000)
        
        # -> Done button closes Tag Manager modal
        elem = page.get_by_role("button", name="Done")
        await elem.click(timeout=10000)
        await page.wait_for_timeout(500)
        
        # -> Open the Tag and Clip Manager by clicking the 'Manage Tags' button to verify the Tag Manager modal and confirm the 'Walk Cycle' tag exists.
        # @@ts-step {"i":11,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/footer/div[2]/div/button[3]","desc":"Click 'Manage Tags button'","input":null,"field":"5037"}
        # Manage Tags button
        elem = page.get_by_test_id("manage-tags-button")
        await elem.click(timeout=10000)
        
        # -> Click the 'Done' button in the Tag Manager modal to close it and return to the studio workspace.
        # @@ts-step {"i":12,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/footer/dialog/div/div[2]/div/div[2]/button","desc":"Click 'Done button'","input":null,"field":"5662"}
        # Done button
        elem = page.get_by_role("button", name="Done")
        await elem.click(timeout=10000)
        
        # -> Open the Tag and Clip Manager by clicking the 'Manage Tags' button to verify the Tag Manager modal lists the 'Walk Cycle' tag.
        # @@ts-step {"i":13,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/footer/div[2]/div/button[3]","desc":"Click 'Manage Tags button'","input":null,"field":"5037"}
        # Manage Tags button
        elem = page.get_by_test_id("manage-tags-button")
        await elem.click(timeout=10000)
        
        # -> Click the 'Done' button in the Tag Manager modal to close it and return to the Studio workspace.
        # @@ts-step {"i":14,"type":"action","action":"click","selector":"xpath=/html/body/div[3]/div/footer/dialog/div/div[2]/div/div[2]/button","desc":"Click 'Done button'","input":null,"field":"5898"}
        # Done button
        elem = page.get_by_role("button", name="Done")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        # Studio workspace (main canvas) is visible
        canvas = page.get_by_role("application", name="Pixel art drawing canvas. Use").or_(page.locator("#center-canvas-area")).first
        await canvas.scroll_into_view_if_needed()
        assert await canvas.is_visible(), "Expected the canvas to be visible."
        
        # A tagged clip labeled 'Walk Cycle' is present
        tag_btn = page.locator("button:has-text('Walk Cycle')").or_(page.locator("text=Walk Cycle")).first
        await tag_btn.scroll_into_view_if_needed()
        assert await tag_btn.is_visible(), "Expected Walk Cycle tag to be present."
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    
