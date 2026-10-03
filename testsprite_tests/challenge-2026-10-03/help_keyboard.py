"""Self-contained TestSprite frontend regression: real pixels and pointer input.

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
    await expect(page.get_by_test_id("main-composite-canvas")).to_be_visible()
    await page.get_by_test_id("pen-tool").click()
    first = await stroke(page, (0.2, 0.25), (0.35, 0.25))
    artwork = await stroke(page, (0.7, 0.65), (0.7, 0.8))
    await page.get_by_test_id("select-box-tool").click()
    box = await page.get_by_test_id("main-composite-canvas").bounding_box()
    await page.mouse.move(box["x"] + box["width"] * 0.1, box["y"] + box["height"] * 0.1)
    await page.mouse.down()
    await page.mouse.move(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.5, steps=6)
    await page.mouse.up()
    gizmo = page.get_by_test_id("selection-transform-gizmo")
    await expect(gizmo).to_be_visible()
    selection = await gizmo.bounding_box()
    assert await pixels(page) == artwork, "Creating a marquee must not edit pixels"
    await page.locator("#main-content").focus()
    await page.keyboard.press("Shift+/")
    help_dialog = page.get_by_role("dialog", name=re.compile("Atelier Guide & Shortcuts"))
    await expect(help_dialog).to_be_visible()
    await help_dialog.get_by_role("button", name="Close dialog", exact=True).focus()
    for key in ("Control+z", "Control+Shift+z", "Control+s", "e", "Delete", "ArrowRight", "Shift+h"):
        await page.keyboard.press(key)
        await expect(help_dialog).to_be_visible()
        assert await pixels(page) == artwork, f"Help must absorb {key} without changing artwork"
        assert await gizmo.bounding_box() == selection, f"Help must absorb {key} without moving selection"
        await expect(page.get_by_test_id("select-box-tool")).to_have_class(re.compile("pixel-primary-btn"))
    await page.keyboard.press("Escape")
    await expect(help_dialog).not_to_be_visible()
    await expect(gizmo).to_be_visible()
    assert await pixels(page) == artwork, "Closing Help must leave the original selection artwork intact"
    await page.locator("#main-content").focus()
    await page.keyboard.press("Escape")
    await expect(gizmo).not_to_be_visible()
    assert await pixels(page) == artwork, "Cancelling the marquee must preserve artwork"
    await page.get_by_test_id("undo-button").click()
    await same_pixels(page, first, "Undo must remove exactly the second stroke, not consume a phantom modal edit")
    await page.get_by_test_id("redo-button").click()
    await same_pixels(page, artwork, "Redo must restore every original pixel")
    print(json.dumps({"case": "help_keyboard", "verdict": "passed", "modalKeys": 7, "comparedRgbaBytes": len(artwork)}))


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
