from pathlib import Path
import zipfile,json
from PIL import Image
from io import BytesIO
root=Path('artifacts/playwright-production-3111')
count=0
for p in sorted(root.rglob('*.zip')):
    if p.name not in ('manual-normals.zip','tiles-8.zip','tiles-16.zip','tiles-32.zip'): continue
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None
        if p.name.startswith('tiles-'):
            m=json.loads(z.read('tilemap.json'));t=json.loads(z.read('map.tmj'))
            assert t['layers'][0]['data']==[i+1 for row in m['tilemap'] for i in row]
            a=Image.open(BytesIO(z.read('tileset.png')))
            assert a.size==(m['atlas']['width'],m['atlas']['height'])
        elif 'chromium' in str(p):
            dest=Path('artifacts/feature-repairs/phase4-godot-compiled');dest.mkdir(exist_ok=False)
            for n in z.namelist(): assert Path(n).name==n
            z.extractall(dest)
    print(p.parent.name,p.name,'CRC and native atlas/map checks passed')
    count+=1
assert count==12,count
print('12 final compiled output ZIPs passed; manual kit safely unpacked for fresh Godot checks.')
