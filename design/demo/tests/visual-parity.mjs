// 静态稿逐屏对照使用隔离的演示身份和可重建的示例日期。
// 业务验收另走 tests/run.mjs 的真实主线；本脚本不会接触已打开的游客浏览器。
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium} = createRequire(import.meta.url)(
  process.env.HXX_PLAYWRIGHT || 'playwright',
);
const base = 'http://127.0.0.1:8765/design/demo/index.html';
const out = path.resolve(
  process.env.HXX_REVIEW_OUT || '.codex/local-deploy/ui-implementation/screens',
);
const size = (process.argv[2] || '390x844').split('x').map(Number);
const folder = path.join(out, size.join('x'));
const browser = await chromium.launch({channel: 'chrome'});
const ctx = await browser.newContext({
  viewport: {width: size[0], height: size[1]},
  timezoneId: 'Asia/Shanghai',
  reducedMotion: 'reduce',
});
const p = await ctx.newPage();
p.setDefaultTimeout(20000);
const errors = [],
  shots = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('response', (r) => {
  if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
});
const act = async (a, id) => {
  const area = (await p.locator('#sheet[open]').count())
    ? p.locator('#sheet')
    : p;
  await area
    .locator(`[data-action="${a}"]${id ? '[data-id="' + id + '"]' : ''}`)
    .first()
    .click();
};
const close = () => p.locator('#close-sheet').click();
async function nav(route) {
  await p.goto(base + '#' + route);
  await p.locator('#app[data-page="' + route.split('?')[0] + '"]').waitFor();
}
async function shot(id) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
  await p.screenshot({
    path: path.join(folder, id + '.png'),
    animations: 'disabled',
    style: '#toast{visibility:hidden!important}',
  });
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error(id + ' 横向溢出');
  shots.push(id);
}
async function fixture(stage) {
  await p.evaluate(async (stage) => {
    const s = await import('/design/store.mjs'),
      d = await import('/design/data.mjs');
    const db = s.initialDB(),
      a = s.account('游客 A');
    db.current = 'A';
    db.accounts.A = a;
    s.initialize(a, 'start-a');
    s.gift(a);
    const visit = (id, at) =>
      s.checkin(a, {
        pointId: id,
        requestId: crypto.randomUUID(),
        code: d.point(id).code,
        now: at,
      });
    visit('gate', '2026-11-05T09:18:00+08:00');
    if (stage !== 'poor') visit('ridge', '2026-11-05T11:32:00+08:00');
    const draw = (id) => {
      const options = s.eligible(a, 'cloud');
      s.draw(a, {
        poolId: 'cloud',
        requestId: crypto.randomUUID(),
        random: () => (options.indexOf(id) + 0.5) / options.length,
      });
    };
    draw('mountain-hair');
    draw('mountain-bottom');
    if (stage === 'story' || stage === 'dressing') {
      draw('mountain-top');
      s.saveLook(a, {
        ...d.lookFor('gift'),
        hair: 'mountain-hair',
        top: stage === 'dressing' ? 'gift-top' : 'mountain-top',
        bottom: 'mountain-bottom',
      });
      visit('shop', '2026-11-06T14:12:00+08:00');
      s.activity(a, {
        requestId: crypto.randomUUID(),
        now: '2026-11-06T14:40:00+08:00',
      });
    } else if (stage === 'full') {
      const order = s.createOrder(a, {id: 'review', packId: 'five'});
      s.pay(a, {id: order.id, status: 'paid'});
      for (const id of s.eligible(a, 'cloud')) draw(id);
    }
    localStorage.setItem('hxx.demo.v1', JSON.stringify(db));
  }, stage);
  await p.reload();
}
try {
  await mkdir(folder, {recursive: true});
  await nav('entry');
  await shot('01');
  await act('login', 'A');
  await shot('05');
  await act('initialize');
  await shot('06');
  await nav('explore');
  await shot('07');
  await nav('scene');
  await shot('08');
  await act('map-list');
  await shot('09');
  await close();
  await act('gift');
  await shot('10');
  await close();
  await nav('memories');
  await shot('37');
  await nav('point?id=gate');
  await shot('11');
  await nav('checkin?id=gate');
  await act('test-code', 'gate');
  await shot('12');
  await act('verify-code');
  await shot('13');
  await close();
  await p.clock.setFixedTime(new Date(Date.now() + 120000));
  await act('verify-code');
  await p.locator('#sheet .visit-print').waitFor();
  await shot('18');
  await close();
  await nav('memories');
  await p.locator('[data-value=works]').click();
  await shot('38');
  await p.locator('[data-value=events]').click();
  for (const [id, route] of [
    ['14', 'point?id=shop'],
    ['15', 'activity'],
    ['16', 'point?id=ridge'],
    ['17', 'point?id=brook'],
    ['20', 'pool?id=bloom'],
  ]) {
    await nav(route);
    await shot(id);
  }
  await fixture('pool');
  await nav('pool?id=cloud');
  await shot('19');
  await p.locator('.pool-supplement').scrollIntoViewIfNeeded();
  await shot('28');
  await p.evaluate(() => {
    window.reviewRandom = Math.random;
    Math.random = () => 0;
  });
  await act('draw');
  await p.locator('.reward-reveal').waitFor();
  await p.evaluate(() => {
    Math.random = window.reviewRandom;
  });
  await shot('21');
  await close();
  await fixture('poor');
  await nav('pool?id=cloud');
  await shot('22');
  await act('no-balance');
  await shot('23');
  await close();
  await fixture('full');
  await nav('pool?id=cloud');
  await shot('24');
  await fixture('dressing');
  await nav('partner');
  await act('home-dress');
  await act('equip', 'mountain-top');
  await shot('25');
  await act('wardrobe-return');
  await shot('47');
  await act('dirty-discard');
  await fixture('story');
  await nav('partner');
  await act('home-catalog');
  await shot('26');
  await nav('collection?id=mountain');
  await shot('27');
  await act('source', 'mountain-shoes');
  await shot('29');
  await close();
  await nav('memories');
  await shot('31');
  await p.locator('.journal-event').nth(1).click();
  await shot('32');
  await close();
  await act('begin-compose');
  await p.locator('[data-event]').nth(2).uncheck();
  await p.locator('[data-event]').nth(3).uncheck();
  await p.evaluate(() => scrollTo(0, 0));
  await shot('34');
  await p.locator('.event-picker').scrollIntoViewIfNeeded();
  await shot('30');
  await p.locator('[data-value=trail]').click();
  await p.evaluate(() => scrollTo(0, 0));
  await shot('46');
  await p.locator('[data-value=postcard]').click();
  await act('preview-work');
  await p.locator('[data-action=save-work]').waitFor();
  await p.evaluate(() => scrollTo(0, 0));
  await shot('35');
  await act('save-work');
  await shot('36');
  await p.evaluate(() =>
    Object.defineProperty(navigator, 'canShare', {
      value: () => false,
      configurable: true,
    }),
  );
  await act('share');
  await p.locator('#sheet[open]').waitFor();
  await shot('39');
  await close();
  await act('works');
  await shot('33');
  await nav('account');
  await shot('40');
  await nav('wallet');
  await shot('42');
  await act('purchase-wallet');
  await shot('43');
  await act('order', 'five');
  await shot('44');
  await act('resume-order');
  await shot('45');
  await close();
  await nav('wallet');
  await p.locator('[data-target^="order?id="]').last().scrollIntoViewIfNeeded();
  await shot('48');
  await writeFile(
    path.join(folder, 'result.json'),
    JSON.stringify({size, shots, errors}, null, 2),
  );
  if (errors.length) throw Error(errors.join('\n'));
} finally {
  await browser.close();
}
