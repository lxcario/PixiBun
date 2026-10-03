"""Self-contained TestSprite frontend regressions: real pixels and pointer input.

Runs through the production UI. It reads rendered canvas pixels, never app stores.
The local target matches the registered loopback environment. Set
PIXIBUN_CHALLENGE_URL for a different explicitly selected target when run locally.
"""

import asyncio
import json
import os
import re
from playwright.async_api import async_playwright, expect


async def pixels(page):
    return await page.get_by_test_id("main-composite-canvas").evaluate(
        "c => Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data)"
    )


async def same_pixels(page, expected, message):
    for _ in range(100):
        actual = await pixels(page)
        if actual == expected:
            return
        await asyncio.sleep(0.05)
    assert actual == expected, message


async def stroke(page, start, end):
    canvas = page.get_by_test_id("main-composite-canvas")
    before = await pixels(page)
    box = await canvas.bounding_box()
    assert box and box["width"] > 0, "The actual drawing canvas must have geometry"
    await page.mouse.move(box["x"] + box["width"] * start[0], box["y"] + box["height"] * start[1])
    await page.mouse.down()
    await page.mouse.move(box["x"] + box["width"] * end[0], box["y"] + box["height"] * end[1], steps=6)
    await page.mouse.up()
    for _ in range(100):
        after = await pixels(page)
        if after != before:
            break
        await asyncio.sleep(0.05)
    assert after != before, "A real pointer stroke must change canvas pixels"
    return after


async def challenge(page):
    target = os.environ.get("PIXIBUN_CHALLENGE_URL", "http://127.0.0.1:3150").rstrip("/")
    await page.goto(target + "/studio")
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await page.get_by_role("button", name=re.compile("^Rename project ")).click()
    await page.locator("input:focus").fill("Challenge guest original")
    await page.locator("input:focus").press("Enter")
    await page.get_by_test_id("pen-tool").click()
    first = await stroke(page, (0.2, 0.25), (0.35, 0.25))
    artwork = await stroke(page, (0.7, 0.65), (0.7, 0.8))
    await page.get_by_test_id("save-button").click()
    await expect(page.get_by_role("status").filter(has_text=re.compile("^Changes saved$"))).to_be_visible()
    await page.get_by_role("button", name="Studio options", exact=True).click()
    await page.get_by_role("button", name="Co-Draw session", exact=True).click()
    dialog = page.get_by_role("dialog", name=re.compile("Peer-to-Peer Co-Draw"))
    await expect(dialog).to_be_visible()
    await dialog.get_by_role("button", name="Join Session", exact=True).click()
    await dialog.get_by_role("textbox", name="Host invite code input").fill("invalid-invite")
    await dialog.get_by_role("button", name="Save My Drawing & Join Separately").click()
    await expect(dialog.get_by_text(re.compile("invalid.*(token|format)|not valid", re.I))).to_be_visible()
    await expect(dialog.get_by_role("textbox", name="Generated answer token")).to_have_count(0)
    await dialog.get_by_role("button", name="Close", exact=True).click()
    await expect(page.get_by_role("button", name="Rename project Challenge guest original", exact=True)).to_be_visible()
    await same_pixels(page, artwork, "A rejected invite must preserve every original artwork pixel")
    await page.get_by_test_id("undo-button").click()
    await same_pixels(page, first, "Rejected pairing must not consume or replace the original Undo history")
    await page.get_by_test_id("redo-button").click()
    await same_pixels(page, artwork, "Redo after pairing failure must restore the second stroke exactly")
    await page.get_by_test_id("save-button").click()
    await expect(page.get_by_role("status").filter(has_text=re.compile("^Changes saved$"))).to_be_visible()
    await page.reload()
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await same_pixels(page, artwork, "Saved original must survive reloading after a rejected invite")
    await expect(page.get_by_role("button", name="Rename project Challenge guest original", exact=True)).to_be_visible()
    await page.get_by_test_id("file-menu-button").click()
    await page.get_by_role("menuitem", name="Projects", exact=True).click()
    gallery = page.get_by_role("dialog", name=re.compile("Atelier Projects & Gallery"))
    await expect(gallery.get_by_role("button", name="Open project Challenge guest original", exact=True)).to_be_visible()
    await expect(gallery.get_by_role("button", name="Open project Shared Drawing", exact=True)).to_have_count(0)
    print(json.dumps({"case": "invalid_invite", "verdict": "passed", "comparedRgbaBytes": len(artwork), "savedIdentity": "Challenge guest original"}))


async def run_test():
    async with async_playwright() as playwright:
        options = {"headless": True, "args": ["--disable-dev-shm-usage"]}
        if os.environ.get("PIXIBUN_CHROMIUM_EXECUTABLE"):
            options["executable_path"] = os.environ["PIXIBUN_CHROMIUM_EXECUTABLE"]
        browser = await playwright.chromium.launch(**options)
        context = await browser.new_context(viewport={"width": 1600, "height": 1000}, color_scheme="dark")
        context.set_default_timeout(15000)
        try:
            page = await context.new_page()
            await challenge(page)
        finally:
            await context.close()
            await browser.close()


asyncio.run(run_test())
