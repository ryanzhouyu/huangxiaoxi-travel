import {catalog} from '../review-service.mjs';
import {h, href, link, button, bar, section, header, icon, stageFigure, artifact, note, status, footer} from '../ui.mjs';

const assets = catalog.assets;
const slots = catalog.slots;
const outfits = catalog.outfits;
const pools = catalog.pools;

export function collection({p, here, back}) {
  return `${bar('风物收藏册', back)}<div class="stack">
    ${header('把风景穿在身上', '查看整套装扮和已经收下的部件。')}
    <div class="collection-grid">${outfits.map(outfit => {
      const count = assets.filter(item => item.outfit === outfit.id && p.owned.includes(item.id)).length;
      return link(`<div class="collection-doll">${stageFigure(catalog.lookFor(outfit.id))}</div><strong>${outfit.name}</strong>
        <small>${outfit.source} · ${count}/4</small>`, href('outfit', {id: outfit.id, from: here}), 'paper collection-card');
    }).join('')}</div>
  </div>`;
}

export function outfit({p, id, here, back}) {
  const outfit = outfits.find(entry => entry.id === id);
  const parts = assets.filter(item => item.outfit === id);
  return `${bar(outfit.name, back)}
    <div class="theater outfit-theater"><div class="theater-caption"><span>${outfit.source}</span><h2>${outfit.name}</h2></div>${stageFigure(catalog.lookFor(id))}</div>
    <div class="stack overlap">${section(header('套装部件', '已拥有 ' + parts.filter(item => p.owned.includes(item.id)).length + ' / 4 件') +
      `<div class="artifact-grid">${parts.map(item => button(artifact(item, p.owned.includes(item.id) ? '已拥有' : '查看来源'), 'source', {value: item.id, classes: 'artifact'})).join('')}</div>`)}</div>`;
}

export function sourceContent(item, p, here) {
  const fromPools = pools.filter(pool => pool.assets.includes(item.id));
  const location = item.outfit === 'gift' ? link('查看景区见面礼', href('gift', {from: here})) : '';
  const owned = p.owned.includes(item.id);
  return `<div class="source-art">${artifact(item)}</div>${note(item.source + ' · ' + slots[item.slot])}
    ${owned ? link('穿上看看', href('wardrobe', {item: item.id, from: here}), 'button primary') : location}
    ${!owned ? fromPools.map(pool => link(pool.name + (p.unlocked.includes(pool.id) ? ' · 已解锁' : ' · 到访后解锁'), href('pool', {id: pool.id, from: here}))).join('') : ''}`;
}

export function poolPage({p, ui, id, here, back}) {
  const pool = pools.find(entry => entry.id === id);
  const locked = !p.unlocked.includes(id);
  const remaining = p.eligible[id];
  const complete = !remaining.length;
  const total = pool.assets.length;
  const count = total - remaining.length;
  const poolAssets = pool.assets.map(id => assets.find(item => item.id === id));
  const state = complete ? '这套已经收齐了' : locked ? '到访后解锁' : p.balance ? '已经可以抽取' : '当前次数不足';
  let action = '';
  if (complete) action = link('翻开旅行手账', '#memories', 'button primary');
  else if (locked) action = button('查看可到访地点', 'unlockPlaces');
  else if (!p.balance) action = link('看看免费机会', href('opportunities', {from: here}), 'button primary');
  else action = button(ui.busy ? '正在抽取…' : '抽取一次 · 消耗 1 次', 'draw', {value: id, disabled: !!(ui.busy || ui.pending)});
  const places = pool.points.map(id => catalog.points.find(point => point.id === id));
  return `${bar(pool.name, back, link(icon('ticket') + p.balance + ' 次', href('wallet', {from: here}), 'compact counter'))}
    <div class="theater pool-theater ${id}"><div class="theater-caption"><h2>${outfits.find(item => item.id === pool.outfits[0]).name}</h2><span aria-hidden="true">✿</span></div>${stageFigure(catalog.lookFor(pool.outfits[0]))}
      ${link('套装图鉴 ›', href('outfit', {id: pool.outfits[0], from: here}), 'light-chip theater-link')}
    </div>
    <div class="stack overlap">
      ${section(`<div class="progress-title"><h2>本池收集</h2><b>${count} / ${total}</b></div><progress value="${count}" max="${total}" aria-label="本池收集"></progress>
        <div class="part-strip">${poolAssets.filter(item => item.outfit).map(item => button(artifact({...item, name: slots[item.slot]}, p.owned.includes(item.id) ? '已拥有' : '待收集'), 'source', {value: item.id, classes: 'artifact'})).join('')}</div>
        <div class="pool-state"><strong>${state}</strong>${note(complete ? '不会再扣除次数。' : '跨池排除已拥有项，剩余 ' + remaining.length + ' 件等概率。')}</div>
        ${status(ui.error, 'error')}`, 'pool-inventory')}
      ${section(header('表情、姿势与背景') + `<div class="artifact-grid three">${poolAssets.filter(item => !item.outfit).map(item => button(artifact(item, p.owned.includes(item.id) ? '已拥有' : '待收集'), 'source', {value: item.id, classes: 'artifact'})).join('')}</div>`)}
      ${section('<span id="unlock-places" tabindex="-1"></span>' + header(locked && !complete ? '到访任一地点即可解锁' : '关联地点') + places.map(point => link(point.name, href('point', {id: point.id, from: here}))).join(''))}
    </div>
    ${footer(action)}`;
}
