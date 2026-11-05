import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export async function verifyRestore(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const file = path.resolve('.codex/local-deploy/demo-run/备用回访手账.json');
  const expected = JSON.parse(await readFile(file, 'utf8'));
  const base = 'http://127.0.0.1:8765/design/demo/';
  try {
    await page.goto(base + 'presenter.html');
    await page.locator('#restore').setInputFiles(file);
    await page.locator('#confirm-action').click();
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('hxx.demo.v1')),
      ),
      expected,
    );
    await page.goto(base + 'index.html#memories');
    await page.locator('#app[data-page="memories"]').waitFor();
    await page.locator('[data-value="works"]').click();
    await page.locator('.work-card').first().click();
    const work = expected.accounts[expected.current].works[0];
    assert.equal(
      await page.locator('.final-image').getAttribute('src'),
      work.image,
    );
    const other = await ctx.newPage();
    await other.goto(base + 'presenter.html');
    await other.locator('#reset').click();
    await other.locator('#confirm-action').click();
    await page.locator('#app[data-page="entry"]').waitFor();
    await other
      .locator('#restore')
      .setInputFiles({
        name: '坏备份.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"version":2,"accounts":null}'),
      });
    await other.getByText('无法载入备份。', {exact: false}).waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('hxx.demo.v1')),
      null,
    );
    await writeFile(
      'output/demo-rehearsal/restore.json',
      JSON.stringify(
        {
          at: new Date().toISOString(),
          restoredAccount: expected.current,
          restoredWorks: expected.accounts[expected.current].works.length,
          exactSnapshot: true,
          otherTabReset: true,
          badArchivePreserved: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await ctx.close();
  }
}
