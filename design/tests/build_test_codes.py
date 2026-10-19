"""Generate QR fixtures from the same point configuration used by the app."""
import argparse
import html
import json
from pathlib import Path
import subprocess
from urllib.parse import urlencode, urlsplit
import qrcode

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8765/design/index.html')
args = parser.parse_args()
url = urlsplit(args.base_url)
if url.scheme not in ('http', 'https') or not url.netloc or url.query or url.fragment:
    raise ValueError('base-url must be an absolute http(s) index URL without query or hash')
points = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {POINTS} from './data.mjs'; console.log(JSON.stringify(POINTS))"], cwd=root, encoding='utf-8'))
dest = root / 'test-codes'
dest.mkdir(exist_ok=True)
cards = []
fixtures = []
for p in points:
    target = args.base_url + '#checkin?' + urlencode({'id': p['id'], 'code': p['code']})
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=4)
    qr.add_data(target)
    qr.make(fit=True)
    qr.make_image(fill_color='black', back_color='white').save(dest / (p['id'] + '.png'))
    fixtures.append({'pointId': p['id'], 'code': p['code'], 'url': target})
    cards.append(f'<article><h2>{html.escape(p["name"])}</h2><img src="test-codes/{p["id"]}.png" alt="{html.escape(p["name"])}测试二维码"><p>{html.escape(p["code"])}</p><a href="{html.escape(target)}">直接打开此测试点位 →</a></article>')
page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>黄晓西 · 测试点位码</title><style>body{font:14px/1.8 sans-serif;background:#f5f2e9;color:#2c5145;margin:30px auto;padding:0 24px;max-width:1000px}h1{font-weight:500}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{padding:20px;border:1px solid #c4ceb9;border-radius:12px;background:white;text-align:center}img{width:100%;max-width:270px;image-rendering:pixelated}a{color:inherit}code{overflow-wrap:anywhere}aside{background:#e5ebdc;padding:16px;margin:25px 0}</style><h1>测试点位二维码</h1><p>扫码或点击链接 → 选择演示账号与伙伴（首次）→ 回到此点位 → 确认打卡。</p><aside>二维码目标：<code>BASE</code><br>127.0.0.1 仅本机可访问，手机扫码不能访问电脑的本机地址。部署到手机可访问的网址后，请用 build_test_codes.py --base-url 重新生成。测试码只校验内容，不证明游客真实到场。</aside><section>CARDS</section><p><a href="index.html">回到旅行衣橱</a></p></html>'''
(root / 'test-points.html').write_text(page.replace('BASE', html.escape(args.base_url)).replace('CARDS', ''.join(cards)), encoding='utf-8')
(dest / 'manifest.json').write_text(json.dumps(fixtures, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Generated {len(fixtures)} test point codes from data.mjs')
