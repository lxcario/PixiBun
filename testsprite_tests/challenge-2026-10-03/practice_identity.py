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


async def open_practice(page):
    await page.get_by_title("Return to PixiBun Home", exact=True).click()
    await expect(page).to_have_url(re.compile(r"/$"))
    await page.get_by_role("navigation").get_by_role("link", name="Playground", exact=True).click()
    await expect(page.get_by_role("button", name="Return to drawing", exact=True)).to_be_visible()
    await page.get_by_role("button", name="Trace Stencil", exact=True).click()
    for _ in range(100):
        traced = await pixels(page)
        if any(value > 0 for value in traced[3::4]):
            return traced
        await asyncio.sleep(0.05)
    assert False, "Trace Stencil must actually create visible artwork"


async def challenge(page):
    target = os.environ.get("PIXIBUN_CHALLENGE_URL", "http://127.0.0.1:3150").rstrip("/")
    await page.goto(target + "/studio")
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await page.get_by_role("button", name=re.compile("^Rename project ")).click()
    await page.locator("input:focus").fill("Challenge original")
    await page.locator("input:focus").press("Enter")
    await page.get_by_test_id("pen-tool").click()
    first = await stroke(page, (0.2, 0.25), (0.35, 0.25))
    artwork = await stroke(page, (0.7, 0.65), (0.7, 0.8))
    await page.get_by_test_id("undo-button").click()
    await same_pixels(page, first, "Practice precondition must retain only the first stroke")
    await expect(page.get_by_test_id("redo-button")).to_be_enabled()
    traced = await open_practice(page)
    assert traced != first and traced != artwork, "Practice must be separate recognizable stencil artwork"
    await page.get_by_role("button", name="Return to drawing", exact=True).click()
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await same_pixels(page, first, "Return must restore exact original pixels")
    await expect(page.get_by_role("button", name="Rename project Challenge original", exact=True)).to_be_visible()
    await expect(page.get_by_test_id("redo-button")).to_be_enabled()
    await page.get_by_test_id("redo-button").click()
    await same_pixels(page, artwork, "Return must preserve the original Redo buffer")
    kept = await open_practice(page)
    await page.get_by_role("button", name="Keep practice in Studio", exact=True).click()
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await same_pixels(page, kept, "Keep must transfer the exact practice pixels to Studio")
    kept_identity = await page.get_by_role("button", name=re.compile("^Rename project ")).get_attribute("aria-label")
    assert kept_identity != "Rename project Challenge original", "Keep must allocate a separate project identity"
    await page.reload()
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await same_pixels(page, kept, "Kept practice must survive reloading")
    await expect(page.get_by_role("button", name=kept_identity, exact=True)).to_be_visible()
    await page.get_by_test_id("file-menu-button").click()
    await page.get_by_role("menuitem", name="Projects", exact=True).click()
    gallery = page.get_by_role("dialog", name=re.compile("Atelier Projects & Gallery"))
    await gallery.get_by_role("button", name="Open project Challenge original", exact=True).click()
    await expect(gallery).not_to_be_visible()
    await same_pixels(page, artwork, "Keeping practice must not overwrite either stroke in the saved original")
    print(json.dumps({"case": "practice_identity", "verdict": "passed", "comparedRgbaBytes": len(artwork), "keptIdentity": kept_identity, "redoPreserved": True}))


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
