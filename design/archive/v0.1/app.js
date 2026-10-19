(() => {
'use strict';
const pages = {
 entry:['P01','演示账号入口','/entry','演示身份与回跳','进入或切换演示账号，保存扫码目标；这里仅展示入口结构。','账号、已有伙伴、返回目标','进入伙伴选择或恢复进度','原启动页'],
 onboarding:['P02','选择初始伙伴','/onboarding','初始默认搭配','全部初始装扮免费，首次选择只决定默认搭配。','初始模板目录','伙伴与当前搭配','029 / 030'],
 partner:['P03','伙伴','/partner','陪伴首页','保留原稿角色为中心，提供景区、换装与回忆快捷入口。','伙伴保存状态、当前景区摘要','进入游玩、衣橱或回忆','009'],
 explore:['P04','游玩','/explore','景区浏览','区域与景区选择先合并。导览帮助游玩，不要求领取路线任务。','景区目录、领取与到访摘要','选择景区','016 / 017'],
 scene:['P05','景区与导览','/scenes/:sceneId','线上体验与实地辅助','默认套装、景点、商家和活动放在同一个景区上下文。','景区、点位、默认套装','领取试穿、点位详情、卡池','001 / 017 / 072'],
 point:['P06','点位详情','/points/:pointId','到访核验入口','景点和商家共享基础模板，按类型展示活动和奖励资格。','点位、领奖状态、关联卡池','到访记录、次数、卡池解锁','002 / 040 / 006 / 043'],
 activity:['P07','活动详情','/activities/:activityId','体验完成条件','到店与消费体验分开。本周店员核验结果采用模拟。','活动条件、奖励资格','活动结果弹层','006 动作彩蛋扩展'],
 pool:['P08','卡池','/pools/:poolId','收集与抽取','先显示所属景区、通用次数、剩余奖励和解锁条件。','解锁、资产拥有、景区余额','抽取结果或购买弹层','012 / 004 / 005'],
 wardrobe:['P09','衣橱','/wardrobe','搭配与图鉴','搭配负责穿什么，图鉴负责还差什么与获取来源。','已拥有资产、保存搭配、草稿','保存搭配、套装与来源详情','007 / 008 / 067 / 070 / 071'],
 collection:['P10','套装详情','/collections/:outfitId','套装收集目标','显示整套与部件进度，缺件能追溯到地点或卡池。','套装组成、拥有状态、来源','应用整套或查看获取方式','070 / 071'],
 memories:['P11','回忆','/memories','足迹与已保存作品','以有效到访为依据，支持跨日回顾，不设游玩结束按钮。','按景区和时间筛选的事件、作品','事件详情或纪念图制作','044 / 045'],
 compose:['P12','制作纪念图','/memories/compose','经历与形象组合','预览为主。去换装再返回时保留经历范围与模板。','选中经历、当前搭配、模板','作品草稿与保存能力','003 / 044 / 045 展开'],
 work:['P13','作品详情','/works/:workId','保存与再次制作','作品固定生成时的版本；换装后可以做新作品。','作品文件、来源经历、搭配快照','保存图片、再次制作','003 / 回忆图册'],
};
const state={page:'partner',scenario:'fresh',view:'搭配',memoryView:'足迹',category:'服饰',pointFilter:'全部',pointType:'spot',saved:'初始搭配 A',draft:'初始搭配 A',range:'当天经历',template:'单点纪念',returnTo:null,history:[]};
const $=s=>document.querySelector(s);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visited=()=>state.scenario==='visited'||state.scenario==='complete';
const button=(label,page,cls='',attrs='')=>`<button class="btn ${cls}" data-page="${page}" ${attrs}>${label}</button>`;
const action=(label,act,cls='')=>`<button class="btn ${cls}" data-act="${act}">${label}</button>`;
const section=(title,extra='')=>`<div class="section-head"><h3>${title}</h3><span>${extra}</span></div>`;
const preview=(title,body,cls='')=>`<div class="preview ${cls}"><div class="label">${title}</div><small>${body}</small><span class="meta-line">预览容器 · 素材后置</span></div>`;
const panel=(title,body,cta='')=>`<div class="panel"><div class="row"><h3>${title}</h3></div><p>${body}</p>${cta}</div>`;
const tabs=(items,value,key)=>`<div class="tabs">${items.map(x=>`<button class="${x===value?'active':''}" data-key="${key}" data-value="${x}">${x}</button>`).join('')}</div>`;
const badge=(s,warm=false)=>`<span class="badge ${warm?'warm':''}">${s}</span>`;
const empty=(t,p,cta)=>`<div class="empty"><h3>${t}</h3><p>${p}</p>${cta}</div>`;
function go(page,opts={}){if(!pages[page])return;$('#sheet').close();if(page!==state.page&&opts.record!==false)state.history.push(state.page);if(opts.returnTo)state.returnTo=opts.returnTo;state.page=page;location.hash=page;render();$('#screen').scrollTop=0;}
function sheet(title,body){$('#sheet-title').textContent=title;$('#sheet-content').innerHTML=body;$('#sheet').showModal();}
function top(title,body){return `<div class="kicker">黄晓西 · 测试景区 A</div><h2>${title}</h2><p class="subtitle">${body}</p>`;}
function renderPage(){
 if(state.scenario==='error'&&state.page!=='entry')return top('暂时没有加载成功','错误状态模板')+empty('保留当前页面与选择','重试后恢复数据，不清空已有搭配或制作范围。',action('查看恢复后的状态','recover'));
 switch(state.page){
 case 'entry':return top('欢迎回来。','使用演示账号体验伙伴、游玩与旅行回忆。')+section('演示账号')+panel('游客 A','新游客与首次流程',button('进入首次体验','onboarding','secondary full'))+panel('游客 B','已有足迹与收集进度的结构样例',action('查看已有进度','returning','secondary full'))+'<p class="subtitle">演示身份入口样式；真实进度存储在后续联调中接入。</p>';
 case 'onboarding':return top('选一个初始模样','脸部身份固定，全部初始装扮都可免费使用。')+preview('初始搭配预览',esc(state.draft),'large')+`<div class="grid">${['A','B','C'].map(x=>`<button class="asset ${state.draft==='初始搭配 '+x?'selected':''}" data-outfit="初始搭配 ${x}">模板 ${x}<span>免费初始装扮</span></button>`).join('')}</div>`+action('确认这个搭配','create','full')+'<p class="subtitle">此处模板数量仅供结构预览，素材方案后续确定。</p>';
 case 'partner':return top('一起留下旅行的样子','数字伙伴承载你的回忆。')+preview('伙伴形象预览',esc(state.saved),'large')+`<div class="actions">${button('去换装','wardrobe','secondary')}${button('去游玩','explore')}</div>`+section('当前景区','测试数据')+panel('测试景区 A',visited()?'已有实地足迹 · 可继续收集与生成回忆':'免费套装可体验 · 还没有实地足迹',button('查看景区','scene','quiet'))+section('旅行的收获')+`<div class="summary"><span><strong>${visited()?'2':'0'}</strong>打卡地点</span><span><strong>${visited()?'1':'0'}</strong>可用卡池</span><span><strong>${visited()?'3':'0'}</strong>景区通用次数</span></div>`+button('查看我的回忆','memories','secondary full');
 case 'explore':return top('去哪里留下足迹','线上了解、到场打卡，慢慢收集当地装扮。')+preview('景区封面位置','景区信息与封面素材分开配置')+panel('测试景区 A','景点、商家和体验活动 · 默认套装免费体验',button('了解景区与奖励','scene','full'))+section('已有足迹')+(visited()?panel('测试景区 A','最近记录：示例日期 · 两个地点',button('回顾足迹','memories','quiet')):'<p class="subtitle">完成一次有效实地打卡后，这里会出现到访记录。</p>');
 case 'scene':return top('测试景区 A','景区介绍与游玩说明，不要求先选择路线或领取任务。')+panel('景区体验套装','线上可免费领取，领取本身不计为实际到访。',action('领取并体验换装','gift','secondary full'))+`<div class="map-placeholder">导览预览区 · 点位位置由配置接入<div class="pin-row"><button data-page="point" data-point-type="spot">入口</button><button data-page="point" data-point-type="spot">景点</button><button data-page="point" data-point-type="merchant">商家</button></div>也可直接查看下面的列表</div>`+`<div class="chips">${['全部','景点','商家','活动'].map(x=>`<button class="chip ${state.pointFilter===x?'active':''}" data-key="pointFilter" data-value="${x}">${x}</button>`).join('')}</div>`+(['全部','景点'].includes(state.pointFilter)?panel('景点 A · 山水留影处','首次有效打卡获得次数，并解锁关联卡池。',button('查看点位与奖励','point','quiet','data-point-type="spot"')):'')+(['全部','商家','活动'].includes(state.pointFilter)?panel(state.pointFilter==='活动'?'文创体验 · 示例活动':'旅伴文创店 · 示例商家','到店奖励与完成体验活动奖励分开。',state.pointFilter==='活动'?button('查看体验活动','activity','quiet'):button('查看商家点位','point','quiet','data-point-type="merchant"')):'')+button('查看景区卡池','pool','secondary full');
 case 'point':return top(state.pointType==='merchant'?'旅伴文创店 · 示例商家':'景点 A · 山水留影处',state.pointType==='merchant'?'到店打卡与店内活动分开，支持商家二维码直达。':'测试点位详情，支持二维码深链直达。')+preview(state.pointType==='merchant'?'商家图片位置':'点位图片位置','介绍 · 地点与核验信息')+`<div class="summary"><span>领奖资格<strong>${visited()?'已领取':'首次可领'}</strong></span><span>关联卡池<strong>${visited()?'已解锁':'待到访'}</strong></span></div>`+panel(state.pointType==='merchant'?'到店打卡可获得':'实地打卡可获得','记录一次经历 · 首次发放景区次数 · 解锁关联卡池')+action(visited()?'查看重复到访结果':'确认打卡','checkin','full')+action('定位核验（模拟）','checkin','secondary full')+section('这里可以收集')+panel('山水主题卡池','套装 A＋套装 B，其他点位可共享。',button('查看卡池','pool','quiet'))+button('查看关联体验活动','activity','quiet full');
 case 'activity':return top('文创体验 · 示例活动','完成条件与店员核验独立于商家到店。')+panel('如何参加','到店后按活动说明完成体验，由店员核验完成。此结构草案不设实际消费门槛。')+panel('可获得','活动次数奖励，每账号每项活动一次。')+'<div class="notice">本周活动核验采用明确标识的模拟结果。</div>'+action('模拟核验成功','activity-ok','full')+action('模拟核验失败','activity-fail','secondary full')+button('返回商家点位','point','quiet full');
 case 'pool':return top('山水主题卡池','测试景区 A · 由多个点位共享')+`<div class="summary"><span>本景区通用次数<strong>${visited()?'3':'0'}</strong></span><span>剩余可抽<strong>${state.scenario==='complete'?'0':visited()?'4':'6'} 件</strong></span></div>`+preview('套装 A / 套装 B','完整造型预览位，点击部件可查看来源')+(visited()?'<div class="notice">已解锁 · 已拥有奖励跨池排除，剩余奖励等概率。</div>':panel('先到访，再解锁','到访任一关联点位即可解锁，购买次数不能绕过条件。',button('查看关联点位','point','quiet')))+`<div class="grid">${['头饰','上装','下装','表情','姿势','配饰'].map((x,i)=>`<button class="asset" data-act="asset-source">${x}<span>${state.scenario==='complete'?'已拥有':i===0&&visited()?'已拥有':'可收集'}</span></button>`).join('')}</div>`+section('抽取说明')+(state.scenario==='complete'?'<div class="panel soft"><h3>这个卡池已收齐</h3><p>不再扣次，可将景区余额用于其他可抽卡池。</p></div>':visited()?action('抽取一次','draw','full'):button('去打卡解锁','point','full'))+(visited()&&state.scenario!=='complete'?action('购买通用次数','purchase','secondary full'):'');
 case 'wardrobe':return top('把旅途穿在身上','预览与保存区分，取消不覆盖原搭配。')+tabs(['搭配','图鉴'],state.view,'view')+(state.view==='搭配'?preview('伙伴搭配预览',esc(state.draft))+'<div class="status-line">'+(state.draft===state.saved?'当前已保存：':'正在预览：')+esc(state.draft)+'</div>'+`<div class="chips">${['服饰','表情','姿势','背景'].map(x=>`<button class="chip ${x===state.category?'active':''}" data-key="category" data-value="${x}">${x}</button>`).join('')}</div>`+`<div class="grid">${['初始搭配 A','初始搭配 B',state.category+'示例 1',state.category+'示例 2',state.category+'示例 3','景区免费套装'].map(x=>`<button class="asset ${state.draft===x?'selected':''}" data-outfit="${x}">${x}<span>已拥有 · 示例</span></button>`).join('')}</div>`+action(state.returnTo==='compose'?'保存并返回制作':'保存搭配','save-outfit','full')+(state.returnTo?button('取消并返回',state.returnTo,'quiet full'):''):panel('套装 A · 山水相遇',state.scenario==='complete'?'已收齐 · 6/6 件':'收集进度示例 · 2/6 件',button('看整套与缺少部件','collection','quiet'))+panel('套装 B · 花间留影','未收齐 · 缺件可查看获得地点',button('查看获取方式','collection','quiet')));
 case 'collection':return top('套装 A · 山水相遇','整套目标、已有进度与缺件来源放在一起。')+preview('整套展示位置','图鉴预览，不代表拥有全部部件','large')+`<div class="summary"><span>收集进度<strong>${state.scenario==='complete'?'6/6':'2/6'}</strong></span><span>获得地点<strong>景点 A / B</strong></span></div>`+`<div class="grid">${['头饰','上装','下装','鞋','表情','姿势'].map((x,i)=>`<button class="asset" data-act="asset-source">${x}<span>${i<2||state.scenario==='complete'?'已拥有':'查看来源'}</span></button>`).join('')}</div>`+(state.scenario==='complete'?button('去衣橱应用套装','wardrobe','full'):action('查看缺件获取方式','asset-source','full'));
 case 'memories':return top('走过的地方，都记得','真实足迹持续积累，不需要开始或结束旅程。')+tabs(['足迹','作品'],state.memoryView,'memoryView')+(!visited()?empty('还没有实地游玩记录','线上领取套装不会产生到访。完成一次有效打卡后，即可生成回忆。',button('去了解景区','scene')):state.memoryView==='足迹'?`<label class="field">回忆范围<select data-field="range"><option ${state.range==='当天经历'?'selected':''}>当天经历</option><option ${state.range==='多日经历'?'selected':''}>多日经历</option></select></label><div class="timeline"><div class="event"><small>示例日期 · 10:20</small><h3>景点 A · 山水留影处</h3><p class="subtitle">首次到访，获得次数并解锁卡池。</p><button data-act="event">查看这次经历 →</button></div><div class="event"><small>示例日期 · 14:10</small><h3>旅伴文创店</h3><p class="subtitle">到店打卡，留下一条旅途记录。</p><button data-act="event">查看这次经历 →</button></div></div>`+button('用这些经历制作纪念图','compose','full'):panel('我的山水回忆 · 示例作品','作品保留生成时的搭配与经历范围。',button('查看已保存作品','work','quiet'))+button('再制作一张','compose','secondary full'));
 case 'compose':return top('做一张旅途纪念','只使用已发生的到访经历与当前保存搭配。')+(!visited()?empty('需要先有一次有效打卡','已有经历后可在当天或多天后制作，无需结束游玩。',button('查看景区','scene')):`<label class="field">选择的经历范围<select data-field="range"><option ${state.range==='当天经历'?'selected':''}>当天经历</option><option ${state.range==='多日经历'?'selected':''}>多日经历</option></select></label>`+preview('纪念图画面预览',esc(state.range)+' · '+esc(state.saved),'photo')+`<div class="chips">${['单点纪念','足迹长图'].map(x=>`<button class="chip ${x===state.template?'active':''}" data-key="template" data-value="${x}">${x}</button>`).join('')}</div>`+action('调整伙伴搭配','compose-wardrobe','secondary full')+`<p class="subtitle">返回后保留：${esc(state.range)}、${esc(state.template)}及所选经历。</p>`+button('查看作品结果结构','work','full'));
 case 'work':return top('我的山水回忆','已生成作品为固定版本，后续换装不自动覆盖。')+(!visited()?empty('还没有已保存作品','至少一次实地打卡后可以制作纪念图。',button('去游玩','scene')):preview('已保存作品展示位置','测试景区 A · 静态作品文件','photo')+panel('来源经历','景点 A、旅伴文创店 · 示例日期范围')+action('保存图片','download-placeholder','full')+button('以当前搭配再做一张','compose','secondary full'));
 }
}
function render(){
 $('#page-picker').innerHTML=Object.entries(pages).map(([k,v])=>`<option value="${k}" ${state.page===k?'selected':''}>${v[0]} ${v[1]}</option>`).join('');
 $('#page-list').innerHTML=Object.entries(pages).map(([k,v])=>`<button data-page="${k}" class="${state.page===k?'active':''}"><code>${v[0]}</code>${v[1]}</button>`).join('');
 $('#page-title').textContent=pages[state.page][1];$('#scenario').value=state.scenario;$('#screen').innerHTML=renderPage();
 const group=['scene','point','activity','pool'].includes(state.page)?'explore':['collection'].includes(state.page)?'wardrobe':['compose','work'].includes(state.page)?'memories':state.page;
 $('#bottom-nav').innerHTML=[['partner','伙伴','COMPANION'],['explore','游玩','EXPLORE'],['wardrobe','衣橱','WARDROBE'],['memories','回忆','MEMORIES']].map(([k,t,en])=>`<button data-page="${k}" class="${group===k?'active':''}" ${group===k?'aria-current="page"':''}>${t}<small>${en}</small></button>`).join('');
 const p=pages[state.page];$('#page-spec').innerHTML=`<h2>${p[0]} ${p[3]}</h2><p>${p[4]}</p><dl><dt>建议路由</dt><dd><code>${p[2]}</code></dd><dt>主要输入</dt><dd>${p[5]}</dd><dt>主要输出与跳转</dt><dd>${p[6]}</dd><dt>原画板对应</dt><dd>${p[7]}</dd><dt>能力阶段</dt><dd>结构草案，文字占位。业务能力按模块接口接入，素材方案后置。</dd></dl>`;
}
function handle(act){
 switch(act){
 case 'create':state.saved=state.draft;go('partner');break;
 case 'returning':state.scenario='visited';go('partner');break;
 case 'recover':state.scenario='visited';render();break;
 case 'gift':sheet('套装领取结果 · 结构示例','<p>景区默认套装进入已拥有资产。领取不代表实际到访。</p><div class="actions">'+action('去试穿','gift-wardrobe')+action('留在景区','close','secondary')+'</div>');break;
 case 'gift-wardrobe':state.draft='景区免费套装';go('wardrobe',{returnTo:'scene'});break;
 case 'checkin':state.scenario='visited';render();sheet('打卡结果 · 状态示例','<p>本次经历已记录；首次奖励增加景区通用次数，关联卡池已解锁。</p><div class="notice">这里只切换结构预览状态，没有执行真实核验或发奖。</div><div class="actions">'+button('去抽取','pool')+action('继续游玩','close','secondary')+'</div>');break;
 case 'activity-ok':state.scenario='visited';render();sheet('活动核验成功 · 状态示例','<p>活动奖励与到店奖励独立。正式联调中检查每账号每活动一次。</p>'+button('查看卡池','pool','full'));break;
 case 'activity-fail':sheet('未通过核验','<p>没有记录活动成功，也不发活动奖励。保留原活动页面供再次查看条件。</p>'+action('返回活动','close','full'));break;
 case 'draw':sheet('获得新奖励 · 结构示例',preview('服饰部件预览位','示例新部件')+'<p>结果已入库与是否试穿分开处理；此草案没有真实扣次或抽取。</p><div class="actions">'+action('去试穿','draw-wardrobe')+action('继续查看卡池','close','secondary')+'</div>');break;
 case 'draw-wardrobe':state.draft='刚获得的服饰部件';go('wardrobe',{returnTo:'pool'});break;
 case 'purchase':sheet('购买景区通用次数','<p>测试景区 A · 套餐及价格由配置提供。购买不解锁卡池。</p>'+panel('示例套餐','示例次数与金额位置，不代表实际定价。')+'<div class="notice">模拟支付入口；结构预览不会创建订单或增加余额。</div>'+action('查看成功反馈','purchase-ok','full')+action('取消','close','secondary full'));break;
 case 'purchase-ok':sheet('购买结果 · 结构示例','<p>成功后展示次数到账与回到原卡池。实际入账由后续订单服务处理。</p>'+action('返回原卡池','close','full'));break;
 case 'asset-source':sheet('奖励来源','<p>套装 A · 来源为山水主题卡池。未解锁时引导查看关联地点，已解锁时可直接抽取。</p><div class="actions">'+button('查看卡池','pool')+button('查看关联地点','point','secondary')+'</div>');break;
 case 'save-outfit':state.saved=state.draft;const target=state.returnTo;state.returnTo=null;if(target)go(target);else{render();sheet('搭配保存反馈','<p>本结构预览已更新当前显示搭配，首页与制作页共用。真实持久化待服务接入。</p>'+action('继续搭配','close','full'));}break;
 case 'compose-wardrobe':state.view='搭配';go('wardrobe',{returnTo:'compose'});break;
 case 'event':sheet('一次实地经历','<p>测试点位、到访时间、核验方式和奖励来源。该事件不因之后换装而改写。</p>'+button('用这些经历制作','compose','full'));break;
 case 'download-placeholder':sheet('作品导出能力位置','<p>本轮确认静态作品展示与保存入口。这里没有生成图片文件；实际素材合成与下载按后续能力接入。</p>'+action('返回作品','close','full'));break;
 case 'close':$('#sheet').close();break;
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.page){if(b.dataset.pointType)state.pointType=b.dataset.pointType;if(state.page==='wardrobe'&&state.draft!==state.saved&&b.dataset.page!==state.page){const dest=b.dataset.page;sheet('当前搭配尚未保存','<p>保存、放弃或继续编辑，避免跨页时静默丢失。</p>'+`<div class="actions"><button class="btn" data-leave="${dest}" data-save="yes">保存并离开</button><button class="btn secondary" data-leave="${dest}">放弃并离开</button></div>`+action('继续编辑','close','quiet full'));return;}go(b.dataset.page);}else if(b.dataset.leave){if(b.dataset.save)state.saved=state.draft;else state.draft=state.saved;state.returnTo=null;go(b.dataset.leave);}else if(b.dataset.act)handle(b.dataset.act);else if(b.dataset.outfit){state.draft=b.dataset.outfit;render();}else if(b.dataset.key){state[b.dataset.key]=b.dataset.value;render();}});
document.addEventListener('change',e=>{if(e.target.dataset.field)state[e.target.dataset.field]=e.target.value;});
$('#page-picker').onchange=e=>go(e.target.value);$('#scenario').onchange=e=>{state.scenario=e.target.value;render();};$('#back').onclick=()=>go(state.history.pop()||'partner',{record:false});$('#close-sheet').onclick=()=>$('#sheet').close();$('#sheet').addEventListener('click',e=>{if(e.target===$('#sheet'))$('#sheet').close();});
if(pages[location.hash.slice(1)])state.page=location.hash.slice(1);window.blueprintState=state;render();
})();
