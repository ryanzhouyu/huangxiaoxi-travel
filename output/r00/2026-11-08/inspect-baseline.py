"""R00 只读盘点；输出不覆盖素材、程序或历史报告。从仓库根目录运行。"""
import hashlib
import json
import re
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path.cwd()
OUT = ROOT / 'output/r00/2026-11-08'
BASE = '8c5ba355b4b60708ea8210c238ebfd563b896bde'

def git(*args):
    return subprocess.check_output(['git', *args], encoding='utf-8').strip()

def save(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

files = subprocess.check_output(['git', 'ls-files', '-z'], encoding='utf-8').rstrip('\0').split('\0')
prefixes = ('design/demo/assets/', 'design/hifi/assets/', 'reviews/2026-11-05-wardrobe/selected/', 'reviews/2026-11-05-ui-companion/')
assets = []
for name in files:
    p = ROOT / name
    if name.startswith(prefixes) and p.suffix.lower() in ('.png', '.webp', '.jpg', '.jpeg'):
        with Image.open(p) as im:
            assets.append({'path': name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'size': list(im.size), 'mode': im.mode})
source_exts = {'.psd', '.psb', '.ora', '.kra', '.xcf', '.blend', '.fbx', '.glb', '.gltf', '.moc3', '.cmo3', '.spine', '.skel', '.aep', '.moho', '.fla'}
sources = [f for f in files if Path(f).suffix.lower() in source_exts or f.endswith('.model3.json')]
fonts = [f for f in files if Path(f).suffix.lower() in {'.woff', '.woff2', '.ttf', '.otf'}]
modules = []
for name in files:
    p = ROOT / name
    if p.suffix != '.mjs' or not (name.count('/') == 1 and name.startswith('design/') or name.startswith('design/demo/') and '/tests/' not in name or name == 'design/hifi/art.mjs'):
        continue
    body = p.read_text(encoding='utf-8')
    imports = re.findall(r"(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['\"]([^'\"]+)['\"]", body)
    links = []
    for value in imports:
        if value.startswith('.'):
            target = (p.parent / value.split('?')[0].split('#')[0]).resolve()
            links.append({'literal': value, 'target': target.relative_to(ROOT).as_posix(), 'exists': target.exists()})
    modules.append({'path': name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'imports': links})
selection = json.loads((ROOT / 'reviews/2026-11-05-wardrobe/selected/selection.json').read_text(encoding='utf-8'))
scope = {
    'date': '2026-11-08', 'baseCommit': BASE,
    'method': 'git tracked files; raster metadata; literal ES module imports only, dynamic resource construction reviewed separately',
    'sourceScanExtensions': sorted(source_exts) + ['*.model3.json'],
    'editableAnimationSourcesFound': sources, 'bundledFontsFound': fonts,
    'sourceScanLimit': 'Does not inspect untracked external drives, private art-provider files or archives; no conclusion that external sources do not exist.',
    'outfits': [{'selection': x['id'], 'outfitId': x['outfitId'], 'name': x['name'], 'board': 'reviews/2026-11-05-wardrobe/selected/' + x['board'], 'assetIds': [s['assetId'] for s in x['slots'].values()]} for x in selection['outfits']],
    'assets': assets, 'modules': modules,
    'missingLiteralImports': [x for m in modules for x in m['imports'] if not x['exists']],
    'unverified': ['continuous animation', 'editable rig', 'production rights', 'real iPhone/Android and WeChat', 'cloud identity and storage']
}
OUT.mkdir(parents=True, exist_ok=True)
save('baseline-inventory.json', scope)
print(json.dumps({'assets': len(assets), 'modules': len(modules), 'editableSources': len(sources), 'fonts': len(fonts), 'missingImports': len(scope['missingLiteralImports'])}, ensure_ascii=False))
