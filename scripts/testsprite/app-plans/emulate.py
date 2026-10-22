"""Run an App plan spec the way the TestSprite GitHub App agent can.

The App agent reads the page and acts on named elements: navigate, click (at the
element's centre), fill, select, upload, scroll, a few keys. It cannot drag, read
a downloaded file or sample canvas pixels. This runner uses only those gestures,
so a spec that passes here is one the agent can actually carry out. Artwork is
checked through the Studio's own Canvas readout (painted pixels, color counts,
frame digest), exactly the text the agent reads.

Usage:
  python scripts/testsprite/app-plans/emulate.py [spec.json ...]
Environment:
  PIXIBUN_URL   origin under test (default http://localhost:3000)
  HEADED=1      show the browser
"""
import json
import os
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

HERE = Path(__file__).resolve().parent
BASE = os.environ.get("PIXIBUN_URL", "http://localhost:3000").rstrip("/")
FIELDS = {
    "size": "size", "frame": "frame", "frames": "frames", "layer": "layer", "layers": "layers",
    "pixels": "pixels", "colors": "colors", "top": "top-colors", "digest": "digest",
}


FIELDS_ALIAS = {}


class StepFailed(AssertionError):
    pass


def readout(page):
    # Locator waits only: the deployed Content Security Policy forbids evaluated strings.
    section = page.locator("[data-testid=canvas-readout]")
    expect(section).to_have_attribute("data-state", "ready", timeout=20000)
    # A burst of commits can schedule one more read; let it settle.
    time.sleep(0.25)
    expect(section).to_have_attribute("data-state", "ready", timeout=20000)
    return {k: page.locator(f"[data-testid=canvas-readout-{v}]").inner_text().strip() for k, v in FIELDS.items()}


def scope(page, step):
    if "within" in step:
        return page.get_by_role("dialog", name=step["within"])
    return page


def named(page, step, key):
    role = step.get("role", "button")
    name = step[key]
    if name.startswith("/"):
        flags = re.IGNORECASE if name.endswith("/i") else 0
        pattern = re.compile(name[1:-2] if name.endswith("/i") else name[1:-1], flags)
        target = scope(page, step).get_by_role(role, name=pattern)
    else:
        target = scope(page, step).get_by_role(role, name=name, exact=True)
    return target.nth(step["nth"]) if "nth" in step else target.first


def run_step(page, step, memory):
    if "open" in step:
        page.goto(BASE + step["open"], timeout=180000)
        if "replay=" in step["open"]:
            page.wait_for_selector("[data-testid=replay-status][data-state=applied]", state="attached", timeout=30000)
        return
    if "skip" in step:
        try:
            page.get_by_role("button", name="Skip setup").click(timeout=8000)
        except Exception:
            pass
        return
    if "click" in step:
        if step.get("optional"):
            try:
                named(page, step, "click").click(timeout=2500)
            except Exception:
                pass
            return
        target = named(page, step, "click")
        try:
            target.click(timeout=4000 if step.get("role") in ("checkbox", "radio", "switch") else 10000)
        except Exception:
            if step.get("role") not in ("checkbox", "radio", "switch"):
                raise
            # A visually hidden input inside its label: the agent activates the
            # element itself rather than the point under the cursor.
            target.evaluate("element => element.click()")
    elif "rightClick" in step:
        named(page, step, "rightClick").click(button="right", timeout=10000)
    elif "canvas" in step:
        page.get_by_label("Pixel art canvas workspace").click(timeout=10000)
    elif "fill" in step:
        field = scope(page, step).get_by_label(step["fill"], exact=True)
        field.fill(step["value"], timeout=10000)
    elif "select" in step:
        scope(page, step).get_by_label(step["select"], exact=True).select_option(label=step["option"], timeout=10000)
    elif "key" in step:
        page.keyboard.press(step["key"])
    elif "color" in step:
        pot = step.get("pot", "Primary")
        page.get_by_role("button", name=re.compile(f"^{pot} color")).first.click(timeout=10000)
        page.get_by_label(f"{pot} hex value", exact=True).fill(step["color"], timeout=10000)
        page.get_by_role("button", name="Close color access").click(timeout=10000)
    elif "command" in step:
        # The command palette's own search field and the matching result.
        page.keyboard.press("Control+k")
        page.get_by_label("Search studio commands", exact=True).fill(step["command"], timeout=10000)
        page.get_by_role("option", name=re.compile(re.escape(step["command"]))).first.click(timeout=10000)
    elif "record" in step:
        memory[step["record"]] = readout(page)
        print(f"      recorded {step['record']}: {memory[step['record']]}")
    elif "readout" in step:
        actual = readout(page)
        for field, want in step["readout"].items():
            if field.endswith("~"):
                # One 8-bit step per channel, same pixel count: "#808080 256".
                hex_want, count_want = want.split()
                hex_got, count_got = actual[FIELDS_ALIAS.get(field[:-1], field[:-1])].split()
                close = all(abs(int(hex_want[i:i + 2], 16) - int(hex_got[i:i + 2], 16)) <= 1 for i in (1, 3, 5))
                if not close or count_got != count_want:
                    raise StepFailed(f"readout {field[:-1]}: expected about {want!r}, got {hex_got} {count_got}")
                continue
            if isinstance(want, str) and want.startswith("="):
                ref, _, sub = want[1:].partition(".")
                want = memory[ref][sub or field]
            if isinstance(want, str) and want.startswith("!="):
                ref, _, sub = want[2:].partition(".")
                bad = memory[ref][sub or field] if ref in memory else ref
                if actual[field] == bad:
                    raise StepFailed(f"readout {field} still {bad}")
                continue
            if actual[field] != str(want):
                raise StepFailed(f"readout {field}: expected {want!r}, got {actual[field]!r}")
    elif "visible" in step:
        expect(named(page, step, "visible")).to_be_visible(timeout=10000)
    elif "absent" in step:
        expect(scope(page, step).get_by_role(step.get("role", "button"), name=step["absent"], exact=True)).to_have_count(0, timeout=10000)
    elif "enabled" in step:
        expect(named(page, step, "enabled")).to_be_enabled(timeout=10000)
    elif "disabled" in step:
        expect(named(page, step, "disabled")).to_be_disabled(timeout=10000)
    elif "pressed" in step:
        expect(named(page, step, "pressed")).to_have_attribute("aria-pressed", "true", timeout=10000)
    elif "checked" in step:
        expect(named(page, step, "checked")).to_be_checked(timeout=10000)
    elif "unchecked" in step:
        expect(named(page, step, "unchecked")).not_to_be_checked(timeout=10000)
    elif "field" in step:
        expect(scope(page, step).get_by_label(step["field"], exact=True)).to_have_value(step["equals"], timeout=10000)
    elif "text" in step:
        expect(page.get_by_text(step["text"], exact=False).first).to_be_attached(timeout=10000)
    elif "alert" in step:
        alert = page.get_by_role("alert").filter(has_text=step["alert"]).first
        expect(alert).to_be_visible(timeout=10000)
        # Chrome drops content outside an open modal dialog from the accessibility tree
        # (it is inert), and the App agent reads that tree. Playwright's role query does not.
        if not alert.evaluate("el => { const top = [...document.querySelectorAll('dialog')].filter(d => d.matches(':modal')).pop(); return !top || top.contains(el); }"):
            raise StepFailed("the alert is outside the open modal dialog, so it is inert and never announced")
    elif "note" in step:
        return
    else:
        raise ValueError(f"unknown step {step}")
    if step.get("settle"):
        time.sleep(step["settle"])


def run_spec(browser, path):
    spec = json.loads(Path(path).read_text(encoding="utf-8"))
    context = browser.new_context(viewport={"width": 1920, "height": 1080}, accept_downloads=False)
    page = context.new_page()
    memory = {}
    print(f"\n{spec['key']} — {spec['title']}")
    ok = True
    for index, step in enumerate(spec["steps"], 1):
        kind = next(k for k in step if k not in ("role", "within", "nth", "value", "option", "equals", "pot", "settle", "say", "why", "optional", "assert", "shown"))
        try:
            run_step(page, step, memory)
            print(f"  {index:>2} ok   {kind}: {step.get(kind)}")
        except Exception as error:  # noqa: BLE001 - report every failure kind the same way
            ok = False
            first = str(error).splitlines()[0][:220]
            print(f"  {index:>2} FAIL {kind}: {step.get(kind)} -> {first}")
            page.screenshot(path=str(HERE / "out" / f"{spec['key']}-fail.png"))
            break
    context.close()
    return spec["key"], ok


def main(argv):
    paths = argv or sorted(str(p) for p in (HERE / "specs").glob("*.json"))
    (HERE / "out").mkdir(exist_ok=True)
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=os.environ.get("HEADED") != "1")
        for path in paths:
            results.append(run_spec(browser, path))
        browser.close()
    print("\nSummary:")
    for key, ok in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {key}")
    receipt = {"origin": BASE, "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "results": dict(results)}
    (HERE / "out" / "emulation-receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    return 0 if all(ok for _, ok in results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
