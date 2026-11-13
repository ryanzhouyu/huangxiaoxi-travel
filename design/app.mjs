import * as D from './data.mjs';
import * as S from './store.mjs?v=3.1';
import {composeImage as prototypePostcard} from './postcard.mjs';
import {renderGamePage,rewardPresentation,studioPreview} from './game-ui.mjs?v=3.1';
import * as prototypeArt from './world.mjs';

const demo = document.documentElement.dataset.experience === 'demo';
const profile = demo ? await (await import('./demo/profile.mjs')).loadDemo() : {};
const artwork = profile.art || prototypeArt;
const {icon, itemArt} = artwork;
const composeImage = profile.composeImage || prototypePostcard;
const storageKey = profile.storageKey || S.KEY;
const progressStorage = () => profile.storage || localStorage;
const sessionKey = key => (profile.sessionPrefix || '') + key;
const $=s=>document.querySelector(s), clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
const roots=['partner','explore','memories'];
const titles={entry:'进入旅行衣橱',onboarding:'初次相遇',partner:'伙伴',explore:'游玩',scene:'黔山漫游',point:'地点详情',checkin:'到访打卡',activity:'手作体验',pool:'收集装扮',wardrobe:'我的衣橱',collection:'套装图鉴',memories:'旅行回忆',compose:'制作纪念图',work:'我的纪念图',account:'我的账号',wallet:'次数与订单'};
if(profile.orderPages)titles.order='模拟订单';
const methodName={qr:'测试码核验','geo-demo':'定位模拟','staff-demo':'店员核验模拟'};
let db,loadError='',route={name:'entry',params:new URLSearchParams()},ui={},busy=false,failNext=false,modalContext=null,focusBeforeSheet=null,queuedNavigation=null;
let reportStage;
const busyControls=new Map();
const sessionGet=k=>{try{return sessionStorage.getItem(sessionKey(k));}catch{return null;}};
const sessionSet=(k,v)=>{try{sessionStorage.setItem(sessionKey(k),v);}catch{/* Local business storage is validated independently. */}};
const sessionRemove=k=>{try{sessionStorage.removeItem(sessionKey(k));}catch{}};
try{db=S.readDB(progressStorage());}catch(e){loadError=e.message;db=S.initialDB();}
const me=()=>db.accounts[db.current];
const routeString=r=>r.name+(r.params.toString()?'?'+r.params.toString():'');
function parse(value){const [name,q='']=value.replace(/^#/,'').split('?');return {name:titles[name]?name:'partner',params:new URLSearchParams(q)};}
const href=(name,values={})=>name+(Object.keys(values).length?'?'+new URLSearchParams(values):'');
const id=()=>route.params.get('id');
const button=(text,action,extra='',attrs='')=>`<button class="btn ${extra}" data-action="${action}" ${attrs}>${text}</button>`;
const link=(text,target,extra='')=>button(text,'go',extra,`data-target="${esc(target)}"`);
const tag=(s,cls='')=>`<span class="tag ${cls}">${esc(s)}</span>`;
const heading=(title,body='')=>`<div class="page-intro"><h1>${title}</h1>${body?`<p>${body}</p>`:''}</div>`;
const section=(title,aside='')=>`<div class="section-title"><h2>${title}</h2>${aside}</div>`;
const card=(title,body,foot='',cls='')=>`<section class="card ${cls}"><h3>${title}</h3><p>${body}</p>${foot}</section>`;
const empty=(title,body,foot='')=>`<div class="empty"><span class="empty-icon">✧</span><h2>${title}</h2><p>${body}</p>${foot}</div>`;
const notice=(s,cls='')=>`<p class="notice ${cls}">${s}</p>`;
const fmt=t=>new Date(t).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const day=t=>new Date(t).toLocaleDateString('en-CA');
function setUI(){try{ui=JSON.parse(sessionGet('hxx.ui.'+db.current)||'{}');}catch{ui={};}ui={starter:'start-a',category:'top',wardrobeTab:'dress',memoryTab:'events',filter:'全部',range:'all',template:'postcard',selected:null,draft:null,returnTo:null,...ui};if(!Array.isArray(ui.stack))ui.stack=[];}
function keepUI(){if(!db.current)return;try{const clean={...ui};delete clean.preview;sessionSet('hxx.ui.'+db.current,JSON.stringify(clean));}catch{/* Editing state remains available in memory. */}}
function change(fn){if(loadError)throw Error(loadError);const current=S.readDB(progressStorage());const storage=failNext?{setItem(){throw Error('test');}}:progressStorage();failNext=false;const next=S.commit(storage,current,fn);const previousOwner=db.current;db=next.db;if(previousOwner===db.current)keepUI();return next.result;}
function tx(fn){const active=db.current;return change(d=>{if(d.current!==active)throw Error('演示账号已在另一页切换，请等待页面同步后再操作。');return fn(d.accounts[active]);});}
function lockApp(value){busy=value;reportStage?.();$('#app').setAttribute('aria-busy',String(value));if(value){$('#app').querySelectorAll('button,input,select').forEach(el=>{if(!busyControls.has(el))busyControls.set(el,el.disabled);el.disabled=true;});}else{busyControls.forEach((wasDisabled,el)=>el.disabled=wasDisabled);busyControls.clear();}}
function resumeNavigation(){if(!queuedNavigation)return false;const {target,options}=queuedNavigation;queuedNavigation=null;go(target,options);return true;}
function compositionStamp(){return JSON.stringify({owner:db.current,look:me()?.look,events:selectedEvents().map(e=>e.id),title:ui.title||'把黔山带回去',template:ui.template});}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function close(){reportStage?.();if($('#sheet').open)$('#sheet').close();modalContext=null;focusBeforeSheet?.focus?.();}
function sheet(title,body,context=null){reportStage?.();focusBeforeSheet=document.activeElement;$('#sheet-title').textContent=title;$('#sheet-body').innerHTML=body;$('#sheet').dataset.kind=body.includes('reward-reveal')?'reward':'standard';modalContext=context;if(!$('#sheet').open)$('#sheet').showModal();}
function error(e){sheet('操作未完成',notice(esc(e.message),'error')+button('返回继续','close','full'));}
function dirty(){return route.name==='wardrobe'&&ui.draft&&JSON.stringify(ui.draft)!==JSON.stringify(me()?.look);}
function guarded(target){let r=parse(target);const a=me();if(!a){if(!['entry','onboarding'].includes(r.name))sessionSet('hxx.pending',routeString(r));return parse('entry');}if(!a.initialized){if(!['entry','onboarding'].includes(r.name))sessionSet('hxx.pending',routeString(r));return parse('onboarding');}if(r.name==='entry'||r.name==='onboarding')return parse('partner');return r;}
function go(target,options={}){const {force=false,replace=false,back=false,record=true}=options;if(busy){queuedNavigation={target,options};return;}if(dirty()&&!force&&parse(target).name!=='wardrobe'){sheet('保存这次搭配吗？','<p>正在试穿的搭配还没有保存。选择保存后再离开，或放弃本次修改。</p>'+button('保存并继续','dirty-save','full')+button('放弃修改并继续','dirty-discard','secondary full')+button('继续编辑','close','text full'),{target,back,record});return;}close();if(demo)$('#toast').classList.remove('show');const r=guarded(target);ui.stack??=[];if(back)ui.stack.pop();else if(record&&routeString(r)!==routeString(route)&&!['entry','onboarding'].includes(route.name))ui.stack.push(routeString(route));if(route.name==='wardrobe'&&r.name!=='wardrobe'){ui.returnTo=null;ui.draft=null;}route=r;history[replace?'replaceState':'pushState'](null,'','#'+routeString(r));if(r.name==='wardrobe'){if(!ui.draft)ui.draft=clone(me().look);ui.returnTo=r.params.get('from')||ui.returnTo||'partner';}keepUI();render();window.scrollTo({top:0});}
function pending(){const p=sessionGet('hxx.pending');sessionRemove('hxx.pending');return p||'partner';}
function wardrobe({look,focus,back}={}){ui.draft=clone(look||me().look);ui.category=focus||'top';ui.wardrobeTab='dress';ui.returnTo=back||routeString(route);go(href('wardrobe',{from:ui.returnTo}));}
function selectedEvents(){return filteredByRange().filter(e=>!ui.selected||ui.selected.includes(e.id));}
function resetCompose(events){ui.selected=events.map(e=>e.id);ui.range='all';ui.template='postcard';ui.preview=null;keepUI();}
const outfitIds=id=>D.ASSETS.filter(a=>a.outfit===id).map(a=>a.id);
const ownedCount=id=>outfitIds(id).filter(x=>me().owned.includes(x)).length;
function assetCard(a,action='asset',selected=false){const owned=me().owned.includes(a.id);return `<button class="asset ${selected?'selected':''} ${owned?'owned':'unowned'}" data-slot="${a.slot}" data-slot-label="${D.SLOTS[a.slot]}" data-action="${action}" data-id="${a.id}" aria-pressed="${selected}"><span class="swatch">${itemArt(a)}${selected?`<i class="equipped-mark">${icon('check')}</i>`:''}</span><strong>${esc(a.name)}</strong><small>${owned?(selected?'已穿戴':'已收集'):'未获得 · 看来源'}</small></button>`;}
function balance(){return `<div class="balance"><span>黔山漫游 · 通用次数</span><strong>${me().balance}<small>次</small></strong>${link('收支明细','wallet','text')}</div>`;}
function pointCard(p){const done=me().claimed.includes('point:'+p.id);return `<button class="place" data-action="go" data-target="point?id=${p.id}"><span class="place-icon">${p.kind==='商家'?'⌂':'⌁'}</span><span><strong>${p.name}</strong><small>${p.kind} · ${done?'首次奖励已领':`首次到访 +${p.reward} 次`}</small></span><span class="arrow">↗</span></button>`;}
function poolCard(p){const n=S.eligible(me(),p.id).length,unlocked=me().unlocked.includes(p.id);return `<button class="place" data-action="go" data-target="pool?id=${p.id}"><span class="place-icon">✧</span><span><strong>${p.name}</strong><small>${n===0?'已收齐':unlocked?`已解锁 · 还差 ${n} 件`:'到访关联地点后解锁'}</small></span><span class="arrow">↗</span></button>`;}
function workCard(w){return `<button class="work-card" data-action="go" data-target="work?id=${w.id}"><img src="${w.image}" alt="${esc(w.title)}"><strong>${esc(w.title)}</strong><small>${fmt(w.at)} · ${w.events.length} 条经历</small></button>`;}
function renderPage(){const a=me(),p=D.point(id())||D.POINTS[0],pool=D.pool(id())||D.POOLS[0];
 if(id()&&(['point','pool','collection'].includes(route.name))&&!({point:D.point(id()),pool:D.pool(id()),collection:D.OUTFITS.find(x=>x.id===id())}[route.name]))return empty('这个内容不存在','链接中的地点、卡池或套装编号无效，请返回查看。',link('返回景区','scene','full'));
 if(route.name==='checkin'&&id()&&!D.point(id()))return empty('找不到这个地点','请从景区地图重新选择。',link('返回景区','scene','full'));
 const detail=profile.renderDetails?.({route,a,button,link,esc,fmt});
 if(detail!=null)return detail;
 const game=renderGamePage({presentation:profile.presentation,poolProgress:profile.poolProgress,draftMarkup:profile.draftMarkup,collectionExtras:profile.collectionExtras,customerDemo:demo,art:artwork,route,a,ui,accounts:db.accounts,button,link,esc,fmt,dirty,ownedCount,assetCard,pointCard,poolCard,workCard,filteredByRange,rangeFields});if(game!==null)return game;
 switch(route.name){
 case 'checkin':{const code=route.params.get('code')||'',matched=D.POINTS.find(x=>x.code===code);return heading(matched?'确认这次到访':'扫描地点二维码','扫码只识别地点，确认核验后才记录经历和发放奖励。')+(matched?card(matched.name,`${matched.spot} · 测试点位`,tag(a.claimed.includes('point:'+matched.id)?'首次奖励已领':`首次到访 +${matched.reward} 次`)):'')+`<label class="field">点位二维码内容或测试码<input id="checkin-code" value="${esc(code)}" placeholder="粘贴点位链接或输入测试码" autocomplete="off"></label>`+button('验证并记录到访','verify-code','full')+notice('可用手机系统相机扫描外部点位二维码，再通过链接进入此页。此版本也支持粘贴链接或测试码。')+`<details><summary>没有现场二维码？使用测试点位</summary><p class="fine">以下操作仅验证流程，会产生带演示标记的测试经历。</p>${D.POINTS.map(x=>button(x.name,'test-code','secondary full',`data-id="${x.id}"`)).join('')}</details>`;}
 case 'activity':return tag('店内活动 · 模拟核验')+heading(D.ACTIVITY.name,D.ACTIVITY.description)+card('参与方式','1. 到山间手作铺了解活动。<br>2. 完成手作体验。<br>3. 请店员核验后领取奖励。')+card('活动奖励',`完成体验 +${D.ACTIVITY.reward} 次景区通用次数，每个账号一次。与到店首次奖励独立。`)+(a.claimed.includes('activity:craft')?notice('这项活动奖励已领取。可在回忆中查看体验记录。')+link('查看回忆','memories','full'):button('演示店员核验','staff','full'))+link('查看山间手作铺','point?id=shop','secondary full')+notice('测试版仅演示核验成功或失败，不代表真实消费已完成。');
 case 'work':{const w=a.works.find(w=>w.id===id());if(!w)return empty('这张作品不存在','作品可能属于其他演示账号。',button('查看我的作品','works','secondary'));return heading(w.title,'保存时的搭配与经历已固定，之后换装不会改写。')+`<img class="final-image" src="${w.image}" alt="${esc(w.title)}，已保存纪念图">`+`<div class="two-actions">${button('保存 PNG 图片','download','',`data-id="${w.id}"`)}${button('分享图片','share','secondary',`data-id="${w.id}"`)}</div>`+section('这张图来自')+w.snapshots.map(e=>card(e.name,`${fmt(e.at)} · ${methodName[e.method]} · 测试经历`)).join('')+button('用当前搭配，再做一张','recreate','secondary full',`data-id="${w.id}"`)+button('回到我的作品','works','text full');}
 case 'account':return heading('游客 '+db.current,'演示身份 · 仅当前浏览器保存')+card('我的旅行进度',`${a.events.length} 条经历 · ${a.owned.length} 件装扮 · ${a.works.length} 张作品`,link('查看次数与模拟订单','wallet','text'))+notice('这是完整交互原型：扫码内容核验、发奖、抽取和图片合成在浏览器内运行，尚未接云端或真实景区。')+button('切换演示账号','logout','secondary full')+`<details><summary>体验与验收工具</summary><p class="fine">这些工具只服务本次验收，不作为正式游客功能。</p>${link('查看测试点位码','checkin','secondary full')}${button('演示下一次保存失败','fail-next','secondary full')}${button('重置当前账号进度','reset','danger full')}<a href="../docs/完整体验与验收标准.md" target="_blank">体验说明与验收标准 ↗</a></details>`;
 case 'wallet':return heading('每一次收获，都有来处。','黔山漫游的次数可用于本景区已解锁卡池。')+balance()+section('次数收支')+(a.ledger.length?a.ledger.map(l=>`<div class="ledger"><div><strong>${esc(l.reason)}</strong><small>${fmt(l.at)}</small></div><b class="${l.delta>0?'positive':''}">${l.delta>0?'+':''}${l.delta}</b></div>`).join(''):notice('暂无记录，先到测试点位打卡获得次数。'))+section('模拟购买订单')+(a.orders.length?a.orders.map(o=>`<div class="card"><h3>${o.count} 次通用次数 · ¥${o.price}</h3><p>${fmt(o.at)} · ${esc(o.id.slice(0,8))}</p>${tag({pending:'待模拟支付',paid:'模拟支付成功',cancelled:'已取消',failed:'模拟支付失败'}[o.status])}${o.status==='pending'?button('继续模拟支付','resume-order','text full',`data-id="${o.id}"`):''}</div>`).join(''):notice('暂无订单。模拟支付不扣款，测试价格不代表正式售价。'));
 }
}
function filteredByRange(){return me().events.filter(e=>ui.range==='all'||ui.range==='today'&&day(e.at)===day(new Date())||ui.range==='custom'&&(!ui.from||day(e.at)>=ui.from)&&(!ui.to||day(e.at)<=ui.to));}
function rangeFields(){return `<div class="range-fields"><label class="field">经历范围<select id="range"><option value="all" ${ui.range==='all'?'selected':''}>全部经历（含多日）</option><option value="today" ${ui.range==='today'?'selected':''}>今天</option><option value="custom" ${ui.range==='custom'?'selected':''}>自选日期</option></select></label>${ui.range==='custom'?`<div class="two-actions"><label class="field">起始日期<input type="date" id="from" value="${esc(ui.from||'')}"></label><label class="field">截止日期<input type="date" id="to" value="${esc(ui.to||'')}"></label></div>`:''}</div>`;}
function refreshDraft(){
 const canvas=$('.draft-postcard');
 if(canvas && profile.paintDraft)profile.paintDraft(canvas,{look:me().look,events:selectedEvents(),template:ui.template,title:ui.title});
}
function render(){reportStage?.();if(loadError){$('#app').innerHTML=empty('暂时无法读取进度',esc(loadError),button('重试读取','reload','full'));return;}
 const root=roots.includes(route.name)&&!(route.name==='wardrobe'&&ui.returnTo),gate=['entry','onboarding'].includes(route.name);document.title=titles[route.name]+' · 黄晓西';$('#app').dataset.page=route.name;$('#app').className='app '+(gate?'gate-page':root?'root-page':'detail-page');
 const immersive=['entry','onboarding','partner','explore','scene','point','pool','wardrobe','collection','memories','compose'].includes(route.name);$('#app').classList.toggle('immersive',immersive);
 const head=gate||root?'':`<header class="app-header ${immersive?'stage-header':''}">${button(icon('back'),'back','icon','aria-label="返回上一页"')}<strong>${titles[route.name]}</strong><span class="test-label">体验版</span></header>`;
 $('#app').innerHTML=head+`<div class="content ${gate?'gate-content':''}">${renderPage()}</div>`+(root?`<nav class="bottom-nav" aria-label="主导航">${[['partner','伙伴','partner'],['explore','游玩','map'],['memories','回忆','book']].map(([k,t,i])=>`<button data-action="tab" data-target="${k}" ${route.name===k?'aria-current="page"':''}><span>${icon(i)}</span><b>${t}</b></button>`).join('')}</nav>`:'');refreshDraft();if($('.inventory-scroll'))$('.inventory-scroll').scrollTop=ui.inventoryScroll||0;if(busy)lockApp(true);keepUI();}
function resultEvent(e){sheet(e.reward?'到访成功，收下这份旅途奖励':'已记录这次到访',`${profile.presentation?.visitPhoto(e.pointId) || ''}<div class="result-mark">✓</div><h3>${e.name}</h3><p>${fmt(e.at)} · ${methodName[e.method]}</p>${profile.presentation?.companionNote('这页盖好啦，下次翻开就知道来过。') || ''}${notice(e.reward?`+${e.reward} 次景区通用次数 · 现有 ${me().balance} 次`:'首次奖励已领取，本次只记录经历，不重复发放。')}${e.unlocked.length?notice('新解锁：'+e.unlocked.map(x=>D.pool(x).name).join('、')):''}${demo&&e.pointId==='shop'&&e.kind==='商家'&&!me().claimed.includes('activity:craft')?link('去做一枚旅行手作','activity','gold full'):''}${button('去看看关联卡池','result-pool','full',`data-id="${D.point(e.pointId).pools[0]}"`)}${link('继续游玩','scene','secondary full')}${button('用这次经历做纪念','event-compose','text full',`data-id="${e.id}"`)}`);}
function purchase(poolId){const remaining=S.eligible(me(),poolId).length;if(poolId&&!remaining){toast('这个卡池已收齐，请先选择其他卡池。');return;}sheet('购买景区通用次数',notice('模拟支付，不产生真实扣款。只用于黔山漫游；未解锁卡池仍需到访。')+D.PACKS.map(p=>`<button class="package" data-action="order" data-id="${p.id}" data-pool="${poolId||''}"><strong>${p.count} 次</strong><span>测试价 ¥${p.price} →</span></button>`).join('')+button('暂不购买','close','text full'));}
function payment(o){sheet('确认模拟支付',card('黔山漫游 · '+o.count+' 次通用次数',`测试金额 ¥${o.price} · 订单 ${o.id.slice(0,8)}`)+notice('仅演示订单流程，无需输入支付信息。')+button('模拟支付成功','pay','full',`data-id="${o.id}" data-status="paid"`)+button('模拟支付失败','pay','secondary full',`data-id="${o.id}" data-status="failed"`)+button('取消此订单','pay','text full',`data-id="${o.id}" data-status="cancelled"`));}
function opportunities(poolId){const a=me(),points=D.POINTS.filter(p=>!a.claimed.includes('point:'+p.id)),hasActivity=!a.claimed.includes('activity:'+D.ACTIVITY.id);sheet('通用次数不足',notice(points.length||hasActivity?'这些地方的首次奖励还没有领取。已经领过的地点再次到访不重复发次数。':'本景区的免费到访与活动奖励均已领取，可继续游玩留足迹，或演示购买通用次数。')+points.map(p=>link(`${p.name} · 首次 +${p.reward} 次`,'point?id='+p.id,'secondary full')).join('')+(hasActivity?link(`${D.ACTIVITY.name} · 完成体验 +${D.ACTIVITY.reward} 次`,'activity','secondary full'):'')+link('继续逛景区','scene','text full')+button('购买次数 · 模拟','purchase','full',`data-id="${poolId}"`));}
function showDrawResult(d){const x=D.asset(d.assetId),more=S.eligible(me(),d.poolId).length;sheet('新的装扮，遇见你了',rewardPresentation(x,artwork)+`<p class="reward-balance">已放入衣橱 · 通用次数剩余 ${me().balance} 次</p>${button('穿上看看','try-asset','gold full',`data-id="${x.id}"`)}`+(more?(me().balance?button('再开启一次 · 消耗 1 次','draw-again','secondary full',`data-id="${d.poolId}"`):button('看看哪里还能获得次数','no-balance','secondary full',`data-id="${d.poolId}"`)):link('这个卡池收齐啦，看看其他装扮','scene','secondary full'))+button('先收好，返回卡池','close','text full'));}
function source(assetId){const x=D.asset(assetId);if(!x)return;const owned=me().owned.includes(x.id),pools=D.POOLS.filter(p=>p.assets.includes(x.id));sheet(x.name,(profile.presentation?.sourcePicture(x) || '')+tag(D.SLOTS[x.slot])+notice(owned?'已在衣橱中，可试穿后保存。':'尚未拥有，可通过以下来源收集。')+(owned?button('去衣橱试穿','try-asset','full',`data-id="${x.id}"`):x.outfit==='gift'?link('去景区免费领取','scene','full'):pools.map(p=>card(p.name,me().unlocked.includes(p.id)?'已解锁，使用景区通用次数抽取。':'需先到访：'+p.points.map(x=>D.point(x).name).join(' / '),link('查看这个卡池','pool?id='+p.id,'secondary full'))).join('')));}
async function handle(act,el){const a=me(),value=el.dataset.value,xid=el.dataset.id;
 switch(act){
 case 'go':go(el.dataset.target);break;
 case 'tab':if(route.name==='wardrobe'&&dirty()){go(el.dataset.target,{record:false});return;}ui.returnTo=null;ui.draft=null;ui.stack=[];go(el.dataset.target,{record:false});break;
 case 'back':{const target=route.name==='wardrobe'&&ui.returnTo?ui.returnTo:ui.stack?.at(-1)||{scene:'explore',point:'scene',activity:'point?id=shop',pool:'scene',checkin:'scene',collection:'wardrobe',compose:'memories',work:'memories',account:'partner',wallet:'account'}[route.name]||'partner';go(target,{back:true});break;}
 case 'close':close();break;
 case 'login':{change(d=>{d.accounts[xid]??=S.account('游客 '+xid);d.current=xid;});setUI();go(me().initialized?pending():'onboarding',{force:true});break;}
 case 'starter':ui.starter=xid;render();break;
 case 'initialize':tx(a=>S.initialize(a,ui.starter));go(pending(),{force:true});toast('三套初始装扮已放入衣橱');break;
 case 'logout':change(d=>{d.current=null;});ui={};go('entry',{force:true});break;
 case 'home-dress':ui.returnTo='partner';ui.draft=clone(a.look);ui.wardrobeTab='dress';go(href('wardrobe',{from:ui.returnTo}));break;
 case 'home-catalog':ui.returnTo='partner';ui.draft=clone(a.look);ui.wardrobeTab='catalog';go(href('wardrobe',{from:ui.returnTo}));break;
 case 'home-pose':ui.returnTo='partner';ui.draft=clone(a.look);ui.wardrobeTab='dress';ui.category='pose';go(href('wardrobe',{from:ui.returnTo}));break;
 case 'greet':ui.lineIndex=(ui.lineIndex||0)+1;ui.greeting=true;render();break;
 case 'map-list':sheet('沿途的相遇',D.POINTS.map(pointCard).join('')+link('一枚旅行手作 · 查看活动','activity','secondary full'));break;
 case 'filter':ui.filter=value;render();break;
 case 'gift':{
  const got=tx(S.gift);
  render();
  const preview=profile.giftPreview?.('gift') ?? '<div class="result-mark">✧</div><h3>黔山初见 · 4 件装扮</h3><p>拥有了，但还没有穿上。要看看新模样吗？</p>';
  sheet(got?'领取成功，装进旅行衣橱':'这套装扮已经领取',preview+button('立即试穿','try-gift','full')+button('先收好，继续看景区','close','secondary full'));
  break;
 }
 case 'try-gift':wardrobe({look:{...a.look,...Object.fromEntries(outfitIds('gift').map(x=>[D.asset(x).slot,x]))},back:'scene'});break;
 case 'open-checkin':go('checkin?id='+xid);break;
 case 'test-code':go(href('checkin',{id:xid,code:D.point(xid).code}));break;
 case 'verify-code':{let code=$('#checkin-code').value.trim();if(code.includes('#')){const q=code.split('#')[1];code=parse(q).params.get('code')||code;}const p=D.POINTS.find(p=>p.code===code);if(!p)throw Error('无法识别这个点位码，请使用有效的测试点位二维码或测试码。');if(id()&&p.id!==id())throw Error('这个二维码不属于当前地点，请扫描此地点的测试码，或重新打开对应地点。');const e=tx(a=>S.checkin(a,{pointId:p.id,code,requestId:uid()}));render();resultEvent(e);break;}
 case 'geo':sheet('定位打卡 · 模拟核验',notice('此步骤不会读取实际位置。仅用于检查核验成功与失败后的业务反馈。')+button('模拟定位成功','geo-success','full',`data-id="${xid}"`)+button('模拟超出范围','geo-fail','secondary full'));break;
 case 'geo-success':{const e=tx(a=>S.checkin(a,{pointId:xid,method:'geo-demo',requestId:uid()}));render();resultEvent(e);break;}
 case 'geo-fail':sheet('暂时不能完成定位打卡',notice('模拟结果：不在点位范围。未记录到访、未发放次数，也未解锁卡池。','error')+button('返回地点详情','close','full'));break;
 case 'staff':sheet('店员核验 · 模拟',notice('演示完成体验后的核验，不会核验真实消费。')+button('模拟体验核验成功','staff-success','full')+button('模拟核验不通过','staff-fail','secondary full'));break;
 case 'staff-success':{const e=tx(a=>S.activity(a,{requestId:uid()}));render();resultEvent(e);break;}
 case 'staff-fail':sheet('体验尚未核验通过',notice('模拟结果：体验未完成。未发奖、未增加经历。','error')+button('返回活动','close','full'));break;
 case 'result-pool':go('pool?id='+xid);break;
 case 'source':source(xid);break;
 case 'draw':{const owner=db.current,d=tx(a=>S.draw(a,{poolId:xid,requestId:uid()})),x=D.asset(d.assetId);lockApp(true);el.classList.add('is-drawing');try{await new Promise(resolve=>setTimeout(resolve,480));}finally{lockApp(false);}if(owner!==db.current){resumeNavigation();break;}if(resumeNavigation()){toast(x.name+'已放入衣橱');break;}render();showDrawResult(d);break;}
 case 'draw-again':{close();render();const next=$(`[data-action="draw"][data-id="${xid}"]`);if(next)await handle('draw',next);else opportunities(xid);break;}
 case 'try-asset':{const x=D.asset(xid);wardrobe({look:{...a.look,[x.slot]:x.id},focus:x.slot});break;}
 case 'no-balance':opportunities(xid||id()||'cloud');break;
 case 'purchase-wallet':purchase(null);break;
 case 'purchase':purchase(xid||id()||'cloud');break;
 case 'order':{const o=tx(a=>S.createOrder(a,{packId:xid,id:uid(),sourcePool:el.dataset.pool||null}));if(profile.orderPages)go('order?id='+o.id);else payment(o);break;}
 case 'resume-order':payment(a.orders.find(o=>o.id===xid));break;
 case 'pay':{const o=tx(a=>S.pay(a,{id:xid,status:el.dataset.status}));render();sheet(o.status==='paid'?'次数已到账':o.status==='cancelled'?'订单已取消':'模拟支付失败',notice(o.status==='paid'?`+${o.count} 次 · 当前景区通用次数 ${me().balance} 次`:'未增加次数，可返回继续游玩或重新选择套餐。')+(o.status==='paid'&&D.pool(o.sourcePool)?link('回到'+D.pool(o.sourcePool).name,'pool?id='+o.sourcePool,'full'):button('返回继续','close','full')));break;}
 case 'wardrobe-tab':ui.wardrobeTab=value;render();break;
 case 'quick-category':
 case 'category':ui.category=value;ui.inventoryScroll=0;render();break;
 case 'equip':{const x=D.asset(xid);if(!a.owned.includes(xid))throw Error('这件装扮还没有获得。');ui.inventoryScroll=$('.inventory-scroll')?.scrollTop||0;ui.draft[x.slot]=x.id;render();break;}
 case 'restore-look':ui.draft=clone(a.look);render();break;
 case 'save-look':{tx(a=>S.saveLook(a,ui.draft));ui.preview=null;const target=ui.returnTo;ui.returnTo=null;ui.draft=null;go(target||'wardrobe',{force:true,replace:!target,back:!!target});toast('搭配已保存，首页和新纪念图将使用它');break;}
 case 'wardrobe-return':go(ui.returnTo||'partner',{back:true});break;
 case 'dirty-save':{const context={...modalContext};tx(a=>S.saveLook(a,ui.draft));ui.preview=null;ui.draft=null;ui.returnTo=null;go(context.target,{...context,force:true});break;}
 case 'dirty-discard':{const context={...modalContext};ui.draft=null;ui.returnTo=null;go(context.target,{...context,force:true});break;}
 case 'try-outfit':{if(ownedCount(xid)!==outfitIds(xid).length)throw Error('还没有集齐这套装扮。');const look={...a.look,...Object.fromEntries(outfitIds(xid).map(x=>[D.asset(x).slot,x]))};wardrobe({look});break;}
 case 'memory-tab':ui.memoryTab=value;render();break;
 case 'works':ui.memoryTab='works';go('memories');break;
 case 'event':{const e=a.events.find(e=>e.id===xid);sheet(e.name,(profile.presentation?.visitPhoto(e.pointId) || '')+notice(`${fmt(e.at)} · ${methodName[e.method]} · 测试记录`)+card('这次经历的收获',e.reward?`获得 ${e.reward} 次景区通用次数。`:'已领取首次奖励，本次没有额外次数。')+button('只用这次经历做纪念','event-compose','full',`data-id="${e.id}"`));break;}
 case 'event-compose':resetCompose(a.events.filter(e=>e.id===xid));go('compose');break;
 case 'begin-compose':{const range=ui.range;resetCompose(filteredByRange());ui.range=range;go('compose');break;}
 case 'template':ui.template=value;ui.preview=null;render();break;
 case 'compose-dress':ui.title=$('#work-title').value;wardrobe({back:'compose'});break;
 case 'preview-work':{const events=clone(selectedEvents());if(!events.length)throw Error('请至少选择一条到访经历。');ui.title=$('#work-title').value.trim()||'把黔山带回去';const owner=db.current,look=clone(a.look),stamp=compositionStamp(),title=ui.title,template=ui.template;let failure=null;lockApp(true);el.textContent='正在合成纪念图…';try{const png=await composeImage({look,events,template,title});if(owner===db.current){if(stamp!==compositionStamp())throw Error('搭配或经历已在其他页面更新，请重新生成纪念图。');ui.preview=png;ui.previewLook=look;ui.previewEvents=events.map(e=>e.id);ui.previewStamp=stamp;}}catch(e){failure=e;if(owner===db.current)ui.preview=null;}finally{lockApp(false);}const navigated=resumeNavigation();if(!navigated)render();if(failure){if(navigated)toast('纪念图生成失败，可返回后重试');else throw failure;}break;}
 case 'save-work':{if(!ui.preview)throw Error('请先生成预览。');if(ui.previewStamp!==compositionStamp()){ui.preview=null;render();throw Error('制作条件已改变，请重新生成预览。');}const events=selectedEvents(),work={id:uid(),title:ui.title||'把黔山带回去',at:new Date().toISOString(),events:events.map(e=>e.id),snapshots:clone(events),look:clone(ui.previewLook),template:ui.template,image:ui.preview};tx(a=>S.saveWork(a,work));ui.preview=null;ui.selected=null;ui.range='all';ui.template='postcard';ui.title='';delete ui.from;delete ui.to;delete ui.previewLook;delete ui.previewEvents;delete ui.previewStamp;go('work?id='+work.id);toast('纪念图已保存到我的作品');break;}
 case 'download':{const w=a.works.find(w=>w.id===xid),anchor=document.createElement('a');anchor.href=w.image;anchor.download=`黄晓西-${w.title}.png`;anchor.click();toast('已发起保存，也可长按作品图片保存');break;}
 case 'share':{const w=a.works.find(w=>w.id===xid),blob=await(await fetch(w.image)).blob(),file=new File([blob],'黄晓西纪念图.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:w.title});}catch(e){if(e.name!=='AbortError')throw e;}}else sheet('保存图片后分享',notice('当前浏览器不支持直接分享图片。请保存 PNG，再到微信或其他社交应用发布。')+button('保存 PNG 图片','download','full',`data-id="${w.id}"`));break;}
 case 'recreate':{const w=a.works.find(w=>w.id===xid);resetCompose(a.events.filter(e=>w.events.includes(e.id)));ui.template=w.template;ui.title=w.title;go('compose');break;}
 case 'fail-next':failNext=true;toast('下一次进度保存会失败；原有进度保留');break;
 case 'reset':sheet('重置这个演示账号？',notice('将清除当前账号的装扮、足迹、次数与作品，另一个账号不受影响。','error')+button('确认重置当前账号','reset-confirm','danger full')+button('保留进度','close','secondary full'));break;
 case 'reset-confirm':change(d=>{d.accounts[d.current]=S.account('游客 '+d.current);});sessionRemove('hxx.ui.'+db.current);setUI();go('onboarding',{force:true});break;
 case 'reload':location.reload();break;
 }
 keepUI();}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled||busy)return;try{await handle(el.dataset.action,el);}catch(err){error(err);}});
document.addEventListener('change',e=>{if(busy)return;if(e.target.matches('#range,#from,#to')){ui[e.target.id==='range'?'range':e.target.id]=e.target.value;if(ui.from&&ui.to&&ui.from>ui.to){toast('起始日期不能晚于截止日期');ui.to=ui.from;}ui.preview=null;render();}if(e.target.matches('[data-event]')){const key=e.target.dataset.event;if(e.target.checked)ui.selected=[...new Set([...ui.selected,key])];else ui.selected=ui.selected.filter(x=>x!==key);ui.preview=null;render();}});
document.addEventListener('input',e=>{if(busy)return;if(e.target.id==='work-title'){ui.title=e.target.value;ui.preview=null;const save=$('[data-action="save-work"]');if(save){save.dataset.action='preview-work';save.textContent='生成纪念图预览';$('.compose-preview').innerHTML=profile.draftMarkup||studioPreview(me().look,ui.title,artwork,selectedEvents().at(-1)?.pointId);$('[data-action="preview-work"].text')?.remove();}refreshDraft();const caption=$('.studio-scene>span');if(caption)caption.textContent=ui.title||'把黔山带回去';keepUI();}});
$('#close-sheet').addEventListener('click',close);
$('#sheet').addEventListener('cancel',()=>{modalContext=null;});
window.addEventListener('hashchange',()=>{const target=location.hash.slice(1);if(target===routeString(route))return;if(dirty()){history.replaceState(null,'','#'+routeString(route));go(target);}else go(target,{replace:true});});
window.addEventListener('beforeunload',e=>{if(dirty()){keepUI();e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(demo&&e.key===profile.epochKey){location.reload();return;}if(e.key!==storageKey&&e.key!==null)return;if(demo&&e.newValue===null){for(const key of Object.keys(sessionStorage))if(key.startsWith(profile.sessionPrefix))sessionStorage.removeItem(key);location.reload();return;}try{const oldAccount=db.current,oldLook=JSON.stringify(me()?.look),hadEdits=dirty(),next=S.readDB(progressStorage());keepUI();db=next;const sameAccount=oldAccount===db.current&&me()?.initialized;if(sameAccount){if(ui.draft&&!hadEdits)ui.draft=clone(me().look);if(hadEdits&&Object.values(ui.draft).some(x=>!me().owned.includes(x))){ui.draft=clone(me().look);toast('另一页重置了装扮，试穿已恢复为当前搭配');}if(oldLook!==JSON.stringify(me().look))ui.preview=null;}else{close();setUI();ui.preview=null;if(!me()?.initialized||ui.draft&&Object.values(ui.draft).some(x=>!me().owned.includes(x))){ui.draft=null;ui.returnTo=null;}failNext=false;route=guarded(routeString(route));history.replaceState(null,'','#'+routeString(route));}render();toast(sameAccount&&hadEdits?'进度已同步，当前未保存的试穿已保留':sameAccount?'其他页面更新了进度，已同步':'演示账号已在另一页切换，页面已同步');}catch(err){error(err);}});
if(demo && parent!==window && new URLSearchParams(location.search).get('stage')==='1' && window.frameElement && parent.location.pathname===new URL('./demo/stage.html',import.meta.url).pathname){
 const {connectStage}=await import('./demo/stage/bridge.mjs');
 reportStage=connectStage(()=>({account:me(),owner:db.current,route,pageTitle:titles[route.name],modal:$('#sheet').open?$('#sheet-title').textContent:'',dirty:!!dirty(),busy,error:loadError,preview:!!ui.preview,selected:route.name==='compose'&&me()?selectedEvents().length:0}),go);
 $('#sheet').addEventListener('close',reportStage);
 document.addEventListener('input',reportStage);
}
setUI();route=guarded(location.hash.slice(1)||'partner');history.replaceState(null,'','#'+routeString(route));render();
