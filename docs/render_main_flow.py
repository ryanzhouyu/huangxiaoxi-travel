from pathlib import Path
from html import escape
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
W,H,S=1700,1320,2
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
def arrow(points,label=None,lx=0,ly=0,dashed=False):
    pts=[(int(x*S),int(y*S)) for x,y in points]
    if dashed:
        for (ax,ay),(bx,by) in zip(pts,pts[1:]):
            length=((bx-ax)**2+(by-ay)**2)**0.5
            for step in range(0,int(length),16*S):
                end=min(length,step+9*S)
                d.line([(ax+(bx-ax)*step/length,ay+(by-ay)*step/length),(ax+(bx-ax)*end/length,ay+(by-ay)*end/length)],fill='#779985',width=3*S)
    else:d.line(pts,fill='#527c64',width=3*S,joint='curve')
    x,y=points[-1];px,py=points[-2]
    if x>px:tri=[(x,y),(x-12,y-7),(x-12,y+7)]
    elif x<px:tri=[(x,y),(x+12,y-7),(x+12,y+7)]
    elif y>py:tri=[(x,y),(x-7,y-12),(x+7,y-12)]
    else:tri=[(x,y),(x-7,y+12),(x+7,y+12)]
    d.polygon([(a*S,b*S) for a,b in tri],fill='#527c64')
    dash=' stroke-dasharray="9 7"' if dashed else ''
    svg.append('<polyline points="'+' '.join(f'{a},{b}' for a,b in points)+'" fill="none" stroke="#527c64" stroke-width="3"'+dash+'/>')
    svg.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in tri)+'" fill="#527c64"/>')
    if label:text(lx,ly,label,22,fill='#476c55')

text(70,32,'黄晓西换装体验一期主线业务流程图',40,bold=True)
text(70,96,'v2 · 2026.10.19    线上体验 → 实地游玩与打卡 → 抽取与装扮 → 回忆分享',25,fill='#617266')

for x,n,t,b in [
    (70,'01','选择数字伙伴','首次选择喜欢的初始形象\n回访恢复伙伴与已有进度'),
    (620,'02','线上了解景区并领装','了解感兴趣的景区\n领取免费套装，体验换装'),
    (1170,'03','实地游玩并打卡','入口／景点／商家／现场活动\n有效打卡后自动：\n记录经历＋发次数＋解锁关联卡池')]:
    box(x,230,460,220,n+' '+t,b)
arrow([(530,340),(620,340)])
arrow([(1080,340),(1170,340)])

box(1170,680,460,230,'04 抽取装扮奖励','使用本景区通用次数\n在已解锁卡池抽取\n服装部件／表情／动作')
box(620,680,460,230,'05 装扮数字伙伴','搭配服装、表情或动作\n预览并保存伙伴形象')
box(70,680,460,230,'06 生成回忆并分享','以真实游玩经历为基础\n可当日或多日汇总\n保存或分享静态纪念图')
arrow([(1400,450),(1400,680)])
text(1190,500,'一次打卡即抽\n多次累积后抽',24)
arrow([(1170,795),(1080,795)])
arrow([(620,795),(530,795)])

arrow([(1170,365),(1130,365),(1130,570),(300,570),(300,680)],dashed=True)
text(390,526,'每次打卡积累真实经历，也可直接回顾生成',24,fill='#617266')

arrow([(70,795),(30,795),(30,180),(1400,180),(1400,230)])
text(1040,143,'继续实地游玩，持续积累经历',23,fill='#476c55')

arrow([(1400,910),(1400,1010)],'次数不足时，可选',1190,951)
box(1170,1010,460,120,'模拟购买抽奖次数','支付演示成功后入账')
arrow([(1630,1070),(1670,1070),(1670,795),(1630,795)])
text(1618,931,'入账',22,fill='#476c55')

rect(70,995,1000,135,'#e8f0e5')
text(95,1015,'中途、当天回酒店后、连续游玩多天后，均可分享。',25,bold=True)
text(95,1065,'已有经历可反复生成，无需重新打卡、抽奖或换装。',24)

rect(70,1190,1560,95,'#e9eee7',stroke='#d1dbcf')
text(95,1206,'回忆前提：至少一次有效实地打卡；线上领装与购买次数不产生到访经历。',24)
text(95,1247,'路线导览是辅助功能；不设强制选任务、选择下一步或主动结束游玩的环节。',23,fill='#617266')
svg.append('</svg>')
(ROOT/'主线业务流程图.svg').write_text('\n'.join(svg),encoding='utf-8')
im.resize((W,H),Image.Resampling.LANCZOS).save(ROOT/'主线业务流程图.png')
print('Rendered main flow PNG and SVG:',W,H)
