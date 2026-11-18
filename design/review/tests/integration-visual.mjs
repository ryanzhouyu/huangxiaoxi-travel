import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {POINTS} from '../../data.mjs';
import {initialDB, account, initialize, checkin, activity, saveWork} from '../../store.mjs';
import {makeFixture} from '../wardrobe-study/fixture.mjs';
import {progressKey} from '../review-service.mjs';

const {chromium} = createRequire(import.meta.url)(process.env.HXX_PLAYWRIGHT || 'playwright');
const base = process.env.HXX_REVIEW_URL || 'http://127.0.0.1:8782/design/review/index.html';
const out = process.env.HXX_VISUAL_OUT || '.codex/wardrobe-memory-integration/visual';
const browser = await chromium.launch({channel:'chrome'});
const sizes = [[360,640],[390,844],[430,932],[1280,720],[1440,1000]];
const shots = [], findings = [], errors = [];

function journalFixture() {
  const db = initialDB();
  db.current = 'visual-journal';
  const member = db.accounts[db.current] = account('视觉复验');
  initialize(member, 'start-a');
  return {db, member};
}

async function makeJournal() {
  const {db,member} = journalFixture();
  for (const [id,requestId,now] of [
    ['gate','gate-first','2026-11-16T01:17:00Z'], ['ridge','ridge-first','2026-11-16T03:30:00Z'],
    ['gate','gate-repeat','2026-11-17T10:45:00Z'], ['brook','brook-first','2026-11-18T02:23:00Z'],
    ['shop','shop-first','2026-11-18T06:10:00Z'],
  ]) {
    checkin(member, {pointId:id, code:POINTS.find(point => point.id === id).code, requestId, now});
  }
  activity(member, {requestId:'craft-first', now:'2026-11-18T07:02:00Z'});
  const page = await browser.newPage({timezoneId:'Asia/Shanghai'});
  await page.goto(base);
  const definitions = [
    {id:'trail', template:'trail', title:'与晓西的三日手账', dateLabel:'2026-11-16 — 2026-11-18', events:member.events},
    {id:'single', template:'single', title:'花溪一日', dateLabel:'2026-11-18', events:member.events.filter(item => item.id === 'brook-first')},
  ];
  const photos = await page.evaluate(async ({look,prints}) => {
    const {prepareArtwork} = await import(new URL('../demo/renderer.mjs',location.href));
    const {composeImage} = await import(new URL('../demo/postcard.mjs',location.href));
    await prepareArtwork();
    return await Promise.all(prints.map(print => composeImage({...print,look})));
  }, {look:member.look, prints:definitions});
  await page.close();
  const noWorks = structuredClone(db);
  for (const [index,print] of definitions.entries()) {
    saveWork(member,{...print, at:'2026-11-18T08:30:00Z', image:photos[index], look:member.look,
      events:print.events.map(event => event.id), snapshots:print.events});
  }
  return {complete:db, noWorks, empty:journalFixture().db};
}

async function open(width,height,db,hash) {
  const page = await browser.newPage({viewport:{width,height},timezoneId:'Asia/Shanghai',reducedMotion:'reduce'});
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if(response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  await page.addInitScript(({key,db}) => localStorage.setItem(key, JSON.stringify(db)), {key:progressKey,db});
  await page.goto(base + '#' + hash);
  await page.locator('#app[data-page]').waitFor();
  return page;
}

async function capture(page,name) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
  const {width,height} = page.viewportSize();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.equal(horizontalOverflow,0);
  const file = `${width}x${height}-${name}.png`;
  await page.screenshot({path:out + '/' + file, animations:'disabled', style:'#toast {visibility:hidden}'});
  shots.push(file);
}

try {
  await mkdir(out,{recursive:true});
  const samples = await makeJournal();
  for (const [width,height] of sizes) {
    const closet = await open(width,height,makeFixture(),'wardrobe?item=gift-top&from=%23partner');
    assert.equal(await closet.locator('.hanger[aria-pressed=true]').getAttribute('data-value'),'gift-top');
    const actor = await closet.locator('.doll img').boundingBox();
    const room = await closet.locator('.room').boundingBox();
    assert.ok(actor.y >= room.y && actor.y + actor.height <= room.y + room.height);
    const touch = await closet.locator('.slots .slot').evaluateAll(items =>
      Math.min(...items.map(item => Math.min(item.offsetHeight,item.offsetWidth))));
    assert.ok(touch >= 44);
    await capture(closet,'wardrobe');
    await closet.getByRole('button',{name:'全部上装 · 6 件',exact:true}).click();
    await capture(closet,'wardrobe-grid');
    await closet.locator('.grid-detail[data-id=gift-top]').click();
    await capture(closet,'wardrobe-detail');
    await closet.close();

    const journal = await open(width,height,samples.complete,'memories');
    const reading = journal.locator('.reading');
    assert.equal(await journal.locator('.day').count(),3);
    assert.equal(await journal.locator('.experience').count(),6);
    assert.equal(await journal.locator('.experience .stamp').count(),2);
    await capture(journal,'memory');
    await reading.evaluate(element => {element.scrollTop = element.scrollHeight;});
    const tail = await journal.locator('.book-tail').boundingBox();
    const readingBox = await reading.boundingBox();
    assert.ok(tail.y + tail.height <= readingBox.y + readingBox.height + 1);
    await capture(journal,'memory-tail');
    await journal.locator('.experience').filter({hasText:'一枚旅行手作'}).click();
    await capture(journal,'memory-event');
    await journal.getByRole('button',{name:'关闭',exact:true}).click();
    await journal.getByRole('button',{name:'纪念作品',exact:true}).click();
    assert.equal(await journal.locator('.work-photo').count(),2);
    await capture(journal,'memory-works');
    await journal.locator('.work').filter({hasText:'与晓西的三日手账'}).click();
    await capture(journal,'memory-print');
    await journal.close();
    findings.push({width,height,wardrobe:'7 类触区；全身、网格和大图',memory:'三日六条、书尾、两种作品比例、原图'});
  }
  const empty = await open(360,640,samples.empty,'memories');
  await empty.getByText('第一枚足迹，等你来。').waitFor();
  await capture(empty,'memory-empty');
  await empty.close();
  const noWorks = await open(390,844,samples.noWorks,'memories?view=works');
  await noWorks.getByText('第一张纪念图等着冲洗').waitFor();
  await capture(noWorks,'memory-empty-works');
  await noWorks.close();
  assert.deepEqual(errors,[]);
  await writeFile(out + '/visual.json', JSON.stringify({chrome:browser.version(),findings,shots,errors},null,2) + '\n');
  console.log('五档视口，' + shots.length + ' 张截图，资源与页面错误 0。');
} finally {
  await browser.close();
}
