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
const guidePoint = id => page.locator(`.level-marker[data-guide-point="${id}"]`);
const guideDialog = page.locator('#guide-point-dialog[open]');
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
    const before = await account();
    await guidePoint(pointId).click();
    await guideDialog.getByRole('heading', {name: point.name, exact: true}).waitFor();
    assert.deepEqual(await account(), before, '打开景点详情只读进度');
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
  assert.equal(await page.locator('#guide-collection-count').innerText(), '0/2 套');
  assert.equal(await page.locator('.chapter-map .reward-counts').innerText(), '表情 1 · 动作 1 · 背景 2');
  assert.equal(await page.locator('.chapter-map .nav-tab[aria-current=page]').innerText(), '游玩');
  const mapUrl = page.url();
  await guidePoint('gate').click();
  await guideDialog.getByRole('heading', {name: '山门入口'}).waitFor();
  assert.ok((await guideDialog.innerText()).includes('山门入口或望山台首次有效到访后解锁'));
  assert.equal(await guideDialog.locator('.guide-pool-action').count(), 0);
  await page.reload();
  await guideDialog.waitFor();
  await guideDialog.getByRole('button', {name: '关闭详情'}).click();
  await page.waitForURL(mapUrl);
  await page.waitForFunction(() => document.activeElement.dataset.guidePoint === 'gate');
  await guidePoint('ridge').click();
  await guideDialog.waitFor();
  await page.goBack();
  await guideDialog.waitFor({state: 'hidden'});
  await page.waitForFunction(() => document.activeElement.dataset.guidePoint === 'ridge');
  await caption('全部奖励');
  await page.locator('#guide-reward-list').waitFor();
  assert.equal(await page.locator('#guide-reward-list a').count(), 2);
  await page.keyboard.press('Escape');
  await page.locator('#guide-reward-list').waitFor({state: 'hidden'});
  await act('places');
  await act('mapFilter', '商家');
  assert.equal(await sheet.locator('.guide-place-list a').count(), 1);
  await act('mapFilter', '活动');
  assert.equal(await sheet.locator('.guide-place-list a').innerText(), '一枚旅行手作');
  await act('mapFilter', '全部');
  await screenshot('places');
  await close();
  pass('导览点位、直达刷新、回焦、玩法入口及共享奖品去重');
  await next('初见礼');
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
  await page.locator('.back').click();
  await guideDialog.getByRole('heading', {name: '山门入口'}).waitFor();
  assert.equal(await guideDialog.locator('.point-visit').innerText(), '已打卡');
  assert.equal(await guideDialog.locator('.point-pool-status').innerText(), '已解锁');
  await guideDialog.getByRole('link', {name: '进入云山卡池'}).click();
  await at('pool');
  pass('核验与抽取返回原景点，已打卡和已解锁从存档刷新');
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
  await go('scene');
  assert.equal(await page.locator('#guide-collection-count').innerText(), '1/2 套');
  await guidePoint('brook').click();
  await guideDialog.waitFor();
  for (const id of ['joy', 'wave']) assert.equal(await guideDialog.locator(`[data-guide-prize="${id}"]`).getAttribute('data-collected'), 'true');
  await guideDialog.getByRole('button', {name: '关闭详情'}).click();
  await guideDialog.waitFor({state: 'hidden'});
  pass('整套收集进度及另一卡池的共有奖品实时刷新');
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
  assert.ok(await page.locator('.reading .day').count() >= 2);
  const repeatPhotos = await page.locator('.experience').filter({hasText:'山门入口'}).locator('img').evaluateAll(images => images.map(image => image.src));
  assert.ok(repeatPhotos.length >= 2 && new Set(repeatPhotos).size === 1);
  assert.ok(await page.locator('.experience').filter({hasText:'山间手作铺'}).locator('.stamp.shop').isVisible());
  assert.ok(await page.locator('.experience').filter({hasText:'一枚旅行手作'}).locator('.stamp.craft').isVisible());
  await act('journalFilter');
  await act('journalRangeMode','custom');
  await sheet.getByLabel('起始日期').fill('2099-11-20');
  await sheet.getByLabel('截至日期').fill('2099-11-18');
  await caption('查看足迹');
  await sheet.getByRole('alert').waitFor();
  await sheet.getByLabel('截至日期').fill('2099-11-20');
  await caption('查看足迹');
  await note('这段日期没有足迹');
  await screenshot('memories-filter-empty');
  await act('clearRange');
  const reading = page.locator('.reading');
  await reading.evaluate(element => {element.scrollTop = element.scrollHeight;});
  const eventRow = page.locator('.experience').last();
  await eventRow.scrollIntoViewIfNeeded();
  const journalOffset = await reading.evaluate(element => element.scrollTop);
  await eventRow.click();
  await close();
  assert.equal(await reading.evaluate(element => element.scrollTop), journalOffset);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'event');
  pass('手账日期选择、逆序校验、筛选空态和清除；到店和手作用不同印签，同地点图一致，详情关闭恢复滚动及焦点');
  await page.locator('.experience').first().click();
  await screenshot('event');
  await next('用这段经历做纪念');
  await at('compose');
  await page.locator('[data-model="compose.title"]').fill('山间的两日');
  await act('template', 'trail');
  const extraVisit = (await account()).events.find(event => event.pointId === 'gate').id;
  await page.locator('.visit-option input[value="' + extraVisit + '"]').check();
  assert.equal(await page.locator('.visit-option input:checked').count(), 2);
  await screenshot('compose', {fullPage: true});
  const originalComposeUrl = page.url();
  await next('调整搭配');
  const restored = await account();
  const nextTop = restored.owned.find(id => id.endsWith('-top') && id !== restored.look.top);
  await act('slot', 'top');
  await act('open-grid');
  await sheet.locator(`.grid-detail[data-id="${nextTop}"]`).click();
  await screenshot('wardrobe-full-detail');
  await act('return-grid');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), nextTop);
  await sheet.locator(`.grid-choice[data-id="${nextTop}"]`).click();
  assert.equal(await page.evaluate(() => document.activeElement.dataset.value), nextTop);
  assert.equal((await account()).look.top, restored.look.top);
  const wardrobeUrl = page.url();
  await next('套装图鉴');
  await at('collection');
  await next('返回');
  await at('wardrobe');
  assert.equal(page.url(), wardrobeUrl);
  assert.equal(await page.locator(`.hanger[data-value="${nextTop}"]`).getAttribute('aria-pressed'), 'true');
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await at('wardrobe');
  assert.equal(await page.locator('[data-value="' + nextTop + '"]').getAttribute('aria-pressed'), 'true');
  await act('slot', 'background');
  await act('equip', 'paper');
  await next('返回');
  await screenshot('wardrobe-dirty');
  await caption('继续试穿');
  await setFault('saveLook', 'reject');
  await act('saveLook');
  await alert();
  assert.equal((await account()).look.top, restored.look.top);
  await act('saveLook');
  await at('compose');
  assert.equal((await account()).look.top, nextTop);
  assert.equal(page.url(), originalComposeUrl);
  assert.equal(await page.locator('[data-model="compose.title"]').inputValue(), '山间的两日');
  assert.equal(await page.locator('.visit-option input:checked').count(), 2);
  assert.equal(await page.locator('[data-action="template"][aria-pressed="true"]').getAttribute('data-value'), 'trail');
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
  await page.evaluate(async image => {
    const bytes = Uint8Array.from(atob(image.split(',')[1]), value => value.charCodeAt(0));
    const decoded = await createImageBitmap(new Blob([bytes], {type:'image/png'}));
    if (!decoded.width || !decoded.height) throw new Error('导出图片无法打开');
    decoded.close();
  }, 'data:image/png;base64,' + png.toString('base64'));
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
  await act('journalWork', print.id);
  assert.equal(await sheet.locator('.full-print').getAttribute('src'), print.image);
  await screenshot('journal-work-preview');
  await close();
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

  await next('回忆');
  await act('memoryTab','events');
  await page.locator('.experience').first().click();
  await next('用这段经历做纪念');
  await at('compose');
  await page.locator('[data-model="compose.title"]').fill('晓西的一段旅程');
  await act('template','single');
  await act('renderPrint');
  await at('preview');
  await act('saveWork');
  await at('work');
  const single = (await account()).works.find(work => work.title === '晓西的一段旅程');
  assert.ok(single);
  assert.equal(single.template, 'single');
  assert.equal(single.snapshots.length, 1);
  assert.equal((await account()).works.find(work => work.id === print.id).image, print.image);
  const singleEvent = page.waitForEvent('download');
  await next('保存到设备');
  const singleDownload = await singleEvent;
  const singlePath = path.join(out,'travel-single.png');
  await singleDownload.saveAs(singlePath);
  const singlePng = await readFile(singlePath);
  assert.deepEqual(singlePng, Buffer.from(single.image.split(',')[1], 'base64'));
  await page.evaluate(async data => {
    const image = new Image();
    image.src = data;
    await image.decode();
  }, 'data:image/png;base64,' + singlePng.toString('base64'));
  await next('返回');
  assert.equal(await page.locator('.work-photo').count(), 2);
  assert.equal(await page.locator('.work-photo.long').count(), 1);
  await screenshot('journal-both-prints');
  await next('伙伴');
  pass('单页与长图分别生成、保存和实际打开 PNG，作品册保留两种比例，旧长图字节固定');

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
  assert.equal((await account()).works.find(work => work.id === print.id).image, print.image);
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
        const actor = await page.locator('.doll img').boundingBox();
        const stage = await page.locator('.room').boundingBox();
        const categories = await page.locator('.slots').boundingBox();
        assert.ok(actor && stage && actor.y >= stage.y && actor.y + actor.height <= stage.y + stage.height);
        assert.ok(categories && categories.y + categories.height <= rect.y, '衣橱的部件分类被保存区遮住');
      }
      if (name === 'scene') {
        const pinsReachable = await page.locator('.level-marker').evaluateAll(pins => pins.length === 4 && pins.every(pin => {
          const bounds = pin.firstElementChild.getBoundingClientRect();
          return pin.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
        }));
        assert.ok(pinsReachable, '地图点位被遮挡');
        await guidePoint('shop').click();
        await guideDialog.waitFor();
        const rect = await guideDialog.boundingBox();
        assert.ok(rect.y >= 0 && rect.y + rect.height <= height && Math.abs(rect.y + rect.height / 2 - height / 2) <= 1, '点位详情未在视口居中');
        await screenshot('scene-point');
        await page.keyboard.press('Escape');
        await guideDialog.waitFor({state: 'hidden'});
      }
      if (['memories', 'compose', 'wallet'].includes(name)) {
        if (name === 'memories') await page.locator('.reading').evaluate(element => {element.scrollTop = element.scrollHeight;});
        else await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await screenshot(name + '-bottom');
      }
    }
    pass('适配设计视口', {width, height});
  }

  await page.setViewportSize({width: 360, height: 640});
  await go('wardrobe');
  await page.evaluate(() => document.documentElement.style.setProperty('--safe', '30px'));
  const bottom = await page.locator('.desk').boundingBox();
  const action = await page.locator('[data-action="saveLook"]').boundingBox();
  assert.ok(bottom.y + bottom.height - action.y - action.height >= 30);
  await screenshot('wardrobe-safe-area');
  pass('360×640 另模拟 30px 底部安全区');
  await page.evaluate(() => document.documentElement.style.removeProperty('--safe'));

  const storageValue = await page.evaluate(key => localStorage.getItem(key), progressKey);
  for (const [width, height, safe] of [[360, 640, 30], [390, 844, 0], [430, 932, 0]]) {
    const mobile = await browser.newContext({viewport: {width, height}, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
    await mobile.addInitScript(({key, value}) => localStorage.setItem(key, value), {key: progressKey, value: storageValue});
    const screen = await mobile.newPage();
    await screen.goto(base + href('scene', {from: '#explore'}));
    await screen.locator('.chapter-map').waitFor();
    await screen.evaluate(inset => document.documentElement.style.setProperty('--safe', inset + 'px'), safe);
    const layout = await screen.locator('.chapter-map').evaluate(map => {
      const rect = selector => map.querySelector(selector).getBoundingClientRect();
      const frame = map.getBoundingClientRect();
      const dock = rect('.guide-dock');
      const nav = rect('.main-nav');
      const heading = rect('.chapter-head');
      return {
        layers: dock.bottom <= nav.top && dock.top < frame.bottom && nav.bottom <= frame.bottom,
        stamps: rect('.suit-progress .suit-stamp').height >= 18,
        points: [...map.querySelectorAll('[data-guide-point]')].map(marker => {
          const hit = marker.getBoundingClientRect();
          const parts = [...marker.querySelectorAll('.map-prop, .trail-name, .reward-ticket, .marker-suits, .shop-visit-stamp')].filter(part => part.getClientRects().length);
          return [marker.dataset.guidePoint, hit.width >= 44 && hit.height >= 44 && parts.every(part => {
            const bounds = part.getBoundingClientRect();
            return bounds.top >= heading.bottom && bounds.bottom <= dock.top && bounds.left >= frame.left && bounds.right <= frame.right;
          })];
        }),
      };
    });
    assert.ok(layout.layers && layout.stamps && layout.points.length === 4 && layout.points.every(([, valid]) => valid), JSON.stringify({width, height, safe, layout}));
    const modal = screen.locator('#guide-point-dialog[open]');
    for (const point of catalog.points) {
      const marker = screen.locator(`[data-guide-point="${point.id}"]`);
      await marker.locator('.trail-name').tap();
      await modal.getByRole('heading', {name: point.name, exact: true}).waitFor();
      const rect = await modal.boundingBox();
      assert.ok(Math.abs(rect.y + rect.height / 2 - (height - safe) / 2) <= 1);
      assert.equal(await modal.locator('.point-pool').count(), point.pools.length);
      await modal.getByRole('button', {name: '关闭详情'}).tap();
      await modal.waitFor({state: 'hidden'});
      await screen.waitForFunction(id => document.activeElement.dataset.guidePoint === id, point.id);
    }
    if (safe) {
      await screen.screenshot({path: path.join(out, '360x640', 'scene-touch-safe.png'), animations: 'disabled'});
      await screen.locator('[data-guide-point="shop"] .map-prop').tap();
      await modal.waitFor();
      await screen.setViewportSize({width: 360, height: 400});
      const body = modal.locator('.point-dialog-scroll');
      assert.ok(await body.evaluate(element => element.scrollHeight > element.clientHeight));
      const bounds = await body.boundingBox();
      const touch = await mobile.newCDPSession(screen);
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height - 14;
      const scrollBefore = await screen.evaluate(() => scrollY);
      for (let swipe = 0; swipe < 3; swipe++) {
        await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
        for (let step = 1; step <= 5; step++) {
          await touch.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y: y - step * 30}]});
        }
        await touch.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      }
      await touch.detach();
      await screen.waitForFunction(() => {
        const content = document.querySelector('.point-dialog-scroll');
        return Math.abs(content.scrollHeight - content.clientHeight - content.scrollTop) < 2;
      });
      assert.equal(await screen.evaluate(() => scrollY), scrollBefore);
      const closeButton = await modal.getByRole('button', {name: '关闭详情'}).boundingBox();
      const checkin = await modal.getByRole('link', {name: '记录到店'}).boundingBox();
      const activityEntry = await modal.getByRole('link', {name: '一枚旅行手作'}).boundingBox();
      assert.ok(closeButton.y >= 0 && activityEntry.y + activityEntry.height <= checkin.y && checkin.y + checkin.height <= 400 - safe);
      await screen.screenshot({path: path.join(out, '360x640', 'scene-touch-compact.png'), animations: 'disabled'});
    }
    await mobile.close();
    pass('景区导览触屏打开、关闭回焦与地图图形', {width, height, safe});
  }

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
