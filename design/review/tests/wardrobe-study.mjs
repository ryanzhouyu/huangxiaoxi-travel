import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {makeFixture, sources} from '../wardrobe-study/fixture.mjs';

const {chromium} = createRequire(import.meta.url)(process.env.HXX_PLAYWRIGHT || 'playwright');
const origin = process.env.HXX_STUDY_ORIGIN || 'http://127.0.0.1:8782';
const layout = process.env.HXX_STUDY_LAYOUT;
const gridPicker = layout === 'grid';
const detailPicker = layout === 'detail' || gridPicker;
const atelier = layout === 'atelier' || detailPicker;
const defaultOut = gridPicker ? 'wardrobe-grid-study' :
  detailPicker ? 'wardrobe-detail-study' : atelier ? 'wardrobe-layout-study' : 'wardrobe-study-20261118';
const out = process.env.HXX_STUDY_OUT || '.codex/' + defaultOut;
const browser = await chromium.launch({channel: 'chrome'});
const checks = [], viewports = [], shots = [], errors = [];
const mobile = {width: 360, height: 640};
const view = (page, name = 'wardrobe') => page.locator('#study[data-view=' + name + ']').waitFor();
const action = (page, name) => page.locator('button[data-action=' + name + ']:visible');
const button = (page, name) => page.getByRole('button', {name, exact: true});
const equip = (page, id) => page.locator('.hanger[data-id=' + id + ']');
const slot = (page, id) => page.locator('.slot[data-slot=' + id + ']').click();
const look = (page, key = 'data-look') => page.locator('#study').getAttribute(key);
const pass = label => checks.push(label);
const hash = page => page.evaluate(() => location.hash);
const leaveButton = page => detailPicker ? action(page,'leave') : button(page,'取消并返回');
const railOffset = rail => rail.evaluate((element, horizontal) =>
  horizontal ? element.scrollLeft : element.scrollTop, atelier);

async function open(viewport, query = '', baseline = false, touch = false) {
  const page = await browser.newPage({viewport, reducedMotion: 'reduce', hasTouch: touch, isMobile: touch});
  page.setDefaultTimeout(9000);
  const key = 'hxx.review.v1';
  await page.addInitScript(({key, value}) => localStorage.setItem(key, value),
    {key, value: baseline ? JSON.stringify(makeFixture()) : '隔离测试原值'});
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
  });
  const url = new URL(baseline ? 'design/review/index.html#wardrobe?from=%23partner' : 'design/review/wardrobe-study/' + query, origin);
  if (atelier && !baseline) url.searchParams.set('layout', 'atelier');
  if (detailPicker && !baseline) url.searchParams.set('picker', layout);
  await page.goto(url.href);
  await (baseline ? page.locator('#app[data-page="wardrobe"] .doll').waitFor() : view(page));
  return page;
}

async function imagesReady(page) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  try {
    await page.waitForFunction(() => document.images.length && [...document.images].every(img => img.complete && img.naturalWidth));
  } catch (error) {
    const missing = await page.evaluate(() => [...document.images].filter(img => !img.complete || !img.naturalWidth)
      .map(img => img.src.slice(0,150)));
    throw new Error(JSON.stringify({viewport:page.viewportSize(), missing, errors}), {cause:error});
  }
}

async function capture(page, id) {
  await imagesReady(page);
  await page.screenshot({path: out + '/' + id + '.png', animations:'disabled'});
  shots.push(id);
}

async function selectionVisible(page) {
  const row = await page.locator('.hanger[aria-pressed=true]').boundingBox();
  const rail = await page.locator('.hangers').boundingBox();
  assert.ok(row.y >= rail.y && row.y + row.height <= rail.y + rail.height);
  if (atelier) assert.ok(row.x >= rail.x && row.x + row.width <= rail.x + rail.width);
}

async function geometry(page, safe = 0) {
  await imagesReady(page);
  const result = await page.evaluate(() => {
    const box = selector => document.querySelector(selector)?.getBoundingClientRect();
    const image = document.querySelector('.doll img');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const frame = image.getBoundingClientRect();
    const scale = Math.min(frame.width / canvas.width, frame.height / canvas.height);
    const left = frame.left + (frame.width - canvas.width * scale) / 2;
    const top = frame.bottom - canvas.height * scale;
    const label = box('.stage-note');
    let covered = 0;
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (pixels[(y * canvas.width + x) * 4 + 3] < 24) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const dx = left + x * scale, dy = top + y * scale;
      if (dx >= label.left && dx <= label.right && dy >= label.top && dy <= label.bottom) covered++;
    }
    const actor = {left: left + minX * scale, right: left + maxX * scale,
      top: top + minY * scale, bottom: top + maxY * scale, height: (maxY - minY) * scale};
    const controls = [...document.querySelectorAll('.slots button, .desk [data-action], .top button')];
    return {
      width: innerWidth, height: innerHeight, contentWidth: document.documentElement.scrollWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight,
      actor, covered, roomBottom: box('.room').bottom,
      actorRightLimit: box('.rack')?.left ?? box('.stage').right,
      deskTop: box('.desk').top, controlBottom: box('.secondary-row, .finish').bottom,
      minHeight: Math.min(...controls.map(item => item.getBoundingClientRect().height)),
      minWidth: Math.min(...controls.map(item => item.getBoundingClientRect().width)),
      clippedText: [...controls, ...document.querySelectorAll('.hanger')].filter(item =>
        item.scrollWidth > item.clientWidth + 2 || item.scrollHeight > item.clientHeight + 2).map(item => item.innerText),
    };
  });
  const {actor} = result;
  assert.ok(actor.height >= 240 && actor.left >= 0 && actor.right < result.actorRightLimit &&
    !result.covered && actor.bottom < result.deskTop, JSON.stringify(result));
  assert.ok(result.controlBottom <= result.height - safe && result.roomBottom === result.deskTop &&
    result.minHeight >= 44 && result.minWidth >= 44 && !result.overflowY &&
    result.contentWidth === result.width && !result.clippedText.length, JSON.stringify(result));
  return result;
}

try {
  await mkdir(out, {recursive:true});
  for (const [width, height] of [[360,640], [390,844], [430,932], [1280,720], [1440,1000]]) {
    const page = await open({width,height});
    const initial = await geometry(page);
    await capture(page, 'study-' + width + '-default');
    assert.ok(await action(page,'save').isDisabled());
    await equip(page,'gift-top').click();
    await capture(page,'study-' + width + '-try');
    await slot(page,'expression');
    await equip(page,'joy').click();
    await capture(page,'study-' + width + '-expression');
    await slot(page,'pose');
    await equip(page,'wave').click();
    await capture(page,'study-' + width + '-pose');
    await slot(page,'background');
    await equip(page,'mountain-bg').click();
    assert.match(await page.locator('.room').getAttribute('style'), /cloud-pavilion\.webp/);
    await capture(page,'study-' + width + '-background');
    const mixed = await geometry(page);
    if (atelier) assert.equal(mixed.deskTop, initial.deskTop);
    viewports.push({initial, mixed});
    await page.close();
    if (width <= 390) {
      const baseline = await open({width,height}, '', true);
      await capture(baseline,'visitor-' + width + '-default');
      await action(baseline,'equip').filter({hasText:'黔山初见'}).click();
      await capture(baseline,'visitor-' + width + '-try');
      await baseline.close();
    }
  }
  pass('五档视口核对人物不透明边界、桌沿、安全触区、横竖溢出，检查实际场景图片与同数据对照');
  const page = await open(mobile);
  const rail = page.locator('.hangers');
  assert.equal(await page.locator('.hanger').count(), 6);
  if (gridPicker) {
    const saved = page.getByRole('button', {name:'溪边薄荷 已保存穿着', exact:true, pressed:true});
    assert.ok(await saved.locator('.saved-mark').isVisible());
    assert.equal((await saved.locator('img').boundingBox()).height, 84);
    assert.equal(await page.locator('.wear-state').count(), 0);
  } else {
    assert.equal(await page.locator('.wear-state').allTextContents().then(items => items.join('/')), '已保存穿着');
  }
  if (detailPicker) assert.ok(await rail.evaluate(element => element.scrollWidth > element.clientWidth));
  else assert.ok(await page.locator('.more-cue').isVisible());
  if (atelier) {
    await rail.hover();
    await page.mouse.wheel(0, 850);
    await page.waitForFunction(() => document.querySelector('.hangers').scrollLeft > 0);
  }
  await equip(page,'flower-top').click();
  if (!atelier) await page.waitForFunction(() => document.querySelector('.more-cue').hidden);
  const endScroll = await railOffset(rail);
  assert.ok(endScroll > 0);
  await selectionVisible(page);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), 'flower-top');
  if (gridPicker) {
    const trial = page.getByRole('button', {name:'花溪漫步 正在试穿', exact:true, pressed:true});
    assert.ok(await trial.isVisible());
    assert.equal(await trial.locator('.saved-mark').count(), 0);
    assert.ok(await equip(page,'start-c-top').locator('.saved-mark').isVisible());
  } else {
    assert.equal(await equip(page,'flower-top').locator('.wear-state').innerText(), '正在试穿');
  }
  assert.equal(await equip(page,'start-c-top').getAttribute('aria-pressed'), 'false');
  await capture(page,'study-360-last');
  await slot(page,'shoes');
  const beforeShoes = (await look(page)).split('/');
  await equip(page,'start-a-shoes').click();
  const afterShoes = (await look(page)).split('/');
  assert.deepEqual(afterShoes, beforeShoes.map((part,index) => index === 3 ? 'start-a-shoes' : part));
  await slot(page,'top');
  assert.equal(await railOffset(rail), endScroll);
  await action(page,'catalog').click();
  await view(page,'catalog');
  await action(page,'outfit').filter({hasText:'花溪漫步'}).click();
  assert.equal(await page.locator('#sheet small').allTextContents().then(items => items.filter(item => item === '已拥有').length), 1);
  await button(page,'关闭').click();
  await action(page,'wardrobe').click();
  assert.equal(await railOffset(rail), endScroll);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'catalog');
  assert.deepEqual((await look(page)).split('/'), afterShoes);
  pass('小屏可到第六件，完整显示选中状态；切换部位保留另一部位，图鉴返回恢复滚动、分类、焦点和试穿');
  await page.reload();
  await view(page);
  assert.deepEqual((await look(page)).split('/'), afterShoes);
  for (const [part, id, index] of [['hair','start-b-hair',0], ['bottom','gift-bottom',2]]) {
    await slot(page,part);
    const before = (await look(page)).split('/');
    await equip(page,id).click();
    assert.deepEqual((await look(page)).split('/'), before.map((value,i) => i === index ? id : value));
  }
  await slot(page,'top');
  await leaveButton(page).click();
  await capture(page,'study-360-cancel');
  await button(page,'继续试穿').click();
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'leave');
  await action(page,'reset').click();
  assert.equal(await look(page), await look(page,'data-saved'));
  assert.ok(await action(page,'save').isDisabled());
  pass('刷新恢复试穿，继续试穿恢复焦点，恢复已保存后停留衣橱并禁用保存');
  await page.close();

  const starter = await open(mobile, '?profile=starter');
  await slot(starter,'expression');
  assert.equal(await starter.locator('.hanger').count(), 1);
  await action(starter,'catalog').click();
  await action(starter,'outfit').filter({hasText:'花溪漫步'}).click();
  assert.deepEqual(await starter.locator('#sheet small').allTextContents(), Array(4).fill('未拥有'));
  pass('新游客仅显示拥有的类别选项，图鉴展开展示未拥有部件且保持只读');
  await starter.close();

  const compose = await open(mobile, '?source=compose&save=reject');
  await compose.evaluate(() => document.documentElement.style.setProperty('--safe', '30px'));
  const original = await look(compose);
  await equip(compose,'gift-top').click();
  const trial = await look(compose);
  await action(compose,'save').click();
  await compose.getByRole('alert').waitFor();
  assert.equal(await look(compose), trial);
  assert.equal(await look(compose,'data-saved'), original);
  await selectionVisible(compose);
  viewports.push({safetyBottom: 30, failedSave: await geometry(compose,30)});
  await capture(compose,'study-360-failure-safe');
  await action(compose,'save').click();
  await view(compose,'source');
  assert.equal(await hash(compose), sources.compose.hash);
  assert.equal(await look(compose,'data-saved'), trial);
  assert.deepEqual(await compose.locator('dd').allTextContents(), ['与晓西看山色','足迹长图','山门入口、望山台']);
  assert.equal(await compose.evaluate(() => localStorage.getItem('hxx.review.v1')), '隔离测试原值');
  await capture(compose,'study-360-compose');
  pass('30px 模拟底部安全区下保存失败保留草稿，重试后返回完整制作地址、标题、模板及所选经历，游客存档原值保留');
  await compose.close();

  const gift = await open(mobile,'?source=gift&item=gift-top');
  assert.match(await look(gift), /gift-top/);
  await leaveButton(gift).click();
  await button(gift,'放弃试穿并返回').click();
  await view(gift,'source');
  assert.equal(await hash(gift), sources.gift.hash);
  assert.equal(await look(gift), await look(gift,'data-saved'));
  assert.doesNotMatch(await look(gift), /gift-top/);
  await gift.close();
  const pool = await open(mobile,'?source=pool&item=mountain-top');
  assert.match(await look(pool), /mountain-top/);
  await leaveButton(pool).click();
  await pool.getByRole('dialog').getByRole('button',{name:'保存并返回',exact:true}).click();
  await view(pool,'source');
  assert.equal(await hash(pool), sources.pool.hash);
  assert.match(await look(pool,'data-saved'), /mountain-top/);
  pass('见面礼和卡池只预选已拥有部件，放弃或保存后分别回到带参数的来源');
  if (atelier) {
    const touch = await open(mobile, '', false, true);
    const touchRail = touch.locator('.hangers');
    const area = await touchRail.boundingBox();
    const session = await touch.context().newCDPSession(touch);
    const y = Math.round(area.y + area.height / 2);
    await session.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:300,y}]});
    for (const x of [270,235,200,165,130,95,60]) {
      await session.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x,y}]});
    }
    await session.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    assert.ok(await railOffset(touchRail) > 0);
    const chosen = await equip(touch,'flower-top').boundingBox();
    await touch.touchscreen.tap(chosen.x + chosen.width / 2, chosen.y + chosen.height / 2);
    assert.match(await look(touch), /flower-top/);
    await touch.close();
    pass('模拟手机触摸横滑可选末项，桌面滚轮可翻选。短列表与长列表切换时舞台高度一致');
  }
  if (detailPicker && !gridPicker) {
    const detail = await open(mobile);
    const dialog = detail.getByRole('dialog');
    const head = dialog.locator('h2');
    const rail = detail.locator('.hangers');
    const original = await look(detail);
    const preview = detail.locator('.inspection-media img');
    await action(detail,'inspect').click();
    assert.equal(await head.innerText(), '溪边薄荷·上装');
    await detail.keyboard.press('ArrowRight');
    assert.equal(await head.innerText(), '黔山初见·上装');
    assert.equal(await look(detail), original);
    assert.equal(await look(detail,'data-saved'), original);
    await capture(detail,'detail-360-clothing');
    await detail.keyboard.press('Escape');
    assert.ok(!await dialog.isVisible());
    assert.equal(await detail.evaluate(() => document.activeElement.dataset.action), 'inspect');
    await rail.evaluate(element => {element.scrollLeft=element.scrollWidth;});
    const offset = await railOffset(rail);
    assert.ok(offset > 0);
    await action(detail,'inspect').click();
    assert.equal(await head.innerText(), '黔山初见·上装');
    await button(detail,'下一件').click();
    await button(detail,'下一件').click();
    assert.ok(await button(detail,'下一件').isDisabled());
    assert.equal(await head.innerText(), '花溪漫步·上装');
    await button(detail,'关闭').click();
    assert.equal(await railOffset(rail), offset);
    assert.equal(await look(detail), original);
    await action(detail,'inspect').click();
    await button(detail,'试穿这一件').click();
    assert.match(await look(detail), /gift-top/);
    assert.equal(await look(detail,'data-saved'), original);
    await selectionVisible(detail);
    assert.equal(await detail.evaluate(() => document.activeElement.dataset.id), 'gift-top');
    await slot(detail,'background');
    const fromWorkshop = await look(detail);
    await detail.evaluate(() => document.documentElement.style.setProperty('--safe', '30px'));
    await action(detail,'inspect').click();
    await button(detail,'下一件').click();
    assert.equal(await head.innerText(), '山色留白');
    assert.match(await preview.getAttribute('src'), /cloud-pavilion\.webp$/);
    assert.equal(await preview.evaluate(image => getComputedStyle(image).objectFit), 'contain');
    assert.equal(await look(detail), fromWorkshop);
    const fullImage = await preview.boundingBox();
    const thumbnail = await equip(detail,'mountain-bg').locator('img').boundingBox();
    assert.ok(fullImage.height > thumbnail.height * 3);
    const apply = await button(detail,'预览这个背景').boundingBox();
    assert.ok(apply.y + apply.height <= 610);
    await capture(detail,'detail-360-background-safe');
    await button(detail,'预览这个背景').click();
    assert.match(await detail.locator('.room').getAttribute('style'), /cloud-pavilion\.webp/);
    assert.match(await look(detail), /mountain-bg$/);
    assert.equal(await look(detail,'data-saved'), original);
    assert.equal(await detail.evaluate(() => document.activeElement.dataset.id), 'mountain-bg');
    await detail.close();
    pass('大图从可见试穿项或第一个完整可见项进入，翻阅无写入，取消恢复焦点和横向位置，显式试穿或预览后定位到该项，背景整图及安全区可见');
  }
  if (gridPicker) {
    const stress = await open(mobile, '?profile=stress', false, true);
    const dialog = stress.getByRole('dialog');
    const list = dialog.locator('.all-parts');
    const gridChoice = id => dialog.locator('.grid-choice[data-id=' + id + ']');
    const gridDetail = id => dialog.locator('.grid-detail[data-id=' + id + ']');
    const current = await look(stress);
    const browse = () => action(stress,'open-grid').click();
    const gridOffset = () => list.evaluate(element => element.scrollTop);
    const lastId = 'sample-night-flower-top';
    assert.equal(await action(stress,'open-grid').innerText(), '全部上装 · 30 件');
    assert.equal(await stress.locator('.hanger').count(), 6);
    assert.equal(await equip(stress,lastId).count(), 0);
    await browse();
    assert.equal(await dialog.locator('h2').innerText(), '全部上装 · 30 件');
    const savedChoice = gridChoice('start-c-top');
    assert.ok(await savedChoice.locator('.saved-mark').isVisible());
    assert.equal((await savedChoice.locator('img').boundingBox()).height, 80);
    assert.equal(await dialog.locator('.grid-wear').count(), 0);
    const breadth = await list.evaluate(element => {
      const frame = element.getBoundingClientRect();
      const inside = [...element.children].filter(card => {
        const rect = card.getBoundingClientRect();
        return rect.bottom <= frame.bottom && rect.top >= frame.top;
      }).length;
      return {fullCards:inside, total:element.children.length, horizontalOverflow:element.scrollWidth - element.clientWidth};
    });
    assert.deepEqual(breadth, {fullCards:9, total:30, horizontalOverflow:0});
    viewports.push({gridWidth:360, height:640, ...breadth});
    await capture(stress,'grid-360-thirty');
    const scrollRegion = await list.boundingBox();
    const scrolling = await stress.context().newCDPSession(stress);
    const x = Math.round(scrollRegion.x + scrollRegion.width / 2);
    const startY = Math.round(scrollRegion.y + scrollRegion.height * .8);
    await scrolling.send('Input.dispatchTouchEvent',{type:'touchStart', touchPoints:[{x,y:startY}]});
    for (const distance of [25,55,85,115,145,175]) {
      await scrolling.send('Input.dispatchTouchEvent',{type:'touchMove', touchPoints:[{x,y:startY-distance}]});
    }
    await scrolling.send('Input.dispatchTouchEvent',{type:'touchEnd', touchPoints:[]});
    await stress.waitForFunction(() => document.querySelector('.all-parts').scrollTop > 0);
    await gridChoice(lastId).scrollIntoViewIfNeeded();
    const end = await gridOffset();
    assert.ok(end > 0);
    await gridDetail(lastId).click();
    assert.equal(await dialog.locator('h2').innerText(), '花溪漫步·月色');
    assert.equal(await look(stress), current);
    assert.equal(await look(stress,'data-saved'), current);
    await capture(stress,'grid-360-last-detail');
    await button(stress,'返回列表').click();
    assert.equal(await gridOffset(), end);
    assert.equal(await stress.evaluate(() => document.activeElement.dataset.id), lastId);
    await button(stress,'关闭').click();
    assert.equal(await stress.evaluate(() => document.activeElement.dataset.action), 'open-grid');
    assert.equal(await look(stress), current);
    await browse();
    assert.equal(await gridOffset(), end);
    await capture(stress,'grid-360-end-restored');
    await gridChoice(lastId).click();
    assert.ok(!await dialog.isVisible());
    assert.equal(await look(stress), current.replace('start-c-top',lastId));
    assert.equal(await look(stress,'data-saved'), current);
    assert.equal(await stress.locator('.hanger').count(), 6);
    assert.equal(await stress.evaluate(() => document.activeElement.dataset.id), lastId);
    await selectionVisible(stress);
    await capture(stress,'grid-360-try-last');
    await browse();
    assert.equal(await gridOffset(), end);
    assert.equal(await gridChoice(lastId).getAttribute('aria-pressed'), 'true');
    assert.equal(await gridChoice(lastId).locator('.saved-mark').count(), 0);
    assert.equal(await savedChoice.getAttribute('aria-pressed'), 'false');
    assert.ok(await savedChoice.locator('.saved-mark').isVisible());
    await stress.keyboard.press('Escape');
    assert.ok(!await dialog.isVisible());
    await slot(stress,'background');
    await stress.evaluate(() => document.documentElement.style.setProperty('--safe', '30px'));
    await browse();
    assert.equal(await dialog.locator('h2').innerText(), '全部背景 · 3 张');
    assert.equal(await list.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 2);
    assert.ok(await gridChoice('paper').locator('.saved-mark').isVisible());
    const lastBackground = await gridChoice('flower-bg').boundingBox();
    assert.ok(lastBackground.y + lastBackground.height <= 610);
    await capture(stress,'grid-360-background');
    await gridDetail('mountain-bg').click();
    const scene = dialog.locator('.inspection-media img');
    assert.match(await scene.getAttribute('src'), /cloud-pavilion\.webp$/);
    assert.equal(await scene.evaluate(element => getComputedStyle(element).objectFit), 'contain');
    await stress.keyboard.press('Escape');
    assert.equal(await dialog.locator('h2').innerText(), '全部背景 · 3 张');
    await gridChoice('mountain-bg').click();
    assert.match(await stress.locator('.room').getAttribute('style'), /cloud-pavilion\.webp/);
    await stress.reload();
    await view(stress);
    assert.match(await look(stress), /sample-night-flower-top\/.*\/mountain-bg$/);
    await action(stress,'save').click();
    await view(stress,'source');
    assert.match(await look(stress,'data-saved'), /sample-night-flower-top\/.*\/mountain-bg$/);
    assert.equal(await stress.evaluate(() => localStorage.getItem('hxx.review.v1')), '隔离测试原值');
    await action(stress,'wardrobe').click();
    await slot(stress,'top');
    assert.ok(await equip(stress,lastId).locator('.saved-mark').isVisible());
    assert.equal(await equip(stress,'start-c-top').locator('.saved-mark').count(), 0);
    await stress.close();
    pass('30 件上装的底栏保留六件，360×640 网格首屏显示九件；模拟触摸可纵向浏览，末项查看和退出可恢复滚动与焦点，点选只改试穿且进入快选');
    pass('背景两列及原画大图通过，模拟 30px 安全区后末项可点击；测试配色草稿刷新和显式保存通过，原游客存档原值保留');
    pass('快选与全量网格用勾标保留已保存状态，试穿描边与勾标独立，读屏名称保留状态，保存后勾标随保存项更新');
  }
  assert.deepEqual(errors, []);
  await writeFile(out + '/checks.json', JSON.stringify({chrome:browser.version(), checks, viewports, shots, errors}, null, 2) + '\n');
  console.log('Chrome ' + browser.version() + ' · ' + checks.length + ' 组检查 · ' + shots.length + ' 张截图。');
} finally {
  await browser.close();
}
