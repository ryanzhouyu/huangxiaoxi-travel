import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function verifyArtwork(browser) {
  const context = await browser.newContext({
    viewport: {width: 1280, height: 720},
  });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/design/demo/index.html');
    await page.locator('#app[data-page="entry"]').waitFor();
    const result = await page.evaluate(async () => {
      const {renderedLook, sceneStyle} = await import('./renderer.mjs');
      const {lookFor, OUTFITS, ASSETS} = await import('../data.mjs');
      const {thumbnailUrl} = await import('./wardrobe-art.mjs');
      const {frames} = await import('./assets/wardrobe/frames.mjs');
      const slots = ['hair', 'top', 'bottom', 'shoes'];
      const thumbs = ASSETS.filter((a) => a.outfit);
      const thumbHashes = await Promise.all(
        thumbs.map(async (a) => {
          const image = new Image();
          image.src = thumbnailUrl(a.id);
          await image.decode();
          if (image.width !== 256 || image.height !== 256)
            throw Error('单品尺寸错误 ' + a.id);
          const c = document.createElement('canvas');
          c.width = c.height = 256;
          const g = c.getContext('2d');
          g.drawImage(image, 0, 0);
          const {data} = g.getImageData(0, 0, 256, 256);
          for (let i = 0; i < 256; i++) {
            if (
              [i, 255 * 256 + i, i * 256, i * 256 + 255].some(
                (n) => data[4 * n + 3] > 8,
              )
            )
              throw Error('单品碰边 ' + a.id);
          }
          return c.toDataURL();
        }),
      );
      const patch = (surface, x, y, w, h) =>
        surface.getContext('2d').getImageData(x, y, w, h).data.join(',');
      const bodies = new Set(),
        facePatches = new Set();
      let neckFits = 0;
      for (const outfit of OUTFITS) {
        const look = lookFor(outfit.id);
        const figure = renderedLook(look);
        bodies.add(figure.src);
        facePatches.add(patch(figure.surface, 205, 133, 26, 15));
        for (const top of OUTFITS) {
          const mixed = renderedLook({...look, top: top.id + '-top'}).surface;
          const throat = mixed
            .getContext('2d')
            .getImageData(220, 172, 4, 38).data;
          if (throat.some((value, i) => i % 4 === 3 && value < 245))
            throw Error('下颌至领口出现空隙 ' + outfit.id + '/' + top.id);
          neckFits++;
        }
        for (const part of [...slots, 'neck', 'wave']) {
          const [, , width, height, left, top] = frames[outfit.id][part];
          if (
            left < 2 ||
            top < 2 ||
            left + width >= 658 ||
            top + height >= 1018
          )
            throw Error('穿戴层触边 ' + outfit.id + ' ' + part);
        }
        for (const slot of slots) {
          const mixed = {...look, [slot]: 'start-a-' + slot};
          if (look[slot] === mixed[slot]) continue;
          const changed = renderedLook(mixed).surface;
          const outside =
            slot === 'shoes' || slot === 'bottom'
              ? [160, 63, 117, 67]
              : [163, 633, 115, 20];
          if (patch(changed, ...outside) !== patch(figure.surface, ...outside))
            throw Error('换件影响其他部位 ' + outfit.id + ' ' + mixed[slot]);
        }
      }
      const wardrobe = {
        outfits: bodies.size,
        distinctItems: new Set(thumbHashes).size,
        sharedFace: facePatches.size === 1,
        neckFits,
      };
      const {composeImage} = await import('./postcard.mjs');
      const start = lookFor('start-a');
      const changes = {
        hair: 'flower-hair',
        top: 'gift-top',
        bottom: 'mountain-bottom',
        shoes: 'flower-shoes',
        expression: 'joy',
        pose: 'wave',
        background: 'flower-bg',
      };
      const layers = {};
      for (const [slot, id] of Object.entries(changes)) {
        const changed = {...start, [slot]: id};
        layers[slot] =
          slot === 'background'
            ? sceneStyle(changed).wash !== sceneStyle(start).wash
            : renderedLook(start).src !== renderedLook(changed).src;
      }
      const events = [
        {pointId: 'brook', name: '花溪小径', at: new Date().toISOString()},
      ];
      const image = async (template, look) => {
        const result = new Image();
        result.src = await composeImage({
          look,
          template,
          events,
          title: '十六字长标题测试一二三四五六七八九',
        });
        await result.decode();
        return result;
      };
      const single = await image('postcard', start),
        trail = await image('trail', start);
      const alternate = await image('postcard', {
        ...start,
        background: 'flower-bg',
      });
      return {
        wardrobe,
        layers,
        singleSize: [single.width, single.height],
        trailSize: [trail.width, trail.height],
        backgroundChangesPng: single.src !== alternate.src,
      };
    });
    assert.deepEqual(result.wardrobe, {
      outfits: 6,
      distinctItems: 24,
      sharedFace: true,
      neckFits: 36,
    });
    assert.ok(Object.values(result.layers).every(Boolean));
    assert.ok(result.trailSize[1] > result.singleSize[1]);
    assert.ok(result.backgroundChangesPng);
    await page.goto(
      'http://127.0.0.1:8765/output/demo-rehearsal/' +
        encodeURIComponent('连续操作彩排.webm'),
    );
    const video = page.locator('video');
    await video.waitFor();
    await page.waitForFunction(
      () => document.querySelector('video')?.readyState >= 2,
    );
    result.videoSize = await video.evaluate((v) => [
      v.videoWidth,
      v.videoHeight,
    ]);
    assert.deepEqual(result.videoSize, [1280, 720]);
    await writeFile(
      'output/demo-rehearsal/artwork.json',
      JSON.stringify(result, null, 2),
    );
  } finally {
    await context.close();
  }
}
