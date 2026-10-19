import json, html, re
from pathlib import Path
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
records=json.loads((ROOT/'source/asset-manifest.json').read_text(encoding='utf-8'))
groups={
 '启动与创建':[13,14,28,29,30,76],
 '陪伴首页':[9],
 '背包与换装':[7,8,67],
 '图鉴与收藏':[10,11,49,70,71],
 '地图与导览':[1,16,17,47,48,72],
 '景点与打卡':[2,32,34,40,69],
 '卡池与抽奖':[4,5,12,31,33,35,36],
 '商家与文创':[6,15,43,75],
 '同行人与赠礼':[37,38,39,41,42,46,68,73,74],
 '宠物与旅行':[51,52,53,54,55,56,57,58,59,60,61,65,66],
 '旅程与回忆':[3,44,45],
 '画板分区标题':[18,19,20,21,22,23,24,25,26,27,50],
}
descriptions={
 1:'景区地图上首次赠送专属套装的弹窗。',2:'已打卡状态、奖励预览、去抽奖、附近商家动作彩蛋。',
 3:'角色与景点组合的分享海报，附二维码与社交入口；二维码为原稿图像，未经有效性验证。',
 4:'抽取中静态演出示意；与 032 原图内容相同。',5:'SSR 头部部件获得、套装剩余部件、再抽与放入衣橱；与 033 相同。',
 6:'店铺展示、示例商品与价格、导航、到店扫码、动作 GIF 概念。',7:'动作网格与动作配置槽；角色基底为男孩。',
 8:'按服装部位切换、稀有度、详情、套装进度、保存搭配。',9:'夜景角色、对白；背包／同行人／宠物／打卡和对话／地图／回忆。',
 10:'横向景点切换、整套预览、服饰背景动作网格的一版图鉴。',11:'图鉴整套与各类型收集状态。',
 12:'服饰和文创共用奖池示意、不重复获取、单抽五连抽、任务领券。',13:'浅色日间启动方向，多彩贵州智慧导览。',
 14:'夜景启动方向，贵州省智慧导览。',15:'商家打卡获得动作的结果页。',16:'省域各区域选择与总体收集进度；艺术化地图。',
 17:'区域内景区选择与套装收集进度。',18:'分区标题：启动页。',19:'分区标题：创建角色引导页。',20:'分区标题：首页。',
 21:'分区标题：图鉴收集。',22:'分区标题：背包。',23:'分区标题：地图选择 地图导览。',24:'分区标题：打卡流程。',
 25:'分区标题：抽奖流程。',26:'分区标题：同行人。',27:'分区标题：回忆地图。',
 28:'首页新手引导，一次展示多个功能入口。',29:'昵称、随机生成、男女形象与完成创建。',30:'创建角色的二次确认。',
 31:'券不足购买五连抽，示例价格 12 元；非已确认上线定价。',32:'命名为打卡动画，内容为抽取中；与 004 相同。',
 33:'SSR 服装部件结果；与 005 相同。',34:'打卡成功赠送一张券的弹窗。',35:'单抽券不足购买弹窗，示例价格 3 元。',
 36:'卡池剩余未解锁数量大于等于五件时推荐五连抽。',37:'邀请同行人、手机号／微信分享和关系选择。',
 38:'我发出的邀请、等待确认与已确认状态。',39:'我收到的邀请、接受拒绝与关系标签。',40:'点位未打卡状态和去打卡入口。',
 41:'同行人列表及解除关系操作。',42:'解除关系二次确认。',43:'附近商家动作彩蛋列表及导航。',
 44:'省域旅程回忆：时间、地点、路线、收获与图片视频分享。',45:'景区回忆：单人／情侣／同行人、时刻、角色与共同经历。',
 46:'亲密度达到宝箱门槛后的奖励弹窗。',47:'天河潭地图导览，较长画幅版本；原始文件名未描述功能。',
 48:'厕所筛选及附近设施距离提示。',49:'图鉴侧边分类与右侧服装网格布局的一版。',50:'分区标题：宠物系统。',
 51:'三种宠物、随机免费孵化八小时、9.9 元指定并立即获得的原稿示例。',52:'宠物孵化成功与命名。',
 53:'孵化倒计时与立即孵化购买入口。',54:'无宠物状态、同行人亲密度门槛与前往同行人。',55:'宠物服装预览、已获得／未解锁。',
 56:'多宠物选择与锁定槽位。',57:'按目的地区分的宠物虚拟旅行照片与短句。',58:'选择目的地、旅行时长、随行宠物与携带道具。',
 59:'宠物返回结算，照片、服饰、宠物用品、赠礼道具与消耗品。',60:'旅行中空巢、倒计时、加速与可能收获。',
 61:'使用道具加速返程。',65:'有宠物主页与出发旅行入口。',66:'旅行收获背包、小吃数量与赠送同行人；原始文件名未描述功能。',
 67:'背包背景分类、场景卡片、稀有度与保存搭配。',68:'100／250／450／700／999 亲密度宝箱及奖励说明。',
 69:'服饰部件结果附赠一张抽奖券。',70:'套装详情和部件进度，提供去收集入口。',71:'已收齐套装，提供去换装入口。',
 72:'天河潭导览默认状态、分类、当前位置和打卡进度。',73:'送虚拟贵州小吃、数量选择、亲密度加成与宝箱。',
 74:'同行人列表、关系标签、亲密度、赠礼与邀请申请入口。',75:'商家首次打卡获得动作并赠券。',
 76:'黄小西带你游贵州启动页；与口述黄晓西存在名称写法差异。',
}
thumbs=ROOT/'previews/thumbs';thumbs.mkdir(exist_ok=True)
for r in records:
    i=int(r['id']);r['category']=next(g for g,ids in groups.items() if i in ids)
    r['description']=descriptions[i]
    r['thumbnail']=f"previews/thumbs/{r['id']}.webp"
    with Image.open(ROOT/r['file']) as im:
        ImageOps.contain(im.convert('RGB'),(420,780)).save(ROOT/r['thumbnail'],'WEBP',quality=84)
    r['duplicate_of']={'032':'004','033':'005'}.get(r['id'])
(ROOT/'source/review-index.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')

def inline(s):
    s=html.escape(s)
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
    return re.sub(r'`([^`]+)`',r'<code>\1</code>',s)

def render_md(md):
    lines=md.splitlines();out=[];i=0
    while i<len(lines):
        line=lines[i]
        if not line.strip(): i+=1;continue
        if line.startswith('#'):
            lev=len(line)-len(line.lstrip('#'));out.append(f'<h{lev}>{inline(line[lev:].strip())}</h{lev}>');i+=1
        elif line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                vals=[s.strip() for s in lines[i].strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+',v) for v in vals): rows.append(vals)
                i+=1
            out.append('<div class="table"><table><thead><tr>'+''.join('<th>'+inline(v)+'</th>' for v in rows[0])+'</tr></thead><tbody>')
            out.extend('<tr>'+''.join('<td>'+inline(v)+'</td>' for v in row)+'</tr>' for row in rows[1:]);out.append('</tbody></table></div>')
        elif re.match(r'^\d+\. ',line):
            out.append('<ol>')
            while i<len(lines) and re.match(r'^\d+\. ',lines[i]):
                out.append('<li>'+inline(re.sub(r'^\d+\. ','',lines[i]))+'</li>');i+=1
            out.append('</ol>')
        else:
            p=[]
            while i<len(lines) and lines[i].strip() and not lines[i].startswith(('#','|')):
                p.append(lines[i]);i+=1
            out.append('<p>'+inline(' '.join(p))+'</p>')
    return '\n'.join(out)

report=render_md((ROOT/'研究报告.md').read_text(encoding='utf-8'))
css='''*{box-sizing:border-box}body{margin:0;background:#f5f3ed;color:#26352e;font:16px/1.7 "Microsoft YaHei",sans-serif}a{color:#21614b;text-underline-offset:3px}header,main{max-width:1280px;margin:auto;padding:28px}header{padding-top:48px}h1{font-size:clamp(28px,4vw,46px);line-height:1.3;margin:8px 0 18px}h2{font-size:26px;margin:44px 0 16px}h3{font-size:20px;margin-top:28px}p{margin:12px 0}.eyebrow,.meta{font-size:13px;color:#627168}.stats{display:flex;gap:24px;flex-wrap:wrap;margin:26px 0}.stats strong{display:block;font-size:26px;color:#24533e}.button,button,select,input{font:inherit;border:1px solid #bdcbbf;border-radius:8px;padding:10px 14px;background:#fff;color:#26352e}.button{display:inline-block;text-decoration:none}button{cursor:pointer}button.active{background:#24533e;color:#fff;border-color:#24533e}.toolbar{position:sticky;top:0;z-index:10;background:#f5f3edf2;padding:14px 0;backdrop-filter:blur(10px)}.filters{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.filters button{font-size:13px;padding:7px 10px}.search{display:flex;gap:12px}.search input{flex:1;min-width:0}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.card{background:#fff;border:1px solid #dce2d9;border-radius:10px;overflow:hidden}.card>button{display:block;width:100%;padding:0;border:0;border-radius:0;background:#e8e7df;height:330px}.card img{width:100%;height:100%;object-fit:contain}.card .body{padding:15px}.card h3{font-size:16px;margin:4px 0 8px;line-height:1.6;overflow-wrap:anywhere}.card p{font-size:14px;line-height:1.7}.pill{font-size:12px;color:#5b655e}dialog{max-width:1240px;width:94vw;max-height:92vh;border:0;border-radius:12px;padding:0;background:#faf9f4}dialog::backdrop{background:#09160fbd}.modal-head{position:sticky;top:0;background:#faf9f4;display:flex;align-items:center;gap:18px;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #dce2d9}.modal-body{display:grid;grid-template-columns:2fr 1fr;gap:24px;padding:24px}.modal-body img{width:100%;height:auto;display:block}.details{overflow-wrap:anywhere}.details p{margin:8px 0 16px}.details small{font-size:12px}.report{max-width:1040px;background:#fff;padding:48px;border:1px solid #dce2d9;border-radius:12px}.report h1{font-size:36px}.table{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px;margin:12px 0 24px}th,td{padding:12px;border:1px solid #dce2d9;text-align:left;vertical-align:top}th{background:#eef2ec}code{font-size:13px;overflow-wrap:anywhere}.notes{background:#eaf0e8;padding:20px;border-radius:10px;margin:22px 0}.overview{width:100%;max-height:600px;object-fit:contain;background:#111}.small-link{font-size:13px}footer{padding:30px;color:#647269;font-size:13px}.report li{margin-bottom:14px}@media(max-width:1000px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:720px){header,main{padding:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card>button{height:260px}.modal-body{display:block;padding:16px}.details{margin-top:20px}.report{padding:22px}.stats{gap:16px}.report h1{font-size:28px}}@media(max-width:430px){.grid{grid-template-columns:1fr}.card>button{height:410px}.filters{flex-wrap:nowrap;overflow:auto}.filters button{white-space:nowrap}.stats strong{font-size:22px}}'''
css+='th:first-child,td:first-child{min-width:100px}.table table{min-width:640px}'
head='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>黄小西换装体验画板研究</title><link rel="icon" href="data:,"><style>'+css+'</style>'
(ROOT/'研究报告.html').write_text(head+'<header><a href="index.html">← 素材索引</a></header><main class="report">'+report+'</main><footer>2026年10月19日 · 本地研究记录 · 原型事实与产品建议见正文区分</footer></html>',encoding='utf-8')
data=json.dumps(records,ensure_ascii=False).replace('</','<\\/')
notes=json.loads((ROOT/'source/text-notes.json').read_text(encoding='utf-8'))
note_html=''.join('<p><strong>'+n['id']+'</strong> '+html.escape(re.sub('<[^>]+>',' ',n['text']))+'</p>' for n in notes)
page=head+'''<header><div class="eyebrow">RUNNINGHUB 画板归档 · 2026年10月19日</div><h1>黄小西换装体验画板研究</h1><p>原始素材、功能注解与下一轮体验讨论的依据。所有图片保留原稿内容。</p><div class="stats"><div><strong>73 张</strong>原始图片 · 含 11 张分区标题</div><div><strong>3 条</strong>文字规则</div><div><strong>142.5 MB</strong>下载及图片解码校验完成</div><div><strong>71 张</strong>按 SHA256 去重</div></div><p><a class="button" href="研究报告.html">阅读研究报告</a> <a class="button" href="研究报告.md">Markdown 原文</a> <a class="button" href="source/asset-manifest.csv">素材清单 CSV</a> <a class="button" href="https://rhtv.runninghub.cn/camp/view/2069614228987592706" target="_blank" rel="noreferrer">原始画板 ↗</a></p><div class="notes">这些是扁平原型图，尚不包含可换装分层资产或实际动画。商品、二维码、价格和地理信息为原稿示例，需核实后才能用于正式产品。004／032 与 005／033 内容分别相同，按原节点保留。</div></header><main><div class="toolbar"><div class="search"><input id="search" type="search" aria-label="搜索素材" placeholder="搜索名称、功能或编号，例如 045、背包、孵化"><select id="sort" aria-label="排序"><option value="id">按原节点编号</option><option value="position">按画板从上到下</option></select></div><div class="filters" id="filters"></div><p class="meta" id="count" aria-live="polite"></p></div><div class="grid" id="grid"></div><h2>画板文字规则</h2><div class="notes">'''+note_html+'''</div><h2>原画板位置总览</h2><p>保留原始空间分组；画板数据没有连线，排列位置不等于已确认的页面跳转关系。</p><a href="previews/board-overview.png"><img class="overview" src="previews/board-overview.png" alt="原画板全局截图"></a><h2>缩略总览</h2><p>'''+ ' · '.join(f'<a href="previews/contact-sheet-{i:02d}.jpg">第 {i} 页</a>' for i in range(1,8))+'''</p><h2>来源与记录</h2><p><a href="source/canvas.json">完整节点与坐标</a> · <a href="source/asset-manifest.json">原图校验清单</a> · <a href="source/review-index.json">逐图分类与注解</a> · <a href="source/text-notes.json">原文规则</a> · <a href="source/verification.json">归档校验记录</a></p><p class="meta">以本次口述目标为研究依据；正式品牌名称、首发场景和第一版范围留待确认。</p></main><dialog id="viewer"><div class="modal-head"><strong id="modal-title"></strong><div><button id="prev" aria-label="上一张">←</button> <button id="next" aria-label="下一张">→</button> <button id="close">关闭</button></div></div><div class="modal-body"><a id="full-link" target="_blank"><img id="full" alt=""></a><div class="details" id="details"></div></div></dialog><footer>本地离线索引 · 图片缩略图用于浏览，点击打开已下载的完整原图。</footer><script>const assets='''+data+''';
const $=s=>document.querySelector(s);let category='全部',current=0;
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const cats=['全部',...new Set(assets.map(a=>a.category))];
$('#filters').innerHTML=cats.map(c=>'<button data-cat="'+esc(c)+'" class="'+(c==='全部'?'active':'')+'">'+esc(c)+'</button>').join('');
function visible(){let q=$('#search').value.trim().toLowerCase();return assets.filter(a=>(category==='全部'||a.category===category)&&[a.id,a.name,a.description,a.category].join(' ').toLowerCase().includes(q)).sort((a,b)=>$('#sort').value==='position'?a.y-b.y||a.x-b.x:Number(a.id)-Number(b.id))}
function render(){const items=visible();$('#count').textContent='显示 '+items.length+' / '+assets.length+' 张图片 · 点击图片查看原图与研究注解';$('#grid').innerHTML=items.map(a=>'<article class="card" id="asset-'+a.id+'"><button data-open="'+a.id+'" aria-label="查看 '+esc(a.name)+'"><img loading="lazy" src="'+encodeURI(a.thumbnail)+'" alt="'+esc(a.name)+'"></button><div class="body"><div class="pill">'+a.category+' · '+a.width+' × '+a.height+'</div><h3>'+a.id+' '+esc(a.name)+'</h3><p>'+esc(a.description)+'</p><a class="small-link" href="'+encodeURI(a.file)+'" target="_blank">打开完整原图 ↗</a></div></article>').join('')}
function open(id){current=assets.findIndex(a=>a.id===id);const a=assets[current];$('#modal-title').textContent=a.id+' '+a.name;$('#full').src=encodeURI(a.file);$('#full').alt=a.name;$('#full-link').href=encodeURI(a.file);$('#details').innerHTML='<p><strong>'+esc(a.category)+'</strong></p><p>'+esc(a.description)+'</p><p>'+a.width+' × '+a.height+' · '+(a.bytes/1024/1024).toFixed(2)+' MB · '+a.format+'</p><p><a href="'+esc(a.url)+'" target="_blank" rel="noreferrer">原始来源 URL ↗</a></p><p><a href="'+encodeURI(a.file)+'" download>下载本地原图</a></p><p><small>原节点：'+esc(a.node_id)+'<br>画板位置：'+Math.round(a.x)+', '+Math.round(a.y)+'<br>SHA256：'+a.sha256+'</small></p>'+(a.duplicate_of?'<p>与 '+a.duplicate_of+' 的 SHA256 相同，按原节点单独保留。</p>':'');if(!$('#viewer').open)$('#viewer').showModal();history.replaceState(null,'','#asset-'+a.id);$('#viewer').scrollTop=0}
$('#filters').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;category=b.dataset.cat;document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('active',b.dataset.cat===category));render()};
$('#search').oninput=render;$('#sort').onchange=render;$('#grid').onclick=e=>{const b=e.target.closest('[data-open]');if(b)open(b.dataset.open)};$('#close').onclick=()=>$('#viewer').close();$('#prev').onclick=()=>open(assets[(current+assets.length-1)%assets.length].id);$('#next').onclick=()=>open(assets[(current+1)%assets.length].id);$('#viewer').addEventListener('click',e=>{if(e.target===$('#viewer'))$('#viewer').close()});document.addEventListener('keydown',e=>{if($('#viewer').open&&e.key==='ArrowLeft')$('#prev').click();if($('#viewer').open&&e.key==='ArrowRight')$('#next').click()});render();const match=location.hash.match(/asset-([0-9]{3})/);if(match&&assets.some(a=>a.id===match[1]))open(match[1]);
</script></html>'''
(ROOT/'index.html').write_text(page,encoding='utf-8')
print('Built index, report HTML and',len(records),'annotated thumbnails.')
