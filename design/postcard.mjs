import {world,stageFigure} from './world.mjs';
const date=t=>new Date(t).toLocaleDateString('en-CA');
const time=t=>new Date(t).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
async function imageFrom(svg){const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();return img;}finally{URL.revokeObjectURL(url);}}
export async function composeImage({look,events,template,title}){
 if(!events.length)throw Error('请选择至少一条到访经历。');
 const trail=template==='trail',canvas=document.createElement('canvas');canvas.width=900;canvas.height=trail?1400:1200;const c=canvas.getContext('2d');
 c.fillStyle='#f4e7c7';c.fillRect(0,0,900,canvas.height);c.strokeStyle='#b49760';c.lineWidth=2;c.strokeRect(25,25,850,canvas.height-50);c.strokeStyle='#d2bb88';c.strokeRect(34,34,832,canvas.height-68);
 c.fillStyle='#6b7950';c.font='19px serif';c.fillText('黄 晓 西  ·  黔 山 纪 游',60,81);c.fillStyle='#58482c';c.font='bold 44px serif';c.fillText(title||'把黔山带回去',60,147);c.fillStyle='#9a8154';c.font='18px sans-serif';const dates=events.map(e=>date(e.at)).sort();c.fillText(dates[0]===dates.at(-1)?dates[0]:`${dates[0]} — ${dates.at(-1)}`,60,183);
 const height=trail?550:520;
 const scenery=world('map').replace('<svg class=',`<svg x="0" y="0" width="780" height="${height}" class=`);
 const person=stageFigure(look).replace('<svg class=',`<svg x="252" y="65" width="280" height="${height-80}" class=`);
 const photo=await imageFrom(`<svg xmlns="http://www.w3.org/2000/svg" width="780" height="${height}" viewBox="0 0 780 ${height}">${scenery}${person}</svg>`);
 c.save();c.translate(450,225+height/2);c.rotate(-.018);c.fillStyle='#ffefd0';c.shadowColor='#7d693c33';c.shadowBlur=16;c.shadowOffsetY=6;c.fillRect(-403,-height/2-12,806,height+50);c.shadowBlur=0;c.shadowOffsetY=0;c.drawImage(photo,-390,-height/2,780,height);c.font='16px serif';c.textAlign='center';c.fillStyle='#9e8657';c.fillText('把这一刻，留在我们的手账里。',0,height/2+26);c.restore();
 let y=225+height+109;c.font='bold 26px serif';c.fillStyle='#5a6544';c.fillText(trail?'这一路，我们来过':'留在这里的小小回忆',62,y);y+=45;c.font='22px sans-serif';const limit=trail?8:4;
 const selected=events.slice(0,limit);if(selected.length>1){c.strokeStyle='#c1af7b';c.setLineDash([4,5]);c.beginPath();c.moveTo(73,y-7);c.lineTo(73,y+(selected.length-1)*43-7);c.stroke();c.setLineDash([]);}
 for(const e of selected){c.fillStyle='#7f8c5c';c.beginPath();c.arc(73,y-7,5,0,Math.PI*2);c.fill();c.fillStyle='#7e6a45';c.font='17px sans-serif';c.fillText(date(e.at).slice(5)+'  '+time(e.at),94,y);c.fillStyle='#4d5940';c.font='22px serif';c.fillText(e.name,255,y,550);y+=43;}
 if(events.length>limit){c.font='16px sans-serif';c.fillStyle='#99815a';c.fillText(`另有 ${events.length-limit} 条经历，完整记录保存在作品详情`,94,y);}
 c.strokeStyle='#c9b17c';c.beginPath();c.moveTo(60,canvas.height-100);c.lineTo(840,canvas.height-100);c.stroke();c.fillStyle='#9c875f';c.font='16px sans-serif';c.fillText('演示作品 · 伙伴与场景为示意 · 测试到访记录',60,canvas.height-61);return canvas.toDataURL('image/png');
}
