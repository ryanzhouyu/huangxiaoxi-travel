async (page)=>{
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const q=await context.newPage(),errors=[],checks=[];
  q.on('pageerror',e=>errors.push(e.message));q.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const base='http://127.0.0.1:8765/design/hifi/index.html';
  const check=(name,pass)=>checks.push({name,pass:!!pass});
  const navigate=async(id,state='default')=>{
    await q.goto(base+'#'+id+(state!=='default'?'?state='+state:''));
    await q.locator('#screen[data-page="'+id+'"]').waitFor();
    await q.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    await q.locator('.hifi-toast').evaluateAll(els=>els.forEach(el=>el.remove()));
  };
  try{
    await navigate('partner');
    const catalog=await q.evaluate(async()=> (await import('./catalog.mjs')).pages);
    for(const p of catalog){
      await navigate(p.id);
      check(p.id+'：有独立页面内容',await q.locator('#screen').innerText().then(s=>s.length>15));
      check(p.id+'：图片成功加载',await q.locator('#screen img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
      check(p.id+'：部件图集显示区域有效',await q.locator('#screen .atlas-item').evaluateAll(items=>items.every(i=>{const r=i.getBoundingClientRect();return r.width>10&&r.height>10;})));
      check(p.id+'：无文档横向溢出',await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await q.locator('#phone').screenshot({path:'output/playwright/hifi/'+p.id+'.png'});
      for(const state of p.states.filter(s=>s!=='default')){
        await navigate(p.id,state);
        check(p.id+'/'+state+'：状态有内容',await q.locator('#screen').getAttribute('data-state')===state);
        await q.locator('#phone').screenshot({path:'output/playwright/hifi/states/'+p.id+'-'+state+'.png'});
      }
    }
    await navigate('entry');
    check('登录入口没有游玩导航',await q.locator('.game-nav').count()===0);
    await q.locator('[data-action="get-code"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.state==='agreement');
    check('未勾协议有明确提示',await q.locator('.inline-error').count()===1);
    await q.locator('#agreement').check();await q.locator('[data-action="get-code"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.page==='code');
    for(let i=0;i<6;i++)await q.locator('.otp input').nth(i).fill(String(i+1));
    await q.locator('[data-action="verify-login"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.page==='onboarding');
    check('首次登录进入初始化且无主菜单',await q.locator('.game-nav').count()===0);
    await q.locator('[data-go="partner"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.page==='partner');
    check('伙伴主导航有三个场景',await q.locator('.game-nav>button').count()===3);
    await navigate('compose');await q.locator('[data-go="wardrobe"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.page==='wardrobe');
    await q.locator('[data-action="save-look"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.page==='compose');
    check('制作进入衣橱保存可返回制作',await q.locator('#screen').getAttribute('data-page')==='compose');
    await q.locator('#work-title').fill('这一天的山风');await q.locator('[data-go="wardrobe"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.page==='wardrobe');
    await q.locator('[data-action="save-look"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.page==='compose');
    check('衣橱返回保留制作标题',await q.locator('#work-title').inputValue()==='这一天的山风');
    await navigate('bind','bind-conflict');
    check('绑定冲突不出现自动合并操作',!(await q.locator('#overlay button').allTextContents()).some(s=>s.includes('合并')));
    await navigate('pool','pool-empty');
    check('收齐没有抽取或购买入口',await q.locator('[data-action="prize"],[data-action="purchase"]').count()===0);
    await navigate('order');await q.locator('[data-action="payment"]').click();await q.locator('[data-action="paid"]').click();
    await q.waitForFunction(()=>document.querySelector('#screen').dataset.state==='order-paid');
    check('模拟订单成功回卡池入口可用',await q.locator('[data-go="pool"]').count()===1);
    for(const size of [{width:360,height:640},{width:430,height:932},{width:1440,height:1100}]){
      await q.setViewportSize(size);
      for(const id of (size.width<700?catalog.map(p=>p.id):['entry','onboarding','partner','scene','wardrobe','compose'])){
        await navigate(id);
        check(size.width+'px '+id+'：无文档横向溢出',await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        if(size.width<700){
          const inaccessible=await q.locator('#screen .primary,#screen .secondary').evaluateAll(buttons=>buttons.filter(b=>{
            const r=b.getBoundingClientRect();if(!r.width||!r.height)return false;
            const inViewport=r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;
            let p=b.parentElement,scrollable=false;
            while(p&&p.id!=='phone'){
              if(/auto|scroll/.test(getComputedStyle(p).overflowY)&&p.scrollHeight>p.clientHeight)scrollable=true;
              p=p.parentElement;
            }
            return !inViewport&&!scrollable;
          }).map(b=>b.textContent));
          check(size.width+'px '+id+'：主要操作可见或在可滚动区',inaccessible.length===0);
          if(inaccessible.length)errors.push(id+': clipped actions '+inaccessible.join(','));
        }
        await q.screenshot({path:'output/playwright/hifi/check-'+size.width+'-'+id+'.png'});
      }
    }
    await q.setViewportSize({width:1800,height:1200});await q.goto('http://127.0.0.1:8765/design/hifi/overview.html');
    await q.locator('#gallery .card').first().waitFor();
    await q.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(i=>i.decode()));});
    check('总览的 21 张页面 PNG 已加载',await q.locator('#gallery img').count()===21);
    await q.screenshot({path:'output/playwright/hifi/overview.png',fullPage:true});
    check('无页面脚本或资源错误',errors.length===0);
  }catch(e){checks.push({name:'流程中断：'+e.message,pass:false});}
  finally{
    await page.evaluate(result=>window.hxxHifiQA=result,{at:new Date().toISOString(),checks,errors,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length});
    await context.close();
  }
}
