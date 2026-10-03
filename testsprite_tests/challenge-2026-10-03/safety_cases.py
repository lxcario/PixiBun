"""Executable challenge cases 04–12; browser UI and rendered pixels only.

Each case runs in a fresh context. No application stores, test hooks, synthetic
input dispatch, or injected export delays. A missed cancellation window fails
explicitly rather than passing without exercising cancellation.
"""
import asyncio
import json
import os
import re
import struct
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright, expect

TARGET = os.environ.get("PIXIBUN_CHALLENGE_URL", "http://127.0.0.1:3150").rstrip("/")


async def pixels(page):
    return await page.get_by_test_id("main-composite-canvas").evaluate(
        "c => Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)"
    )


async def same(page, expected):
    for _ in range(100):
        actual = await pixels(page)
        if actual == expected:
            return
        await asyncio.sleep(.05)
    assert actual == expected, "Rendered RGBA artwork differs from the expected exact snapshot"


async def ready(page):
    await page.goto(TARGET + "/studio")
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await expect(page.get_by_test_id("main-composite-canvas")).to_be_visible()


async def drag(page, start, end):
    box = await page.get_by_test_id("main-composite-canvas").bounding_box()
    assert box
    await page.mouse.move(box["x"] + box["width"] * start[0], box["y"] + box["height"] * start[1])
    await page.mouse.down()
    await page.mouse.move(box["x"] + box["width"] * end[0], box["y"] + box["height"] * end[1], steps=6)
    await page.mouse.up()


async def paint(page, second=False):
    await page.get_by_test_id("pen-tool").click()
    before = await pixels(page)
    await drag(page, (.7,.65) if second else (.2,.25), (.7,.8) if second else (.35,.25))
    for _ in range(100):
        after = await pixels(page)
        if after != before:
            return after
        await asyncio.sleep(.05)
    raise AssertionError("Actual pointer stroke did not change artwork")


async def save(page):
    await page.get_by_test_id("save-button").click()
    await expect(page.get_by_role("status").filter(has_text=re.compile("Changes saved"))).to_be_visible()


async def resize_dialog(page):
    await page.get_by_role("button", name="File", exact=True).click()
    await page.get_by_role("menuitem", name=re.compile("Canvas size")).click()
    dialog = page.get_by_role("dialog", name="Resize Canvas & Frame Bounds")
    await expect(dialog).to_be_visible()
    return dialog


def frames(page):
    return page.get_by_role("button", name=re.compile(r"^Select frame \d+\."))


async def select_frame(page, index):
    await page.get_by_role("button", name=re.compile(rf"^Select frame {index}\." )).click()


async def duration(page, value):
    field = page.get_by_role("spinbutton", name="Active frame duration in milliseconds")
    await field.fill(str(value))
    await field.press("Tab")
    await expect(field).to_have_value(str(value))


async def two_frames(page):
    first = await paint(page)
    await duration(page, 240)
    await page.get_by_test_id("add-frame-button").click()
    await expect(frames(page)).to_have_count(2)
    blank = await pixels(page)
    assert not any(blank[3::4]), "New frame must be transparent, not duplicate frame one"
    second = await paint(page, True)
    assert second != first
    return first, second


async def reload_history(page):
    await ready(page)
    first = await paint(page)
    await save(page)
    await page.reload()
    await same(page, first)
    second = await paint(page, True)
    await page.get_by_test_id("undo-button").click()
    await same(page, first)
    await page.get_by_test_id("redo-button").click()
    await same(page, second)
    await save(page)
    await page.reload()
    await same(page, second)


async def locked_history(page):
    await ready(page)
    first = await paint(page)
    both = await paint(page, True)
    await page.get_by_role("button", name="Lock layer Base Layer", exact=True).click()
    for tool, start, end in (
        ("pen-tool", (.45,.45), (.55,.45)),
        ("eraser-tool", (.2,.25), (.35,.25)),
        ("bucket-tool", (.5,.5), (.5,.5)),
    ):
        await page.get_by_test_id(tool).click()
        await drag(page, start, end)
        await same(page, both)
    await page.get_by_role("button", name="Unlock layer Base Layer", exact=True).click()
    await page.get_by_test_id("undo-button").click()
    await expect(page.get_by_role("button", name="Unlock layer Base Layer", exact=True)).to_be_visible()
    await same(page, both)
    await page.get_by_test_id("undo-button").click()
    await expect(page.get_by_role("button", name="Lock layer Base Layer", exact=True)).to_be_visible()
    await same(page, both)
    await page.get_by_test_id("undo-button").click()
    await same(page, first)
    await page.get_by_test_id("redo-button").click()
    await same(page, both)


async def frame_isolation(page):
    await ready(page)
    first, second = await two_frames(page)
    field = page.get_by_role("spinbutton", name="Active frame duration in milliseconds")
    old = await field.input_value()
    await duration(page, 700)
    await page.get_by_test_id("undo-button").click()
    await expect(field).to_have_value(old)
    await same(page, second)
    await select_frame(page, 1)
    await same(page, first)
    await expect(field).to_have_value("240")
    await select_frame(page, 2)
    await same(page, second)


async def resize_cancel(page):
    await ready(page)
    first = await paint(page)
    both = await paint(page, True)
    dialog = await resize_dialog(page)
    fields = dialog.get_by_role("spinbutton")
    await fields.nth(0).fill("999999")
    await expect(fields.nth(0)).to_have_value("512")
    assert 4 <= int(await fields.nth(1).input_value()) <= 512
    await fields.nth(1).fill("0")
    assert 4 <= int(await fields.nth(0).input_value()) <= 512
    assert 4 <= int(await fields.nth(1).input_value()) <= 512
    await dialog.get_by_test_id("resample-checkbox").uncheck()
    await dialog.get_by_test_id("anchor-bottom-right").click()
    await dialog.get_by_role("button", name="Cancel", exact=True).click()
    await same(page, both)
    assert await page.get_by_test_id("main-composite-canvas").evaluate("c=>[c.width,c.height]") == [32,32]
    await page.get_by_test_id("undo-button").click()
    await same(page, first)
    await page.get_by_test_id("redo-button").click()
    await same(page, both)


async def stale_tab_copy(page):
    await ready(page)
    await page.get_by_role("button", name=re.compile("^Rename project")).click()
    await page.locator("input:focus").fill("Challenge stale original")
    await page.locator("input:focus").press("Enter")
    await paint(page)
    await save(page)
    second = await page.context.new_page()
    await ready(second)
    await same(second, await pixels(page))
    original = await paint(page, True)
    await save(page)
    await drag(second, (.45,.45), (.55,.45))
    copy = await pixels(second)
    assert copy != original
    await second.get_by_test_id("save-button").click()
    await expect(second.get_by_role("alert").filter(has_text=re.compile("changed in another tab"))).to_be_visible()
    await page.reload()
    await same(page, original)
    await second.get_by_role("button", name="Save a copy", exact=True).click()
    await expect(second.get_by_role("alert").filter(has_text=re.compile("changed in another tab"))).to_have_count(0)
    await save(second)
    await second.reload()
    await same(second, copy)
    await save(page)
    await expect(page.get_by_role("alert").filter(has_text=re.compile("changed in another tab"))).to_have_count(0)
    await page.get_by_role("button", name="File", exact=True).click()
    await page.get_by_role("menuitem", name="Projects", exact=True).click()
    gallery = page.get_by_role("dialog", name=re.compile("Atelier Projects & Gallery"))
    await expect(gallery.get_by_role("button", name="Open project Challenge stale original (conflict copy)", exact=True)).to_be_visible()
    await gallery.get_by_role("button", name="Open project Challenge stale original", exact=True).click()
    await same(page, original)


async def backup_roundtrip(page):
    await ready(page)
    await page.get_by_role("button", name=re.compile("^Rename project")).click()
    await page.locator("input:focus").fill("Challenge portable backup")
    await page.locator("input:focus").press("Enter")
    first, second = await two_frames(page)
    await duration(page, 700)
    await page.get_by_test_id("export-button").click()
    dialog = page.get_by_role("dialog")
    await dialog.get_by_test_id("export-tab-project").click()
    async with page.expect_download() as pending:
        await dialog.get_by_role("button", name="Download project backup", exact=True).click()
    download = await pending.value
    path = await download.path()
    assert path and Path(path).stat().st_size > 0
    await page.get_by_role("button", name="File", exact=True).click()
    await page.get_by_role("menuitem", name=re.compile("New drawing")).click()
    confirmation = page.get_by_role("dialog")
    await confirmation.get_by_role("button", name="Start New Drawing", exact=True).click()
    assert not any((await pixels(page))[3::4])
    await page.locator("input[type=file]").first.set_input_files({
        "name": download.suggested_filename,
        "mimeType": "application/json",
        "buffer": Path(path).read_bytes(),
    })
    importing = page.get_by_role("dialog")
    await importing.get_by_role("button", name="Confirm Import", exact=True).click()
    await expect(importing).not_to_be_visible()
    await expect(page.get_by_role("button", name=re.compile("^Rename project"))).to_contain_text("Challenge portable backup")
    await expect(frames(page)).to_have_count(2)
    await select_frame(page, 1)
    await same(page, first)
    await expect(page.get_by_role("spinbutton", name="Active frame duration in milliseconds")).to_have_value("240")
    await select_frame(page, 2)
    await same(page, second)
    await expect(page.get_by_role("spinbutton", name="Active frame duration in milliseconds")).to_have_value("700")


async def floating_selection(page):
    await ready(page)
    await paint(page)
    original = await paint(page, True)
    await page.get_by_test_id("select-box-tool").click()
    await drag(page, (.1,.1), (.5,.5))
    await expect(page.get_by_test_id("selection-transform-gizmo")).to_be_visible()
    await drag(page, (.25,.25), (.375,.25))
    gizmo = page.get_by_test_id("selection-transform-gizmo")
    before = await gizmo.bounding_box()
    assert before
    await page.locator("#main-content").focus()
    await page.keyboard.press("ArrowRight")
    after = await gizmo.bounding_box()
    canvas = await page.get_by_test_id("main-composite-canvas").bounding_box()
    assert after and canvas and abs(after["x"] - before["x"] - canvas["width"]/32) < .2, "Arrow must move exactly one native pixel"
    assert after["y"] == before["y"]
    await page.keyboard.press("Enter")
    await expect(gizmo).not_to_be_visible()
    moved = await pixels(page)
    # The original top-left stroke moves five native pixels; untouched bottom-right stays exact.
    expected = original.copy()
    for y in range(16):
        for x in range(32):
            index = (y*32+x)*4
            expected[index:index+4] = [0,0,0,0]
    for y in range(16):
        for x in range(27):
            index = (y*32+x)*4
            destination = (y*32+x+5)*4
            expected[destination:destination+4] = original[index:index+4]
    assert moved == expected, "Only selected artwork must move the expected five pixels"
    await page.get_by_test_id("undo-button").click()
    await same(page, original)
    await page.get_by_test_id("redo-button").click()
    await same(page, moved)


async def keyboard_skip(page):
    await page.goto(TARGET + "/")
    link = page.get_by_role("link", name="Skip to content", exact=True)
    await page.keyboard.press("Tab")
    await expect(link).to_be_focused()
    await page.keyboard.press("Enter")
    await expect(page.locator("main#top")).to_be_focused()
    assert urlparse(page.url).path == "/" and urlparse(page.url).fragment == "top"
    await page.get_by_role("link", name="Studio", exact=True).first.click()
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await page.reload()
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await page.keyboard.press("Tab")
    await expect(link).to_be_focused()
    await page.keyboard.press("Enter")
    await expect(page.locator("#main-workspace")).to_be_focused()
    assert urlparse(page.url).path == "/studio" and urlparse(page.url).fragment == "main-workspace"


async def apng_cancel(page):
    await ready(page)
    dialog = await resize_dialog(page)
    await dialog.get_by_role("spinbutton").nth(0).fill("256")
    await dialog.get_by_role("spinbutton").nth(1).fill("256")
    await dialog.get_by_test_id("resample-checkbox").check()
    await dialog.get_by_role("button", name="Apply Resize", exact=True).click()
    await page.get_by_test_id("fit-canvas-button").click()
    artwork = await paint(page)
    for _ in range(23):
        await page.get_by_text("Frame actions", exact=False).click()
        await page.get_by_role("button", name="Duplicate frame", exact=True).click()
    await expect(frames(page)).to_have_count(24)
    await same(page, artwork)
    downloads = []
    page.on("download", lambda download: downloads.append(download))
    await page.get_by_test_id("export-button").click()
    dialog = page.get_by_role("dialog")
    await dialog.get_by_test_id("export-tab-apng").click()
    await dialog.get_by_role("button", name="2x", exact=True).click()
    await dialog.get_by_role("button", name="Download APNG", exact=True).click()
    await expect(dialog.get_by_text(re.compile("Encoding APNG"))).to_be_visible(timeout=2000)
    await page.keyboard.press("Escape")
    await expect(dialog).not_to_be_visible()
    await asyncio.sleep(2)
    assert not downloads, "Cancelled APNG must not produce a partial/completed download"
    await expect(frames(page)).to_have_count(24)
    await same(page, artwork)
    await page.get_by_test_id("export-button").click()
    dialog = page.get_by_role("dialog")
    await dialog.get_by_test_id("export-tab-png").click()
    await dialog.get_by_role("button", name="1x", exact=True).click()
    async with page.expect_download() as pending:
        await dialog.get_by_role("button", name="Download PNG", exact=True).click()
    path = await (await pending.value).path()
    data = Path(path).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", data[16:24]) == (256,256)
    decoded = await page.evaluate("""async data => {
        const blob=new Blob([Uint8Array.from(data)],{type:'image/png'});
        const bitmap=await createImageBitmap(blob);const c=document.createElement('canvas');
        c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);
        const result=Array.from(ctx.getImageData(0,0,c.width,c.height).data);bitmap.close();return result;
    }""", list(data))
    assert decoded == artwork, "Later completed PNG must decode into every original pixel"


CASES = (reload_history, locked_history, frame_isolation, resize_cancel, stale_tab_copy,
         apng_cancel, backup_roundtrip, floating_selection, keyboard_skip)


async def run_test():
    chosen = os.environ.get("PIXIBUN_CHALLENGE_CASE", "all")
    selected = [case for case in CASES if chosen == "all" or case.__name__ == chosen]
    assert selected, "Unknown case; never silently run zero tests"
    async with async_playwright() as playwright:
        for case in selected:
            # Firefox uses the actual browser-download flow; Chromium's native
            # OS Save picker cannot be accepted by headless Playwright.
            family = os.environ.get("PIXIBUN_CHALLENGE_BROWSER", "firefox" if case == backup_roundtrip else "chromium")
            options = {"headless": True}
            if family == "chromium":
                options["args"] = ["--disable-dev-shm-usage"]
            executable = os.environ.get(f"PIXIBUN_{family.upper()}_EXECUTABLE")
            if executable:
                options["executable_path"] = executable
            browser = await getattr(playwright, family).launch(**options)
            try:
                context = await browser.new_context(viewport={"width":1600,"height":1000}, color_scheme="dark")
                context.set_default_timeout(15000)
                try:
                    await case(await context.new_page())
                    print(json.dumps({"case":case.__name__,"browser":family,"verdict":"passed"}), flush=True)
                finally:
                    await context.close()
            finally:
                await browser.close()


asyncio.run(run_test())
