import json, hashlib
from pathlib import Path
from urllib.parse import urlparse, unquote
from html.parser import HTMLParser
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'source/asset-manifest.json').read_text(encoding='utf-8'))
canvas=json.loads((ROOT/'source/canvas.json').read_text(encoding='utf-8'))
review=json.loads((ROOT/'source/review-index.json').read_text(encoding='utf-8'))
checks=json.loads((ROOT/'source/browser-checks.json').read_text(encoding='utf-8-sig'))
errors=[]
for item in manifest:
    p=ROOT/item['file']
    if not p.is_file(): errors.append('Missing image: '+item['file']);continue
    if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']: errors.append('Checksum: '+item['id'])
    with Image.open(p) as im:
        im.load()
        if (im.width,im.height)!=(item['width'],item['height']): errors.append('Dimensions: '+item['id'])
for item in review:
    if not (ROOT/item['thumbnail']).is_file():errors.append('Missing thumbnail: '+item['id'])
record=dict(checked_date='2026-10-19',source_url='https://rhtv.runninghub.cn/camp/view/2069614228987592706',nodes=len(canvas['nodes']),images=len(manifest),text_nodes=sum(n['type']=='rh-text' for n in canvas['nodes']),bytes=sum(r['bytes'] for r in manifest),unique_images=len(set(r['sha256'] for r in manifest)),image_checks='Full decode, dimensions and SHA256 for every downloaded file',browser_checks=checks,errors=errors)
vp=ROOT/'source/verification.json';vp.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,val in attrs:
            if key not in ('href','src') or not val:continue
            parsed=urlparse(val)
            if parsed.scheme or val.startswith('#'):continue
            if not (ROOT/unquote(parsed.path)).exists():errors.append('Missing link: '+val)
for name in ['index.html','研究报告.html']:
    parser=Links();parser.feed((ROOT/name).read_text(encoding='utf-8'))
if not all(c['pass'] for c in checks):errors.append('Browser check failure')
record['status']='passed' if not errors else 'failed'
vp.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(record,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
