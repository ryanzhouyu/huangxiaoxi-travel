async (page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const q=await context.newPage();
 const checks=[],errors=[];q.on('pageerror',e=>errors.push(e.message));q.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const assert=(name,ok)=>{checks.push({name,pass:!!ok});if(!ok)throw Error(name);};
 const base='http://127.0.0.1:8765/design/index.html?v=3';
 const wait=async p=>q.waitForFunction(n=>document.querySelector('#app').dataset.page===n,p);
 const go=async r=>{await q.evaluate(r=>location.hash=r,r);await wait(r.split('?')[0]);};
 const click=async a=>q.locator('[data-action="'+a+'"]').first().click();
 const shot=async name=>{await q.waitForTimeout(180);await q.screenshot({path:'output/playwright/game-'+name+'.png'});};
 try{
  await q.goto(base+'#entry');await wait('entry');await shot('entry');await q.locator('[data-action="login"][data-id="A"]').click();await wait('onboarding');await shot('onboarding');await click('initialize');await wait('partner');
  assert('首页以整屏场景呈现，没有功能说明卡和统计卡',await q.locator('.companion-world .world-art').count()===1&&await q.locator('#app .card,#app .stats,#app .page-intro').count()===0);
  const first=await q.locator('.dialogue-line').textContent();await click('greet');assert('点伙伴会回应且不产生虚假养成数值',await q.locator('.dialogue-line').textContent()!==first);await shot('home');
  await click('home-catalog');await wait('wardrobe');assert('图鉴入口直接打开套装收藏册',await q.locator('.catalog-outfit').count()===6);await shot('catalog');
  await go('partner');await click('home-dress');await wait('wardrobe');assert('换装人物与部件柜同屏',await q.locator('.dressed-character').isVisible()&&await q.locator('.inventory-scroll .asset').count()>=3);await shot('wardrobe');
  await go('scene');assert('示意地图四个地点可点',await q.locator('.map-pin').count()===4);await shot('map');
  await q.locator('[data-action="filter"][data-value="商家"]').click();assert('地图分类筛选商家',await q.locator('.map-pin').count()===1);await q.locator('.map-pin').click();await wait('point');assert('地图标记打开对应地点',q.url().includes('id=shop'));await shot('point');
  await go('checkin?id=gate&code=HXX-GATE-2026');await click('verify-code');await q.locator('#sheet [data-action="result-pool"]').click();await wait('pool');await shot('pool');await click('draw');await q.locator('.reward-reveal').waitFor();assert('获得装扮有实物部件示意和展示反馈',await q.locator('.reward-art .item-art').count()===1);await q.waitForTimeout(700);await shot('reward');await q.locator('#close-sheet').click();
  await go('memories');assert('回忆以真实到访的手账节点呈现',await q.locator('.journal-event').count()===1);await shot('journal');
  await go('compose');await shot('studio');
  for(const size of [{width:360,height:640},{width:390,height:844},{width:430,height:932},{width:1440,height:1000}]){await q.setViewportSize(size);for(const r of ['partner','scene','wardrobe','pool?id=cloud','memories','compose']){await go(r);if(r==='scene')await q.locator('[data-action="filter"][data-value="全部"]').click();assert(`${size.width}×${size.height} ${r} 无横向溢出`,await q.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));if(['partner','scene','wardrobe'].includes(r)){
   assert(`${size.width}×${size.height} ${r} 首屏完整`,await q.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
   const selectors=r==='partner'?'.hud-orb,.identity-button,.location-plaque,.dialogue-line,.bottom-nav button':r==='scene'?'.map-pin,.gift-medal,.map-filter .btn,.pool-charm':'.cabinet-categories .btn,.dressing-save .btn,.inventory-scroll .asset';
   const hit=await q.locator(selectors).evaluateAll(els=>els.filter(el=>{const box=el.getBoundingClientRect(),clip=el.closest('.inventory-scroll')?.getBoundingClientRect();return box.width>0&&box.height>0&&box.top>=0&&box.bottom<=innerHeight&&(!clip||(box.top+box.height/2>=clip.top&&box.top+box.height/2<clip.bottom));}).every(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return el===hit||el.contains(hit);}));assert(`${size.width}×${size.height} ${r} 关键入口没有被遮挡`,hit);
  }}if(size.width===1440){await go('partner');await shot('desktop');}if(size.width===360){await go('partner');await shot('home-small');await go('wardrobe');await shot('wardrobe-small');await go('scene');await shot('map-small');}}
  assert('无脚本和控制台错误',errors.length===0);
 }catch(e){checks.push({name:'中断：'+e.message,pass:false});await q.screenshot({path:'output/playwright/game-failure.png',fullPage:true});}
 finally{await page.evaluate(data=>window.hxxGameQA=data,{at:new Date().toISOString(),checks,errors,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length});await context.close();}
}
