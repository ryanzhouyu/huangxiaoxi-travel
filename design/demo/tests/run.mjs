// 从仓库根目录执行。Playwright 仅供验收使用，游客端无需安装。
import {createRequire} from 'node:module';
import {rehearse} from './rehearsal.mjs';
import {audit} from './audit.mjs';
import {verifyRestore} from './restore.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.HXX_PLAYWRIGHT || 'playwright');
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  await audit(browser);
  await rehearse(browser);
  await verifyRestore(browser);
} finally {
  await browser.close();
}
