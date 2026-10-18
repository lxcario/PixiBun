"""PixiBun Season 4: lighting. Real UI, independent file/pixel observations.
Controlled supporting replay; no automatic PR claim.
"""
import asyncio
import base64
import binascii
import json
import re
import struct
import tempfile
import zlib
from pathlib import Path
from urllib.parse import urlsplit
from playwright import async_api
from playwright.async_api import expect
import os
import collections
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

def decode_png(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Downloaded bytes are not PNG'
    offset, payload, palette, transparency = 8, bytearray(), None, b''
    width = height = depth = color_type = None
    saw_end = False
    while offset < len(data):
        length = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        body = data[offset + 8:offset + 8 + length]
        assert len(body) == length and offset + length + 12 <= len(data), 'Incomplete PNG chunk'
        crc = struct.unpack_from('>I', data, offset + length + 8)[0]
        assert binascii.crc32(kind + body) & 0xffffffff == crc, 'PNG CRC mismatch'
        offset += length + 12
        if kind == b'IHDR':
            width, height, depth, color_type, compression, filtering, interlace = struct.unpack('>IIBBBBB', body)
            assert 1 <= width <= 64 and 1 <= height <= 64, 'Fixture PNG exceeds bounded reader dimensions'
            assert compression == filtering == interlace == 0, 'Unexpected PNG coding mode'
            assert depth == 8 and color_type in (2, 3, 6), f'Unsupported PNG depth/type: {depth}/{color_type}'
        elif kind == b'PLTE':
            palette = [tuple(body[i:i + 3]) for i in range(0, len(body), 3)]
        elif kind == b'tRNS':
            transparency = body
        elif kind == b'IDAT':
            payload.extend(body)
        elif kind == b'IEND':
            saw_end = True
            break
    assert saw_end and width is not None and payload, 'Missing PNG structure'
    channels = {2: 3, 3: 1, 6: 4}[color_type]
    stride = width * channels
    raw = zlib.decompress(payload)
    assert len(raw) == height * (stride + 1), 'PNG raster length mismatch'
    previous, rgba = bytearray(stride), []
    for y in range(height):
        start = y * (stride + 1)
        mode = raw[start]
        assert 0 <= mode <= 4, f'Unknown PNG filter {mode}'
        row = bytearray(raw[start + 1:start + 1 + stride])
        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            above = previous[x]
            upper_left = previous[x - channels] if x >= channels else 0
            if mode == 1:
                predictor = left
            elif mode == 2:
                predictor = above
            elif mode == 3:
                predictor = (left + above) // 2
            elif mode == 4:
                p = left + above - upper_left
                distances = (abs(p - left), abs(p - above), abs(p - upper_left))
                predictor = (left, above, upper_left)[distances.index(min(distances))]
            else:
                predictor = 0
            row[x] = (row[x] + predictor) & 255
        for x in range(width):
            pixel = row[x * channels:(x + 1) * channels]
            if color_type == 6:
                rgba.extend(pixel)
            elif color_type == 2:
                transparent = struct.unpack('>HHH', transparency) if transparency else None
                rgba.extend([*pixel, 0 if tuple(pixel) == transparent else 255])
            else:
                index = pixel[0]
                assert palette is not None and index < len(palette), 'Missing palette entry'
                rgba.extend([*palette[index], transparency[index] if index < len(transparency) else 255])
        previous = row
    return width, height, rgba

def encode_fixture_png(rgba):
    def chunk(kind, payload):
        return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)
    rows = b''.join(b'\0' + bytes(rgba[y * 64:(y + 1) * 64]) for y in range(16))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 16, 16, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')

def fixture():
    frames, expected_layers, composites = [], [], []
    for index, color in enumerate([(91, 58, 41, 255), (57, 121, 182, 255)]):
        ink, glow = [0] * 1024, [0] * 1024
        for x, y in [(2, 2), (2, 3), (3, 3), (4 + index, 4)]:
            offset = (y * 16 + x) * 4
            ink[offset:offset + 4] = color
        offset = (12 * 16 + 12) * 4
        glow[offset:offset + 4] = [(243, 204, 92, 255), (104, 186, 127, 255)][index]
        layers = []
        for name, raster in [('Glow', glow), ('Ink', ink)]:
            layers.append({'id': f'{name.lower()}-{index}', 'name': name, 'visible': True,
                'locked': False, 'opacity': 1, 'blendMode': 'source-over',
                'pngBase64': base64.b64encode(encode_fixture_png(raster)).decode('ascii')})
        composite = [glow[i] if glow[(i // 4) * 4 + 3] else ink[i] for i in range(1024)]
        frames.append({'id': f'pose-{index}', 'durationMs': [100, 200][index], 'layers': layers})
        expected_layers.append([glow, ink])
        composites.append(composite)
    project = {'format': 'pixibun-project', 'version': 3, 'name': 'S4 Quiet Lantern',
        'width': 16, 'height': 16, 'fps': 8, 'loopMode': 'repeat',
        'onionSkin': {'enabled': False, 'prevFrames': 1, 'nextFrames': 1,
            'prevColor': '#c792df', 'nextColor': '#dcabdf', 'opacity': 0.45},
        'palettes': [{'id': 'quiet-colors', 'name': 'Quiet Colors',
            'colors': ['#5b3a29', '#3979b6', '#f3cc5c', '#68ba7f']}],
        'currentPaletteId': 'quiet-colors', 'customRamps': [],
        'clips': [{'id': 'quiet-loop', 'name': 'Quiet Loop', 'startFrame': 0, 'endFrame': 1, 'loopMode': 'forward'}],
        'frames': frames, 'createdAt': 1, 'updatedAt': 1}
    return project, expected_layers, composites

def check_backup(project, expected_layers):
    assert project['format'] == 'pixibun-project' and project['version'] in (3, 4)
    assert project['name'] == 'S4 Quiet Lantern'
    assert (project['width'], project['height'], project['fps'], project['loopMode']) == (16, 16, 8, 'repeat')
    assert project['onionSkin']['enabled'] is False
    assert len(project['frames']) == 2
    assert [f['durationMs'] for f in project['frames']] == [100, 200]
    for index, frame in enumerate(project['frames']):
        assert [layer['name'] for layer in frame['layers']] == ['Glow', 'Ink'], 'Layer order/name changed or flattened'
        for layer_index, layer in enumerate(frame['layers']):
            assert layer['visible'] is True and layer['locked'] is False and layer['opacity'] == 1
            assert layer['blendMode'] == 'source-over'
            _, _, rgba = decode_png(base64.b64decode(layer['pngBase64']))
            assert rgba == expected_layers[index][layer_index], f'Layer pixels changed at frame {index}, layer {layer_index}'
    selected = next(p for p in project['palettes'] if p['id'] == project['currentPaletteId'])
    assert selected['name'] == 'Quiet Colors'
    assert [c.lower() for c in selected['colors']] == ['#5b3a29', '#3979b6', '#f3cc5c', '#68ba7f']
    assert len(project['clips']) == 1
    clip = project['clips'][0]
    assert (clip['name'], clip['startFrame'], clip['endFrame'], clip['loopMode']) == ('Quiet Loop', 0, 1, 'forward')

async def raster(canvas):
    return await canvas.evaluate("""async c => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
    }""")

async def import_file(page, path):
    skip = page.get_by_test_id('welcome-skip')
    if await skip.is_visible():
        await skip.click()
    await page.locator('input[type=file]').first.set_input_files(str(path))
    dialog = page.get_by_role('dialog', name='Import Project (.pixibun)', exact=True)
    await expect(dialog).to_be_visible()
    await dialog.get_by_role('button', name='Confirm Import', exact=True).click()
    await expect(dialog).to_be_hidden()
    await expect(page.locator('[data-frame-card]')).to_have_count(2)

async def check_ui(page, composites):
    canvas = page.get_by_test_id('main-composite-canvas')
    await expect(canvas).to_have_attribute('width', '16')
    await expect(canvas).to_have_attribute('height', '16')
    for index, duration in enumerate([100, 200]):
        await page.get_by_role('button', name=re.compile(r'^Select frame ' + str(index + 1) + r'\.')).click()
        await expect(page.get_by_role('spinbutton', name='Active frame duration in milliseconds', exact=True)).to_have_value(str(duration))
        assert await raster(canvas) == composites[index], f'Reopened main canvas differs at frame {index + 1}'

async def backup(page):
    await page.get_by_test_id('export-button').click()
    await page.get_by_test_id('export-tab-project').click()
    async with page.expect_download(timeout=30000) as pending:
        await page.get_by_role('button', name='Download project backup', exact=True).click()
    download = await pending.value
    assert await download.failure() is None
    path = await download.path()
    assert path is not None, 'No actual downloaded backup file'
    content = Path(path).read_bytes()
    assert download.suggested_filename.endswith('.pixibun')
    return content

OBSERVED_BUILD_VERSIONS = {}


async def assert_destination(page, target):
    actual, intended = urlsplit(page.url), urlsplit(target)
    assert (actual.scheme, actual.netloc) == (intended.scheme, intended.netloc), 'Actual browser origin differs from requested target'
    if os.environ.get('PIXIBUN_LOCAL_URL'):
        assert intended.hostname in ('127.0.0.1', 'localhost'), 'Local qualification must use a loopback origin'
        return {'actualOrigin': actual.netloc, 'build': 'local-development; no deployed SHA claim'}
    if EXPECTED_COMMIT is not None:
        assert re.fullmatch(r'[a-f0-9]{40}', EXPECTED_COMMIT), 'A verified candidate commit is required before cloud execution'
    response = await page.request.get(target + '/precache-manifest.json', headers={'Cache-Control': 'no-cache'})
    assert response.ok, 'Cannot inspect deployed build identity'
    version = (await response.json()).get('version', '')
    observed_commit = version.rsplit('-', 1)[-1]
    assert re.fullmatch(r'[a-f0-9]{40}', observed_commit), f'Build lacks a full source identity: {version}'
    if EXPECTED_COMMIT is not None:
        assert observed_commit == EXPECTED_COMMIT, f'Wrong deployed build: {version}; expected {EXPECTED_COMMIT}'
    assert OBSERVED_BUILD_VERSIONS.setdefault(actual.netloc, version) == version, 'Deployed build changed during the journey'
    return {'actualOrigin': actual.netloc, 'build': version, 'sourceCommit': observed_commit, 'expectedCommitPinned': EXPECTED_COMMIT is not None}


async def open_browser(pw, target, path='/studio?template=bun'):
    engine = os.environ.get('PIXIBUN_BROWSER', 'chromium')
    browser_type = getattr(pw, engine)
    options = {'headless': True}
    if engine == 'chromium':
        options['args'] = ['--window-size=1920,1080', '--disable-dev-shm-usage']
        if not os.environ.get('PIXIBUN_LOCAL_URL'):
            options['args'] += ['--ipc=host', '--single-process']
    if os.environ.get('PIXIBUN_BROWSER_EXECUTABLE'):
        assert os.environ.get('PIXIBUN_LOCAL_URL'), 'Executable override only for local qualification'
        options['executable_path'] = os.environ['PIXIBUN_BROWSER_EXECUTABLE']
    browser = await browser_type.launch(**options)
    context = await browser.new_context(viewport={'width': 1920, 'height': 1080}, accept_downloads=True)
    await context.add_init_script("Object.defineProperty(window, 'showSaveFilePicker', {value: undefined, configurable: true});")
    page = await context.new_page()
    page.set_default_timeout(15000)
    await page.goto(target + path)
    await expect(page.get_by_test_id('main-composite-canvas')).to_be_visible()
    skip = page.get_by_test_id('welcome-skip')
    # Clicking a real control waits out an optional onboarding animation; no storage writes.
    try:
        await page.get_by_test_id('pen-tool').click(timeout=3000)
    except PlaywrightTimeoutError:
        if not await skip.is_visible(): raise
        await skip.click()
        await page.get_by_test_id('pen-tool').click()
    await assert_destination(page, target)
    return browser, context, page


async def download_format(page, kind):
    await page.get_by_test_id('export-button').click()
    dialog = page.get_by_role('dialog')
    await dialog.get_by_test_id('export-tab-' + kind.lower()).click()
    await dialog.get_by_role('button', name='1x', exact=True).click()
    async with page.expect_download(timeout=30000) as pending:
        await dialog.get_by_role('button', name='Download ' + kind, exact=True).click()
    download = await pending.value
    assert await download.failure() is None
    actual = await download.path()
    assert actual is not None
    content = Path(actual).read_bytes()
    await expect(dialog).to_be_hidden()
    return content


def target_url():
    return os.environ.get('PIXIBUN_LOCAL_URL', 'VAR_{url}').rstrip('/')


def emit_evidence(kind, detail):
    print('PIXIBUN_' + kind.upper() + '_EVIDENCE', json.dumps(detail), flush=True)
    if os.environ.get('PIXIBUN_EVIDENCE_PATH'):
        Path(os.environ['PIXIBUN_EVIDENCE_PATH']).write_text(json.dumps(detail, indent=2), encoding='utf-8')



EXPECTED_COMMIT = None

async def choose_ink(page, hex_color):
    await page.get_by_test_id('toolbar-color-dock').get_by_role('button', name=re.compile(r'^Primary color ')).dblclick()
    dialog = page.get_by_role('dialog').filter(has=page.get_by_role('heading', name=re.compile('Pick Custom Primary Color')))
    await dialog.get_by_role('textbox', name='Picker hex color', exact=True).fill(hex_color)
    await dialog.get_by_role('button', name='Select Color', exact=True).click()
    await expect(dialog).to_be_hidden()


def painted_heart(highlight=True):
    # Literal target artwork. No product rasterizer, imported fixture or recipe link.
    result = [0] * 1024
    for y, first, last in HEART_BANDS:
        for x in range(first, last + 1):
            at = (y * 16 + x) * 4
            result[at:at + 4] = [232, 58, 92, 255]
    if highlight:
        for x, y in [(4, 4), (3, 5), (3, 6)]:
            at = (y * 16 + x) * 4
            result[at:at + 4] = [255, 255, 255, 255]
    return result


HEART_BANDS = [(3, 3, 5), (3, 10, 12), (4, 2, 6), (4, 9, 13),
    (5, 1, 14), (6, 1, 14), (7, 1, 14), (8, 2, 13), (9, 3, 12),
    (10, 4, 11), (11, 5, 10), (12, 6, 9), (13, 7, 8)]


async def wait_raster(page, expected):
    canvas = page.get_by_test_id('main-composite-canvas')
    deadline = asyncio.get_running_loop().time() + 15
    while asyncio.get_running_loop().time() < deadline:
        if await raster(canvas) == expected:
            return
        await asyncio.sleep(0.05)
    assert await raster(canvas) == expected, 'Exact raster did not settle within 15 seconds'


async def wait_changed(canvas, before):
    deadline = asyncio.get_running_loop().time() + 15
    while asyncio.get_running_loop().time() < deadline:
        if await raster(canvas) != before:
            return
        await asyncio.sleep(0.05)
    assert await raster(canvas) != before, 'Lighting did not change actual pixels within 15 seconds'


async def save_artifact(page, name):
    if os.environ.get('PIXIBUN_ARTIFACT_DIR'):
        directory = Path(os.environ['PIXIBUN_ARTIFACT_DIR'])
        directory.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(directory / (name + '.png')))


async def run_test():
    async with async_api.async_playwright() as pw:
        browser, context, page = await open_browser(pw, target_url(), '/studio?width=16&height=16')
        try:
            canvas = page.get_by_test_id('main-composite-canvas')
            await expect(canvas).to_have_attribute('width', '16')
            await expect(canvas).to_have_attribute('height', '16')
            assert await raster(canvas) == [0] * 1024, 'Drawing fixture must begin blank'
            await page.get_by_test_id('pen-tool').click()
            await page.get_by_role('button', name='Brush size 1 pixels. Size 1 px', exact=True).click()
            clean = page.get_by_role('checkbox', name='Clean corners', exact=True)
            await clean.uncheck()
            await page.get_by_role('button', name='1 pixel brush preset', exact=True).click()
            await choose_ink(page, '#e83a5c')
            for y, first, last in HEART_BANDS:
                box = await canvas.bounding_box()
                assert box
                start = (box['x'] + (first + 0.5) * box['width'] / 16, box['y'] + (y + 0.5) * box['height'] / 16)
                end = (box['x'] + (last + 0.5) * box['width'] / 16, start[1])
                await page.mouse.move(*start)
                await page.mouse.down()
                await page.mouse.move(*end, steps=max(1, last - first))
                await page.mouse.up()
            await wait_raster(page, painted_heart(False))
            await choose_ink(page, '#ffffff')
            for x, y in [(4, 4), (3, 5), (3, 6)]:
                box = await canvas.bounding_box()
                await page.mouse.click(box['x'] + (x + 0.5) * box['width'] / 16, box['y'] + (y + 0.5) * box['height'] / 16)
            before = painted_heart()
            await wait_raster(page, before)
            assert sum(before[3::4]) // 255 == 100, 'The heart must have 100 painted pixels'
            await save_artifact(page, 'heart-drawn-through-real-ui')
            png = await download_format(page, 'PNG')
            assert decode_png(png) == (16, 16, before), 'Painted artwork did not survive the actual PNG download'
            if os.environ.get('PIXIBUN_ARTIFACT_DIR'):
                (Path(os.environ['PIXIBUN_ARTIFACT_DIR']) / 'actual-painted-heart.png').write_bytes(png)
            await page.get_by_test_id('tab-ai').click()
            await page.get_by_test_id('pixitools-task-lighting').click()
            await page.get_by_role('button', name='Manual setup', exact=True).click()
            await page.get_by_role('button', name='Apply lighting', exact=True).click()
            await wait_changed(canvas, before)
            after = await raster(canvas)
            changed = sum(a != b for a, b in zip(before, after))
            assert changed > 0 and after[3::4] == before[3::4], 'Lighting must change color while preserving silhouette alpha'
            await save_artifact(page, 'painted-heart-lighting-applied')
            await page.get_by_test_id('undo-button').click()
            await wait_raster(page, before)
            await save_artifact(page, 'painted-heart-after-undo')
            await page.get_by_test_id('redo-button').click()
            await wait_raster(page, after)
            await page.get_by_test_id('undo-button').click()
            await wait_raster(page, before)
            emit_evidence('painted-lighting', {**await assert_destination(page, target_url()),
                'fixture': 'Heart drawn by 13 real red brush drags and 3 white brush clicks',
                'paintedPixels': 100, 'redPixels': 97, 'whitePixels': 3, 'lightingChangedChannels': changed,
                'comparedRgbaChannels': 1024, 'actualPngBytes': len(png), 'exactUndoRedoUndo': True,
                'scope': 'Deterministic real pointer drawing and lighting preservation; functional artwork fixture, not an autonomous artistic-quality claim.'})
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(run_test())
