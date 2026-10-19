import json, re, hashlib, urllib.request, concurrent.futures, csv, html
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
canvas = json.loads((ROOT/'source/canvas.json').read_text(encoding='utf-8'))
nodes = canvas['nodes']
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 18)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 14)
records=[]
for i,n in enumerate(nodes,1):
    d=n['data']; name=d.get('label') or d.get('title') or 'Text'
    for j,url in enumerate(d.get('sourceObjects',[]),1):
        ext=Path(urllib.parse.urlparse(url).path).suffix.lower() or '.png'
        safe=re.sub(r'[<>:"/\\|?*\x00-\x1f]','_',name)
        if safe.lower().endswith(ext): safe=safe[:-len(ext)]
        records.append(dict(id=f'{i:03d}',node_id=n['id'],name=name,url=url,file=f'assets/original/{i:03d}_{safe}{ext}',x=n['position']['x'],y=n['position']['y']))

def fetch(r):
    path=ROOT/r['file']
    try:
        if not path.exists():
            req=urllib.request.Request(r['url'],headers={'User-Agent':'Mozilla/5.0','Referer':'https://rhtv.runninghub.cn/'})
            with urllib.request.urlopen(req,timeout=60) as res: path.write_bytes(res.read())
        with Image.open(path) as im:
            r.update(width=im.width,height=im.height,format=im.format)
            im.verify()
        r.update(bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),status='ok')
    except Exception as e: r.update(status='failed',error=str(e))
    return r

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    records=list(pool.map(fetch,records))
(ROOT/'source/asset-manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
with (ROOT/'source/asset-manifest.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['id','node_id','name','file','width','height','format','bytes','sha256','url','x','y','status','error']
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(records)

for page in range((len(records)+11)//12):
    group=records[page*12:page*12+12]
    sheet=Image.new('RGB',(1600,3*660),(239,236,229));draw=ImageDraw.Draw(sheet)
    for idx,r in enumerate(group):
        x=(idx%4)*400;y=(idx//4)*660
        if r['status']=='ok':
            with Image.open(ROOT/r['file']) as im:
                thumb=ImageOps.contain(im.convert('RGB'),(380,590))
                sheet.paste(thumb,(x+(400-thumb.width)//2,y+10))
        draw.text((x+12,y+606),f"{r['id']} {r['name'][:20]}",font=font,fill='#262721')
        draw.text((x+12,y+632),f"{r.get('width','?')} × {r.get('height','?')}",font=small,fill='#61645b')
    sheet.save(ROOT/f'previews/contact-sheet-{page+1:02d}.jpg',quality=91)

notes=[dict(id=f'{i:03d}',node_id=n['id'],position=n['position'],text=n['data'].get('text')) for i,n in enumerate(nodes,1) if n['type']=='rh-text']
(ROOT/'source/text-notes.json').write_text(json.dumps(notes,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(nodes=len(nodes),image_nodes=len(records),text_nodes=len(notes),edges=len(canvas['edges']),downloaded=sum(r['status']=='ok' for r in records),bytes=sum(r.get('bytes',0) for r in records),failures=[r for r in records if r['status']!='ok']),ensure_ascii=False,indent=2))
for r in records: print(r['id'],r['name'],r['status'])
