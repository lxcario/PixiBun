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
        if not os.environ.get('PIXIBUN_LOCAL_URL') and os.environ.get('PIXIBUN_QUALIFICATION')!='1':
            options['args'] += ['--ipc=host', '--single-process']
    if os.environ.get('PIXIBUN_BROWSER_EXECUTABLE'):
        assert os.environ.get('PIXIBUN_LOCAL_URL') or os.environ.get('PIXIBUN_QUALIFICATION')=='1', 'Executable override requires explicit local qualification'
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
import hashlib,copy,io,zipfile

def exact_project(project):
    result=copy.deepcopy(project)
    for key in ['createdAt','updatedAt']:result.pop(key,None)
    for frame in result['frames']:
        for layer in frame['layers']:
            layer['decodedPng']=decode_png(base64.b64decode(layer.pop('pngBase64')))
    return result

async def project(page):return json.loads((await backup(page)).decode())
async def capture_artifact(page,name):
    directory=Path(os.environ.get('PIXIBUN_ARTIFACT_DIR','work/advanced-evidence'))
    directory.mkdir(parents=True,exist_ok=True)
    await page.screenshot(path=str(directory/(name+'.png')))

async def save_reload(page):
    await page.get_by_test_id('save-button').click()
    await expect(page.get_by_role('status').filter(has_text=re.compile(r'^Changes saved$'))).to_be_visible()
    await page.reload()
    await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    await page.get_by_test_id('tab-tools').click()

async def choose_tool(page,name):
    shelf=page.locator('[data-shelf]')
    direct=shelf.get_by_test_id(name+'-tool')
    if await direct.is_visible():await direct.click()
    else:
        await shelf.locator('[data-tools~="'+name+'"] button[aria-haspopup]').click(button='right')
        await page.get_by_role('menu').get_by_test_id(name+'-tool').click()

async def open_capture(page):
    await page.get_by_test_id('tab-tools').click()
    details=page.get_by_test_id('animate-artwork')
    if not await details.evaluate('e=>e.open'):await details.locator('summary').click()
    await page.get_by_test_id('create-motion-part-btn').click()
    await expect(page.get_by_test_id('piximotion-panel')).to_be_visible()



async def admit_lantern(page):
    fixture_data,layers,composites=fixture()
    fixture_data['name']='S4 Lantern Keep'
    await page.locator('input[type=file]').first.set_input_files({'name':'s4-lantern-keep.pixibun','mimeType':'application/json','buffer':json.dumps(fixture_data).encode()})
    dialog=page.get_by_role('dialog',name='Import Project (.pixibun)',exact=True)
    await dialog.get_by_role('button',name='Confirm Import',exact=True).click()
    await expect(dialog).to_be_hidden()
    actual=await project(page)
    assert actual['name']=='S4 Lantern Keep' and len(actual['frames'])==2
    assert [f['durationMs'] for f in actual['frames']]==[100,200]
    for i,frame in enumerate(actual['frames']):
        assert [l['name'] for l in frame['layers']]==['Glow','Ink']
        for j,layer in enumerate(frame['layers']):assert decode_png(base64.b64decode(layer['pngBase64']))==(16,16,layers[i][j])
    return actual,layers,composites

async def frame(page,index):
    await page.get_by_role('button',name=re.compile(r'^Select frame '+str(index+1)+r'\.')).click()

async def same_composite(page,expected):
    canvas=page.get_by_test_id('main-composite-canvas')
    for _ in range(100):
        if await raster(canvas)==expected:return
        await asyncio.sleep(.05)
    assert await raster(canvas)==expected,'Literal composite mismatch'

async def choose_ink(page,color):
    await page.get_by_test_id('toolbar-color-dock').get_by_role('button',name=re.compile(r'^Primary color ')).dblclick()
    dialog=page.get_by_role('dialog').filter(has=page.get_by_role('heading',name=re.compile('Pick Custom Primary Color')))
    await dialog.get_by_role('textbox',name='Picker hex color',exact=True).fill(color)
    await dialog.get_by_role('button',name='Select Color',exact=True).click()
    await expect(dialog).to_be_hidden()

async def edit_one_pixel(page):
    await choose_tool(page,'pen')
    await page.get_by_role('button',name='Brush size 1 pixels. Size 1 px',exact=True).click()
    await page.get_by_role('checkbox',name='Clean corners',exact=True).uncheck()
    await page.get_by_role('button',name='1 pixel brush preset',exact=True).click()
    await choose_ink(page,'#e83a5c')
    box=await page.get_by_test_id('main-composite-canvas').bounding_box();assert box
    await page.mouse.click(box['x']+14.5*box['width']/16,box['y']+14.5*box['height']/16)


# Each scenario is a complete standalone saved-script companion when published.
# Fixture files are independent driver-created bytes admitted through normal UI.
SCENARIO = 'svg'

async def exact_native(page, expected):
    canvas=page.get_by_test_id('main-composite-canvas')
    for _ in range(100):
        if await raster(canvas)==expected:return
        await asyncio.sleep(.05)
    raise AssertionError('Actual native RGBA differs from the literal expected artwork')

async def blank_drawing(page, name):
    await page.get_by_test_id('file-menu-button').click()
    await page.get_by_test_id('new-drawing-button').click()
    dialog=page.get_by_role('dialog',name='Start a New Drawing?',exact=True)
    await dialog.get_by_role('radio',name='16 by 16 pixels, Tiny icon',exact=True).click()
    await dialog.get_by_role('button',name='Start New Drawing',exact=True).click()
    await expect(dialog).to_be_hidden()
    await expect(page.get_by_test_id('main-composite-canvas')).to_have_attribute('width','16')
    await exact_native(page,[0]*1024)
    await page.get_by_role('button',name=re.compile('^Rename project ')).click()
    await page.locator('input:focus').fill(name)
    await page.locator('input:focus').press('Enter')
    await expect(page.get_by_role('button',name='Rename project '+name,exact=True)).to_be_visible()

async def pen_at(page, x, y, color):
    await choose_tool(page,'pen')
    await page.get_by_role('button',name='Brush size 1 pixels. Size 1 px',exact=True).click()
    clean=page.get_by_role('checkbox',name='Clean corners',exact=True)
    if await clean.is_checked():await clean.uncheck()
    await page.get_by_role('button',name='1 pixel brush preset',exact=True).click()
    await choose_ink(page,color)
    box=await page.get_by_test_id('main-composite-canvas').bounding_box();assert box
    await page.mouse.click(box['x']+(x+.5)*box['width']/16,box['y']+(y+.5)*box['height']/16)

async def png_journey(page):
    await blank_drawing(page,'S4 Exact PNG')
    red=[0]*1024;red[(3*16+2)*4:(3*16+2)*4+4]=[255,0,0,255]
    both=red.copy();both[(10*16+8)*4:(10*16+8)*4+4]=[0,0,255,255]
    await pen_at(page,2,3,'#ff0000');await exact_native(page,red)
    await pen_at(page,8,10,'#0000ff');await exact_native(page,both)
    await page.get_by_test_id('undo-button').click();await exact_native(page,red)
    await page.get_by_role('button',name='Redo last action',exact=True).click();await exact_native(page,both)
    actual=await download_format(page,'PNG')
    assert decode_png(actual)==(16,16,both),'Actual PNG bytes differ from literal red/blue cells and transparent background'
    await exact_native(page,both)
    return {'literalAll1024Channels':True,'redCell':[2,3],'blueCell':[8,10],'transparentOrigin':True,'undoRedoExact':True,'actualPngDecoded':True,'pngSha256':hashlib.sha256(actual).hexdigest()}

async def save_journey(page):
    await blank_drawing(page,'S4 Save Roundtrip')
    red=[0]*1024;red[(3*16+2)*4:(3*16+2)*4+4]=[255,0,0,255]
    blue=[0]*1024;blue[(10*16+8)*4:(10*16+8)*4+4]=[0,0,255,255]
    await pen_at(page,2,3,'#ff0000');await exact_native(page,red)
    hold=page.get_by_role('spinbutton',name='Active frame duration in milliseconds',exact=True)
    await hold.fill('100');await hold.press('Tab')
    await page.get_by_test_id('add-frame-button').click();await exact_native(page,[0]*1024)
    await hold.fill('200');await hold.press('Tab')
    await page.get_by_test_id('tab-layers').click()
    await page.get_by_role('button',name='Add New Layer',exact=True).click()
    await page.get_by_role('button',name='Select layer Layer 2. Double click to rename',exact=True).dblclick()
    await page.get_by_role('textbox',name='Layer name',exact=True).fill('Blue Mark')
    await page.get_by_role('textbox',name='Layer name',exact=True).press('Enter')
    await pen_at(page,8,10,'#0000ff');await exact_native(page,blue)
    before=await project(page)
    assert before['name']=='S4 Save Roundtrip'
    assert [f['durationMs'] for f in before['frames']]==[100,200]
    assert [[l['name'] for l in f['layers']] for f in before['frames']]==[['Base Layer'],['Blue Mark','Base Layer']]
    for f,expected in zip(before['frames'],[red,blue]):
        for layer in f['layers']:
            required=expected if layer['name']=='Blue Mark' or f is before['frames'][0] else [0]*1024
            assert decode_png(base64.b64decode(layer['pngBase64']))==(16,16,required)
    await page.get_by_test_id('save-button').click()
    await expect(page.get_by_role('status').filter(has_text=re.compile('^Changes saved$'))).to_be_visible()
    await page.reload();await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
    after=await project(page);assert exact_project(after)==exact_project(before),'Actual saved project changed after real same-context reload'
    for index,expected in enumerate([red,blue]):
        await frame(page,index);await exact_native(page,expected)
        await expect(hold).to_have_value(str([100,200][index]))
        assert decode_png(await download_format(page,'PNG'))==(16,16,expected)
    return {'actualReload':True,'perFrameLayerCounts':[1,2],'holdsMs':[100,200],'projectIdentitiesAndAllLayerPngExact':True,'decodedPngForBothFrames':True,'scope':'Browser save and reload; not crash recovery or persistent Undo.'}

async def svg_journey(page):
    before_pixels=await raster(page.get_by_test_id('main-composite-canvas'))
    assert len(before_pixels)==1024 and sum(v>0 for v in before_pixels[3::4])==192
    before=await project(page)
    await page.get_by_test_id('export-button').click()
    await page.get_by_test_id('export-tab-svg').click()
    dialog=page.get_by_role('dialog')
    await expect(dialog.get_by_text(re.compile('An approximate contour conversion'))).to_be_visible()
    await expect(dialog.get_by_text(re.compile('Smoothing can change edges and small details'))).to_be_visible()
    await dialog.get_by_role('button',name='4x',exact=True).click()
    await expect(dialog.get_by_text('64 × 64 px (Vector SVG)',exact=True)).to_be_visible()
    async with page.expect_download() as pending:await dialog.get_by_role('button',name='Download SVG',exact=True).click()
    download=await pending.value;assert await download.failure() is None
    path=await download.path();assert path
    import xml.etree.ElementTree as ET
    content=Path(path).read_bytes();root=ET.fromstring(content)
    assert root.tag=='{http://www.w3.org/2000/svg}svg'
    assert root.attrib['width'] in ('64','64px') and root.attrib['height'] in ('64','64px')
    geometry=[e for e in root.iter() if e.tag.rsplit('}',1)[-1] in ('path','polygon','rect')]
    assert any(e.attrib.get('d') or e.attrib.get('points') or (float(e.attrib.get('width',0))>0 and float(e.attrib.get('height',0))>0) for e in geometry),'No meaningful emitted SVG geometry'
    await exact_native(page,before_pixels)
    assert exact_project(await project(page))==exact_project(before),'SVG export changed saved artwork or metadata'
    return {'actualSvgParsed':True,'namespaceCorrect':True,'dimensions':[64,64],'nonemptyGeometry':True,'approximationGuidanceVisible':True,'artworkAndProjectExact':True,'scope':'Approximate vectorization; no pixel-exact vector reconstruction claim.'}

async def cycle_journey(page):
    rgba=await raster(page.get_by_test_id('main-composite-canvas'))
    assert len(rgba)==1024 and sum(v>0 for v in rgba[3::4])==192,'Bun fixture not admitted'
    assert decode_png(await download_format(page,'PNG'))==(16,16,rgba)
    await page.get_by_role('button',name='Palette',exact=True).click()
    scan=page.get_by_role('button',name='Scan Canvas',exact=True)
    if not await scan.is_visible():await page.get_by_role('button',name=re.compile('^Palette workshop')).click()
    await scan.click()
    original=await project(page)
    selected_palette=next(p for p in original['palettes'] if p['id']==original['currentPaletteId'])
    colors=selected_palette['colors']
    rgb=[list(bytes.fromhex(c[1:]))+[255] for c in colors]
    assert len(rgb)==6 and {tuple(rgba[i:i+4]) for i in range(0,1024,4) if rgba[i+3]}=={tuple(c) for c in rgb},'Scanned palette does not match actual Bun colors'
    animated_cells=[(i,rgb.index(rgba[i:i+4])) for i in range(0,1024,4) if rgba[i:i+4] in rgb[2:6]]
    assert animated_cells and all(any(rgba[i:i+4]==rgb[k] for i in range(0,1024,4)) for k in range(6))
    engine=page.get_by_role('button',name='Cycle Engine',exact=True)
    if await engine.get_attribute('aria-expanded')=='false':await engine.click()
    await page.get_by_role('button',name='Add Color Range Track',exact=True).click()
    track=page.get_by_role('button',name='Cycle 1',exact=True)
    if await track.get_attribute('aria-expanded')=='false':await track.click()
    await page.get_by_role('button',name='Last color 5: '+colors[5],exact=True).click()
    await page.get_by_role('button',name='First color 2: '+colors[2],exact=True).click()
    smooth=page.get_by_role('checkbox',name='BlendShift (Smooth)',exact=True)
    if await smooth.is_checked():await smooth.locator('..').click()
    await expect(smooth).not_to_be_checked()
    await page.get_by_role('combobox',name='Direction',exact=True).select_option('forward')
    rate=page.get_by_role('spinbutton',name='Rate (Hz)',exact=True)
    observed=[]
    for value in ['6','5.5','5.6']:
        await rate.fill(value);await rate.press('Tab');await expect(rate).to_have_value(value)
        observation=await rate.evaluate('e=>({value:e.value,valid:e.validity.valid,stepMismatch:e.validity.stepMismatch})')
        assert observation=={'value':value,'valid':True,'stepMismatch':False};observed.append(observation)
    await rate.fill('5.5');await rate.press('Tab');before_last_edit=await project(page)
    await rate.fill('6');await rate.press('Tab');before_play=await project(page)
    selected=next(p for p in before_play['palettes'] if p['id']==before_play['currentPaletteId'])
    assert [(t['low'],t['high'],t['rate'],t['direction'],t['blendShift']) for t in selected['cycleTracks']]==[(2,5,6,'forward',False)]
    await page.get_by_role('button',name='Play Cycle',exact=True).click()
    phases=set()
    for _ in range(70):
        actual=await raster(page.get_by_test_id('main-composite-canvas'))
        first_offset,first_register=animated_cells[0]
        first=actual[first_offset:first_offset+4]
        assert first in rgb[2:6], 'First animated register left the declared palette interval'
        phase=(rgb.index(first)-first_register)%4;phases.add(phase)
        expected=rgba.copy()
        for offset,register in animated_cells:expected[offset:offset+4]=rgb[2+(register-2+phase)%4]
        assert actual==expected,'Cycle changed an outside pixel, endpoint, alpha, or register order'
        if len(phases)>=3:break
        await asyncio.sleep(.05)
    assert len(phases)>=3,'No independently observed multi-phase cycle playback'
    await page.get_by_role('button',name='Pause Cycle',exact=True).click();await exact_native(page,rgba)
    assert exact_project(await project(page))==exact_project(before_play),'Preview changed serialized artwork or metadata'
    await page.get_by_test_id('undo-button').click()
    assert exact_project(await project(page))==exact_project(before_last_edit),'Playback consumed an artwork/configuration Undo entry'
    await page.get_by_role('button',name='Redo last action',exact=True).click()
    assert exact_project(await project(page))==exact_project(before_play)
    await page.get_by_role('button',name='Delete track',exact=True).click()
    await expect(page.get_by_role('button',name='Delete track',exact=True)).to_have_count(0)
    await exact_native(page,rgba)
    deleted=await project(page)
    def no_tracks(p):
        clean=exact_project(p)
        for palette in clean['palettes']:palette.pop('cycleTracks',None)
        return clean
    assert no_tracks(deleted)==no_tracks(original),'Track deletion changed protected project data'
    return {'nativeRateObservations':observed,'inclusiveInterval':[2,5],'observedPhases':sorted(phases),'all1024ChannelsComparedPerPhase':True,'outsideRegistersAndTransparencyExact':True,'actualBunAndScannedPaletteVerified':True,'previewDidNotConsumeUndo':True,'redoExact':True,'trackDeletedArtworkProtected':True,'scope':'Discrete forward cycling of a declared Bun range; does not qualify blended or ping-pong timing.'}

JOURNEYS={'png':png_journey,'save':save_journey,'svg':svg_journey,'cycle':cycle_journey}

async def run_test():
    scenario=os.environ.get('PIXIBUN_SCENARIO',SCENARIO)
    assert scenario in JOURNEYS
    async with async_api.async_playwright() as pw:
        browser,context,page=await open_browser(pw,target_url())
        try:
            await expect(page.locator('[data-restoration-phase="active"]')).to_be_visible()
            await expect(page).not_to_have_url(re.compile('template='))
            detail=await JOURNEYS[scenario](page)
            emit_evidence('remaining-'+scenario,{**await assert_destination(page,target_url()),'scenario':scenario,**detail})
        except Exception:
            await capture_artifact(page,'remaining-'+scenario+'-failed');raise
        finally:await browser.close()

if __name__=='__main__':asyncio.run(run_test())
