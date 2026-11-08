// R00 静态重建验证；不执行会覆盖运行素材的 build.mjs。
// 从仓库根目录启动 8878 静态服务，HXX_PLAYWRIGHT 指向已有 Playwright。
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {frames} from '../../../design/demo/assets/wardrobe/frames.mjs';
const {chromium} = createRequire(import.meta.url)(process.env.HXX_PLAYWRIGHT || 'playwright');
const scratch = '.codex/local-deploy/r00-20261108/rebuilt';
const output = 'output/r00/2026-11-08';
await mkdir(scratch, {recursive: true});
const browser = await chromium.launch({channel: 'chrome'});
const records = [];
try {
  const context = await browser.newContext({viewport: {width: 920, height: 760}});
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8878/reviews/2026-11-05-wardrobe/selected/index.html');
  for (const id of ['start-b', 'flower']) {
    const result = await page.evaluate(async id => (await import('./build/extract.mjs')).buildSet(id), id);
    assert.deepEqual(result.frames, frames[id], `${id} frame layout`);
    const images = {[id]: result.image, ...Object.fromEntries(Object.entries(result.thumbs).map(([slot, b64]) => [id + '-' + slot, b64]))};
    if (result.cameo) images.cameo = result.cameo;
    for (const [name, b64] of Object.entries(images)) await writeFile(path.join(scratch, name + '.webp'), Buffer.from(b64, 'base64'));
    records.push({outfitId: id, framesMatch: true, files: Object.keys(images).map(x => x + '.webp')});
  }
  // 用实际演示渲染器读取重建图集；依然使用原有固定脸部和图层顺序。
  await page.route('**/assets/wardrobe/*.webp', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (['start-b.webp', 'flower.webp'].includes(name)) await route.fulfill({path: path.resolve(scratch, name), contentType: 'image/webp'});
    else await route.continue();
  });
  await page.evaluate(async () => {
    const art = await import('/design/demo/wardrobe-art.mjs');
    const {lookFor} = await import('/design/data.mjs');
    await art.prepareWardrobe();
    document.head.innerHTML = '<meta charset="utf-8"><style>body{margin:0;background:#f5ead5;color:#40352f;font:18px system-ui}main{display:flex}section{width:460px;text-align:center}img{width:440px;height:680px;object-fit:contain}h2{margin:12px 0;font-size:20px}p{margin:0}</style>';
    document.body.innerHTML = '<main>' + [['start-b','A2 · 晴日出发'],['flower','A6 · 花溪漫步']].map(([id,name]) => '<section><h2>'+name+'</h2><p>原有静态素材重建验证 · 非动画样板</p><img src="'+art.renderedLook(lookFor(id)).src+'"></section>').join('') + '</main>';
    await Promise.all([...document.images].map(i => i.decode()));
  });
  await page.screenshot({path: output + '/static-rebuild-preview.png'});
  await writeFile(output + '/rebuild-check.json', JSON.stringify({date: '2026-11-08', baseCommit: '8c5ba355b4b60708ea8210c238ebfd563b896bde', browser: browser.version(), outputDirectory: scratch, records, method: 'Original buildSet and runtime renderer; only output redirected; frame coordinates asserted against tracked manifest. Pixel comparison recorded separately.', limitations: ['static reconstruction only', 'no animation or mobile certification']}, null, 2) + '\n');
  console.log('2 sets rebuilt; frame manifests match; isolated preview saved.');
} finally { await browser.close(); }
