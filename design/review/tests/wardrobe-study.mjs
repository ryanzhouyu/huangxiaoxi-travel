import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {makeFixture, sources} from '../wardrobe-study/fixture.mjs';

const {chromium} = createRequire(import.meta.url)(process.env.HXX_PLAYWRIGHT || 'playwright');
const origin = process.env.HXX_STUDY_ORIGIN || 'http://127.0.0.1:8782';
const atelier = process.env.HXX_STUDY_LAYOUT === 'atelier';
const out = process.env.HXX_STUDY_OUT || (atelier ? '.codex/wardrobe-layout-study' : '.codex/wardrobe-study-20261118');
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
  await page.goto(url.href);
  await (baseline ? page.locator('.wardrobe-stage').waitFor() : view(page));
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
      await capture(baseline,'prior-' + width + '-default');
      await action(baseline,'equip').filter({hasText:'黔山初见'}).click();
      await capture(baseline,'prior-' + width + '-try');
      await baseline.close();
    }
  }
  pass('五档视口核对人物不透明边界、桌沿、安全触区、横竖溢出，检查实际场景图片与同数据对照');
  const page = await open(mobile);
  const rail = page.locator('.hangers');
  assert.equal(await page.locator('.hanger').count(), 6);
  assert.equal(await page.locator('.wear-state').allTextContents().then(items => items.join('/')), '已保存穿着');
  assert.ok(await page.locator('.more-cue').isVisible());
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
  assert.equal(await equip(page,'flower-top').locator('.wear-state').innerText(), '正在试穿');
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
  await button(page,'取消并返回').click();
  await capture(page,'study-360-cancel');
  await button(page,'继续试穿').click();
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '取消并返回');
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
  await button(gift,'取消并返回').click();
  await button(gift,'放弃试穿并返回').click();
  await view(gift,'source');
  assert.equal(await hash(gift), sources.gift.hash);
  assert.equal(await look(gift), await look(gift,'data-saved'));
  assert.doesNotMatch(await look(gift), /gift-top/);
  await gift.close();
  const pool = await open(mobile,'?source=pool&item=mountain-top');
  assert.match(await look(pool), /mountain-top/);
  await button(pool,'取消并返回').click();
  await button(pool,'保存并返回').click();
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
  assert.deepEqual(errors, []);
  await writeFile(out + '/checks.json', JSON.stringify({chrome:browser.version(), checks, viewports, shots, errors}, null, 2) + '\n');
  console.log('Chrome ' + browser.version() + ' · ' + checks.length + ' 组检查 · ' + shots.length + ' 张截图。');
} finally {
  await browser.close();
}
