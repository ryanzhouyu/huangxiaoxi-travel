import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';

const base = 'http://127.0.0.1:8765/design/demo/index.html';
const output = 'output/companion-visual-review/footer';
const sizes = [
  [320, 568],
  [360, 640],
  [430, 640],
  [390, 844],
  [430, 932],
  [540, 1190],
  [600, 700],
  [1280, 720],
  [1440, 953, 1.25],
  [390, 844, 1, 30],
];

// 隐去浮在风景上的控件，比较页面实绘与从顶到底单独铺一张原画的结果。
// 即使两个背景层都存在、按钮也可点，底部换图造成的接缝仍会被检测出来。
async function backdropDifference(page, route) {
  const map = 'url(' + new URL('../hifi/assets/map.png', page.url()).href + ')';
  const art =
    route === 'partner'
      ? await page
          .locator('.companion-world > .world-art')
          .evaluate((el) => getComputedStyle(el).backgroundImage)
      : route === 'explore'
        ? 'linear-gradient(#473b2430, transparent 30%), ' + map
        : map;
  const app = page.locator('#app');
  const hide = await page.addStyleTag({
    content:
      '#app :is(header,nav,button,.map-gift,.map-bottom,.map-filter,.companion-dialogue,.destination-island,.region-label,.scene-label){visibility:hidden!important}',
  });
  try {
    const screen = await app.screenshot({animations: 'disabled'});
    const reference = await page.addStyleTag({
      content:
        '#app::after{content:"";position:absolute;inset:0;z-index:99;pointer-events:none;background-image:' +
        art +
        ';background-position:center;background-size:cover}',
    });
    try {
      const wall = await app.screenshot({animations: 'disabled'});
      return await page.evaluate(
        async ([a, b]) => {
          async function pixels(base64) {
            const image = new Image();
            image.src = 'data:image/png;base64,' + base64;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width / 4);
            canvas.height = Math.round(image.height / 4);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return ctx.getImageData(0, 0, canvas.width, canvas.height);
          }
          const [first, second] = await Promise.all([pixels(a), pixels(b)]);
          // 分带统计，避免把一道局部接缝平均到整张图里。
          return [0.04, 0.48, 0.775, 0.84, 0.93, 0.975].map((fraction) => {
            let sum = 0,
              n = 0;
            for (
              let y = Math.floor(first.height * fraction);
              y <
              Math.min(first.height, Math.floor(first.height * fraction) + 8);
              y++
            )
              for (let x = 4; x < first.width - 4; x += 2) {
                const i = (first.width * y + x) * 4;
                for (let c = 0; c < 3; c++) {
                  sum += Math.abs(first.data[i + c] - second.data[i + c]);
                  n++;
                }
              }
            return +(sum / n).toFixed(2);
          });
        },
        [screen.toString('base64'), wall.toString('base64')],
      );
    } finally {
      await reference.evaluate((el) => el.remove());
    }
  } finally {
    await hide.evaluate((el) => el.remove());
  }
}

export async function verifyFrameEdges(browser) {
  const results = [];
  await mkdir(output, {recursive: true});
  for (const [width, height, dpr = 1, safe = 0] of sizes) {
    const ctx = await browser.newContext({
      viewport: {width, height},
      deviceScaleFactor: dpr,
      reducedMotion: 'reduce',
    });
    try {
      const page = await ctx.newPage();
      const nav = async (route) => {
        await page.goto(base + '#' + route);
        await page
          .locator('#app[data-page="' + route.split('?')[0] + '"]')
          .waitFor();
        if (safe)
          await page.evaluate(
            (s) =>
              document.documentElement.style.setProperty(
                '--safe-bottom',
                s + 'px',
              ),
            safe,
          );
      };
      await nav('entry');
      await page.locator('[data-action=login]').first().click();
      await page.locator('[data-action=initialize]').click();
      const row = {width, height, dpr, safe, paint: {}};
      for (const route of [
        'partner',
        'explore',
        'memories',
        'scene',
        'wardrobe?from=partner',
      ]) {
        await nav(route);
        const metrics = await page.evaluate(() => {
          const rect = (s) => document.querySelector(s).getBoundingClientRect(),
            app = rect('#app');
          const footer = document.querySelector('.bottom-nav');
          if (footer) {
            const nav = footer.getBoundingClientRect(),
              buttons = [...footer.querySelectorAll('button')].map((b) =>
                b.getBoundingClientRect(),
              );
            return {
              frame: Math.max(
                Math.abs(app.left - nav.left),
                Math.abs(app.right - nav.right),
              ),
              edge: innerHeight - nav.bottom,
              baseline:
                Math.max(...buttons.map((b) => b.bottom)) -
                Math.min(...buttons.map((b) => b.bottom)),
              inset: innerHeight - buttons[0].bottom,
            };
          }
          if (document.querySelector('.dressing-save')) {
            const bar = rect('.dressing-save'),
              slot = rect('.inventory-scroll');
            return {
              gap: innerHeight - bar.bottom,
              rack: slot.bottom <= rect('.chosen-item').top,
              within: bar.top >= 0 && app.bottom <= innerHeight + 1,
            };
          }
          const gift = rect('.map-gift'),
            pool = rect('.map-bottom'),
            map = rect('.atlas-map');
          return {
            mapFits:
              Math.abs(map.bottom - app.bottom) < 1 &&
              Math.abs(map.top - app.top) < 1,
            panels: gift.bottom <= pool.top || gift.right <= pool.left,
            pins: [...document.querySelectorAll('.map-pin')].map((b) =>
              [...b.children].every((c) => {
                const r = c.getBoundingClientRect();
                return (
                  b.contains(
                    document.elementFromPoint(
                      r.x + r.width / 2,
                      r.y + r.height / 2,
                    ),
                  ) &&
                  r.left >= app.left - 1 &&
                  r.right <= app.right + 1
                );
              }),
            ),
          };
        });
        const info = JSON.stringify({width, height, route, metrics});
        if ('baseline' in metrics)
          assert.ok(
            metrics.frame < 1 &&
              Math.abs(metrics.edge) < 1 &&
              metrics.baseline < 1 &&
              metrics.inset >= safe,
            info,
          );
        if ('mapFits' in metrics)
          assert.ok(
            metrics.mapFits &&
              metrics.panels &&
              metrics.pins.length === 4 &&
              metrics.pins.every(Boolean),
            info,
          );
        if ('rack' in metrics) {
          assert.ok(
            metrics.rack &&
              metrics.within &&
              Math.abs(metrics.gap - Math.max(8, safe)) < 1,
            info,
          );
          row.wardrobeBottomGap = metrics.gap;
          const paint = await page.addStyleTag({
            content:
              '.dressroom{--rack:linear-gradient(#117dba,#117dba)!important}',
          });
          try {
            const shot = await page
              .locator('.dressroom')
              .screenshot({animations: 'disabled'});
            const edges = await page.evaluate(async (base64) => {
              const img = new Image();
              img.src = 'data:image/png;base64,' + base64;
              await img.decode();
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const y = Math.floor(img.height * 0.3);
              return [1, img.width - 2].every((x) => {
                const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
                return (
                  Math.abs(r - 17) <= 2 &&
                  Math.abs(g - 125) <= 2 &&
                  Math.abs(b - 186) <= 2
                );
              });
            }, shot.toString('base64'));
            assert.ok(edges, '衣橱舞台侧边未满幅 ' + info);
          } finally {
            await paint.evaluate((el) => el.remove());
          }
        }
        if (['scene', 'explore', 'partner'].includes(route)) {
          row.paint[route] = await backdropDifference(page, route);
          assert.ok(
            Math.max(...row.paint[route]) < 8,
            JSON.stringify({width, height, route, bands: row.paint[route]}),
          );
        }
      }
      // 长手账同样使用这三个底部按钮。在卷动的中间和底部都须可见，最后一个动作可以露出。
      await nav('memories');
      await page.evaluate(async () => {
        const s = await import('/design/store.mjs'),
          d = await import('/design/data.mjs'),
          db = JSON.parse(localStorage.getItem('hxx.demo.v1'));
        for (let i = 0; i < 15; i++)
          s.checkin(db.accounts.A, {
            pointId: 'gate',
            code: d.point('gate').code,
            requestId: 'edge-' + i,
            now: new Date(Date.UTC(2026, 9, 4, 0, i * 3)).toISOString(),
          });
        localStorage.setItem('hxx.demo.v1', JSON.stringify(db));
      });
      await page.reload();
      await page.locator('.journal-event').first().waitFor();
      if (safe)
        await page.evaluate(
          (s) =>
            document.documentElement.style.setProperty(
              '--safe-bottom',
              s + 'px',
            ),
          safe,
        );
      for (const fraction of [0.5, 1]) {
        const ok = await page.evaluate((f) => {
          scrollTo(
            0,
            (document.documentElement.scrollHeight - innerHeight) * f,
          );
          const n = document
              .querySelector('.bottom-nav')
              .getBoundingClientRect(),
            a = document
              .querySelector('[data-action=begin-compose]')
              .getBoundingClientRect();
          return Math.abs(n.bottom - innerHeight) < 1 && a.bottom <= n.top + 1;
        }, fraction);
        assert.ok(
          ok,
          '长手账底栏遮挡 ' + width + '×' + height + ' ' + fraction,
        );
      }
      results.push(row);
    } finally {
      await ctx.close();
    }
  }
  await writeFile(
    output + '/checks.json',
    JSON.stringify(results, null, 2) + '\n',
  );
}
