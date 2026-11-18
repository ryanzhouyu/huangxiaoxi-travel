import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {POINTS} from '../../data.mjs';
import {account, checkin, initialize, initialDB} from '../../store.mjs';
import {progressKey} from '../review-service.mjs';

const {chromium} = createRequire(import.meta.url)(process.env.HXX_PLAYWRIGHT || 'playwright');
const base = process.env.HXX_REVIEW_URL || 'http://127.0.0.1:8782/design/review/index.html';
const out = process.env.HXX_MAIN_OUT || '.codex/partner-navigation/after';
const dims = [[360,640],[390,844],[430,932],[1280,720],[1440,1000]];
const scenes = [['partner','伙伴'],['explore','游玩'],['memories','回忆']];
const browser = await chromium.launch({channel:'chrome'});
const results = [];
const errors = [];
const shots = [];

function fixture(visited) {
  const db = initialDB();
  db.current = 'test-main-scenes';
  const member = db.accounts[db.current] = account('导航复验');
  initialize(member, 'start-a');
  if (visited) {
    const gate = POINTS.find(point => point.id === 'gate');
    checkin(member, {pointId:gate.id, code:gate.code, now:'2026-11-18T02:03:00Z', requestId:'gate-first'});
  }
  return db;
}

async function sample(width, height, {visited = true, safe = 0} = {}) {
  const page = await browser.newPage({viewport:{width,height}, timezoneId:'Asia/Shanghai', reducedMotion:'reduce'});
  page.on('pageerror',error => errors.push(error.message));
  page.on('response',response => {
    if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
  });
  await page.addInitScript(({key, db}) => localStorage.setItem(key, JSON.stringify(db)), {key:progressKey, db:fixture(visited)});
  await page.goto(base + '#partner');
  await page.locator('#app[data-page=partner] .main-nav').waitFor();
  if (safe) await page.evaluate(safe => document.documentElement.style.setProperty('--safe', safe + 'px'), safe);
  return page;
}

async function capture(page, picture) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
  const {width,height} = page.viewportSize();
  const file = width + 'x' + height + '-' + picture + '.png';
  await page.screenshot({animations:'disabled', path:out + '/' + file});
  shots.push(file);
}

async function inspectNav(page, current, safe) {
  const nav = page.getByRole('navigation', {name:'主场景', exact:true});
  assert.equal(await nav.count(),1);
  const actual = await nav.getByRole('link').evaluateAll(items => items.map(item => {
    const bounds = item.getBoundingClientRect();
    const style = getComputedStyle(item);
    return {
      target:item.hash, label:item.textContent.trim(), art:item.firstElementChild.className,
      current:item.getAttribute('aria-current'), width:bounds.width, height:bounds.height,
      x:bounds.x, y:bounds.y, bottom:innerHeight - bounds.bottom, font:style.fontFamily + ' ' + style.fontSize,
      background:style.backgroundColor, color:style.color,
    };
  }));
  assert.deepEqual(actual.map(item => [item.target,item.label]),scenes.map(([name,label]) => ['#' + name,label]));
  assert.deepEqual(actual.filter(item => item.current === 'page').map(item => item.target),['#' + current]);
  assert.ok(actual.every(item => item.width >= 44 && item.height >= 44 && Math.abs(item.bottom - safe - 6) < 1));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),0);
  return {
    metrics:actual.map(({current, background, color, ...metrics}) => metrics),
    selection:actual.filter(item => item.current).map(({background,color}) => [background,color]),
  };
}

try {
  await mkdir(out,{recursive:true});
  for (const [width,height,safe = 0] of [...dims,[360,640,30]]) {
    const page = await sample(width,height,{safe});
    const nav = page.getByRole('navigation',{name:'主场景',exact:true});
    let firstLayout;
    for (const [name,label] of scenes) {
      if (name === 'explore') {
        const target = nav.getByRole('link',{name:label,exact:true});
        await page.keyboard.press('Tab');
        await target.focus();
        assert.equal(await target.evaluate(element => getComputedStyle(element).outlineStyle),'solid');
        await page.keyboard.press('Enter');
      }
      if (name === 'memories') await nav.getByRole('link',{name:label,exact:true}).click();
      await page.locator('#app[data-page=' + name + ']').waitFor();
      const layout = await inspectNav(page,name,safe);
      if (firstLayout) assert.deepEqual(layout,firstLayout);
      else firstLayout = layout;
      if (name === 'partner') {
        const dialogue = page.locator('.speech');
        const actor = page.locator('.companion-doll img');
        const [actorBox, speechBox] = await Promise.all([actor.boundingBox(), dialogue.boundingBox()]);
        assert.ok(actorBox.y + actorBox.height <= speechBox.y);
        const gear = page.locator('.partner-head a, .satchel :is(a, button), .gift-shortcut');
        assert.equal(await gear.count(),8);
        for (const control of await gear.all()) {
          const {width,height} = await control.boundingBox();
          assert.ok(width >= 44 && height >= 44);
        }
      }
      await capture(page,name + (safe ? '-safe' : ''));
    }
    await page.locator('.reading').evaluate(reading => {reading.scrollTop = reading.scrollHeight;});
    const [tail,dock] = await Promise.all([page.locator('.book-tail').boundingBox(),page.locator('.dock').boundingBox()]);
    assert.ok(Math.abs(tail.y + tail.height - dock.y) < 1);
    await page.getByRole('link',{name:/用 1 段足迹做纪念/}).click();
    await page.locator('#app[data-page=compose]').waitFor();
    assert.equal(await nav.count(),0);
    await page.goBack();
    await page.locator('#app[data-page=memories]').waitFor();
    assert.equal(await page.locator('[aria-current=page]').getAttribute('href'),'#memories');
    results.push({width,height,safe,routes:scenes.map(([name]) => name)});
    await page.close();
  }

  const first = await sample(360,640,{visited:false,safe:30});
  await first.getByText('桥上的灯亮了，陪我走走吧。').waitFor();
  await capture(first,'partner-first-visit-safe');
  await first.getByRole('button',{name:'和黄晓西打招呼'}).click();
  await first.getByText('你也看见那盏小灯啦。').waitFor();
  await first.getByRole('button',{name:/你也看见那盏小灯啦。/}).click();
  await first.getByText('听说山里有家手作铺。').waitFor();
  for (const [name,target] of [
    [/黄晓西.*旅行伙伴/,'account'],[/0 次/,'wallet'],[/黔山漫游/,'scene'],
    ['衣橱','wardrobe'],['图鉴','collection'],['打卡','checkin'],['初见礼','gift'],
  ]) {
    await first.getByRole('link',{name,exact:typeof name === 'string'}).click();
    await first.locator('#app[data-page=' + target + ']').waitFor();
    assert.equal(await first.getByRole('navigation',{name:'主场景',exact:true}).count(),0);
    await first.getByRole('link',{name:'返回',exact:true}).click();
    await first.locator('#app[data-page=partner]').waitFor();
  }
  await first.getByRole('button',{name:'动作',exact:true}).click();
  await first.getByRole('dialog',{name:'黄晓西的姿势'}).waitFor();
  await first.keyboard.press('Escape');
  assert.equal(await first.getByRole('dialog').count(),0);
  await first.close();

  assert.deepEqual(errors,[]);
  await writeFile(out + '/review.json', JSON.stringify({
    chrome:browser.version(), results, shots, homepage:'八个入口及人物、对白回归', errors,
  },null,2) + '\n');
  console.log('三页共用导航，' + results.length + ' 组视口，' + shots.length + ' 张截图，资源与页面错误 0。');
} finally {
  await browser.close();
}
