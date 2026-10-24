"""Bounded supporting replay for the 19 October UI reports.

Real keyboard/pointer actions and read-only native RGBA. No store/raster writes.
SCENARIO selects one case when publishing a standalone copy to TestSprite.
This manually controlled replay is not an automatic GitHub App result.
"""
import asyncio
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit
from playwright import async_api
from playwright.async_api import expect

SCENARIO = 'quick-tools'
EXPECTED_COMMIT = None
TARGET = 'VAR_{url}'

async def raster(page, name='main-composite-canvas'):
    return await page.get_by_test_id(name).evaluate('c => Array.from(c.getContext("2d").getImageData(0,0,c.width,c.height).data)')

async def exact(page, expected):
    for _ in range(100):
        if await raster(page) == expected:
            return
        await asyncio.sleep(.05)
    raise AssertionError('Native RGBA differs from the required literal/restoration')

async def project_snapshot(page):
    """Actual downloaded bytes; the replay explicitly qualifies download fallback."""
    await page.get_by_test_id('export-button').click()
    await page.get_by_test_id('export-tab-project').click()
    async with page.expect_download() as pending:
        await page.get_by_role('button', name='Download project backup', exact=True).click()
    file = await pending.value
    assert await file.failure() is None
    path = await file.path()
    assert path
    project = json.loads(Path(path).read_bytes())
    for key in ('createdAt', 'updatedAt'): project.pop(key, None)
    return project

async def choose(page, name):
    shelf = page.locator('[data-shelf]')
    direct = shelf.get_by_test_id(name + '-tool')
    if await direct.is_visible():
        await direct.click()
    else:
        await shelf.locator('[data-tools~="' + name + '"] button[aria-haspopup]').click(button='right')
        await page.get_by_role('menu').get_by_test_id(name + '-tool').click()

async def quick_tools(page):
    before = await raster(page)
    workspace = page.locator('#center-canvas-area')
    await workspace.focus()
    await workspace.press('Shift+F10')
    menu = page.get_by_role('dialog', name='Canvas tools', exact=True)
    await expect(menu).to_be_visible()
    await expect(menu.get_by_role('button', name='Swap primary and secondary colors', exact=True)).to_be_visible()
    await menu.get_by_role('button', name='Eraser', exact=True).click()
    await expect(menu).to_have_count(0)
    await expect(page.get_by_test_id('eraser-tool')).to_have_attribute('aria-pressed', 'true')
    await expect(workspace).to_be_focused()
    await workspace.press('Shift+F10')
    await expect(menu).to_be_visible()
    await page.keyboard.press('Escape')
    await expect(menu).to_have_count(0)
    await expect(workspace).to_be_focused()
    assert await raster(page) == before, 'Menu interaction changed artwork'
    return {'actualKeyChord': True, 'toolSelected': 'eraser', 'escapeReturnedFocus': True, 'allRgbaPreserved': True}

async def erase(page):
    before = await raster(page)
    await page.get_by_test_id('toolbar-color-dock').get_by_role('button', name=re.compile('^Primary color ')).click()
    colors = page.get_by_test_id('color-access-flyout')
    field = colors.get_by_role('textbox', name='Primary hex value', exact=True)
    await field.fill('#1D4ED8')
    await field.press('Enter')
    await colors.get_by_role('button', name='Close color access', exact=True).click()
    await choose(page, 'pen')
    box = await page.get_by_test_id('main-composite-canvas').bounding_box()
    assert box
    def point(x): return (box['x'] + box['width'] * (x + .5) / 16, box['y'] + box['height'] * .5 / 16)
    await page.mouse.move(*point(0))
    await page.mouse.down()
    await page.mouse.move(*point(3), steps=6)
    await page.mouse.up()
    painted = before.copy()
    for x in range(4): painted[x * 4:x * 4 + 4] = [29, 78, 216, 255]
    await exact(page, painted)
    await choose(page, 'eraser')
    await page.mouse.click(*point(1))
    erased = painted.copy()
    erased[4:8] = [0, 0, 0, 0]
    await exact(page, erased)
    await page.get_by_role('button', name='Undo last action', exact=True).click()
    await exact(page, painted)
    await page.get_by_role('button', name='Redo last action', exact=True).click()
    await exact(page, erased)
    return {'literalFourCellStroke': True, 'oneCellErased': True, 'neighborsExactBeforeUndo': True, 'undoExact': True, 'redoExact': True, 'paintedSha256': hashlib.sha256(bytes(painted)).hexdigest()}

async def lesson(page):
    await page.get_by_role('button', name="Let's start", exact=True).click()
    empty = await raster(page)
    await page.get_by_role('button', name='Trace it for me', exact=True).click()
    await expect(page.get_by_text('Matched!', exact=True)).to_be_visible()
    target = await raster(page)
    gaps = page.get_by_role('button', name="What's missing?", exact=True)
    await expect(gaps).to_have_count(0)
    await page.locator('#center-canvas-area').focus()
    await page.keyboard.press('Control+z')
    await exact(page, empty)
    cells = [i // 4 for i in range(3, len(target), 4) if target[i] > 0]
    assert len(cells) > 8
    canvas = page.get_by_test_id('main-composite-canvas')
    width = await canvas.evaluate('c => c.width')
    box = await canvas.bounding_box()
    assert box
    await page.keyboard.press('b')
    for cell in cells[:4]:
        await page.mouse.click(box['x'] + box['width'] * (cell % width + .5) / width, box['y'] + box['height'] * (cell // width + .5) / width)
    await expect(gaps).to_be_visible()
    partial = await raster(page)
    await gaps.click()
    for _ in range(100):
        if any((await raster(page, 'playground-ghost-overlay'))[3::4]): break
        await asyncio.sleep(.01)
    else: raise AssertionError('No actual gap overlay appeared')
    assert await raster(page) == partial, 'Ghost overlay changed artwork'
    await page.get_by_role('button', name='Trace it for me', exact=True).click()
    await expect(page.get_by_text('Matched!', exact=True)).to_be_visible()
    await expect(gaps).to_have_count(0)
    next_pose = page.get_by_role('list', name='Lesson steps').get_by_role('button', name=re.compile('^Frame 2:'))
    assert 'done' not in (await next_pose.get_attribute('aria-label') or '')
    return {'realPartialTracing': True, 'gapsVisibleBeforeMatch': True, 'ghostRgbaDoesNotEnterArtwork': True, 'gapsAbsentAfterMatch': True, 'nextPoseUnfinished': True}

async def outline(page):
    baseline=await raster(page)
    assert any(baseline[3::4])
    await page.get_by_test_id('appearance-button').click()
    lab=page.get_by_role('checkbox',name='Lab: Quick magic',exact=True)
    if not await lab.is_checked():await lab.locator('..').click()
    await expect(lab).to_be_checked()
    await page.get_by_role('button',name='Close studio options',exact=True).click()
    await page.get_by_role('button',name='Effects (PixiTools)',exact=True).click()
    got=page.get_by_role('button',name='Got it',exact=True)
    if await got.is_visible():await got.click()
    await page.get_by_test_id('quick-magic-outline').click()
    changed=await raster(page);assert changed!=baseline,'Outline did not change artwork'
    await page.get_by_role('button',name='Undo last action',exact=True).click()
    await exact(page,baseline)
    await page.get_by_role('button',name='Redo last action',exact=True).click()
    await exact(page,changed)
    return {'beforeSha256':hashlib.sha256(bytes(baseline)).hexdigest(),'afterSha256':hashlib.sha256(bytes(changed)).hexdigest(),'undoExact':True,'redoExact':True}

async def three_frames(page):
    for duration in [100,200,300]:
        if duration!=100:await page.get_by_role('button',name='Duplicate frame',exact=True).click()
        hold=page.get_by_role('spinbutton',name='Active frame duration in milliseconds',exact=True)
        await hold.fill(str(duration));await hold.press('Tab')
        await expect(hold).to_have_value(str(duration))
    await expect(page.locator('[data-frame-card]')).to_have_count(3)

async def deletion(page):
    await three_frames(page)
    cards=page.locator('[data-frame-card]')
    before=[]
    for i in range(3):
        await cards.nth(i).get_by_role('button',name=re.compile(f'^Select frame {i+1}\\.')).click()
        before.append(await raster(page))
    await cards.nth(1).get_by_role('button',name=re.compile('^Select frame 2\\.')).click()
    original_project = await project_snapshot(page)
    await page.get_by_role('button',name='Delete frame',exact=True).click()
    await expect(cards).to_have_count(2)
    for index, duration in enumerate([100, 300]):
        await cards.nth(index).get_by_role('button', name=re.compile(f'^Select frame {index+1}\\.')).click()
        await expect(page.get_by_role('spinbutton', name='Active frame duration in milliseconds', exact=True)).to_have_value(str(duration))
    await page.get_by_role('button',name='Undo',exact=True).click()
    await expect(cards).to_have_count(3)
    await expect(cards.nth(1).get_by_role('button', name=re.compile('^Select frame 2\\.'))).to_have_attribute('aria-current', 'true')
    assert await project_snapshot(page) == original_project, 'Frame recovery changed saved pixels or metadata'
    for i in range(3):
        await cards.nth(i).get_by_role('button',name=re.compile(f'^Select frame {i+1}\\.')).click()
        await expect(page.get_by_role('spinbutton',name='Active frame duration in milliseconds',exact=True)).to_have_value(str([100,200,300][i]))
        await exact(page,before[i])
    return {'framesRestored':3,'holds':[100,200,300],'allFrameRgbaExact':True,'actualToastUndoClicked':True}

async def clips(page):
    await three_frames(page)
    original_project = await project_snapshot(page)
    original_frames = []
    for index in range(3):
        await page.locator('[data-frame-card]').nth(index).get_by_role('button', name=re.compile(f'^Select frame {index+1}\\.')).click()
        original_frames.append(await raster(page))
    await page.get_by_role('button',name='Clips',exact=True).click()
    dialog=page.get_by_role('dialog',name='Animation Tags & Clips',exact=True)
    await dialog.get_by_role('textbox',name='New tag name',exact=True).fill('S4 Quiet Loop')
    await dialog.get_by_role('spinbutton',name='New tag end frame',exact=True).fill('2')
    await dialog.get_by_role('button',name='Add Tag',exact=True).click()
    start=dialog.get_by_role('spinbutton',name='Start frame for tag S4 Quiet Loop',exact=True)
    end=dialog.get_by_role('spinbutton',name='End frame for tag S4 Quiet Loop',exact=True)
    await expect(start).to_have_value('1');await expect(end).to_have_value('2')
    await start.fill('2');await start.press('Tab')
    await expect(start).to_have_value('2');await expect(end).to_have_value('2')
    await end.fill('1');await end.press('Tab')
    await expect(start).to_have_value('2');await expect(end).to_have_value('2')
    feedback=page.get_by_text('Clip frames must form a valid range within the animation.',exact=True)
    await expect(feedback).to_be_visible()
    feedback_text = await feedback.inner_text()
    await start.fill('1');await start.press('Tab')
    await expect(start).to_have_value('1');await expect(end).to_have_value('2')
    await end.fill('3');await end.press('Tab')
    await expect(start).to_have_value('1');await expect(end).to_have_value('3')
    await dialog.get_by_role('button', name='Done', exact=True).click()
    await expect(page.locator('[data-frame-card]')).to_have_count(3)
    for index, duration in enumerate([100, 200, 300]):
        await page.locator('[data-frame-card]').nth(index).get_by_role('button', name=re.compile(f'^Select frame {index+1}\\.')).click()
        await expect(page.get_by_role('spinbutton', name='Active frame duration in milliseconds', exact=True)).to_have_value(str(duration))
        await exact(page, original_frames[index])
    final_project = await project_snapshot(page)
    added = [c for c in final_project['clips'] if c['name'] == 'S4 Quiet Loop']
    assert len(added) == 1 and (added[0]['startFrame'], added[0]['endFrame']) == (0, 2), json.dumps(final_project['clips'])
    assert [c for c in final_project['clips'] if c['name'] != 'S4 Quiet Loop'] == original_project.get('clips', []), 'Existing clips changed'
    original_project.pop('clips', None);final_project.pop('clips', None)
    assert final_project == original_project, 'Clip edits changed unrelated project data'
    return {'lastValidRange':[2,2],'invalidEndRefused':True,'actualVisibleFeedback':feedback_text,'laterValidRange':[1,3],'allOriginalFramesHoldsRgbaAndMetadataPreserved':True,'playbackExportInclusiveOrder':'not independently exercised'}

async def dither(page):
    baseline=await raster(page)
    original_project = await project_snapshot(page)
    await page.get_by_test_id('toolbar-color-dock').get_by_role('button',name=re.compile('^Primary color ')).click()
    flyout=page.get_by_test_id('color-access-flyout')
    await flyout.get_by_role('textbox',name='Primary hex value',exact=True).fill('#1D4ED8')
    await flyout.get_by_role('textbox',name='Primary hex value',exact=True).press('Tab')
    await flyout.get_by_role('button',name=re.compile('^Secondary ')).click()
    await flyout.get_by_role('textbox',name='Secondary hex value',exact=True).fill('#E63946')
    await flyout.get_by_role('textbox',name='Secondary hex value',exact=True).press('Tab')
    await expect(flyout.get_by_role('textbox',name='Secondary hex value',exact=True)).to_have_value('#E63946')
    await flyout.press('Escape')
    await choose(page,'dither')
    await page.get_by_test_id('tab-tools').click()
    await page.get_by_role('combobox',name='Tool panel dither pattern',exact=True).select_option('2x2')
    await expect(page.get_by_role('slider',name='Tool panel dither density',exact=True)).to_have_value('0.5')
    canvas=page.get_by_test_id('main-composite-canvas');box=await canvas.bounding_box();assert box
    x=lambda pixel:box['x']+(pixel+.5)*box['width']/16
    y=box['y']+.5*box['height']/16
    await page.mouse.move(x(0),y);await page.mouse.down();await page.mouse.move(x(15),y,steps=30);await page.mouse.up()
    actual=await raster(page)
    colors={tuple(actual[i:i+4]) for i in range(0,64,4)}
    expected=list(baseline)
    for column in range(0,16,2):expected[column*4:column*4+4]=[29,78,216,255]
    assert actual==expected,json.dumps({'reason':'Dither pattern differs','changedCells':[(i//4,actual[i:i+4],expected[i:i+4]) for i in range(0,1024,4) if actual[i:i+4]!=expected[i:i+4]][:24]})
    await page.get_by_role('button',name='Undo last action',exact=True).click();await exact(page,baseline)
    assert await project_snapshot(page) == original_project, 'Dither Undo changed saved pixels or metadata'
    return {'actualDragAcrossSixteenCells':True,'admittedCells':8,'rowColors':sorted(colors),'all1024ChannelsExact':True,'undoExact':True,'allSavedPixelsAndMetadataExact':True,'contract':'Active-color pattern preserves skipped cells, not automatic two-color alternation'}


async def palette_authoring(page):
    baseline = await raster(page)
    original = await project_snapshot(page)
    await page.get_by_role('button', name='Palette', exact=True).click()
    create = page.get_by_role('button', name='Create palette', exact=True)
    if not await create.is_visible():
        await page.get_by_role('button', name=re.compile('^Palette workshop')).click()
    await create.click()
    dialog = page.get_by_role('dialog', name='Create palette', exact=True)
    await dialog.get_by_label('Palette name', exact=True).fill('S4 Lantern')
    await dialog.get_by_label('Hex color', exact=True).fill('#FFAA00')
    await dialog.get_by_role('button', name='+ Add color', exact=True).click()
    await dialog.get_by_label('Hex color', exact=True).fill('#2D8C7A')
    draft = dialog.get_by_role('group', name='Palette draft colors', exact=True)

    async def order(colors):
        await expect(draft.get_by_role('button')).to_have_count(len(colors))
        for index, color in enumerate(colors):
            await expect(draft.get_by_role('button').nth(index)).to_have_attribute('aria-label', f'Edit color {index + 1}: {color}')

    await order(['#FFAA00', '#2D8C7A'])
    await dialog.get_by_role('button', name='Move left', exact=True).click()
    await order(['#2D8C7A', '#FFAA00'])
    await expect(draft.get_by_role('button').nth(0)).to_have_attribute('aria-pressed', 'true')
    await dialog.get_by_role('button', name='Move right', exact=True).click()
    await order(['#FFAA00', '#2D8C7A'])
    await dialog.get_by_role('button', name='+ Add color', exact=True).click()
    await dialog.get_by_label('Hex color', exact=True).fill('#7C3AED')
    await order(['#FFAA00', '#2D8C7A', '#7C3AED'])
    await dialog.get_by_role('button', name='Remove', exact=True).click()
    await order(['#FFAA00', '#2D8C7A'])
    await dialog.get_by_role('button', name='Create palette', exact=True).click()
    await expect(dialog).to_have_count(0)
    committed = await project_snapshot(page)
    assert len(committed['palettes']) == len(original['palettes']) + 1
    selected = next(p for p in committed['palettes'] if p['id'] == committed['currentPaletteId'])
    assert selected['name'] == 'S4 Lantern' and selected['colors'] == ['#FFAA00', '#2D8C7A']
    assert committed['palettes'][:-1] == original['palettes'], 'Existing palettes changed'
    protected = lambda project: {k: v for k, v in project.items() if k not in ('palettes', 'currentPaletteId')}
    assert protected(committed) == protected(original), 'Palette authoring changed protected project data'
    await exact(page, baseline)
    await create.click()
    await dialog.get_by_label('Palette name', exact=True).fill('S4 Uncommitted')
    await dialog.get_by_label('Hex color', exact=True).fill('#7C3AED')
    await dialog.get_by_role('button', name='Cancel', exact=True).click()
    await expect(dialog).to_have_count(0)
    after_cancel = await project_snapshot(page)
    assert after_cancel == committed, 'Cancelled draft changed committed palette/project data'
    assert all(p['name'] != 'S4 Uncommitted' for p in after_cancel['palettes'])
    await exact(page, baseline)
    return {'realSwatchReorderAndRemoval': True, 'draftCancelled': True,
            'downloadedPaletteColors': selected['colors'], 'existingPalettesPreserved': True,
            'allSavedPixelsAndProtectedMetadataExact': True, 'all1024ChannelsExact': True,
            'savePath': 'browser-download fallback; native picker not qualified'}


async def four_themes(page):
    baseline = await raster(page)
    original = await project_snapshot(page)
    await page.get_by_test_id('appearance-button').click()
    choices = []
    for theme in ['cocoa', 'drizzle', 'harvest', 'harbor']:
        await page.get_by_test_id('theme-option-' + theme).click()
        for scheme in ['dark', 'light']:
            await page.get_by_test_id('scheme-option-' + scheme).click()
            await expect(page.locator('html')).to_have_attribute('data-studio-theme', theme)
            await expect(page.locator('html')).to_have_attribute('data-color-scheme', scheme)
            await expect(page.get_by_test_id('theme-option-' + theme)).to_have_attribute('aria-checked', 'true')
            await expect(page.get_by_test_id('scheme-option-' + scheme)).to_have_attribute('aria-checked', 'true')
            await exact(page, baseline)
            await expect(page.locator('[data-frame-card]')).to_have_count(len(original['frames']))
            await page.get_by_role('button', name='Close studio options', exact=True).click()
            assert await project_snapshot(page) == original, 'Theme choice changed saved layer/frame identities, pixels or metadata'
            choices.append({'theme': theme, 'scheme': scheme, 'all1024ChannelsExact': True, 'allSavedPixelsAndMetadataExact': True})
            await page.get_by_test_id('appearance-button').click()
    await page.get_by_role('button', name='Close studio options', exact=True).click()
    await page.keyboard.press('Control+s')
    await expect(page.get_by_role('button', name='Save now', exact=True)).to_have_attribute('title', 'All changes saved (Ctrl+S)')
    await page.reload()
    await expect(page.locator('[data-restoration-phase]')).to_have_attribute('data-restoration-phase', 'active')
    await expect(page.locator('html')).to_have_attribute('data-studio-theme', 'harbor')
    await expect(page.locator('html')).to_have_attribute('data-color-scheme', 'light')
    await exact(page, baseline)
    assert await project_snapshot(page) == original, 'Theme/reload changed saved project pixels or metadata'
    return {'choices': choices, 'actualReload': True, 'harborDayPersisted': True,
            'allSavedPixelsAndMetadataExact': True,
            'savePath': 'browser-download fallback; native picker not qualified'}


SCENARIOS = {'quick-tools': quick_tools, 'erase': erase, 'lesson': lesson, 'outline': outline, 'frame-recovery': deletion, 'clip-validation': clips, 'dither': dither, 'palette-authoring': palette_authoring, 'four-themes': four_themes}

async def run_test():
    scenario = os.environ.get('PIXIBUN_SCENARIO', SCENARIO)
    assert scenario in SCENARIOS
    target = os.environ.get('PIXIBUN_LOCAL_URL', TARGET).rstrip('/')
    expected = urlsplit(target)
    assert expected.scheme in ('https', 'http') and expected.netloc
    async with async_api.async_playwright() as pw:
        engine = os.environ.get('PIXIBUN_BROWSER', 'chromium')
        options = {'headless': True}
        if engine == 'chromium':
            options['args'] = ['--window-size=1920,1080', '--disable-dev-shm-usage']
            # Match the provider's existing serverless Chromium launch profile.
            # Desktop qualification retains the normal multiprocess browser.
            if not os.environ.get('PIXIBUN_LOCAL_URL') and os.environ.get('PIXIBUN_QUALIFICATION') != '1':
                options['args'] += ['--ipc=host', '--single-process']
        if os.environ.get('PIXIBUN_BROWSER_EXECUTABLE'):
            assert os.environ.get('PIXIBUN_LOCAL_URL') or (os.environ.get('PIXIBUN_QUALIFICATION') == '1' and EXPECTED_COMMIT is not None), 'Executable override requires explicit qualification and a public source pin'
            options['executable_path'] = os.environ['PIXIBUN_BROWSER_EXECUTABLE']
        browser = await getattr(pw, engine).launch(**options)
        try:
            context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
            if scenario in ('frame-recovery', 'clip-validation', 'dither', 'palette-authoring', 'four-themes'):
                await context.add_init_script("Object.defineProperty(window, 'showSaveFilePicker', {value: undefined, configurable: true});")
            page = await context.new_page()
            page.set_default_timeout(15000)
            await page.goto(target + ('/playground' if scenario == 'lesson' else '/studio?template=bun'))
            await expect(page.get_by_test_id('main-composite-canvas')).to_be_visible()
            skip = page.get_by_test_id('welcome-skip')
            if await skip.is_visible(): await skip.click()
            if scenario != 'lesson':
                await expect(page).not_to_have_url(re.compile('template='))
                await expect(page.locator('[data-restoration-phase]')).to_have_attribute('data-restoration-phase', 'active')
                for _ in range(100):
                    if sum(v > 0 for v in (await raster(page))[3::4]) == 192: break
                    await asyncio.sleep(.05)
                else: raise AssertionError('Bun was not admitted')
            actual = urlsplit(page.url)
            assert (actual.scheme, actual.netloc) == (expected.scheme, expected.netloc), 'Browser opened another origin'
            response = await page.request.get(target + '/precache-manifest.json')
            assert response.ok
            version = (await response.json())['version']
            if EXPECTED_COMMIT is not None:
                assert version == 'v1.14.1-' + EXPECTED_COMMIT, 'Unexpected build source'
            detail = await SCENARIOS[scenario](page)
            response = await page.request.get(target + '/precache-manifest.json')
            assert response.ok and (await response.json())['version'] == version, 'Build changed during the test'
            receipt = {'scenario': scenario, 'engine': engine, 'actualOrigin': actual.netloc, 'build': version, 'expectedCommitPinned': EXPECTED_COMMIT is not None, **detail}
            if os.environ.get('PIXIBUN_EVIDENCE_PATH'): Path(os.environ['PIXIBUN_EVIDENCE_PATH']).write_text(json.dumps(receipt, indent=2))
            print('PIXIBUN_UI_REPORT_EVIDENCE', json.dumps(receipt), flush=True)
        finally:
            await browser.close()

if __name__ == '__main__': asyncio.run(run_test())
