import json
import pathlib
import sys
import zipfile

verified = []
for root in sys.argv[1:]:
    for archive_path in sorted(pathlib.Path(root).rglob('untouched-source.zip')):
        source = json.loads((archive_path.parent / 'source-before.json').read_text())
        with zipfile.ZipFile(archive_path) as archive:
            assert archive.testzip() is None, archive_path
            assert archive.read('project.json').decode('utf-8') == source['project']['dataJson']
            assert json.loads(archive.read('project.json'))['name'] == 'Archive boundary fixture'
            assert source['count'] == 3
            pngs = [name for name in archive.namelist() if name.endswith('.png')]
            assert len(pngs) == 3
            assert sorted(archive.read(name) for name in pngs) == [bytes([i, 17, 239]) for i in range(3)]
            assert json.loads(archive.read('recovery-manifest.json'))
        verified.append(str(archive_path))
assert verified, 'No actual downloaded archives found'
print(json.dumps({'kind': 'independent-python-zipfile-crc-and-original-byte-check', 'passedArchives': len(verified), 'archives': verified}, indent=2))
