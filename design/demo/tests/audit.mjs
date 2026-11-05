import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
const base = 'http://127.0.0.1:8765/design/demo/index.html';
const out = path.resolve('output/demo-rehearsal');

export async function audit(browser) {
  await mkdir(out, {recursive: true});
  const results = [];
  async function check(id, fn) {
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}});
    const q = await ctx.newPage(),
      errors = [];
    q.setDefaultTimeout(4000);
    q.on('pageerror', (e) => errors.push(e.message));
    const at = async (name) =>
      q.locator('#app[data-page="' + name + '"]').waitFor();
    const nav = async (route) => {
      await q.goto(base + '#' + route);
      await at(route.split('?')[0]);
    };
    const click = async (action, id) => {
      const modal = q.locator('dialog[open]');
      await ((await modal.count()) ? modal : q)
        .locator(
          '[data-action="' +
            action +
            '"]' +
            (id ? '[data-id="' + id + '"]' : ''),
        )
        .first()
        .click();
    };
    const state = () =>
      q.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('hxx.demo.v1'));
        return d.accounts[d.current];
      });
    const close = () => q.locator('#close-sheet').click();
    const seed = async (visits = []) => {
      await q.goto(base);
      await at('entry');
      await click('login', 'A');
      await click('initialize');
      await at('partner');
      for (const id of visits) {
        await nav('checkin?id=' + id);
        await click('test-code', id);
        await click('verify-code');
        await close();
      }
    };
    try {
      await fn({ctx, q, at, nav, click, state, close, seed});
      assert.deepEqual(errors, []);
      results.push({id, passed: true});
    } catch (e) {
      results.push({
        id,
        passed: false,
        reason: e.message,
        route: q.url(),
        errors,
      });
      await q
        .screenshot({
          path: path.resolve(
            '.codex/local-deploy/demo-run/' + id.split(' ')[0] + '-failure.png',
          ),
        })
        .catch(() => {});
    } finally {
      await ctx.close();
    }
  }
  await check('A01 首次扫码与初始化守卫', async ({q, at, click, state}) => {
    await q.goto(base + '#checkin?id=brook&code=HXX-BROOK-2026');
    await at('entry');
    assert.equal(await q.locator('.bottom-nav,.app-header').count(), 0);
    await click('login', 'B');
    await at('onboarding');
    await click('initialize');
    await at('checkin');
    assert.equal(
      await q.locator('#checkin-code').inputValue(),
      'HXX-BROOK-2026',
    );
    const a = await state();
    assert.equal(a.owned.length, 15);
    assert.equal(
      a.balance + a.events.length + a.unlocked.length + a.works.length,
      0,
    );
  });
  await check(
    'A02 领装幂等与取消试穿',
    async ({seed, q, nav, click, state, at}) => {
      await seed();
      await nav('scene');
      await click('gift');
      const receipt = q.locator('#sheet .gift-preview');
      const items = await receipt.locator('li img').evaluateAll(images =>
        Promise.all(images.map(async image => {
          await image.decode();
          return new URL(image.src).pathname.split('/').pop();
        })),
      );
      assert.deepEqual(items, ['gift-hair.webp','gift-top.webp','gift-bottom.webp','gift-shoes.webp']);
      const outfitMatches = await receipt.locator('.stage-figure').evaluate(async image => {
        await image.decode();
        const {renderedLook} = await import('./renderer.mjs');
        const {lookFor} = await import('../data.mjs');
        return image.src === renderedLook(lookFor('gift')).src;
      });
      assert.ok(outfitMatches);
      assert.equal((await state()).look.top, 'start-a-top');
      await click('try-gift');
      await click('wardrobe-return');
      await click('dirty-discard');
      await at('scene');
      const a = await state();
      assert.equal(a.owned.length, 19);
      assert.equal(a.events.length, 0);
      assert.equal(a.look.top, 'start-a-top');
      assert.equal(await q.locator('[data-action="gift"]').count(), 0);
      await click('try-gift');
      await click('save-look');
      assert.equal((await state()).look.top, 'gift-top');
    },
  );
  await check('A03 四点位与套装的对象一致性', async ({seed, q, nav, click}) => {
    await seed();
    for (const [id, name] of Object.entries({
      gate: '山门入口',
      ridge: '望山台',
      brook: '花溪小径',
      shop: '山间手作铺',
    })) {
      await nav('scene');
      await q.locator('.map-pin[data-target="point?id=' + id + '"]').click();
      assert.equal(await q.locator('.location-sign h1').innerText(), name);
      await click('open-checkin', id);
      assert.equal(await q.locator('.visit-paper h2').innerText(), name);
      await nav('scene');
      await click('map-list');
      await q.locator('#sheet [data-target="point?id=' + id + '"]').click();
      assert.equal(await q.locator('.location-sign h1').innerText(), name);
    }
    for (const [id, name] of [
      ['gift', '黔山初见'],
      ['mountain', '云山拾光'],
      ['flower', '花溪漫步'],
    ]) {
      await nav('partner');
      await click('home-catalog');
      await q.locator('[data-target="collection?id=' + id + '"]').click();
      assert.equal(await q.locator('.title-plaque h1').innerText(), name);
    }
    for (const route of [
      'point?id=absent',
      'checkin?id=absent',
      'order?id=absent',
      'collection?id=absent',
      'work?id=absent',
    ]) {
      await nav(route);
      assert.match(await q.locator('#app').innerText(), /不存在|找不到|未找到/);
    }
  });
  await check(
    'A04 错误码不发奖 重复到访与活动资格',
    async ({seed, q, nav, click, state, close}) => {
      await seed();
      await nav('checkin?id=shop');
      for (const bad of ['', 'INVALID', 'HXX-GATE-2026']) {
        await q.locator('#checkin-code').fill(bad);
        await click('verify-code');
        assert.equal((await state()).events.length, 0);
        await close();
      }
      await click('test-code', 'shop');
      await click('verify-code');
      await close();
      await click('verify-code');
      await close();
      assert.equal((await state()).balance, 1);
      assert.equal((await state()).events.length, 1);
      await nav('activity');
      await click('staff');
      await click('staff-fail');
      await close();
      assert.equal((await state()).balance, 1);
      await click('staff');
      await click('staff-success');
      await close();
      const a = await state();
      assert.equal(a.balance, 3);
      assert.equal(a.events.length, 2);
      assert.equal(await q.locator('[data-action="staff"]').count(), 0);
    },
  );
  await check(
    'A06 A07 A08 跨池排重 耗尽 收齐与刷新',
    async ({seed, q, nav, click, state, close}) => {
      const progress = () => q.getByRole('progressbar').evaluate(el=>[el.value,el.max]);
      await seed(['gate']);
      await nav('pool?id=bloom');
      assert.deepEqual(await progress(),[0,7]);
      assert.equal(await q.locator('[data-action="draw"]').count(), 0);
      await nav('pool?id=cloud');
      const first = q.locator('[data-action="draw"]');
      await first.dblclick();
      await q.locator('.reward-reveal').waitFor();
      assert.equal((await state()).draws.length, 1);
      await close();
      assert.deepEqual(await progress(),[1,7]);
      await click('draw', 'cloud');
      await q.locator('.reward-reveal').waitFor();
      await close();
      assert.equal((await state()).balance, 0);
      await click('no-balance');
      await close();
      await click('purchase', 'cloud');
      await click('order', 'ten');
      await click('resume-order');
      await q.locator('[data-status="paid"]').click();
      await close();
      await nav('pool?id=bloom');
      assert.equal(await q.locator('[data-action="draw"]').count(), 0);
      await nav('pool?id=cloud');
      while (await q.locator('[data-action="draw"]').count()) {
        await click('draw', 'cloud');
        await q.locator('.reward-reveal').waitFor();
        await close();
      }
      let a = await state();
      assert.equal(a.draws.length, 7);
      assert.equal(a.balance, 5);
      assert.ok(a.owned.includes('joy') && a.owned.includes('wave'));
      await q.reload();
      await q.locator('.collection-complete').waitFor();
      assert.match(await q.locator('#app').innerText(), /收齐/);
      assert.deepEqual(await progress(),[7,7]);
      await nav('pool?id=bloom');
      assert.deepEqual(await progress(),[2,7]);
      assert.equal(await q.locator('[data-action="draw"]').count(),0);
      await nav('checkin?id=brook');
      await click('test-code', 'brook');
      await click('verify-code');
      await close();
      await nav('pool?id=bloom');
      assert.match(await q.locator('.pool-rules').innerText(), /剩余 5 件/);
      while (await q.locator('[data-action="draw"]').count()) {
        await click('draw', 'bloom');
        await q.locator('.reward-reveal').waitFor();
        await close();
      }
      a = await state();
      assert.equal(a.draws.length, 12);
      assert.equal(new Set(a.draws.map((d) => d.assetId)).size, 12);
      assert.equal(a.balance, 2);
      await nav('collection?id=flower');
      assert.match(await q.locator('.extra-collection').innerText(), /7 \/ 7/);
      assert.equal(
        await q.locator('.extra-collection .asset.owned').count(),
        3,
      );

      await nav('wallet');
      assert.equal(
        a.ledger.reduce((sum, e) => sum + e.delta, 0),
        2,
      );
    },
  );
  await check(
    'A09 A11 A12 试穿来源与三端搭配',
    async ({seed, q, nav, click, state, at}) => {
      await seed(['gate', 'shop']);
      await nav('compose');
      await q.locator('#work-title').fill('两岸山色');
      await q.locator('[data-event]').last().uncheck();
      await click('compose-dress');
      await q.locator('[data-value="top"]').click();
      await click('equip', 'start-c-top');
      const draft = await q
        .locator('.dressed-character img')
        .getAttribute('src');
      await q.screenshot({path: path.join(out, '搭配对照-衣橱.png')});
      await q.reload();
      await at('wardrobe');
      assert.equal(
        await q.locator('.dressed-character img').getAttribute('src'),
        draft,
      );
      await click('save-look');
      await at('compose');
      assert.equal(await q.locator('#work-title').inputValue(), '两岸山色');
      assert.equal(await q.locator('[data-event]:checked').count(), 1);
      const draftPng = await q.locator('.draft-postcard').evaluate(canvas => canvas.toDataURL('image/png'));
      await click('preview-work');
      await click('save-work');
      const w = (await state()).works[0];
      await writeFile(
        path.join(out, '搭配对照-纪念.png'),
        Buffer.from(w.image.split(',')[1], 'base64'),
      );
      assert.equal(w.image === draftPng, true, '已保存的纪念图须与生成前的草稿逐像素一致');
      assert.equal(w.events.length, 1);
      assert.equal(w.look.top, 'start-c-top');
      await nav('partner');
      await q.screenshot({path: path.join(out, '搭配对照-首页.png')});
      assert.equal(
        await q.locator('.companion-character img').getAttribute('src'),
        draft,
      );
      await click('home-dress');
      await q.locator('[data-value="top"]').click();
      await click('equip', 'start-b-top');
      await q.goBack();
      await click('dirty-discard');
      await at('partner');
      assert.equal((await state()).look.top, 'start-c-top');
      await nav('compose');
      for (const id of await q
        .locator('[data-event]:checked')
        .evaluateAll((boxes) => boxes.map((b) => b.dataset.event)))
        await q.locator('[data-event="' + id + '"]').uncheck();
      assert.equal(
        await q.locator('[data-action="preview-work"]').isDisabled(),
        true,
      );
    },
  );
  await check(
    'A10 套餐金额 三个终态及重复到账',
    async ({seed, q, nav, click, state, close}) => {
      await seed(['shop']);
      for (const [id, status, price, count] of [
        ['one', 'cancelled', '1.00', 1],
        ['five', 'failed', '4.00', 5],
        ['ten', 'paid', '7.00', 10],
      ]) {
        await nav('pool?id=bloom');
        await click('purchase', 'bloom');
        await click('order', id);
        await q.reload();
        await q.locator('.order-receipt').waitFor();
        assert.match(
          await q.locator('.order-receipt').innerText(),
          new RegExp(price),
        );
        await click('resume-order');
        assert.ok(
          (await q.locator('#sheet-body').innerText()).includes(count + ' 次'),
        );
        await q.locator('[data-status="' + status + '"]').click();
        await close();
        const a = await state(),
          o = a.orders[0];
        assert.equal(o.status, status);
        assert.equal(o.price, price);
        assert.equal(a.balance, status === 'paid' ? 11 : 1);
        await nav('wallet');
        await q.locator('[data-target="order?id=' + o.id + '"]').click();
        assert.equal(
          await q.locator('[data-action="resume-order"]').count(),
          0,
        );
      }
    },
  );
  await check(
    'A14 存储与合成错误后恢复 过期异步结果',
    async ({seed, q, nav, click, state, at, close}) => {
      await seed(['gate']);
      await nav('scene');
      await q.evaluate(() => {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (k === 'hxx.demo.v1') {
            Storage.prototype.setItem = set;
            throw Error('quota');
          }
          return set.call(this, k, v);
        };
      });
      await click('gift');
      assert.equal((await state()).owned.length, 15);
      await close();
      await click('gift');
      assert.equal((await state()).owned.length, 19);
      await close();
      await nav('compose');
      await q.evaluate(() => {
        const create = window.createImageBitmap;
        window.createImageBitmap = async (...args) => {
          window.createImageBitmap = create;
          throw Error('合成测试');
        };
      });
      await click('preview-work');
      await q.locator('dialog[open]').waitFor();
      assert.equal((await state()).works.length, 0);
      await close();
      await q.evaluate(() => {
        const create = window.createImageBitmap;
        window.createImageBitmap = async (...args) => {
          await new Promise((r) => setTimeout(r, 400));
          return create(...args);
        };
      });
      await click('preview-work');
      await q.evaluate(() => (location.hash = 'memories'));
      await at('memories');
      assert.equal((await state()).works.length, 0);
      await nav('compose');
      await click('preview-work');
      await click('save-work');
      assert.equal((await state()).works.length, 1);
    },
  );
  await check(
    'A15 账号隔离和多标签草稿',
    async ({seed, q, ctx, nav, click, state, at}) => {
      await seed();
      await nav('partner');
      await click('home-dress');
      await q.locator('[data-value="top"]').click();
      await click('equip', 'start-c-top');
      const other = await ctx.newPage();
      await other.goto(base + '#scene');
      await other.locator('[data-action="gift"]').click();
      await q.waitForFunction(() =>
        document.querySelector('#toast').textContent.includes('已保留'),
      );
      assert.equal(
        await q.locator('[data-id="start-c-top"][aria-pressed="true"]').count(),
        1,
      );
      await other.goto(base + '#account');
      await other.locator('[data-action="logout"]').click();
      await at('entry');
      await other.locator('[data-action="login"][data-id="B"]').click();
      await other.locator('[data-action="initialize"]').click();
      await q.waitForFunction(
        () => JSON.parse(localStorage.getItem('hxx.demo.v1')).current === 'B',
      );
      assert.equal((await state()).owned.length, 15);
      await other.close();
    },
  );
  await check('A16 全尺寸主要操作与首页可读范围', async ({seed, q, nav}) => {
    await seed(['gate']);
    for (const [width, height] of [
      [1280, 720],
      [1440, 900],
      [1920, 1080],
      [360, 640],
      [390, 844],
      [430, 932],
      [1440, 1000],
    ]) {
      await q.setViewportSize({width, height});
      for (const route of [
        'partner',
        'explore',
        'scene',
        'point?id=shop',
        'checkin?id=shop',
        'activity',
        'pool?id=cloud',
        'wardrobe',
        'memories',
        'compose',
        'wallet',
      ]) {
        await nav(route);
        assert.ok(
          await q.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          width + 'px ' + route + ' 横向溢出',
        );
        if (route === 'partner') {
          const navBox = await q.locator('.bottom-nav').boundingBox();
          assert.ok(navBox.y + navBox.height <= height + 1);
          const character = q.locator('.companion-character');
          await character.click();
          assert.ok((await q.locator('.dialogue-line').innerText()).length > 0);
        }
        if (route === 'wardrobe') {
          const b = await q.locator('[data-action="save-look"]').boundingBox();
          assert.ok(
            b.y >= 0 && b.y + b.height <= height + 1,
            '衣橱保存被遮挡 ' + width + 'x' + height + ' ' + JSON.stringify(b),
          );
        }
        if (route === 'scene') {
          await q.locator('.map-pin[data-target="point?id=shop"]').click();
          assert.equal(
            await q.locator('.location-sign h1').innerText(),
            '山间手作铺',
          );
        }
      }
      if (width === 360 || (width === 1440 && height === 900)) {
        await nav('partner');
        await q.screenshot({
          path: path.join(out, '伙伴-' + width + 'x' + height + '.png'),
        });
      }
    }
  });
  await check('A17 坏存档保护和取消复位', async ({q, at}) => {
    await q.goto(base);
    await at('entry');
    await q.evaluate(() => localStorage.setItem('hxx.demo.v1', '{corrupt'));
    await q.reload();
    await q.getByText('暂时无法读取进度').waitFor();
    assert.equal(
      await q.evaluate(() => localStorage.getItem('hxx.demo.v1')),
      '{corrupt',
    );
    await q.goto(new URL('presenter.html', base).href);
    await q.locator('#reset').click();
    await q.locator('#cancel').click();
    assert.equal(
      await q.evaluate(() => localStorage.getItem('hxx.demo.v1')),
      '{corrupt',
    );
  });
  await writeFile(
    path.join(out, 'edge-checks.json'),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
  assert.ok(
    results.every((r) => r.passed),
    '请复核未通过项。',
  );
}
