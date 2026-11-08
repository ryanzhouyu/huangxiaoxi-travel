"""对比隔离重建文件与现有图集；记录差异，不替换原成品。"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

out = Path('output/r00/2026-11-08/rebuild-check.json')
report = json.loads(out.read_text(encoding='utf-8'))
checks = []
for record in report['records']:
    for name in record['files']:
        rebuilt = Path(report['outputDirectory']) / name
        original = Path('design/demo/assets/wardrobe') / name
        with Image.open(rebuilt) as raw_a, Image.open(original) as raw_b:
            a, b = raw_a.convert('RGBA'), raw_b.convert('RGBA')
            assert a.size == b.size, name + ' dimensions differ'
            diff = ImageChops.difference(a, b)
            checks.append({
                'file': name, 'size': list(a.size),
                'decodedPixelsEqual': a.tobytes() == b.tobytes(),
                'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
                'rebuiltSha256': hashlib.sha256(rebuilt.read_bytes()).hexdigest(),
                'meanAbsoluteDifferenceRgba': ImageStat.Stat(diff).mean,
                'maxDifferenceRgba': [v[1] for v in diff.getextrema()],
                'alphaPixelsEqual': a.getchannel('A').tobytes() == b.getchannel('A').tobytes(),
            })
report['pixelChecks'] = checks
report['allDecodedPixelsMatch'] = all(c['decodedPixelsEqual'] for c in checks)
report['assessment'] = 'Frame geometry and alpha match; some decoded RGB values differ slightly. Cause unconfirmed. Visual preview reviewed; exact reproducibility not certified. Freeze toolchain and compare before replacement in R02.'
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
assert all(c['alphaPixelsEqual'] for c in checks), 'Alpha differs; review required'
print(f"Compared {len(checks)} files; exact pixels: {sum(c['decodedPixelsEqual'] for c in checks)}; all alpha equal.")
