import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const base = 'http://127.0.0.1:8765/design/demo/';
const key = 'hxx.demo.v1';
const digest = (value) => createHash('sha256').update(value).digest('hex');
export async function rehearse(browser, {nativeDisplay = false} = {}) {
  const output = path.resolve(
    nativeDisplay
      ? '.codex/local-deploy/demo-run/external-display'
      : 'output/demo-rehearsal',
  );
  await mkdir(output, {recursive: true});
  const recordDir = path.resolve('.codex/local-deploy/demo-run/video');
  await mkdir(recordDir, {recursive: true});
  const runs = [],
    errors = [],
    external = [];
  const ctx = await browser.newContext({
    viewport: nativeDisplay ? null : {width: 1280, height: 720},
    recordVideo: {dir: recordDir, size: {width: 1280, height: 720}},
    acceptDownloads: true,
  });
  await ctx.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1') {
      external.push(url.hostname);
      return route.abort();
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5500);
  page.on('pageerror', (e) => errors.push(e.message));
  const marks = [];
  let readablePlayback = false;
  const dwell = async () => {
    if (readablePlayback) await page.waitForTimeout(620);
  };
  const record = (label, data) => {
    marks.push({label, ...data});
  };
  const state = () =>
    page.evaluate((k) => {
      const db = JSON.parse(localStorage.getItem(k));
      return db?.accounts[db.current];
    }, key);
  const where = () => page.locator('#app').getAttribute('data-page');
  const button = async (action, id) => {
    await dwell();
    const modal = page.locator('dialog[open]');
    const scope = (await modal.count()) ? modal : page;
    await scope
      .locator(
        '[data-action="' + action + '"]' + (id ? '[data-id="' + id + '"]' : ''),
      )
      .first()
      .click();
  };
  const target = async (value) => {
    await dwell();
    const open = page.locator('dialog[open]');
    await ((await open.count()) ? open : page)
      .locator('[data-target="' + value + '"]')
      .first()
      .click();
  };
  const at = async (name) => {
    await page.locator('#app[data-page="' + name + '"]').waitFor();
  };
  const backTo = async (name) => {
    for (let i = 0; i < 20; i++) {
      if ((await where()) === name) return;
      await button('back');
    }
    throw Error('无法返回 ' + name);
  };
  const snapshot = async (name) => {
    await page.screenshot({path: path.join(output, name + '.png')});
  };
  async function visit(id, code, expectedBalance, expectedPool) {
    await at('scene');
    await target('point?id=' + id);
    await button('open-checkin', id);
    await page.locator('#checkin-code').fill(code);
    await button('verify-code');
    const a = await state();
    assert.equal(a.events.at(-1).pointId, id);
    assert.equal(a.balance, expectedBalance);
    assert.ok(a.unlocked.includes(expectedPool));
    record('到访 ' + id, {balance: a.balance, event: a.events.at(-1).name});
    await page.waitForTimeout(420);
  }
  async function draw(pool, expectedBalance) {
    await at('pool');
    await button('draw', pool);
    await page.locator('.reward-reveal').waitFor();
    const a = await state();
    const prize = a.draws[0].assetId;
    assert.equal(a.balance, expectedBalance);
    assert.ok(a.owned.includes(prize));
    await button('try-asset', prize);
    await at('wardrobe');
    await page.waitForTimeout(350);
    await button('save-look');
    await at('pool');
    assert.ok(Object.values((await state()).look).includes(prize));
    record('抽取 ' + pool, {prize, balance: a.balance});
  }
  async function mainRun(label, capture) {
    readablePlayback = capture;
    const start = Date.now();
    await page.goto(base + 'index.html');
    await at('entry');
    await button('login', 'A');
    await at('onboarding');
    await button('starter', 'start-c');
    await button('initialize');
    await at('partner');
    const initial = await state();
    assert.equal(initial.balance, 0);
    assert.equal(initial.events.length, 0);
    assert.equal(initial.works.length, 0);
    if (capture) {
      await page.locator('#toast.show').waitFor({state: 'hidden'});
      await snapshot('投屏伙伴首页');
    }
    await target('explore');
    await at('explore');
    await target('scene');
    await at('scene');
    await button('gift');
    await button('try-gift');
    await at('wardrobe');
    assert.equal((await state()).look.top, 'start-c-top');
    if (capture) await snapshot('衣橱试穿');
    await button('save-look');
    await at('scene');
    assert.equal((await state()).look.top, 'gift-top');
    assert.equal((await state()).events.length, 0);
    await visit('gate', 'HXX-GATE-2026', 2, 'cloud');
    await button('result-pool', 'cloud');
    await draw('cloud', 1);
    await target('scene');
    await visit('ridge', 'HXX-RIDGE-2026', 3, 'cloud');
    await target('scene');
    await visit('shop', 'HXX-SHOP-2026', 4, 'bloom');
    await target('activity');
    await button('staff');
    await button('staff-success');
    assert.equal((await state()).balance, 6);
    assert.equal((await state()).events.length, 4);
    await button('result-pool', 'bloom');
    await draw('bloom', 5);
    await button('purchase', 'bloom');
    await button('order', 'ten');
    await at('order');
    assert.match(await page.locator('.order-receipt').innerText(), /7\.00/);
    await button('resume-order');
    await page.locator('[data-action="pay"][data-status="paid"]').click();
    assert.equal((await state()).balance, 15);
    await target('pool?id=bloom');
    await target('memories');
    await button('begin-compose');
    const a = await state();
    const ridge = a.events.find((e) => e.pointId === 'ridge');
    await page.locator('[data-event="' + ridge.id + '"]').uncheck();
    await page.locator('#work-title').fill('山间相遇');
    await page.locator('[data-action="template"][data-value="trail"]').click();
    await button('preview-work');
    await button('save-work');
    await at('work');
    const first = (await state()).works[0];
    assert.equal(first.events.length, 3);
    assert.ok(!first.events.includes(ridge.id));
    assert.deepEqual(first.look, (await state()).look);
    const download = page.waitForEvent('download');
    await button('download', first.id);
    const file = await download;
    const dest = path.join(output, capture ? '旅行纪念.png' : '复演纪念.png');
    await file.saveAs(dest);
    const png = await readFile(dest);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.deepEqual(png, Buffer.from(first.image.split(',')[1], 'base64'));
    if (capture) await snapshot('作品详情');
    await button('recreate', first.id);
    await page.locator('#work-title').fill('山门留影');
    await page
      .locator('[data-action="template"][data-value="postcard"]')
      .click();
    await button('preview-work');
    await button('save-work');
    await at('work');
    await button('works');
    await at('memories');
    await target('work?id=' + first.id);
    assert.equal(
      await page.locator('.final-image').getAttribute('src'),
      first.image,
    );
    assert.match(await page.locator('#app').innerText(), /山间相遇/);
    assert.equal((await state()).balance, 15);
    runs.push({
      label,
      seconds: Math.round((Date.now() - start) / 1000),
      visits: 4,
      draws: 2,
      works: 2,
      balance: 15,
      firstWork: digest(first.image),
      assets: a.draws.map((d) => d.assetId),
    });
    return first;
  }
  try {
    await page.goto(base + 'presenter.html');
    await page.getByText('本机素材、存档读取和写入检查通过。').waitFor();
    await page.evaluate(() =>
      localStorage.setItem('hxx.interactive.v2', 'legacy-sentinel'),
    );
    const first = await mainRun('首次身份完整主线', true);
    if (nativeDisplay) {
      const display = await page.evaluate(() => ({
        width: screen.width,
        height: screen.height,
        viewport: [innerWidth, innerHeight],
        scale: devicePixelRatio,
      }));
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await writeFile(
        'output/demo-rehearsal/external-display.json',
        JSON.stringify(
          {
            at: new Date().toISOString(),
            browser: 'Chrome headed',
            display,
            runs,
            errors,
          },
          null,
          2,
        ),
      );
      return;
    }
    readablePlayback = false;
    const start = Date.now();
    await page.reload();
    await at('work');
    assert.equal((await state()).works[1].id, first.id);
    await button('works');
    await target('partner');
    await target('account');
    await button('logout');
    await button('login', 'A');
    await at('partner');
    assert.equal((await state()).balance, 15);
    await target('memories');
    await page.locator('[data-value="works"]').click();
    await target('work?id=' + first.id);
    assert.equal(
      await page.locator('.final-image').getAttribute('src'),
      first.image,
    );
    runs.push({
      label: '刷新回访和旧作品',
      seconds: Math.round((Date.now() - start) / 1000),
      balance: 15,
      firstWork: digest(first.image),
    });
    await page.goto(base + 'presenter.html');
    await page.locator('#reset').click();
    await page.locator('#confirm-action').click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('hxx.interactive.v2')),
      'legacy-sentinel',
    );
    await page.setViewportSize({width: 1920, height: 1080});
    await mainRun('复位后重新完整演示 1920×1080', false);
    await page.goto(base + 'presenter.html');
    await page.locator('#reset').click();
    await page.locator('#confirm-action').click();
    await page.setViewportSize({width: 1440, height: 900});
    await mainRun('1440×900 全链路复核', false);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.goto(base + 'presenter.html');
    const backup = page.waitForEvent('download');
    await page.locator('#backup').click();
    await (
      await backup
    ).saveAs(path.resolve('.codex/local-deploy/demo-run/备用回访手账.json'));
    await writeFile(
      path.join(output, 'rehearsals.json'),
      JSON.stringify(
        {at: new Date().toISOString(), runs, marks, errors, external},
        null,
        2,
      ),
    );
  } catch (e) {
    await page.screenshot({
      path: path.resolve('.codex/local-deploy/demo-run/rehearsal-failure.png'),
    });
    throw Error(
      '主线中断 ' +
        page.url() +
        ' / ' +
        JSON.stringify(marks) +
        ' / ' +
        e.message,
      {cause: e},
    );
  } finally {
    const video = page.video();
    await ctx.close();
    await video.saveAs(path.join(output, '连续操作彩排.webm'));
  }
}
