// 从仓库根目录执行。Playwright 仅供验收使用，游客端无需安装。
import {createRequire} from 'node:module';
import {rehearse} from './rehearsal.mjs';
import {verifyArtwork} from './artwork.mjs';
import {audit} from './audit.mjs';
import {verifyRestore} from './restore.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.HXX_PLAYWRIGHT || 'playwright');
const nativeDisplay = process.argv.includes('--display');
const browser = await chromium.launch({
  channel: 'chrome',
  headless: !nativeDisplay,
  args: nativeDisplay ? ['--start-maximized'] : [],
});
try {
  if (nativeDisplay) await rehearse(browser, {nativeDisplay: true});
  else {
    await audit(browser);
    await rehearse(browser);
    await verifyRestore(browser);
    await verifyArtwork(browser);
  }
} finally {
  await browser.close();
}
