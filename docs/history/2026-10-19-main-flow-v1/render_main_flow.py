from pathlib import Path
from html import escape
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
W,H,S=1800,1880,2
im=Image.new('RGB',(W*S,H*S),'#f5f5ef');d=ImageDraw.Draw(im)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="#f5f5ef"/>']
def font(size,bold=False):return ImageFont.truetype('C:/Windows/Fonts/'+('msyhbd.ttc' if bold else 'msyh.ttc'),size*S)
def text(x,y,content,size=25,fill='#233b32',bold=False,center=False):
    for k,line in enumerate(content.split('\n')):
        yy=y+k*(size+13)
        if center:d.text((x*S,yy*S),line,font=font(size,bold),fill=fill,anchor='mt')
        else:d.text((x*S,yy*S),line,font=font(size,bold),fill=fill)
        svg.append(f'<text x="{x}" y="{yy+size}" font-family="Microsoft YaHei,sans-serif" font-size="{size}" fill="{fill}" font-weight="{700 if bold else 400}" text-anchor="{"middle" if center else "start"}">{escape(line)}</text>')
def rect(x,y,w,h,fill='#ffffff',stroke='#b8cbbd',radius=16):
    d.rounded_rectangle((x*S,y*S,(x+w)*S,(y+h)*S),radius=radius*S,fill=fill,outline=stroke,width=2*S)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
def box(x,y,w,h,title,body='',color='#ffffff'):
    rect(x,y,w,h,color)
    text(x+w/2,y+20,title,27,bold=True,center=True)
    if body:text(x+w/2,y+65,body,23,fill='#4d6256',center=True)
def arrow(points,label=None,lx=0,ly=0):
    pts=[(int(x*S),int(y*S)) for x,y in points];d.line(pts,fill='#527c64',width=3*S,joint='curve')
    x,y=points[-1];px,py=points[-2]
    if x>px:tri=[(x,y),(x-12,y-7),(x-12,y+7)]
    elif x<px:tri=[(x,y),(x+12,y-7),(x+12,y+7)]
    elif y>py:tri=[(x,y),(x-7,y-12),(x+7,y-12)]
    else:tri=[(x,y),(x-7,y+12),(x+7,y+12)]
    d.polygon([(a*S,b*S) for a,b in tri],fill='#527c64')
    svg.append('<polyline points="'+' '.join(f'{a},{b}' for a,b in points)+'" fill="none" stroke="#527c64" stroke-width="3"/>')
    svg.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in tri)+'" fill="#527c64"/>')
    if label:text(lx,ly,label,22,fill='#476c55')

text(70,40,'黄晓西换装体验',40,bold=True)
text(70,103,'一期主线业务流程图',30)
text(70,153,'数字伙伴承载旅行回忆 · 单景区一次游玩 · 测试点位验证 · 购买次数采用模拟支付',24,fill='#617266')
for x,n,t,b in [(60,'01','选择数字伙伴','首次选择初始形象\n回访恢复伙伴与进度'),(480,'02','浏览景区与领装','免费领取景区默认套装\n体验换装，不计实地到访'),(900,'03','选择游玩任务','推荐路线 · 景点 · 商家\n现场体验活动'),(1320,'04','有效打卡与发奖','首次自动开始旅程并记录\n次数入账 · 解锁关联卡池')]:
    box(x,230,360,160,n+' '+t,b)
for x in [420,840,1260]:arrow([(x,310),(x+60,310)])
box(770,490,260,100,'按需选择下一步',color='#e8f0e5')
arrow([(1500,390),(1500,445),(900,445),(900,490)])
arrow([(770,540),(690,540),(690,420),(1080,420),(1080,390)],'继续探索',745,395)
arrow([(900,590),(900,640),(320,640),(320,700)])
arrow([(900,640),(900,700)])
arrow([(900,640),(1480,640),(1480,700)])
text(320,659,'收集与换装',23,center=True)
text(900,659,'即时回忆',23,center=True)
text(1480,659,'完成本次游玩',23,center=True)

box(80,700,480,120,'05 选择已解锁卡池','次数在本景区通用')
arrow([(320,820),(320,860)])
poly=[(320,860),(465,945),(320,1030),(175,945)]
d.polygon([(x*S,y*S) for x,y in poly],fill='#fff4d8',outline='#bb9d54',width=2*S)
svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in poly)+'" fill="#fff4d8" stroke="#bb9d54" stroke-width="2"/>')
text(320,920,'次数充足？',26,bold=True,center=True)
arrow([(320,1030),(320,1090)],'不足，可选购买',335,1044)
box(80,1090,480,120,'模拟购买通用次数','成功后入账；也可去打卡获取')
arrow([(80,1150),(45,1150),(45,945),(175,945)],'重新检查',60,907)
arrow([(465,945),(600,945),(600,1270),(320,1270),(320,1320)],'充足',493,909)
box(80,1320,480,120,'抽取并获得服饰部件','部件进入衣橱，可立即使用')
arrow([(320,1440),(320,1490)])
box(80,1490,480,120,'06 按需换装并保存','可以直接返回，不强制试穿')
arrow([(320,1610),(320,1650)])
rect(100,1650,440,60,'#e8f0e5');text(320,1665,'返回操作选择',24,center=True)

box(660,700,480,120,'07 随时查看回忆','按已发生的经历生成')
arrow([(900,820),(900,900)])
box(660,900,480,120,'生成静态纪念图片','数字伙伴 · 地点 · 时间与经历')
arrow([(900,1020),(900,1100)])
box(660,1100,480,110,'保存或分享当前作品')
arrow([(900,1210),(900,1270)])
rect(680,1270,440,60,'#e8f0e5');text(900,1285,'返回操作选择，继续游玩',23,center=True)

box(1240,700,480,120,'08 主动结束本次游玩','无需走完所有点位或收齐套装')
arrow([(1480,820),(1480,900)])
box(1240,900,480,120,'生成完整回忆总结','汇总本次游玩经历与收获')
arrow([(1480,1020),(1480,1100)])
box(1240,1100,480,110,'生成静态纪念图片')
arrow([(1480,1210),(1480,1270)])
box(1240,1270,480,110,'保存 分享或以后回看')
arrow([(1480,1380),(1480,1450)])
rect(1300,1450,360,80,'#e0ecdf');text(1480,1472,'本次游玩结束',27,bold=True,center=True)

rect(60,1760,1660,85,'#e9eee7',stroke='#d1dbcf')
text(85,1775,'主线边界：共享卡池到访任一关联点即可解锁；结束游玩后仍可抽取与换装。',23)
text(85,1811,'图中返回操作选择为循环连接；失败、重试、概率、限次和后台字段留到子流程逐项确认。',22,fill='#617266')
svg.append('</svg>')
(ROOT/'主线业务流程图.svg').write_text('\n'.join(svg),encoding='utf-8')
im.resize((W,H),Image.Resampling.LANCZOS).save(ROOT/'主线业务流程图.png')
print('Rendered main flow PNG and SVG:',W,H)
