import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const base = 'http://127.0.0.1:8765/design/demo/index.html';
const out = path.resolve('output/visual-repair');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function verifyLayout(browser) {
  await mkdir(out, {recursive: true});
  const sizes = [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [390, 844],
    [360, 640],
  ];
  const report = {viewports: [], templates: [], errors: []};
  for (const [w, h] of sizes) {
    const context = await browser.newContext({viewport: {width: w, height: h}});
    try {
      const p = await context.newPage();
      p.setDefaultTimeout(5000);
      p.on('pageerror', (err) => report.errors.push(err.message));
      const at = (name) =>
        p.locator('#app[data-page="' + name + '"]').waitFor();
      const nav = async (name) => {
        await p.goto(base + '#' + name);
        await at(name.split('?')[0]);
      };
      await nav('entry');
      await p.evaluate(() => document.fonts.ready);
      async function clearances(heading, figure, actions) {
        return p.evaluate(
          ([head, actor, buttons]) => {
            const r = (s) => document.querySelector(s).getBoundingClientRect();
            return {
              above: r(actor).top - r(head).bottom,
              below: r(buttons).top - r(actor).bottom,
              buttonBottom: r(buttons).bottom,
            };
          },
          [heading, figure, actions],
        );
      }
      const entry = await clearances(
        '.arrival-logo',
        '.arrival-companion',
        '.arrival-panel',
      );
      await p.locator('[data-action="login"]').first().click();
      await at('onboarding');
      const meeting = await clearances(
        '.meeting-heading',
        '.meeting-character',
        '.meeting-bottom',
      );
      for (const v of [entry, meeting])
        assert.ok(
          v.above >= 8 && v.below >= 8 && v.buttonBottom <= h,
          JSON.stringify({w, h, v}),
        );
      await p.locator('[data-action="initialize"]').click();
      await at('partner');
      await nav('scene');
      const pinChecks = await p.evaluate(() => {
        const frame = document
          .querySelector('.map-plane')
          .getBoundingClientRect();
        return [...document.querySelectorAll('.map-pin')].map((btn) => {
          const medal = btn.querySelector('.pin-medal').getBoundingClientRect();
          const label = btn.querySelector('.pin-label').getBoundingClientRect();
          const nx = parseFloat(btn.style.getPropertyValue('--x')) / 100,
            ny = parseFloat(btn.style.getPropertyValue('--y')) / 100;
          return {
            target: btn.dataset.target,
            dx: medal.x + medal.width / 2 - (frame.x + nx * frame.width),
            dy: medal.bottom - (frame.y + ny * frame.height),
            reachable: [medal, label].every((r) =>
              btn.contains(
                document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                ),
              ),
            ),
            inside:
              label.x >= 0 &&
              label.right <= innerWidth &&
              label.bottom <= innerHeight,
          };
        });
      });
      for (const pin of pinChecks) {
        assert.ok(
          pin.reachable &&
            pin.inside &&
            Math.abs(pin.dx) < 1 &&
            Math.abs(pin.dy) < 1,
          JSON.stringify({w, h, pin}),
        );
        await p.locator('.map-pin[data-target="' + pin.target + '"]').click();
        await at('point');
        assert.ok(p.url().endsWith(pin.target));
        await p.locator('[data-action="back"]').click();
        await at('scene');
      }
      await nav('pool?id=cloud');
      const shelf = await p.locator('.reward-shelf img').evaluateAll((imgs) =>
        imgs.map((i) => {
          const b = i.getBoundingClientRect(),
            slot = i.parentElement.getBoundingClientRect();
          return {
            width: b.width,
            height: b.height,
            dcx: b.x + b.width / 2 - slot.x - slot.width / 2,
            dcy: b.y + b.height / 2 - slot.y - slot.height / 2,
          };
        }),
      );
      assert.equal(shelf.length, 7);
      assert.ok(
        shelf.every(
          (s) =>
            Math.abs(s.width - s.height) <= 1 &&
            Math.abs(s.dcx) <= 1 &&
            Math.abs(s.dcy) <= 1,
        ),
        JSON.stringify(shelf),
      );
      report.viewports.push({w, h, entry, meeting, pinChecks, shelf: shelf[0]});
      if (w !== 1280) continue;
      for (const [id, code] of [
        ['gate', 'HXX-GATE-2026'],
        ['brook', 'HXX-BROOK-2026'],
      ]) {
        await nav('checkin?id=' + id);
        await p.locator('#checkin-code').fill(code);
        await p.locator('[data-action="verify-code"]').click();
        await p.locator('#close-sheet').click();
      }
      for (const template of ['postcard', 'trail']) {
        await nav('compose');
        await p
          .locator('[data-action="template"][data-value="' + template + '"]')
          .click();
        await p.locator('#work-title').fill('花溪相遇');
        const draft = await p
          .locator('.draft-postcard')
          .evaluate((c) => c.toDataURL());
        await p.locator('[data-action="preview-work"]').click();
        await p.locator('[data-action="save-work"]').waitFor();
        assert.equal(
          (await p.locator('.compose-preview img').getAttribute('src')) ===
            draft,
          true,
        );
        // 修改已生成的预览必须即时恢复草稿。
        await p.locator('#work-title').fill('溪边小记');
        const updated = await p
          .locator('.draft-postcard')
          .evaluate((c) => c.toDataURL());
        assert.ok(updated !== draft);
        await p.locator('[data-action="preview-work"]').click();
        await p.locator('[data-action="save-work"]').click();
        await at('work');
        const saved = await p.locator('.final-image').getAttribute('src');
        assert.equal(saved === updated, true);
        const downloadEvent = p.waitForEvent('download');
        await p.locator('[data-action="download"]').click();
        const download = await downloadEvent,
          file = await download.createReadStream();
        const chunks = [];
        for await (const chunk of file) chunks.push(chunk);
        const downloaded = Buffer.concat(chunks);
        assert.deepEqual(
          downloaded,
          Buffer.from(updated.split(',')[1], 'base64'),
        );
        report.templates.push({
          template,
          identical: true,
          sha256: hash(downloaded),
        });
      }
      await p.evaluate(async () => {
        const {OUTFITS, ASSETS} = await import('../data.mjs');
        const {itemArt} = await import('./renderer.mjs');
        const grid = document.createElement('main');
        grid.id = 'sheet-inspection';
        grid.style.cssText =
          'position:relative;background:#f8ecd5;padding:12px;width:760px;display:grid;grid-template-columns:repeat(6,1fr);gap:8px';
        for (const slot of ['hair', 'top', 'bottom', 'shoes'])
          for (const o of OUTFITS) {
            const a = ASSETS.find((x) => x.slot === slot && x.outfit === o.id);
            const tag = document.createElement('div');
            tag.style.textAlign = 'center';
            tag.innerHTML = itemArt(a) + '<small>' + a.name + '</small>';
            tag.firstChild.style.cssText =
              'display:block;width:105px;height:105px;object-fit:contain;margin:auto';
            grid.append(tag);
          }
        document.body.replaceChildren(grid);
        await Promise.all(
          [...grid.querySelectorAll('img')].map((i) => i.decode()),
        );
      });
      await p
        .locator('#sheet-inspection')
        .screenshot({path: path.join(out, '24件单品.png')});
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(report.errors, []);
  await writeFile(
    path.join(out, 'layout-check.json'),
    JSON.stringify(report, null, 2),
  );
}
