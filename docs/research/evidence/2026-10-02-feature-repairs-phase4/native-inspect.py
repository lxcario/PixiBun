from pathlib import Path
import zipfile, io
from PIL import Image
root=Path('artifacts/playwright-production-3108')
for p in root.rglob('manual-normals.zip'):
    with zipfile.ZipFile(p) as z:
        a=Image.open(io.BytesIO(z.read('atlas.png'))); n=Image.open(io.BytesIO(z.read('normal.png')))
        print(p.parent.name, 'diffuse=',[a.getpixel(q) for q in [(1,1),(34,1),(1,18)]], 'normals=',[n.getpixel(q) for q in [(1,1),(17,1),(34,1),(50,1)]], 'profile keys',a.info.keys())
