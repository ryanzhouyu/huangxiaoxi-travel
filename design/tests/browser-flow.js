async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const q=await context.newPage();const checks=[],errors=[];q.on('pageerror',e=>errors.push(e.message));q.on('console',m=>{if(m.type()==='error')errors.push(m.text());});q.on('dialog',d=>d.accept());
 const base='http://127.0.0.1:8765/design/index.html';
 const check=(name,ok)=>{checks.push({name,pass:!!ok});if(!ok)throw Error(name);};
 const click=async(action,id)=>{const scope=await q.locator('dialog[open]').count()?q.locator('dialog[open]'):q;await scope.locator(`[data-action="${action}"]${id?`[data-id="${id}"]`:''}`).first().click();if(action==='draw')await q.locator('dialog[open] .reward-reveal').waitFor();};
 const state=()=>q.evaluate(()=>{const d=JSON.parse(localStorage.getItem('hxx.interactive.v2'));return d?.accounts[d.current];});
 const route=async name=>q.waitForFunction(n=>document.querySelector('#app').dataset.page===n,name);
 const nav=()=>q.locator('.bottom-nav').count();
 const hash=async value=>{await q.evaluate(v=>location.hash=v,value);await route(value.split('?')[0]);};
 const close=async()=>{if(await q.locator('dialog[open]').count())await q.locator('#close-sheet').click();};
 try{
  await q.goto(base+'#point?id=gate');await route('entry');check('未登录访问详情回到入口；入口没有头部或底部导航',await nav()===0&&await q.locator('.app-header').count()===0);
  await click('login','A');await route('onboarding');check('初始化没有游玩导航和页面目录',await nav()===0&&await q.locator('.app-header,.page-index,.controls').count()===0);
  await q.screenshot({path:'output/playwright/interactive-onboarding-mobile.png'});
  await q.evaluate(()=>location.hash='pool?id=cloud');await route('onboarding');check('未初始化不能通过链接跳过伙伴选择',!(await state()).initialized);
  await click('starter','start-b');await click('initialize');await route('pool');check('初始化保存全部初始装扮，并回到原目标', (await state()).owned.length===15&&(await state()).look.top==='start-b-top');
  check('未解锁卡池没有抽取或购买操作',await q.locator('[data-action="draw"],[data-action="purchase"]').count()===0);
  await hash('scene');check('景区详情没有一级导航',await nav()===0);await click('gift');check('领取免费套装不覆盖当前搭配、不增加到访', (await state()).owned.length===19&&(await state()).events.length===0&&(await state()).look.top==='start-b-top');
  await click('try-gift');await route('wardrobe');check('带任务返回的衣橱是编辑页，无底部主导航',await nav()===0);await click('wardrobe-return');check('未保存试穿离开会出现三项选择',await q.locator('[data-action="dirty-save"],[data-action="dirty-discard"],[data-action="close"]').count()===3);
  await click('close');await click('save-look');await route('scene');check('保存后回到原景区，搭配更新', (await state()).look.top==='gift-top');
  await click('try-gift');await click('wardrobe-return');await route('scene');check('没有改动的试穿可直接返回，不留下编辑状态',await q.locator('dialog[open]').count()===0);
  await hash('partner');check('正式主页面显示伙伴、游玩、回忆三个场景入口',await q.locator('.bottom-nav button').count()===3);
  await q.screenshot({path:'output/playwright/interactive-home-mobile.png'});
  await hash('memories');check('只有领装时，回忆为空且不能生成实际作品',await q.getByText('第一条足迹，等你来。').count()===1);
  await hash('point?id=gate');await click('geo','gate');await click('geo-fail');check('定位模拟失败不记录、不发奖', (await state()).events.length===0&&(await state()).balance===0);await close();
  await click('open-checkin','gate');await route('checkin');await q.locator('#checkin-code').fill('bad');await click('verify-code');check('无效码被拒绝，输入与页面保持',await q.getByText('无法识别这个点位码',{exact:false}).count()===1&&(await state()).events.length===0);await close();
  await q.locator('#checkin-code').fill('HXX-BROOK-2026');await click('verify-code');check('二维码与当前地点不匹配时拒绝',await q.getByText('这个二维码不属于当前地点',{exact:false}).count()===1);await close();
  await q.locator('#checkin-code').fill('HXX-GATE-2026');await click('verify-code');let a=await state();check('打卡同时记录经历、发次数和解锁卡池',a.events.length===1&&a.balance===2&&a.unlocked.includes('cloud'));
  await click('result-pool','cloud');await route('pool');await click('draw','cloud');a=await state();const prize=a.draws[0].assetId;check('抽奖扣一次、奖励立即入库',a.balance===1&&a.owned.includes(prize));
  await click('try-asset',prize);await route('wardrobe');check('抽到的部件自动定位并试穿',await q.locator(`[data-action="equip"][data-id="${prize}"][aria-pressed="true"]`).count()===1);await click('save-look');await route('pool');
  await click('draw','cloud');await close();check('抽奖跨次不重复',new Set((await state()).draws.map(d=>d.assetId)).size===2&&(await state()).balance===0);
  await click('no-balance');check('次数不足有游玩与模拟购买两个去向',await q.locator('#sheet [data-action="purchase"]').count()===1&&await q.locator('#sheet [data-target="scene"]').count()===1);await close();
  await click('purchase','cloud');await click('order','five');await q.locator('[data-action="pay"][data-status="cancelled"]').click();check('取消订单不加次数', (await state()).balance===0&&(await state()).orders[0].status==='cancelled');await close();
  await click('purchase','cloud');await click('order','five');await q.locator('[data-action="pay"][data-status="failed"]').click();check('模拟支付失败不发次数',(await state()).balance===0&&(await state()).orders[0].status==='failed');await close();
  await click('purchase','cloud');await click('order','ten');await q.locator('[data-action="pay"][data-status="paid"]').click();check('模拟支付成功发放到景区共享余额',(await state()).balance===10);await close();
  await q.screenshot({path:'output/playwright/interactive-pool-mobile.png'});
  await hash('point?id=gate');await click('open-checkin','gate');await q.locator('#checkin-code').fill('HXX-GATE-2026');await click('verify-code');check('短时间重复打卡不重复记事件和奖励',(await state()).events.length===1&&(await state()).balance===10);await close();
  await hash('point?id=shop');await click('open-checkin','shop');await q.locator('#checkin-code').fill('HXX-SHOP-2026');await click('verify-code');await close();check('商家到店独立发放一次，解锁另一卡池',(await state()).balance===11&&(await state()).unlocked.includes('bloom'));
  await hash('activity');await click('staff');await click('staff-fail');check('店员模拟失败不产生体验记录',(await state()).events.length===2);await close();await click('staff');await click('staff-success');await close();check('完成体验与到店奖励分开，活动不可再领',(await state()).balance===13&&(await state()).events.length===3&&await q.locator('[data-action="staff"]').count()===0);
  await hash('compose');await q.locator('[data-action="template"][data-value="trail"]').click();await q.locator('#range').selectOption('custom');await q.locator('#from').fill('2026-10-01');await q.locator('#from').dispatchEvent('change');await q.locator('#to').fill('2026-10-31');await q.locator('#to').dispatchEvent('change');await q.locator('[data-event]').last().uncheck();await q.locator('#work-title').fill('我的黔山旅行');
  await click('compose-dress');await route('wardrobe');await q.locator('[data-action="category"][data-value="top"]').click();await click('equip','start-c-top');await click('save-look');await route('compose');check('制作中换装保留标题、日期、模板和选中的经历',await q.locator('#work-title').inputValue()==='我的黔山旅行'&&await q.locator('#range').inputValue()==='custom'&&await q.locator('#from').inputValue()==='2026-10-01'&&await q.locator('[data-value="trail"].selected').count()===1&&await q.locator('[data-event]:checked').count()===2);
  await click('preview-work');await q.locator('[data-action="save-work"]').waitFor();check('纪念图生成实际 PNG 预览',await q.locator('.compose-preview img').getAttribute('src').then(s=>s.startsWith('data:image/png')));await q.screenshot({path:'output/playwright/interactive-compose-mobile.png',fullPage:true});await click('save-work');await route('work');a=await state();const workId=a.works[0].id,oldImage=a.works[0].image,oldLook=JSON.stringify(a.works[0].look);check('保存作品包含经历与当前搭配快照',a.works.length===1&&a.works[0].events.length===2&&a.works[0].look.top==='start-c-top');
  const download=q.waitForEvent('download');await click('download',workId);const file=await download;check('保存按钮产生 PNG 下载',file.suggestedFilename().endsWith('.png'));await file.saveAs('output/playwright/interactive-export.png');
  await q.screenshot({path:'output/playwright/interactive-work-mobile.png',fullPage:true});
  await hash('partner');await click('home-dress');await q.locator('[data-action="category"][data-value="top"]').click();await click('equip','start-a-top');await q.evaluate(()=>location.hash='memories');await click('dirty-discard');await route('memories');check('放弃试穿不改变已保存搭配',(await state()).look.top==='start-c-top');
  await hash('partner');await click('home-dress');await click('equip','start-a-top');await click('save-look');await hash('work?id='+workId);check('后续换装不改写历史作品',JSON.stringify((await state()).works[0].look)===oldLook&&(await state()).works[0].image===oldImage);
  await hash('account');await q.locator('details summary').click();await click('fail-next');const before=JSON.stringify(await state());await hash('scene');await click('try-gift');await click('save-look');check('保存失败显示可恢复错误，历史进度不变',await q.getByText('未能保存进度',{exact:false}).count()===1&&JSON.stringify(await state())===before);await close();await click('save-look');await route('scene');
  await hash('pool?id=cloud');let loops=0;while(await q.locator('[data-action="draw"]').count()){await click('draw','cloud');await close();if(++loops>10)throw Error('卡池未收齐');}check('收齐后移除抽取与购买，余额不被继续消费',await q.getByText('这个卡池已收齐',{exact:false}).count()===1&&await q.locator('[data-action="purchase"]').count()===0);a=await state();check('跨卡池共有部件不再可抽',a.owned.includes('joy')&&a.owned.includes('wave'));
  await q.reload();await route('pool');check('刷新恢复余额、拥有物、作品和解锁状态',(await state()).balance===a.balance&&(await state()).works.length===1);
  await hash('wardrobe');await q.locator('[data-action="category"][data-value="expression"]').click();await click('equip','joy');await q.locator('[data-action="category"][data-value="pose"]').click();await click('equip','wave');await click('save-look');check('静态表情和姿势可以独立穿戴并保存',(await state()).look.expression==='joy'&&(await state()).look.pose==='wave');
  await hash('collection?id=flower');await click('source','flower-top');check('未拥有部件给出来源卡池而非穿戴按钮',await q.locator('#sheet [data-target="pool?id=bloom"]').count()===1&&await q.locator('#sheet [data-action="try-asset"]').count()===0);await close();
  await hash('point?id=missing');check('无效地点链接显示缺失提示，不冒充其他地点',await q.getByText('这个内容不存在').count()===1);await hash('work?id=missing');check('无效作品链接可以返回作品列表',await q.locator('[data-action="works"]').count()===1);await click('works');check('返回我的作品准确打开作品页签',await q.locator('.work-card').count()===1);
  await hash('partner');await q.locator('[data-target="scene"]').first().click();await click('try-gift');await q.locator('[data-action="category"][data-value="top"]').click();await click('equip','start-a-top');await click('save-look');await click('back');await route('partner');check('保存搭配返回原景区后，再返回回到伙伴而非重复进入编辑页',await nav()===1);
  await hash('account');await click('logout');await route('entry');await click('login','B');await route('onboarding');check('第二账号与第一账号隔离，不能跳过初始化', (await state()).events.length===0&&(await state()).owned.length===0);
  await click('initialize');await hash('account');await click('logout');await click('login','A');await route('partner');check('回访账号直接恢复伙伴与进度，跳过初始化',(await state()).works.length===1);
  for(const size of [{width:360,height:740},{width:390,height:844},{width:1440,height:1000}]){
   await q.setViewportSize(size);for(const r of ['partner','explore','scene','point?id=shop','checkin','activity','pool?id=bloom','wardrobe','collection?id=flower','memories','compose','work?id='+workId,'account','wallet']){await hash(r);check(`${size.width}px ${r.split('?')[0]} 无横向溢出`,await q.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));}
   if(size.width===1440){await hash('partner');await q.screenshot({path:'output/playwright/interactive-home-desktop.png'});}
  }
  const t=await context.newPage();await t.goto(base+'#checkin?id=brook&code=HXX-BROOK-2026');await t.locator('[data-action="verify-code"]').waitFor();check('已有账号通过扫码链接直接回到指定核验页',await t.locator('#checkin-code').inputValue()==='HXX-BROOK-2026');await t.close();
  const isolated=await page.context().browser().newContext({viewport:{width:390,height:844}});const fresh=await isolated.newPage();await fresh.goto(base+'#checkin?id=brook&code=HXX-BROOK-2026');await fresh.locator('[data-action="login"][data-id="B"]').click();await fresh.locator('[data-action="initialize"]').click();await fresh.locator('[data-action="verify-code"]').waitFor();check('首次扫码经过账号和初始化后保留原点位与二维码',await fresh.locator('#checkin-code').inputValue()==='HXX-BROOK-2026');await isolated.close();
  check('浏览器无脚本或控制台错误',errors.length===0);
 }catch(e){checks.push({name:'流程中断：'+e.message,pass:false});await q.screenshot({path:'output/playwright/interactive-qa-failure.png',fullPage:true});}
 finally{await page.evaluate(data=>window.hxxQA=data,{at:new Date().toISOString(),checks,errors,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length});await context.close();}
}
