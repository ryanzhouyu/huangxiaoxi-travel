async (page) => {
  const context=await page.context().browser().newContext({deviceScaleFactor:1});
  const q=await context.newPage(),checks=[],errors=[],contrasts=[];
  const base='http://127.0.0.1:8765/design/hifi/index.html';
  let sequence=0;
  q.on('pageerror',e=>errors.push(e.message));
  const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
  const open=async route=>{await q.goto(base+'?flow='+(++sequence)+'#'+route);await q.locator('#screen').waitFor();};
  const action=async name=>{const modal=q.locator('#overlay .design-modal');const scope=await modal.count()?modal:q;await scope.locator(`[data-action="${name}"]`).first().click();};
  const route=async name=>q.waitForFunction(id=>document.querySelector('#screen').dataset.page===id,name);
  const state=async name=>q.waitForFunction(s=>document.querySelector('#screen').dataset.state===s,name);
  const close=()=>q.locator('.modal-close').click();
  try {
    for(const [width,height] of [[390,844],[360,640]]) {
      await q.setViewportSize({width,height});
      const label=width+'px ';
      await open('entry');
      for(const modal of ['terms','privacy']){await action(modal);check(label+modal+' 可阅读及关闭',await q.locator('#overlay .design-modal').count()===1);await close();}
      await action('wechat');await q.locator('#overlay [data-go="bind"]').click();await route('bind');
      await action('bind-skip');await route('onboarding');check(label+'微信设计分支与稍后绑定入口保持',true);
      await open('entry');await action('get-code');await state('agreement');check(label+'协议前置反馈保持',await q.locator('.inline-error').count()===1);
      await q.locator('#agreement').check();await q.locator('#phone-number').fill('13800008000');await action('get-code');await route('code');
      for(let i=0;i<6;i++)await q.locator('.otp input').nth(i).fill(String(i+1));
      await action('verify-login');await route('onboarding');await q.locator('[data-action="starter"]').nth(2).click();
      check(label+'初始搭配选择反馈保持',await q.locator('.starter-options .chosen').innerText().then(t=>t.includes('溪边薄荷')));
      await q.locator('[data-go="partner"]').click();await route('partner');
      await q.locator('.game-nav [data-go="explore"]').click();await route('explore');await q.locator('.destination [data-go="scene"]').click();await route('scene');
      await q.locator('.map-categories button').filter({hasText:'商家'}).click();
      check(label+'地图筛选只展示商家',await q.locator('.map-pin:visible').count()===1);
      await q.locator('.map-categories button').filter({hasText:'全部'}).click();
      check(label+'地图全部点位恢复',await q.locator('.map-pin:visible').count()===4);
      await action('gift');await q.locator('#overlay [data-go="wardrobe"]').click();await route('wardrobe');await action('save-look');await route('scene');
      check(label+'领装试穿保存返回景区',true);
      await action('place-list');check(label+'地点一览可打开',await q.locator('#overlay .list-row').count()===3);await close();
      await action('locked-pool');await state('pool-locked');check(label+'锁池没有抽取和购买',await q.locator('[data-action="prize"],[data-action="purchase"]').count()===0);
      await action('unlock-source');await close();
      await open('point?state=merchant');await q.locator('[data-go="activity"]').click();await route('activity');
      await action('staff');await action('staff-failed');check(label+'核验失败有反馈',await q.locator('.hifi-toast').count()===1);
      await action('staff');await action('staff-success');await state('activity-done');check(label+'活动终态操作保持',await q.locator('[data-action="staff"]').count()===0);
      await open('point');await action('geo');await action('checkin-failed');check(label+'定位模拟失败反馈可关闭',await q.locator('#overlay .design-modal').count()===1);await close();
      await q.locator('[data-go="checkin"]').click();await route('checkin');await q.locator('.code-input input').fill('HXX-RIDGE-2026');await action('checkin-success');
      await q.locator('#overlay [data-go="pool"]').click();await route('pool');await action('prize');await q.locator('#overlay [data-go="wardrobe"]').click();await route('wardrobe');
      for(const [tab,name] of [['wardrobe-expression','表情'],['wardrobe-background','背景'],['wardrobe-kind','头饰']]) {
        await action(tab);
        check(label+name+' 页签与列表反馈一致',await q.locator(`[data-action="${tab}"]`).getAttribute('aria-pressed')==='true'&&(await q.locator('#category-name').innerText())===name&&(await q.locator('.selected-item>small').innerText()).includes(name));
        await q.screenshot({path:`output/playwright/all-ui-review/${width}-wardrobe-${tab}.png`});
      }
      await q.locator('[data-action="category"][data-type="top"]').click();await q.locator('.asset-tile').nth(1).click();
      check(label+'部件选中反馈保持',await q.locator('.asset-tile.selected').count()===1);
      await action('dirty');await action('close-modal');await action('save-look');await route('pool');
      check(label+'获得装扮后的试穿与返回保持',true);
      await action('purchase');await q.locator('[data-action="package"][data-count="10"]').click();await q.locator('#overlay [data-go="order"]').click();await route('order');
      check(label+'套餐数量和金额传至订单',await q.locator('.order-product h3').innerText().then(t=>t.includes('10'))&&(await q.locator('.order-product>b').innerText())==='¥7.00');
      await action('payment');await action('paid');await state('order-paid');await q.locator('.order-paper [data-go="pool"]').click();await route('pool');check(label+'模拟支付成功返回卡池',true);
      for(const [event,expected] of [['pay-failed','order-failed'],['cancel-order','order-cancelled']]){await open('order');await action('payment');await action(event);await state(expected);check(label+expected+' 终态保持',true);}
      await open('collection');await q.locator('.suit-card').last().click();await route('outfit');await q.locator('.asset-tile.unowned').first().click();
      check(label+'缺件来源入口保持',await q.locator('#overlay [data-go="pool"]').count()===1);await close();
      await open('memories?state=memory-empty');check(label+'无足迹不出现生成操作',await q.locator('[data-go="compose"]').count()===0);
      await open('memories');await q.locator('[data-action="memory-tab:1"]').click();await state('works');await q.locator('.work-preview').click();await route('work');
      await action('share');await close();await action('download');check(label+'作品保存仍明确设计边界',await q.locator('.hifi-toast').innerText().then(t=>t.includes('业务交互原型')));
      await q.locator('[data-go="compose"]').click();await route('compose');await q.locator('#work-title').fill('山风里的新记忆');await q.locator('[data-action="template"]').last().click();
      await action('select-events');await q.locator('.event-check input').last().uncheck();await action('confirm-events');
      await q.locator('[data-go="wardrobe"]').click();await route('wardrobe');await action('save-look');await route('compose');
      check(label+'制作换装返回保留标题、模板和经历数量',await q.locator('#work-title').inputValue()==='山风里的新记忆'&&await q.locator('.template-options .active').innerText()==='足迹长图'&&await q.locator('.selected-events>b').innerText().then(t=>t.includes('2')));
      await action('generate');await state('compose-preview');await action('save-work');await route('work');check(label+'新作品页面恢复制作标题',await q.locator('.work-description h2').innerText()==='山风里的新记忆');
      await open('account');await q.locator('[data-go="security"]').click();await route('security');await action('change-phone');
      await q.locator('[data-purpose="change"]').click();await route('bind');await action('bind-skip');await route('security');check(label+'更换绑定取消仍返回安全页',true);
      await action('recover');await close();await open('wallet');await q.locator('[data-action="wallet-tab:1"]').click();await state('orders');await q.locator('.ledger-paper [data-go="order"]').first().click();await route('order');check(label+'账本与订单入口保持',true);
      await open('account');await action('logout');await close();check(label+'退出可取消',await q.locator('#screen').getAttribute('data-page')==='account');
      check(label+'设计预览不写入用户进度',await q.evaluate(()=>localStorage.length+sessionStorage.length)===0);
    }
    const targets=[
      ['entry','.primary','.primary'],['entry','.secondary','.secondary'],['entry','.login-panel .muted','.login-panel'],
      ['point','.detail-paper>p:not(.fine)','.detail-paper'],['point','.fine','.detail-paper'],
      ['wallet','.ribbon-tabs>.active','.ribbon-tabs>.active'],['wardrobe','.asset-tile>small','.cabinet'],
    ];
    for(const [id,text,panel] of targets){
      await open(id);
      const ratio=await q.evaluate(({text,panel})=>{
        const rgb=s=>s.match(/[\d.]+/g).map(Number);
        const lum=channels=>{const c=channels.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
        const foreground=rgb(getComputedStyle(document.querySelector(text)).color);
        const background=getComputedStyle(document.querySelector(panel));
        const stops=(background.backgroundImage.match(/rgba?\([^)]+\)/g)||[background.backgroundColor]).map(rgb);
        return Math.min(...stops.map(stop=>{const x=lum(foreground),y=lum(stop.slice(0,3).map(v=>v*(stop[3]??1)));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}));
      },{text,panel});
      contrasts.push({page:id,text,panel,ratio});check(`${id} ${text} 文字对比度至少 4.5:1`,ratio>=4.5);
    }
    check('无页面脚本错误',errors.length===0);
  }catch(e){checks.push({name:'串联中断：'+e.message,pass:false});await q.screenshot({path:'output/playwright/all-ui-review/flow-failure.png',fullPage:true});}
  finally{await page.evaluate(result=>window.hxxUIFlowQA=result,{at:new Date().toISOString(),checks,errors,contrasts,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length});await context.close();}
}
