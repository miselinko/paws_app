"""CI priprema za Android build (poziva se iz .github/workflows/build-apk.yml).

1. pre prebuild-a:  python scripts/ci_prepare_android.py version <versionCode>
   upisuje android.versionCode u app.json
2. posle prebuild-a: python scripts/ci_prepare_android.py signing
   ako je postavljen PAWS_KEYSTORE_PATH, release build se potpisuje tim keystore-om
   (lozinke i alias iz env varijabli / GitHub Secrets). Bez njega ostaje Expo
   podrazumevani potpis — isti kao kod dosadašnjeg lokalnog build_apk.ps1.
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def set_version(code: int):
    p = ROOT / 'app.json'
    data = json.loads(p.read_text(encoding='utf-8'))
    data['expo'].setdefault('android', {})['versionCode'] = code
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'versionCode={code} version={data["expo"]["version"]}')


def patch_signing():
    if not os.environ.get('PAWS_KEYSTORE_PATH'):
        print('PAWS_KEYSTORE_PATH nije postavljen: release ostaje potpisan podrazumevanim Expo keystore-om.')
        return
    p = ROOT / 'android' / 'app' / 'build.gradle'
    s = p.read_text(encoding='utf-8')
    release_cfg = """
        release {
            storeFile file(System.getenv("PAWS_KEYSTORE_PATH"))
            storePassword System.getenv("PAWS_KEYSTORE_PASSWORD")
            keyAlias System.getenv("PAWS_KEY_ALIAS")
            keyPassword System.getenv("PAWS_KEY_PASSWORD")
        }"""
    s, n1 = re.subn(r"(signingConfigs\s*\{\s*debug\s*\{[^}]*\})", r"\1" + release_cfg, s, count=1)
    # u release buildType zameni debug potpis release potpisom
    head, sep, tail = s.partition('buildTypes {')
    tail, n2 = re.subn(r"(release\s*\{[^}]*?)signingConfig signingConfigs\.debug", r"\1signingConfig signingConfigs.release", tail, count=1)
    s = head + sep + tail
    if not (n1 and n2):
        sys.exit('Nije uspelo podešavanje potpisa u build.gradle')
    p.write_text(s, encoding='utf-8')
    print('Release build se potpisuje keystore-om iz GitHub Secrets.')


if __name__ == '__main__':
    if sys.argv[1] == 'version':
        set_version(int(sys.argv[2]))
    elif sys.argv[1] == 'signing':
        patch_signing()
