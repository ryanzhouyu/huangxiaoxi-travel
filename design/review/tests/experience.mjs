import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {catalog, deskKey, progressKey, reviewCode, reviewNumbers} from '../review-service.mjs';
import {href} from '../ui.mjs';

const {chromium} = createRequire(import.meta.url)(process.env.HXX_PLAYWRIGHT || 'playwright');
const out = path.resolve(process.env.HXX_REVIEW_OUT || '.codex/frontend-review/after');
const base = process.env.HXX_REVIEW_URL || 'http://127.0.0.1:8782/design/review/index.html';
const browser = await chromium.launch({channel: 'chrome'});
const session = await browser.newContext({viewport: {width: 390, height: 844}, timezoneId: 'Asia/Shanghai', reducedMotion: 'reduce'});
const page = await session.newPage();
page.setDefaultTimeout(9000);
const checks = [];
const shots = [];
const errorLog = [];
page.on('pageerror', error => errorLog.push(error.message));
page.on('response', response => {
  if (response.status() >= 400) errorLog.push(response.status() + ' ' + response.url());
});

const at = name => page.locator('#app[data-page="' + name + '"]').waitFor();
const act = (name, value) => page.locator('[data-action="' + name + '"]' + (value === undefined ? '' : '[data-value="' + value + '"]')).click();
const caption = name => page.getByRole('button', {name, exact: true}).click();
const next = name => page.getByRole('link', {name, exact: true}).click();
const sheet = page.locator('#sheet');
const note = name => page.getByRole('heading', {name, exact: true}).waitFor({state: 'visible'});
const close = () => sheet.getByRole('button', {name: '关闭'}).click();
const account = () => page.evaluate(key => {
  const db = JSON.parse(localStorage.getItem(key));
  return db.accounts[db.current];
}, progressKey);
const pass = (label, details = {}) => checks.push({label, ...details});

async function go(name, fields, reload = false) {
  const target = base + href(name, fields);
  if (reload) {
    if (page.url() === target) await page.reload();
    else await page.goto(target);
  } else await page.evaluate(target => {location.hash = target;}, href(name, fields));
  await at(name);
}

async function visibleImages() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode()));
  });
}

async function screenshot(name, {fullPage = false} = {}) {
  await visibleImages();
  const {width, height} = page.viewportSize();
  const folder = path.join(out, width + 'x' + height);
  await mkdir(folder, {recursive: true});
  const metrics = await page.evaluate(() => ({
    width: innerWidth, content: document.documentElement.scrollWidth,
    brokenImages: [...document.images].filter(image => image.getClientRects().length && !image.naturalWidth).length,
  }));
  assert.ok(metrics.content <= metrics.width && !metrics.brokenImages, JSON.stringify({name, ...metrics}));
  await page.screenshot({path: path.join(folder, name + '.png'), fullPage, animations: 'disabled', style: '#toast{visibility:hidden!important}'});
  shots.push({name, width, height, fullPage});
}

const setFault = (action, fault) => page.evaluate(({key, action, fault}) => sessionStorage.setItem(key, JSON.stringify({action, fault})), {key: deskKey, action, fault});
const proof = () => page.locator('[name="proof"]');
const alert = () => page.getByRole('alert').waitFor({state: 'visible'});

async function enter(number, checkCode = false) {
  await at('entry');
  await page.getByLabel('手机号', {exact: true}).fill(number);
  await page.getByLabel('我同意本机评审说明').check();
  await caption('获取验证码');
  await at('code');
  if (checkCode) {
    await screenshot('code');
    await page.locator('[name="code"]').fill('000000');
    await caption('验证并进入');
    await alert();
    await screenshot('code-error');
  }
  await page.locator('[name="code"]').fill(reviewCode);
  await caption('验证并进入');
}

async function visit(pointId, expectedBalance, {testBad = false, capture = '', fromMap = false} = {}) {
  const point = catalog.points.find(item => item.id === pointId);
  if (fromMap) {
    await page.locator('.map-pin').filter({hasText: point.name}).click();
    await at('point');
    await screenshot('point-' + pointId);
    await next(point.kind === '商家' ? '记录到店' : '记录到访');
  } else await go('checkin', {id: pointId, from: '#scene'});
  if (testBad) {
    await proof().fill('INVALID');
    await caption('确认并记录到访');
    await alert();
    assert.equal((await account()).events.length, 0);
    await screenshot('checkin-error');
  }
  await proof().fill(point.code);
  if (capture === 'first') await screenshot('checkin');
  await caption('确认并记录到访');
  await note('足迹已写进手账');
  const saved = await account();
  assert.equal(saved.balance, expectedBalance);
  assert.equal(saved.events.at(-1).pointId, pointId);
  if (capture) await screenshot('receipt-' + capture);
  pass('到访 ' + pointId, {balance: saved.balance, reward: saved.events.at(-1).reward});
}

async function draw(expectedBalance, flags = {}) {
  const before = await account();
  if (flags.fault) await setFault('draw', flags.fault);
  await page.getByRole('button', {name: '抽取一次 · 消耗 1 次'}).click();
  if (flags.fault === 'unknown') {
    await page.getByRole('button', {name: '查询这次结果'}).waitFor();
    await screenshot('draw-unknown');
    await page.reload();
    await caption('查询这次结果');
  }
  if (flags.fault === 'reject') {
    await alert();
    assert.equal((await account()).balance, before.balance);
    return;
  }
  await note('旅途收获');
  const after = await account();
  const prize = after.draws[0];
  assert.equal(after.balance, expectedBalance);
  assert.ok(!before.owned.includes(prize.assetId) && after.owned.includes(prize.assetId));
  if (flags.shot) await screenshot('draw-result');
  pass('抽取 ' + prize.poolId, {item: prize.assetId, balance: after.balance});
  return prize.assetId;
}

try {
  await mkdir(out, {recursive: true});
  await page.goto(base);
  await at('entry');
  assert.equal(await page.locator('.main-nav').count(), 0);
  await screenshot('entry');
  await act('terms');
  await screenshot('entry-terms');
  await close();
  await enter(reviewNumbers[0], true);
  await at('onboarding');
  assert.equal(await page.locator('.main-nav').count(), 0);
  await act('starter', 'start-c');
  await screenshot('onboarding');
  await act('initialize');
  await at('partner');
  assert.equal((await account()).look.top, 'start-c-top');
  assert.equal((await account()).owned.filter(item => item.startsWith('start-')).length, 12);
  await screenshot('partner');
  await caption('和黄晓西打招呼');
  await act('openPoses');
  await close();
  await next('回忆');
  await screenshot('memories-empty');
  await act('memoryTab', 'works');
  await screenshot('works-empty');
  await act('memoryTab', 'events');
  await next('游玩');
  await screenshot('explore');
  await next('打开游玩地图');
  await screenshot('scene');
  await act('mapFilter', '商家');
  assert.equal(await page.locator('.map-pin').count(), 1);
  await act('places');
  await screenshot('places');
  await close();
  await act('mapFilter', '全部');
  await page.locator('.gift-row').click();
  await screenshot('gift');
  await act('gift');
  await note('见面礼已收好');
  await screenshot('gift-result');
  const gifted = await account();
  assert.equal(gifted.look.top, 'start-c-top');
  assert.equal(gifted.events.length, 0);
  assert.ok(gifted.owned.includes('gift-top'));
  await next('立即试穿');
  await screenshot('wardrobe');
  await act('saveLook');
  await at('gift');
  assert.equal((await account()).look.top, 'gift-top');
  await page.locator('.back').click();
  await go('pool', {id: 'cloud', from: '#scene'});
  await screenshot('pool-locked');
  await act('unlockPlaces');
  await go('scene');
  await visit('gate', 2, {testBad: true, capture: 'first', fromMap: true});
  await next('已解锁 · 云山卡池');
  await at('pool');
  await screenshot('pool-ready');
  await act('source', 'mountain-top');
  await screenshot('source');
  await close();
  await draw(2, {fault: 'reject'});
  const firstPrize = await draw(1, {fault: 'unknown', shot: true});
  await next('去衣橱看看');
  await at('wardrobe');
  await act('saveLook');
  await at('pool');
  assert.ok(Object.values((await account()).look).includes(firstPrize));
  await draw(0);
  await close();
  await screenshot('pool-empty-balance');
  await next('看看免费机会');
  await screenshot('opportunities');
  assert.ok(!(await page.locator('#app').innerText()).includes('山门入口'));
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await visit('gate', 0, {capture: 'repeat'});
  await close();
  await page.clock.fastForward(24 * 60 * 60_000);
  await go('scene');
  await visit('ridge', 2, {fromMap: true});
  await close();
  await go('scene');
  await visit('shop', 3, {fromMap: true});
  await close();
  await go('activity', {from: href('point', {id: 'shop'})});
  await screenshot('activity');
  await proof().fill('INVALID');
  await caption('提交店员凭证');
  await alert();
  assert.equal((await account()).balance, 3);
  await proof().fill('HXX-CRAFT-REVIEW');
  await caption('提交店员凭证');
  await note('足迹已写进手账');
  assert.equal((await account()).balance, 5);
  await close();
  await screenshot('activity-done');
  await go('scene');
  await visit('brook', 7, {fromMap: true});
  await close();
  await go('pool', {id: 'cloud', from: '#scene'});
  for (let balance = 6; balance >= 2; balance--) {
    await draw(balance);
    await close();
  }
  await screenshot('pool-complete', {fullPage: true});
  assert.equal(await page.locator('[data-action="draw"]').count(), 0);
  assert.equal((await account()).balance, 2);
  await go('pool', {id: 'bloom', from: '#scene'});
  assert.equal(await page.locator('progress').getAttribute('value'), '2');
  await draw(1);
  await close();
  await draw(0);
  await close();
  await next('看看免费机会');
  await screenshot('opportunities-exhausted');
  await note('已领完当前的免费次数');
  await go('collection', {from: '#partner'});
  await screenshot('collection', {fullPage: true});
  await go('outfit', {id: 'mountain', from: '#collection'});
  await screenshot('outfit');
  await go('memories');
  await screenshot('memories', {fullPage: true});
  assert.ok(await page.locator('.journal-day').count() >= 2);
  await page.locator('.journal-entry').first().click();
  await screenshot('event');
  await next('用这一段经历制作');
  await at('compose');
  await page.locator('[data-model="compose.title"]').fill('山间的两日');
  await act('template', 'trail');
  const extraVisit = (await account()).events.find(event => event.pointId === 'gate').id;
  await page.locator('.visit-option input[value="' + extraVisit + '"]').check();
  assert.equal(await page.locator('.visit-option input:checked').count(), 2);
  await screenshot('compose', {fullPage: true});
  await next('调整搭配');
  const restored = await account();
  const nextTop = restored.owned.find(id => id.endsWith('-top') && id !== restored.look.top);
  await act('slot', 'top');
  await act('equip', nextTop);
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await at('wardrobe');
  assert.equal(await page.locator('[data-value="' + nextTop + '"]').getAttribute('aria-pressed'), 'true');
  await act('slot', 'background');
  await act('equip', 'paper');
  await next('取消并返回');
  await screenshot('wardrobe-dirty');
  await caption('继续试穿');
  await setFault('saveLook', 'reject');
  await act('saveLook');
  await alert();
  assert.equal((await account()).look.top, restored.look.top);
  await act('saveLook');
  await at('compose');
  assert.equal((await account()).look.top, nextTop);
  assert.equal(await page.locator('[data-model="compose.title"]').inputValue(), '山间的两日');
  assert.equal(await page.locator('.visit-option input:checked').count(), 2);
  await setFault('renderPrint', 'reject');
  await act('renderPrint');
  await alert();
  await screenshot('compose-error', {fullPage: true});
  await act('renderPrint');
  await at('preview');
  await screenshot('preview');
  await next('返回编辑');
  await page.locator('[data-model="compose.title"]').fill('黔山两日记');
  await act('renderPrint');
  await at('preview');
  const finalImage = await page.locator('.print-object img').getAttribute('src');
  await act('saveWork');
  await at('work');
  await screenshot('work');
  const print = (await account()).works[0];
  assert.equal(print.title, '黔山两日记');
  assert.equal(print.image, finalImage);
  assert.equal(print.snapshots.length, 2);
  assert.equal(new Set(print.snapshots.map(event => event.at.slice(0, 10))).size, 2);
  const fileEvent = page.waitForEvent('download');
  await next('保存到设备');
  const download = await fileEvent;
  const pngPath = path.join(out, 'travel-keepsake.png');
  await download.saveAs(pngPath);
  const png = await readFile(pngPath);
  assert.deepEqual(png, Buffer.from(finalImage.split(',')[1], 'base64'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  pass('导出真实 PNG，与预览和入库图片逐字节相同', {width: png.readUInt32BE(16), height: png.readUInt32BE(20)});
  await act('zoom');
  await screenshot('work-zoom');
  await close();
  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', {configurable: true, value: () => false}));
  await act('share');
  await note('保存后分享');
  await screenshot('share');
  await close();
  await next('返回');
  await screenshot('works');
  await go('account');
  await screenshot('account');
  await next('次数与收支');
  await screenshot('wallet', {fullPage: true});
  await page.locator('.ledger-row').first().click();
  await screenshot('ledger');
  await close();
  await go('wardrobe', {from: '#partner'});
  await act('slot', 'top');
  await act('equip', restored.look.top);
  await act('saveLook');
  await at('partner');
  assert.equal((await account()).works[0].image, print.image);
  await page.reload();
  await at('partner');
  assert.equal((await account()).works[0].image, print.image);
  pass('保存新搭配和刷新后，历史作品图片保持原值');

  const originalTop = (await account()).look.top;
  const alternatives = catalog.assets.filter(item => item.slot === 'top' && item.id !== originalTop);
  const owned = (await account()).owned;
  const [localItem, remoteItem] = alternatives.filter(item => owned.includes(item.id));
  await next('衣橱');
  await act('equip', localItem.id);
  await page.goBack();
  await note('这身试穿还没保存');
  await caption('继续试穿');
  await page.waitForURL(/#wardrobe(?:\?|$)/);
  assert.equal(await page.locator('[data-action="equip"][data-value="' + localItem.id + '"]').getAttribute('aria-pressed'), 'true');

  const second = await session.newPage();
  await second.goto(base + href('wardrobe', {from: '#partner'}));
  await second.locator('[data-action="equip"][data-value="' + remoteItem.id + '"]').click();
  await second.locator('[data-action="saveLook"]').click();
  await second.locator('#app[data-page="partner"]').waitFor();
  await act('saveLook');
  await alert();
  assert.equal((await account()).look.top, remoteItem.id);
  assert.equal(await page.locator('[data-action="equip"][data-value="' + localItem.id + '"]').getAttribute('aria-pressed'), 'true');
  await screenshot('wardrobe-conflict');
  await act('saveLook');
  await at('partner');
  assert.equal((await account()).look.top, localItem.id);
  assert.equal((await account()).works[0].image, print.image);
  await second.close();
  pass('浏览器返回受草稿守卫保护，另一标签保存时保留本页试穿并提示冲突');

  await go('point', {id: 'no-such-place'});
  await screenshot('not-found');
  await note('找不到这个页面');

  for (const [width, height] of [[360, 640], [430, 932], [1440, 1000], [1280, 720]]) {
    await page.setViewportSize({width, height});
    for (const [name, fields] of [['partner'], ['scene', {from: '#explore'}], ['pool', {id: 'cloud'}], ['wardrobe'], ['memories', {view: 'events'}], ['compose'], ['work', {id: print.id}]]) {
      await go(name, fields);
      if (name === 'memories') await act('memoryTab', 'events');
      await screenshot(name);
      if (name === 'wardrobe') {
        const save = page.locator('[data-action="saveLook"]');
        const rect = await save.boundingBox();
        assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= height);
        const actor = await page.locator('.wardrobe-actor img').boundingBox();
        const stage = await page.locator('.wardrobe-stage').boundingBox();
        const categories = await page.locator('.wardrobe-cabinet .tabs').boundingBox();
        assert.ok(actor && stage && actor.y >= stage.y && actor.y + actor.height < stage.y + stage.height);
        assert.ok(categories && categories.y + categories.height <= rect.y, '衣橱的部件分类被保存区遮住');
      }
      if (name === 'scene') {
        const pinsReachable = await page.locator('.map-pin').evaluateAll(pins => pins.every(pin => {
          const bounds = pin.firstElementChild.getBoundingClientRect();
          return pin.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
        }));
        assert.ok(pinsReachable, '地图分类或地点列表盖住了点位');
      }
      if (['memories', 'compose', 'wallet'].includes(name)) {
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await screenshot(name + '-bottom');
      }
    }
    pass('适配设计视口', {width, height});
  }

  await page.setViewportSize({width: 360, height: 640});
  await go('wardrobe');
  await page.evaluate(() => document.documentElement.style.setProperty('--safe', '30px'));
  const bottom = await page.locator('.actions').boundingBox();
  const action = await page.locator('[data-action="saveLook"]').boundingBox();
  assert.ok(bottom.y + bottom.height - action.y - action.height >= 30);
  await screenshot('wardrobe-safe-area');
  pass('360×640 另模拟 30px 底部安全区');
  await page.evaluate(() => document.documentElement.style.removeProperty('--safe'));

  await go('account');
  await act('logoutAsk');
  await act('logout');
  await at('entry');
  const deepLink = base + href('checkin', {id: 'ridge', code: 'HXX-RIDGE-2026'});
  await page.goto(deepLink);
  await enter(reviewNumbers[1]);
  await at('onboarding');
  await act('initialize');
  await at('checkin');
  assert.equal(await proof().inputValue(), 'HXX-RIDGE-2026');
  assert.equal((await account()).works.length, 0);
  assert.equal((await account()).events.length, 0);
  await caption('确认并记录到访');
  await note('足迹已写进手账');
  assert.equal((await account()).events[0].pointId, 'ridge');
  pass('未登录扫码后恢复原地点和凭证，身份隔离');
  assert.deepEqual(errorLog, []);
  await writeFile(path.join(out, 'experience.json'), JSON.stringify({passed: true, checks, shots, errorLog}, null, 2) + '\n');
  console.log(`${checks.length} 个验收记录，${shots.length} 张截图，PNG 已导出。`);
} finally {
  await browser.close();
}
