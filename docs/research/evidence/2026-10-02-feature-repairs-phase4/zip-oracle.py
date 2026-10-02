import pathlib, zipfile, json
root=pathlib.Path('artifacts/feature-repairs/phase4-captures-final')
zip_path=next(root.rglob('manual-normals.zip'))
dest=pathlib.Path('artifacts/feature-repairs/phase4-godot-manual');dest.mkdir(exist_ok=False)
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    for name in z.namelist():
        assert pathlib.PurePosixPath(name).name==name
    z.extractall(dest)
for p in root.rglob('tiles-*.zip'):
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None
        m=json.loads(z.read('tilemap.json'));t=json.loads(z.read('map.tmj'))
        assert t['layers'][0]['data']==[i+1 for row in m['tilemap'] for i in row]
        print(p.name, 'CRC verified;',m['uniqueTiles'],'tiles;',m['columns'],'x',m['rows'],'cells')
print('Manual-normal kit CRC verified and safely unpacked:',dest)
