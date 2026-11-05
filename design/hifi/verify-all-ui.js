async (page) => {
  const context = await page.context().browser().newContext({deviceScaleFactor:1,viewport:{width:390,height:844}});
  const q = await context.newPage();
  const checks = [], errors = [], views = [];
  let viewNumber = 0;
  const base = 'http://127.0.0.1:8765/design/hifi/index.html';
  const output = '.codex/local-deploy/all-ui-audit';
  const check = (name, pass, detail) => checks.push({name,pass:!!pass,...(detail?{detail}: {})});
  q.on('pageerror',e=>errors.push(e.message));
  q.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  q.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  try {
    await q.goto(base+'#partner');
    const catalog = await q.evaluate(async()=> (await import('./catalog.mjs')).pages);
    const required = ['entry','code','bind','onboarding','partner','explore','scene','point','checkin','activity','pool','wardrobe','collection','outfit','memories','compose','work','account','security','wallet','order'];
    const extraModals={entry:['terms','privacy','wechat'],point:['geo'],activity:['staff'],pool:['purchase'],compose:['select-events'],order:['payment']};
    check('21 页清单完整',catalog.length===21&&required.every(id=>catalog.some(p=>p.id===id)));
    for (const [width,height] of [[390,844],[360,640],[430,932],[1440,1000]]) {
      await q.setViewportSize({width,height});
      for (const item of catalog) {
        for (const state of [...item.states,...(extraModals[item.id]||[]).map(action=>'modal-'+action)]) {
          const action=state.startsWith('modal-')?state.slice(6):null;
          await q.goto(base+'?audit-view='+(++viewNumber)+'#'+item.id+(state==='default'||action?'':'?state='+state));
          await q.locator('#screen[data-page="'+item.id+'"]').waitFor();
          if(action) {
            await q.locator(`[data-action="${action}"]`).click();
            await q.locator('#overlay .design-modal').waitFor();
          }
          await q.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
          const metrics = await q.evaluate(async()=> {
            const root = document.querySelector('#overlay .design-modal') || document.querySelector('#screen');
            const frame = document.querySelector('#phone');
            const short = e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g,' ').slice(0,65);
            const shown = e => {const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
            const textElements = [...root.querySelectorAll('*')].filter(e=>!e.closest('svg,.travel-stamp,.province-letter')&&shown(e)&&[...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()));
            const smallText = textElements.filter(e=>parseFloat(getComputedStyle(e).fontSize)<11.99).map(e=>({text:short(e),size:getComputedStyle(e).fontSize,tag:e.tagName,cls:e.className}));
            const clippedText = textElements.filter(e=>{
              const s=getComputedStyle(e);
              if(s.display==='inline'||!e.clientWidth||e.tagName==='INPUT')return false;
              return e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX);
            }).map(short);
            const controls = [...root.querySelectorAll('button,input')].filter(e=>shown(e)&&!e.disabled);
            const mainButtons=[...root.querySelectorAll('.primary,.secondary,.round,.game-nav>button,.wardrobe-subtabs>button,.modal-close')].filter(shown);
            const blocked = [], overflow = [];
            for (const e of controls) {
              const hiddenAncestors=[];
              for(let ancestor=e.parentElement;ancestor&&ancestor!==document.body;ancestor=ancestor.parentElement){
                const style=getComputedStyle(ancestor);
                if(style.overflowY==='hidden'||style.overflowX==='hidden')hiddenAncestors.push({element:ancestor,x:ancestor.scrollLeft,y:ancestor.scrollTop,hiddenX:style.overflowX==='hidden',hiddenY:style.overflowY==='hidden'});
              }
              e.scrollIntoView({block:'nearest',inline:'nearest'});
              await new Promise(resolve=>requestAnimationFrame(resolve));
              const r=e.getBoundingClientRect(), f=frame.getBoundingClientRect();
              if(hiddenAncestors.some(a=>a.hiddenX&&a.element.scrollLeft!==a.x||a.hiddenY&&a.element.scrollTop!==a.y)) {
                overflow.push(short(e)+'：需要滚动隐藏容器才能到达');
              }
              const left=Math.max(r.left,f.left,0),right=Math.min(r.right,f.right,innerWidth);
              const top=Math.max(r.top,f.top,0),bottom=Math.min(r.bottom,f.bottom,innerHeight);
              if(right-left<Math.min(24,r.width)||bottom-top<Math.min(24,r.height)) {
                overflow.push(short(e)); continue;
              }
              const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2);
              if(hit!==e&&!e.contains(hit))blocked.push({text:short(e),coveredBy:hit?.className||hit?.tagName});
            }
            const scrollers = [...document.querySelectorAll('*')].filter(e=>e.scrollTop||e.scrollLeft);
            scrollers.forEach(e=>{e.scrollTop=0;e.scrollLeft=0;});window.scrollTo(0,0);
            await new Promise(resolve=>requestAnimationFrame(resolve));
            return {
              smallText,clippedText,blocked,overflow,controls:controls.length,
              mainTouchSize:mainButtons.every(e=>{const r=e.getBoundingClientRect();return r.width>=43.5&&r.height>=43.5;}),
              noOverflow:document.documentElement.scrollWidth<=innerWidth,
              phoneWidth:frame.getBoundingClientRect().width,
              images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),
              storage:localStorage.length+sessionStorage.length,
            };
          });
          const prefix=`${width}×${height} ${item.id}/${state}`;
          views.push({page:item.id,state,width,height,...metrics});
          check(prefix+'：字号至少 12px',!metrics.smallText.length,metrics.smallText.length?metrics.smallText:undefined);
          check(prefix+'：文字未被裁切',!metrics.clippedText.length,metrics.clippedText.length?metrics.clippedText:undefined);
          check(prefix+'：按钮输入可滚动到并点击',!metrics.blocked.length&&!metrics.overflow.length,(metrics.blocked.length||metrics.overflow.length)?{blocked:metrics.blocked,overflow:metrics.overflow}:undefined);
          check(prefix+'：主要按钮至少 44×44',metrics.mainTouchSize);
          check(prefix+'：无横向溢出',metrics.noOverflow);
          check(prefix+'：图片完整',metrics.images);
          check(prefix+'：未写入业务进度',metrics.storage===0);
          if(width>700)check(prefix+'：桌面原尺寸阅读',Math.abs(metrics.phoneWidth-390)<.5);
          if(width===390||width===360&&state==='default'||metrics.smallText.length||metrics.blocked.length||metrics.overflow.length) {
            await q.locator('#phone').screenshot({path:`${output}/${width}/${item.id}-${state}.png`});
          }
        }
      }
    }
    const expectedViews=(catalog.reduce((sum,item)=>sum+item.states.length,0)+Object.values(extraModals).flat().length)*4;
    check('全部页面、清单状态与八种按钮弹层均完成四尺寸检查',views.length===expectedViews&&expectedViews===240);
    check('无脚本、资源与控制台错误',errors.length===0,errors.length?errors:undefined);
  } catch(e) {
    checks.push({name:'验收中断：'+e.message,pass:false});
  } finally {
    await page.evaluate(result=>window.hxxAllUIQA=result,{
      at:new Date().toISOString(),checks,views,errors,
      passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,
    });
    await context.close();
  }
}
