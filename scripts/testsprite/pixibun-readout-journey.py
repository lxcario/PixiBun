"""PixiBun Season 4: readout. Real UI, independent file/pixel observations.
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

def heart_raster(highlight=True):
    # Literal design specification, independent of the product's replay/raster code.
    rgba = [255, 214, 224, 255] * 256
    bands = [(3, 3, 5), (3, 10, 12), (4, 2, 6), (4, 9, 13),
        (5, 1, 14), (6, 1, 14), (7, 1, 14), (8, 2, 13), (9, 3, 12),
        (10, 4, 11), (11, 5, 10), (12, 6, 9), (13, 7, 8)]
    for y, first, last in bands:
        for x in range(first, last + 1):
            at = (y * 16 + x) * 4
            rgba[at:at + 4] = [232, 58, 92, 255]
    if highlight:
        for x, y in [(4, 4), (3, 5), (3, 6)]:
            at = (y * 16 + x) * 4
            rgba[at:at + 4] = [255, 255, 255, 255]
    return rgba


def summarize(rgba):
    counts = collections.Counter(tuple(rgba[i:i + 4]) for i in range(0, len(rgba), 4) if rgba[i + 3])
    colors = sorted([('#' + ''.join(f'{channel:02x}' for channel in pixel[:3]) + (f'{pixel[3]:02x}' if pixel[3] != 255 else ''), count) for pixel, count in counts.items()], key=lambda x: (-x[1], x[0]))
    digest = 0x811c9dc5
    for channel in struct.pack('<II', 16, 16) + bytes(rgba):
        digest = ((digest ^ channel) * 0x01000193) & 0xffffffff
    return {'pixels': sum(counts.values()), 'colors': len(counts),
        'top-colors': ', '.join(f'{color} {count}' for color, count in colors[:4]), 'digest': f'{digest:08x}'}


async def check_readout(page, rgba, after_revision=None):
    root = page.get_by_test_id('canvas-readout')
    if after_revision is not None:
        # Poll the read-only attribute in the driver; do not evaluate a string
        # inside the page, which a strict production CSP correctly refuses.
        deadline = asyncio.get_running_loop().time() + 15
        while int(await root.get_attribute('data-revision') or '0') <= after_revision:
            assert asyncio.get_running_loop().time() < deadline, 'Readout revision did not advance after the real history action'
            await asyncio.sleep(0.05)
    await expect(root).to_have_attribute('data-state', 'ready')
    fixed = {'size': '16×16', 'frame': '1 of 1', 'frames': '1', 'layer': 'Base Layer', 'layers': '1'}
    for key, value in {**fixed, **summarize(rgba)}.items():
        await expect(page.get_by_test_id('canvas-readout-' + key)).to_have_text(str(value))
    assert await raster(page.get_by_test_id('main-composite-canvas')) == rgba, 'Readout disagrees with independent literal artwork'
    return int(await root.get_attribute('data-revision'))


async def run_test():
    assert summarize(heart_raster())['digest'] == '57feec3e'
    assert summarize(heart_raster(False))['digest'] == 'ddfeef45'
    replay = '1_16x16_e83a5c.ffd6e0.ffffff_l0.3.3.5.3~l0.10.3.12.3~l0.2.4.6.4~l0.9.4.13.4~l0.1.5.14.5~l0.1.6.14.6~l0.1.7.14.7~l0.2.8.13.8~l0.3.9.12.9~l0.4.10.11.10~l0.5.11.10.11~l0.6.12.9.12~l0.7.13.8.13~f1.0.0~p2.4.4.3.5.3.6'
    async with async_api.async_playwright() as pw:
        browser, context, page = await open_browser(pw, target_url(), '/studio?replay=' + replay)
        try:
            await expect(page.get_by_test_id('replay-status')).to_have_attribute('data-state', 'applied')
            await expect(page.get_by_test_id('replay-status')).to_have_attribute('data-steps', '15')
            assert 'replay=' not in page.url, 'Recipe remains in address bar'
            revision = await check_readout(page, heart_raster())
            await page.get_by_test_id('undo-button').click()
            revision = await check_readout(page, heart_raster(False), revision)
            await page.get_by_test_id('redo-button').click()
            await check_readout(page, heart_raster(), revision)
            actual = await download_format(page, 'PNG')
            w, h, decoded = decode_png(actual)
            assert (w, h) == (16, 16) and decoded == heart_raster(), 'Downloaded PNG disagrees with literal artwork/readout'
            await check_readout(page, heart_raster())
            emit_evidence('readout', {**await assert_destination(page, target_url()), 'fixture': 'Heart',
                'literalChannelsCompared': 1024, 'digest': '57feec3e', 'undoDigest': 'ddfeef45',
                'decodedPngBytes': len(actual), 'independentFileAndCanvas': True,
                'scope': 'Recipe application/readout/Undo/Redo/export, not pointer painting or manual screen-reader qualification.'})
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(run_test())
