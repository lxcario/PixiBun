"""Verify ZIP integrity and manifest hashes before extracting a local game kit.

Usage: python scripts/verifyGodotKit.py archive.zip artifacts/phase5/sample
No network access; destination must remain within this repository's artifacts.
"""
import hashlib
import json
import pathlib
import re
import sys
import zipfile

root = pathlib.Path(__file__).resolve().parent.parent
archive = pathlib.Path(sys.argv[1]).resolve()
destination = pathlib.Path(sys.argv[2]).resolve()
if not destination.is_relative_to(root / 'artifacts'):
    raise ValueError('Extraction destination must stay within repository artifacts.')
with zipfile.ZipFile(archive) as bundle:
    names = bundle.namelist()
    if len(names) != len(set(names)) or len(names) > 64:
        raise ValueError('Duplicate or excessive assets.')
    if sum(info.file_size for info in bundle.infolist()) > 128 * 1024 * 1024:
        raise ValueError('Bundle exceeds the download limit.')
    if bundle.testzip() is not None:
        raise ValueError('ZIP CRC failure.')
    for name in names:
        if not re.fullmatch(r'[a-zA-Z0-9_.-]+', name) or name in ('.', '..'):
            raise ValueError('Unsafe asset path.')
        if not (destination / name).resolve().is_relative_to(destination):
            raise ValueError('Asset target escapes the extraction destination.')
    manifest = json.loads(bundle.read('manifest.json'))
    if set(manifest['assetSha256']) != set(names) - {'manifest.json'}:
        raise ValueError('Missing or unexpected assets.')
    for name, digest in manifest['assetSha256'].items():
        if hashlib.sha256(bundle.read(name)).hexdigest() != digest:
            raise ValueError(f'Asset SHA-256 failure: {name}')
    destination.mkdir(parents=True, exist_ok=True)
    for name in names:
        (destination / name).write_bytes(bundle.read(name))
print(json.dumps({'archive': str(archive), 'assets': len(names), 'crc': 'pass', 'sha256': 'pass', 'destination': str(destination)}))
