// Standalone customer-console rehearsal. Run from the repository root with a local preview running.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const {chromium} = createRequire(import.meta.url)(
  process.env.HXX_PLAYWRIGHT || 'playwright',
);
const record = process.argv.includes('--record');
const base = 'http://127.0.0.1:8765/design/demo/',
  tmp = '.codex/local-deploy/stage-run',
  out = record ? 'output/stage-rehearsal' : tmp;
await Promise.all([out, tmp].map((dir) => mkdir(dir, {recursive: true})));
const browser = await chromium.launch({channel: 'chrome'});
const errors = [],
  marks = [],
  sizes = [];
async function setup(viewport, movie = false) {
  const ctx = await browser.newContext({
    viewport,
    acceptDownloads: true,
    ...(movie ? {recordVideo: {dir: tmp, size: viewport}} : {}),
  });
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.protocol.startsWith('http') && u.hostname !== '127.0.0.1') {
      errors.push(u.href);
      return r.abort();
    }
    return r.continue();
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(6000);
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
  });
  await p.goto(base + 'stage.html');
  const f = p.frameLocator('#guest');
  async function text(id, expected) {
    try {
      await p.waitForFunction(
        ([id, v]) => document.getElementById(id).textContent === v,
        [id, expected],
      );
    } catch (e) {
      throw Error(
        id +
          ' 期望 ' +
          expected +
          ' 实际 ' +
          (await p.locator('#' + id).textContent()) +
          ' 中央 ' +
          p
            .frames()
            .map((x) => x.url())
            .join(' / '),
        {cause: e},
      );
    }
  }
  const at = async (name) => {
    try {
      await f.locator('#app[data-page="' + name + '"]').waitFor();
    } catch (e) {
      throw Error(
        '中央未到达 ' +
          name +
          ' ：' +
          JSON.stringify(
            await p.evaluate(() => ({
              url: document.querySelector('#guest').contentWindow.location.href,
              resume: sessionStorage.getItem('hxx.stage.resume'),
              live: document.querySelector('#scene-title').textContent,
            })),
          ),
        {cause: e},
      );
    }
  };
  const account = () =>
    p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('hxx.demo.v1'));
      return d?.accounts[d.current] ?? null;
    });
  const wait = (ms) => (movie ? p.waitForTimeout(ms) : Promise.resolve());
  async function click(selector) {
    await wait(780);
    const sheet = f.locator('#sheet[open]'),
      scope = (await sheet.count()) ? sheet : f;
    await scope.locator(selector).first().click();
  }
  const action = (a, id) =>
    click('[data-action="' + a + '"]' + (id ? '[data-id="' + id + '"]' : ''));
  const go = (target) => click('[data-target="' + target + '"]');
  async function jump(a, id) {
    await wait(720);
    await p
      .locator('[data-jump="' + a + '"]' + (id ? '[data-id="' + id + '"]' : ''))
      .click();
  }
  await text('preflight', '本机素材与存档检查通过');
  await text('balance', '0');
  return {ctx, p, f, text, at, account, wait, action, go, jump, click};
}
async function liveRun() {
  const {ctx, p, f, text, at, account, wait, action, go, jump, click} =
    await setup({width: 1440, height: 900}, record);
  const video = p.video();
  try {
    const mark = async (label, n) => {
      await text('balance', String(n));
      assert.equal((await account()).balance, n);
      marks.push({label, balance: n});
      await wait(1400);
    };
    const visit = async (id, n) => {
      const before = await account();
      await jump('scan', id);
      await at('checkin');
      assert.equal(
        await f.locator('#checkin-code').inputValue(),
        'HXX-' + id.toUpperCase() + '-2026',
      );
      assert.deepEqual(await account(), before);
      await action('verify-code');
      await f.locator('#sheet[open]').waitFor();
      await mark('核验 ' + id, n);
      assert.equal((await account()).events.at(-1).pointId, id);
    };
    const draw = async (pool, n) => {
      await action('result-pool', pool);
      await at('pool');
      await action('draw', pool);
      await f.locator('.reward-reveal').waitFor();
      await mark('抽取 ' + pool, n);
      const prize = (await account()).draws[0].assetId;
      await action('try-asset', prize);
      await at('wardrobe');
      await action('save-look');
      await at('pool');
      assert.ok(Object.values((await account()).look).includes(prize));
    };
    await at('entry');
    await wait(1400);
    await action('login', 'A');
    await action('starter', 'start-c');
    await action('initialize');
    await at('partner');
    await mark('初始伙伴', 0);
    await go('explore');
    await go('scene');
    await action('gift');
    await action('try-gift');
    await text('overlay', '试穿中 · 尚未保存');
    await action('save-look');
    await at('scene');
    assert.equal((await account()).events.length, 0);
    await mark('线上领装并保存', 0);
    await visit('gate', 2);
    await draw('cloud', 1);
    const before = await account();
    await jump('point', 'ridge');
    await at('point');
    assert.deepEqual(await account(), before);
    await visit('ridge', 3);
    await go('scene');
    await visit('shop', 4);
    await go('activity');
    await action('staff');
    await action('staff-success');
    await mark('手作体验', 6);
    await text('visits', '3 / 4');
    await text('events', '4 条');
    await text('pools', '2 / 2');
    await draw('bloom', 5);
    await text('draws', '2 笔');
    await p.screenshot({
      path: out + '/三栏投屏.jpg',
      type: 'jpeg',
      quality: 86,
    });
    await action('purchase', 'bloom');
    await action('order', 'ten');
    await at('order');
    await action('resume-order');
    await click('[data-action="pay"][data-status="paid"]');
    await mark('可选模拟购买', 15);
    await go('pool?id=bloom');
    await go('memories');
    await action('begin-compose');
    const a = await account(),
      ridge = a.events.find((e) => e.pointId === 'ridge');
    await f.locator('[data-event="' + ridge.id + '"]').uncheck();
    await f.locator('#work-title').fill('把黔山的相遇带回家');
    await click('[data-action="template"][data-value="trail"]');
    await action('preview-work');
    await action('save-work');
    await at('work');
    await text('works', '1 张');
    const work = (await account()).works[0];
    assert.deepEqual(
      work.snapshots.map((e) => e.pointId),
      ['gate', 'shop', 'shop'],
    );
    assert.deepEqual(work.look, (await account()).look);
    const dl = p.waitForEvent('download');
    await action('download', work.id);
    await (await dl).saveAs(out + '/三栏演示纪念.png');
    assert.deepEqual(
      await readFile(out + '/三栏演示纪念.png'),
      Buffer.from(work.image.split(',')[1], 'base64'),
    );
    await wait(2300);
    // End the customer-facing movie on the actual exported image (the browser download alone is not visible in video).
    await p.goto('http://127.0.0.1:8765/' + out + '/三栏演示纪念.png');
    await p.locator('img').waitFor();
    await wait(3200);
  } finally {
    await ctx.close();
    if (video) await video.saveAs(out + '/三栏连续彩排.webm');
  }
}
async function boundaries() {
  const {ctx, p, f, text, at, account, action, go, jump} = await setup({
    width: 1280,
    height: 720,
  });
  try {
    await p.evaluate(() => localStorage.setItem('hxx.interactive.v2', 'keep'));
    await jump('scan', 'brook');
    await at('entry');
    await action('login', 'B');
    await action('initialize');
    await at('checkin');
    assert.equal(
      await f.locator('#checkin-code').inputValue(),
      'HXX-BROOK-2026',
    );
    await f.locator('#checkin-code').fill('wrong');
    await action('verify-code');
    await text('overlay', '操作未完成');
    assert.ok(await p.locator('[data-jump="scan"]').first().isDisabled());
    assert.equal((await account()).events.length, 0);
    await f.locator('#close-sheet').click();
    await text('overlay', '');
    for (const id of ['gate', 'ridge', 'brook', 'shop']) {
      const before = await account();
      await jump('point', id);
      await at('point');
      await jump('scan', id);
      await at('checkin');
      assert.equal(
        await f.locator('#checkin-code').inputValue(),
        'HXX-' + id.toUpperCase() + '-2026',
      );
      assert.deepEqual(await account(), before);
    }
    await jump('activity');
    await at('activity');
    assert.equal((await account()).events.length, 0);
    await jump('scan', 'gate');
    await action('verify-code');
    await text('balance', '2');
    await action('result-pool', 'cloud');
    await action('draw', 'cloud');
    await f.locator('.reward-reveal').waitFor();
    const prize = (await account()).draws[0].assetId;
    await action('try-asset', prize);
    await text('overlay', '试穿中 · 尚未保存');
    await jump('point', 'ridge');
    await text('overlay', '保存这次搭配吗？');
    await action('close');
    await at('wardrobe');
    await jump('point', 'shop');
    await action('dirty-discard');
    await at('point');
    assert.ok(!Object.values((await account()).look).includes(prize));
    await jump('scan', 'ridge');
    await action('verify-code');
    await action('result-pool', 'cloud');
    await action('purchase', 'cloud');
    await action('order', 'ten');
    await action('resume-order');
    await f.locator('[data-action="pay"][data-status="cancelled"]').click();
    await text('overlay', '订单已取消');
    await text('balance', '3');
    await f.locator('#close-sheet').click();
    await p.reload();
    await at('order');
    await text('balance', '3');
    await p.locator('#files summary').click();
    const backup = p.waitForEvent('download');
    await p.locator('#backup').click();
    const backupFile = path.join(tmp, 'backstage.json');
    await (await backup).saveAs(backupFile);
    const archive = JSON.parse(await readFile(backupFile));
    await p.locator('#restore').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    });
    await p.locator('#feedback').filter({hasText: '未载入'}).waitFor();
    await text('balance', '3');
    await p.locator('#reset').click();
    await p.locator('#cancel').click();
    assert.deepEqual(await account(), archive.accounts.B);
    await p.locator('#reset').click();
    await p.locator('#apply').click();
    await at('entry');
    await text('balance', '0');
    await action('login', 'A');
    await action('initialize');
    await at('partner');
    await p.locator('#restore').setInputFiles(backupFile);
    await p.locator('#warning').filter({hasText: '游客 B'}).waitFor();
    await p.locator('#cancel').click();
    await at('partner');
    await text('balance', '0');
    await p.locator('#restore').setInputFiles(backupFile);
    await p.locator('#apply').click();
    await text('balance', '3');
    await at('partner');
    assert.deepEqual(await account(), archive.accounts.B);
    assert.equal(
      await p.evaluate(() => localStorage.getItem('hxx.interactive.v2')),
      'keep',
    );
    await p.locator('#files summary').click();
    const other = await ctx.newPage();
    await other.goto(base + 'index.html#account');
    await other.locator('[data-action="logout"]').click();
    await text('identity', '尚未选择身份');
    await other.locator('[data-action="login"][data-id="B"]').click();
    await text('balance', '3');
    await at('partner');
    await other.close();
    for (const [width, height] of [
      [1280, 720],
      [1440, 900],
      [1920, 1080],
      [360, 640],
      [390, 844],
      [430, 932],
    ]) {
      await p.setViewportSize({width, height});
      const box = await p.locator('#guest').boundingBox();
      assert.ok(
        Math.abs(box.x + box.width / 2 - width / 2) < 1 &&
          box.y + box.height <= height + 1,
      );
      assert.ok(await f.locator('.bottom-nav').isVisible());
      const nav = await f.locator('.bottom-nav').boundingBox();
      assert.ok(nav.y + nav.height <= height + 1);
      if (width > 900) {
        await p.locator('#fold').click();
        assert.deepEqual(await p.locator('#guest').boundingBox(), box);
        await p.locator('#bring-back').click();
      } else {
        await p.locator('[data-panel="progress"]').click();
        await text('balance', '3');
        await p.keyboard.press('Escape');
        assert.equal(await p.locator('#progress').isVisible(), false);
        await p.locator('[data-panel="controls"]').click();
        await jump('point', 'gate');
        await at('point');
        assert.equal(await p.locator('#controls').isVisible(), false);
        await action('back');
        await at('partner');
        if (width === 390) {
          await p.locator('[data-panel="controls"]').click();
          await p.screenshot({path: out + '/手机侧栏.jpg'});
          await p.locator('#controls .dismiss').click();
        }
      }
      sizes.push([width, height]);
    }
    await p.setViewportSize({width: 1440, height: 900});
    await p.locator('#fullscreen').click();
    await p.waitForFunction(() => !!document.fullscreenElement);
    await p.locator('#fullscreen').click();
    await p.waitForFunction(() => !document.fullscreenElement);
    const snapshot = await account();
    await p.locator('#playback').click();
    await p.locator('#replay video').evaluate(
      (v) =>
        new Promise((resolve, reject) => {
          if (v.readyState >= 2) return resolve();
          v.onloadeddata = resolve;
          v.onerror = () => reject(Error('录像不可播放'));
        }),
    );
    await p.locator('#end-replay').click();
    assert.deepEqual(await account(), snapshot);
  } finally {
    await ctx.close();
  }
}
try {
  await liveRun();
  await boundaries();
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/checks.json',
    JSON.stringify(
      {checkedAt: new Date().toISOString(), marks, sizes, errors},
      null,
      2,
    ),
  );
  console.log(
    '三栏彩排通过：',
    marks.map((m) => m.balance).join(' → '),
    '；',
    sizes.length,
    '种尺寸。',
  );
} finally {
  await browser.close();
}
