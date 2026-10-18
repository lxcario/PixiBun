import ast
import binascii
import io
import random
import struct
import zlib
from pathlib import Path
from PIL import Image

source = Path(__file__).with_name('pixibun-journey-journey.py').read_text(encoding='utf-8')
tree = ast.parse(source)
pure = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ['decode_png', 'decode_gif', 'decode_apng']]
namespace = {'struct': struct, 'zlib': zlib, 'binascii': binascii}
exec(compile(ast.Module(body=pure, type_ignores=[]), '<independent-bounded-readers>', 'exec'), namespace)
checks = []
for size, colors, interlace in [(16, 4, False), (64, 256, False), (64, 256, True)]:
    rng = random.Random(42)
    palette = [channel for i in range(256) for channel in (i, (i * 19) % 256, (i * 71) % 256)]
    frames = []
    for index in range(2):
        image = Image.new('P', (size, size))
        image.putpalette(palette)
        image.putdata([rng.randrange(colors) for _ in range(size * size)])
        image.info['transparency'] = 0
        frames.append(image)
    output = io.BytesIO()
    frames[0].save(output, format='GIF', save_all=True, append_images=frames[1:], duration=[100, 200],
        loop=0, transparency=0, disposal=2, optimize=False, interlace=interlace)
    data = output.getvalue()
    width, height, decoded = namespace['decode_gif'](data)
    oracle = Image.open(io.BytesIO(data))
    expected = []
    for index in range(oracle.n_frames):
        oracle.seek(index)
        expected.append({'rgba': list(oracle.convert('RGBA').tobytes()), 'delayMs': oracle.info['duration']})
    assert (width, height) == (size, size) and decoded == expected
    checks.append(f'GIF {size}px/{colors} colors interlace={interlace}: exact pixels and holds')
    try:
        namespace['decode_gif'](data[:-4])
        raise RuntimeError('Truncated GIF was accepted')
    except AssertionError:
        checks.append('Truncated GIF refused')

for disposal in [0, 1, 2]:
    frames = []
    for index in range(3):
        image = Image.new('RGBA', (16, 16))
        for x in range(2 + index * 3, 5 + index * 3):
            for y in range(3, 6): image.putpixel((x, y), (200, 30 + 50 * index, 80, 255))
        frames.append(image)
    output = io.BytesIO()
    frames[0].save(output, format='PNG', save_all=True, append_images=frames[1:], duration=[100, 200, 300],
        loop=0, disposal=[0, disposal, 0], blend=[0, 0, 0])
    data = output.getvalue()
    width, height, decoded = namespace['decode_apng'](data)
    oracle = Image.open(io.BytesIO(data))
    expected = []
    for index in range(oracle.n_frames):
        oracle.seek(index)
        expected.append({'rgba': list(oracle.convert('RGBA').tobytes()), 'delayMs': oracle.info['duration']})
    assert (width, height) == (16, 16) and decoded == expected
    checks.append(f'APNG disposal={disposal}: exact pixels and holds')
    corrupt = bytearray(data)
    corrupt[29] ^= 1
    try:
        namespace['decode_apng'](corrupt)
        raise RuntimeError('CRC-corrupt APNG was accepted')
    except AssertionError:
        checks.append('Corrupt APNG refused')

(Path(__file__).resolve().parents[2] / 'artifacts/s4-animation-oracle-checks.json').write_text(__import__('json').dumps({'checks': checks, 'count': len(checks),
    'scope': 'Readers cross-checked against independently encoded Pillow GIF/APNG fixtures; not a cloud or app export verdict.'}, indent=2), encoding='utf-8')
print(f'{len(checks)} bounded decoder checks passed against independent Pillow files, including code-width growth and corrupt/truncated input refusal.')
