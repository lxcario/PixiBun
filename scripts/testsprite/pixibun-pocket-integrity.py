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



EXPECTED_COMMIT = None

def target_url():return os.environ.get('PIXIBUN_LOCAL_URL','VAR_{url}').rstrip('/')

async def run_test():
    async with async_api.async_playwright() as pw:
        engine=os.environ.get('PIXIBUN_BROWSER','chromium')
        options={'headless':True}
        if engine=='chromium':
            options['args']=['--window-size=390,844','--disable-dev-shm-usage']
            if os.environ.get('PIXIBUN_QUALIFICATION')!='1':options['args']+=['--ipc=host','--single-process']
        if os.environ.get('PIXIBUN_BROWSER_EXECUTABLE'):
            assert os.environ.get('PIXIBUN_QUALIFICATION')=='1'
            options['executable_path']=os.environ['PIXIBUN_BROWSER_EXECUTABLE']
        browser=await getattr(pw,engine).launch(**options)
        try:
            context=await browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
            page=await context.new_page();page.set_default_timeout(15000)
            await page.goto(target_url()+'/studio')
            await assert_destination(page,target_url())
            await page.get_by_role('link',name='Try Pocket Doodle Pad',exact=True).click()
            await expect(page).to_have_url(re.compile('/playground$'))
            await expect(page.get_by_role('heading',name='Pocket Doodle Pad',exact=True)).to_be_visible()
            await expect(page.get_by_test_id('main-composite-canvas')).to_have_count(0)
            await expect(page.get_by_role('button',name='Save PNG',exact=True)).to_be_visible()
            await page.get_by_role('tab',name='Free doodle',exact=True).click()
            canvas=page.get_by_role('img',name='Pocket doodle canvas',exact=True)
            actual=lambda:canvas.evaluate('c=>Array.from(c.getContext("2d").getImageData(0,0,c.width,c.height).data)')
            assert await actual()==[0]*4096
            await page.get_by_role('button',name='Use #8cb9c9 color',exact=True).click()
            async def point(x,y):
                await canvas.scroll_into_view_if_needed()
                box=await canvas.bounding_box();assert box
                await page.mouse.click(box['x']+(x+.5)*box['width']/32,box['y']+(y+.5)*box['height']/32)
            expected=[0]*4096
            for x,y in [(4,5),(10,8)]:
                await point(x,y);expected[(y*32+x)*4:(y*32+x)*4+4]=[140,185,201,255]
                assert await actual()==expected
            await page.get_by_role('button',name='Eraser',exact=True).click();await point(4,5)
            expected[(5*32+4)*4:(5*32+4)*4+4]=[0,0,0,0]
            assert await actual()==expected,'Pocket eraser changed its neighbor or failed to clear the selected pixel'
            async with page.expect_download() as pending:await page.get_by_role('button',name='Save PNG',exact=True).click()
            download=await pending.value;assert await download.failure() is None
            path=await download.path();assert path
            assert decode_png(Path(path).read_bytes())==(32,32,expected),'Actual Pocket PNG differs from the literal painted/erased artwork'
            await page.get_by_role('button',name='Clear',exact=True).click();assert await actual()==[0]*4096
            await page.get_by_role('link',name='Home',exact=True).click()
            await expect(page).to_have_url(re.compile('/$'))
            identity=await assert_destination(page,target_url())
            assert await page.evaluate('({width:innerWidth,height:innerHeight})')=={'width':390,'height':844}
            result={**identity,'viewport':[390,844],'studioGateAndPocketReachable':True,'fullStudioAbsent':True,'realSwatchPenAndEraser':True,'all4096ChannelsExact':True,'actualPngDecoded':True,'clearExact':True,'homeReachable':True,'scope':'Desktop browser simulation at mobile viewport. No physical-touch or native-device qualification.'}
            print('PIXIBUN_POCKET_EVIDENCE',json.dumps(result),flush=True)
            if os.environ.get('PIXIBUN_EVIDENCE_PATH'):Path(os.environ['PIXIBUN_EVIDENCE_PATH']).write_text(json.dumps(result,indent=2))
        finally:await browser.close()

if __name__=='__main__':asyncio.run(run_test())
