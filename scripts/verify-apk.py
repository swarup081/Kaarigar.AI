"""Inspect the standalone archive without printing local credentials."""
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

repo = Path(__file__).resolve().parent.parent
apk = Path(sys.argv[1]) if len(sys.argv) > 1 else repo / 'artifacts/Kaarigar-standalone.apk'
credentials = []
for relative in (
    'apps/mobile/.env',
    'apps/ai-services/voice-cataloger/.env',
    'apps/ai-services/pricing-engine/.env',
):
    source = repo / relative
    if not source.exists():
        continue
    for line in source.read_text(encoding='utf-8-sig').splitlines():
        if not line.strip() or line.lstrip().startswith('#') or '=' not in line:
            continue
        name, value = line.split('=', 1)
        value = value.strip().strip('"\'')
        if len(value) >= 16 and re.search(r'KEY|TOKEN|SECRET|URL', name):
            credentials.append(value.encode())

with ZipFile(apk) as archive:
    names = archive.namelist()
    bundle = archive.read('assets/index.android.bundle')
    assert len(bundle) > 100_000, 'No complete bundled application was found.'
    assert b'generativelanguage.googleapis.com' in bundle, 'Direct Gemini transport missing.'
    assert b'API & environment' in bundle, 'Runtime settings screen missing.'
    for content_name in names:
        if content_name.endswith(('.dex', '.bundle', '.json', '.xml')):
            content = archive.read(content_name)
            assert not any(value in content for value in credentials), 'A local environment credential or endpoint was found in the APK.'
    abis = sorted({name.split('/')[1] for name in names if name.startswith('lib/') and name.endswith('.so')})
    assert 'arm64-v8a' in abis, 'ARM64 support missing.'
    print(json.dumps({
        'artifact': apk.name,
        'bytes': apk.stat().st_size,
        'sha256': hashlib.file_digest(apk.open('rb'), 'sha256').hexdigest(),
        'bundled_app_bytes': len(bundle),
        'architectures': abis,
        'project_credentials_found': False,
        'direct_gemini_and_settings_present': True,
    }, indent=2))
