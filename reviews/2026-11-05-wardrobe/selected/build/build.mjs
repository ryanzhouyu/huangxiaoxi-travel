// 先启动本地预览。HXX_PLAYWRIGHT 可指向本机已有的 Playwright。
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {fittings} from './fittings.mjs';
const {chromium} = createRequire(import.meta.url)(
  process.env.HXX_PLAYWRIGHT || 'playwright',
);
const destination = new URL(
  '../../../../design/demo/assets/wardrobe/',
  import.meta.url,
);
const browser = await chromium.launch({channel: 'chrome'});
try {
  await mkdir(destination, {recursive: true});
  const tab = await browser.newPage();
  await tab.goto(
    'http://127.0.0.1:8765/reviews/2026-11-05-wardrobe/selected/index.html',
  );
  const manifest = {};
  for (const id of Object.keys(fittings)) {
    const {image, frames, thumbs, cameo} = await tab.evaluate(
      async (id) => (await import('./build/extract.mjs')).buildSet(id),
      id,
    );
    const save = (name, data) =>
      writeFile(
        new URL(name + '.webp', destination),
        Buffer.from(data, 'base64'),
      );
    await save(id, image);
    if (cameo) await save('cameo', cameo);
    for (const [slot, data] of Object.entries(thumbs))
      await save(id + '-' + slot, data);
    manifest[id] = frames;
  }
  await writeFile(
    new URL('frames.mjs', destination),
    '// 由六张确认稿生成。[图集 x, 图集 y, 宽, 高, 舞台 x, 舞台 y]\nexport const frames = ' +
      JSON.stringify(manifest, null, 2) +
      ';\n',
  );
} finally {
  await browser.close();
}
