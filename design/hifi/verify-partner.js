async (page) => {
  const context = await page.context().browser().newContext({deviceScaleFactor: 1});
  const q = await context.newPage();
  const checks = [], errors = [], metrics = [];
  const base = 'http://127.0.0.1:8765/design/hifi/index.html';
  const output = 'output/playwright/partner-review';
  q.on('pageerror', e => errors.push(e.message));
  q.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  q.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const check = (name, pass, detail = '') => checks.push({name, pass: !!pass, ...(detail ? {detail} : {})});
  const navigate = async (state = 'default') => {
    await q.goto(base + '#partner' + (state === 'default' ? '' : '?state=' + state));
    await q.locator('.partner-scene').waitFor();
    await q.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode()));
    });
  };

  try {
    for (const [width, height] of [[360,640], [390,844], [430,932], [1024,768], [1280,720], [1440,1000]]) {
      await q.setViewportSize({width, height});
      for (const state of ['default', 'first-visit']) {
        await navigate(state);
        const result = await q.evaluate(() => {
          const scene = document.querySelector('.partner-scene');
          const rect = e => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
          const phone = rect(scene);
          const buttons = [...scene.querySelectorAll('button')].filter(b => !b.matches('.character-touch'));
          const inScene = r => r.x >= phone.x - .5 && r.y >= phone.y - .5 && r.right <= phone.right + .5 && r.bottom <= phone.bottom + .5;
          const labels = [...scene.querySelectorAll('.identity-pill b,.identity-pill small,.tool-medal>span,.game-nav>button>span:not(.home-cameo),.speech-paper p,.speech-paper .text-button,.speaker,.place-ribbon')];
          const fontSizes = labels.map(e => ({text:e.textContent.trim(),size:parseFloat(getComputedStyle(e).fontSize)}));
          const clipped = labels.filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.textContent);
          const speech = rect(scene.querySelector('.speech-paper'));
          const navigation = rect(scene.querySelector('.game-nav'));
          const figure = rect(scene.querySelector('.character-touch'));
          const top = rect(scene.querySelector('.home-top'));
          const tools = rect(scene.querySelector('.side-tools'));
          const contentWithinButtons = buttons.every(button => [...button.children].every(child => {
            const a = rect(button), b = rect(child);
            return b.x >= a.x && b.right <= a.right + .5 && b.y >= a.y && b.bottom <= a.bottom + .5;
          }));
          return {
            phone, speech, navigation, figure, fontSizes, clipped,
            noOverflow: document.documentElement.scrollWidth <= innerWidth,
            controlsInside: buttons.every(b => inScene(rect(b))),
            touchSize: buttons.filter(b => !b.matches('.text-button')).every(b => {const r=rect(b);return r.width>=44&&r.height>=44;}),
            contentWithinButtons,
            noPanelOverlap: speech.bottom + 12 <= navigation.y && top.bottom + 10 <= tools.y,
            figureVisible: figure.y >= top.bottom && figure.bottom <= speech.y + 1,
            imagesLoaded: [...scene.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0),
            defaultBalance: scene.querySelector('.counter b').textContent,
            storageEntries: localStorage.length + sessionStorage.length,
          };
        });
        const prefix = `${width}×${height} ${state}`;
        metrics.push({width, height, state, ...result});
        check(prefix + '：无横向溢出', result.noOverflow);
        check(prefix + '：所有操作位于画布内', result.controlsInside);
        check(prefix + '：主要按钮可点击面积至少 44×44', result.touchSize);
        check(prefix + '：按钮图文未越过容器', result.contentWithinButtons);
        check(prefix + '：文字无裁切且至少 12px', !result.clipped.length && result.fontSizes.every(f => f.size >= 12));
        check(prefix + '：对话、导航和顶部入口无重叠', result.noPanelOverlap);
        check(prefix + '：人物完整位于对话框上方', result.figureVisible);
        check(prefix + '：人物图片加载成功', result.imagesLoaded);
        check(prefix + '：示例余额与原状态一致', result.defaultBalance === (state === 'first-visit' ? '0' : '3'));
        check(prefix + '：未写入业务存储', result.storageEntries === 0);
        if (width > 700) check(prefix + '：桌面按 390px 原尺寸阅读', Math.abs(result.phone.width - 390) < .5);
        await q.screenshot({path: `${output}/${width}-${height}-${state}.png`, fullPage: true});
      }
    }

    await q.setViewportSize({width:390,height:844});
    const routes = [
      ['.identity-pill', 'account'], ['.counter', 'wallet'],
      ['.side-tools [data-go="wardrobe"]', 'wardrobe'],
      ['.side-tools [data-go="collection"]', 'collection'],
      ['.side-tools [data-go="checkin"]', 'checkin'],
      ['.speech-paper [data-go="scene"]', 'scene'],
      ['.game-nav [data-go="partner"]', 'partner'],
      ['.game-nav [data-go="explore"]', 'explore'],
      ['.game-nav [data-go="memories"]', 'memories'],
    ];
    for (const [selector, expected] of routes) {
      await navigate();
      await q.locator(selector).click();
      await q.waitForFunction(id => document.querySelector('#screen').dataset.page === id, expected);
      check(selector + '：保留原目标 ' + expected, true);
    }
    await navigate();
    const before = await q.locator('#companion-line').innerText();
    await q.locator('.character-touch').click();
    check('点伙伴仍显示原有回应', (await q.locator('#companion-line').innerText()) !== before);
    await q.locator('.side-tools [data-go="wardrobe"]').click();
    await q.locator('[data-action="save-look"]').click();
    await q.waitForFunction(() => document.querySelector('#screen').dataset.page === 'partner');
    check('从首页进入衣橱保存仍返回伙伴', true);
    await navigate('first-visit');
    await q.locator('.speech-paper [data-go="scene"]').click();
    await q.waitForFunction(() => document.querySelector('#screen').dataset.page === 'scene');
    check('尚未到访仍可从原入口查看景区见面礼', true);

    await navigate();
    await q.locator('.identity-pill').focus();
    await q.keyboard.press('Enter');
    await q.waitForFunction(() => document.querySelector('#screen').dataset.page === 'account');
    check('键盘仍可进入身份页', true);
    await navigate();
    const contrast = await q.evaluate(() => {
      const luminance = channels => {
        const c = channels.map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
        return .2126*c[0]+.7152*c[1]+.0722*c[2];
      };
      const ratio = (a,b) => {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      const rgb = value => value.match(/[\d.]+/g).map(Number);
      // 对浅色半透明底板，按背后全黑计算保守下限；读取实际渲染样式。
      const measure = (textSelector, panelSelector) => {
        const text = getComputedStyle(document.querySelector(textSelector)).color;
        const background = getComputedStyle(document.querySelector(panelSelector)).backgroundImage;
        const stops = background.match(/rgba?\([^)]+\)/g).map(rgb);
        return Math.min(...stops.map(stop => ratio(rgb(text), stop.slice(0,3).map(v => v * (stop[3] ?? 1)))));
      };
      return {
        body:measure('.speech-paper p','.speech-paper'),
        secondary:measure('.identity-pill small','.identity-pill'),
        selected:measure('.game-nav .selected','.game-nav .selected'),
      };
    });
    check('正文、辅助文字和选中导航对比度均达到 4.5:1', Object.values(contrast).every(v => v >= 4.5), JSON.stringify(contrast));
    check('无脚本、控制台或资源错误', errors.length === 0, errors.join('\n'));
  } catch (e) {
    checks.push({name:'验收中断：'+e.message, pass:false});
    await q.screenshot({path:`${output}/failure.png`,fullPage:true});
  } finally {
    await page.evaluate(result => window.hxxPartnerQA = result, {
      at:new Date().toISOString(), checks, errors, metrics,
      passed:checks.filter(c => c.pass).length, failed:checks.filter(c => !c.pass).length,
    });
    await context.close();
  }
}
