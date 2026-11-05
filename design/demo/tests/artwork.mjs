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
      const {lookFor} = await import('../data.mjs');
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
        layers,
        singleSize: [single.width, single.height],
        trailSize: [trail.width, trail.height],
        backgroundChangesPng: single.src !== alternate.src,
      };
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
