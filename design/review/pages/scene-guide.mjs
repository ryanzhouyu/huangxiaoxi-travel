import {catalog} from '../review-service.mjs';
import {chapters, chapterSample, huangguoshu} from '../chapter-catalog.mjs';
import {atlasChapter} from './explore-atlas.mjs';
import {h, href, link, button, tabs, pressed} from '../ui.mjs';

const rewardTypes = [['expression', '表情'], ['pose', '动作'], ['background', '背景']];
const previews = new Map([
  ['mountain', new URL('../guide-art/outfit-B5-detail.webp', import.meta.url).href],
  ['flower', new URL('../guide-art/outfit-A6-detail.webp', import.meta.url).href],
]);

export const pointVisited = (progress, point) => progress.events.some(event => event.pointId === point.id && event.kind !== '体验活动');
export const pointRewardClaimed = (progress, point) => progress.claimed.includes('point:' + point.id);
const isShop = point => point.kind === '商家';
const visitLabel = (point, visited) => `${visited ? '已' : '未'}${isShop(point) ? '到店' : '打卡'}`;
export function guideMapHref(here) {
  const query = new URLSearchParams(here.split('?')[1]);
  query.delete('point');
  return '#scene' + (query.size ? '?' + query : '');
}

function pointHref(here, id) {
  const query = new URLSearchParams(guideMapHref(here).split('?')[1]);
  query.set('point', id);
  return '#scene?' + query;
}

function createGuide({scene, points, pools, outfits, assets, activity, featured}, progressSample = null) {
  const preview = progressSample !== null;
  const unique = values => [...new Set(values)];
  const poolOutfits = selection => unique(selection.flatMap(pool => pool.outfits));
  const poolPrizes = selection => unique(selection.flatMap(pool => pool.assets)).map(id => assets.find(item => item.id === id));
  const partsOf = outfitId => assets.filter(item => item.outfit === outfitId);
  const countOwned = (items, owned) => items.filter(item => owned.has(item.id)).length;
  const wholeOutfit = (id, owned) => partsOf(id).every(item => owned.has(item.id));
  const countOutfits = (ids, owned) => ids.filter(id => wholeOutfit(id, owned)).length;
  const stamp = collected => `<span class="suit-stamp${collected ? ' collected' : ''}"></span>`;
  const stamps = (ids, owned) => {
    const complete = countOutfits(ids, owned);
    return ids.map((id, index) => stamp(index < complete)).join('');
  };
  const outfitName = id => outfits.find(item => item.id === id).name;
  const prop = (point, visited) => `<span class="map-prop prop-${isShop(point) ? 'shop' : visited ? 'visited' : 'pending'}" aria-hidden="true"></span>`;
  const relatedPlaces = pool => pool.points.map(id => points.find(point => point.id === id));
  const artFor = id => previews.has(id) ? `<img src="${h(previews.get(id))}" alt="">` : stamp(false);

  function marker(point, p, owned, here, focus) {
    const unlocked = pools.filter(pool => point.pools.includes(pool.id) && p.unlocked.includes(pool.id));
    const ids = poolOutfits(unlocked);
    const visited = pointVisited(p, point);
    const claimed = pointRewardClaimed(p, point);
    const label = `${point.name}，${visitLabel(point, visited)}，${claimed ? '首访奖励已领' : '首次 +' + point.reward + ' 次'}`;
    return `<a class="level-marker marker-${h(point.anchor || point.id)}" data-guide-point="${h(point.id)}" data-active="${focus === point.id}"
      data-visited="${visited}" data-unlocked="${unlocked.length > 0}" href="${h(pointHref(here, point.id))}"
      aria-haspopup="dialog" aria-label="${h(label)}">
      ${prop(point, visited)}<span class="trail-name">${h(point.name)}<b aria-hidden="true">›</b></span>
      ${isShop(point) && visited ? '<span class="shop-visit-stamp" aria-hidden="true">✓</span>' : ''}
      ${ids.length ? `<span class="marker-suits" aria-hidden="true">${stamps(ids, owned)}</span>` : ''}
      <span class="reward-ticket${claimed ? ' reward-redeemed' : ''}" aria-hidden="true">${claimed ? `${point.reward}次已领` : `+${point.reward}次`}</span>
    </a>`;
  }

  function overview(p, owned, here) {
    const ids = poolOutfits(pools);
    const prizes = poolPrizes(pools);
    const counts = rewardTypes.map(([type, title]) => `${title} ${prizes.filter(item => item.slot === type).length}`).join(' · ');
    return `<section class="guide-dock" aria-label="景区收集概览">
      <section class="pool-overview" id="guide-reward-list" aria-labelledby="guide-reward-title" hidden>
        <header><h3 id="guide-reward-title">${h(scene.name)} · 全部奖励</h3><button type="button" data-guide-rewards-close aria-label="关闭全部奖励">×</button></header>
        ${pools.map(pool => `<article class="pool-preview">
          <div class="pool-row">${preview ? `<strong>${h(pool.name)}</strong>` : link(h(pool.name), href('pool', {id: pool.id, from: here}), 'guide-pool-link')}
            <span class="pool-stamps" aria-hidden="true">${stamps(pool.outfits, owned)}</span>
            <span>${p.unlocked.includes(pool.id) ? '已解锁' : '待解锁'}</span></div>
          <p>${pool.outfits.map(outfitName).map(h).join(' · ')}</p>
          <small>${relatedPlaces(pool).map(point => h(point.name)).join('或')}有效到访解锁</small>
        </article>`).join('')}
      </section>
      <div class="collection-row scene-collection">
        <span class="collection-title">已集齐 <strong id="guide-collection-count">${countOutfits(ids, owned)}/${ids.length} 套</strong></span>
        <span class="suit-progress" aria-hidden="true">${stamps(ids, owned)}</span>
      </div>
      <div class="featured-looks" aria-label="主推套装">${(featured || ids.slice(0, 2)).map(id => `<figure class="featured-look">
        <span class="featured-photo">${artFor(id)}</span><figcaption>${h(outfitName(id))}</figcaption></figure>`).join('')}</div>
      <div class="collection-footer"><span class="reward-counts">${counts}</span>
        <button class="reward-toggle" type="button" data-guide-rewards aria-expanded="false" aria-controls="guide-reward-list">全部奖励 <b aria-hidden="true">›</b></button></div>
    </section>`;
  }

  function prizeRows(items, owned) {
    return rewardTypes.map(([type, title]) => {
      const prizes = items.filter(item => item.slot === type);
      if (!prizes.length) return '';
      return `<div class="point-prize-type" data-prize-type="${type}"><dt>${title} <span>${countOwned(prizes, owned)}/${prizes.length}</span></dt>
        <dd><ul>${prizes.map(item => {
          const collected = owned.has(item.id);
          return `<li data-guide-prize="${h(item.id)}" data-collected="${collected}"><span class="prize-mark" aria-hidden="true">${collected ? '✓' : '○'}</span>
            <span>${h(item.name)}</span><span class="prize-status">${collected ? '已收集' : '未收集'}</span></li>`;
        }).join('')}</ul></dd></div>`;
    }).join('');
  }

  function pointPool(pool, point, p, owned, here) {
    const unlocked = p.unlocked.includes(pool.id);
    const places = relatedPlaces(pool);
    const others = places.filter(place => place.id !== point.id).map(place => place.name);
    const hint = unlocked ? (others.length ? `与${others.join('、')}共用` : '') : `${places.map(place => place.name).join('或')}首次有效到访后解锁`;
    const prizes = prizeRows(poolPrizes([pool]), owned);
    return `<section class="point-pool" data-guide-pool="${h(pool.id)}" aria-labelledby="guide-pool-${h(pool.id)}">
      <header class="point-pool-head"><h3 id="guide-pool-${h(pool.id)}">${h(pool.name)}</h3>
        <span class="point-pool-status" data-unlocked="${unlocked}">${unlocked ? '已解锁' : '待解锁'}</span></header>
      ${hint ? `<p class="point-pool-hint">${h(hint)}</p>` : ''}
      <div class="point-suit-progress"><strong>套装已集齐 <span>${countOutfits(pool.outfits, owned)}/${pool.outfits.length} 套</span></strong>
        <span class="pool-stamps" aria-hidden="true">${stamps(pool.outfits, owned)}</span></div>
      <ul class="point-suits">${pool.outfits.map(id => {
        const parts = partsOf(id);
        const count = countOwned(parts, owned);
        const complete = count === parts.length;
        return `<li class="point-suit" data-complete="${complete}"><div class="point-suit-art">${artFor(id)}</div><p>${h(outfitName(id))}</p>
          <small>${complete ? '✓ 已集齐' : `部件 ${count}/${parts.length}`}</small></li>`;
      }).join('')}</ul>
      ${prizes ? `<h4 class="point-prize-heading">其他奖品</h4><dl class="point-prizes">${prizes}</dl>` : ''}
      ${unlocked && !preview ? link('进入' + h(pool.name), href('pool', {id: pool.id, from: here}), 'guide-pool-action') : ''}
    </section>`;
  }

  function pointDetail(point, p, owned, here) {
    const visited = pointVisited(p, point);
    const claimed = pointRewardClaimed(p, point);
    const checkin = href('checkin', {id: point.id, from: here});
    return `<dialog class="chapter-dialog" id="guide-point-dialog" aria-labelledby="guide-point-title">
      <header class="point-dialog-head">${prop(point, visited)}<div><h2 id="guide-point-title">${h(point.name)}</h2>
        <p class="point-visit" data-visited="${visited}">${visitLabel(point, visited)}${preview ? ' · 评审样例' : ''}</p></div>
        <button type="button" data-guide-point-close aria-label="关闭详情" autofocus>×</button></header>
      <div class="point-dialog-scroll" role="region" aria-label="卡池奖品与打卡奖励" tabindex="0">
        ${pools.filter(pool => point.pools.includes(pool.id)).map(pool => pointPool(pool, point, p, owned, here)).join('')}
        <dl class="point-first-reward"><div><dt>${isShop(point) ? '首次到店奖励' : '首次打卡奖励'}</dt>
          <dd><span class="reward-ticket point-ticket${claimed ? ' point-ticket-redeemed' : ''}" aria-hidden="true"></span>
            ${claimed ? '已领取' : '可获'} ${point.reward} 次抽卡机会</dd></div></dl>
        ${point.id === activity?.point ? link(h(activity.name), href('activity', {from: here}), 'guide-activity') : ''}
      </div>
      ${preview ? '' : `<footer class="point-dialog-actions">${link(isShop(point) ? '记录到店' : '记录到访', checkin, 'button primary')}</footer>`}
    </dialog>`;
  }

  return function renderGuide({p: accountProgress, ui, nav, here, back, params}) {
    const p = progressSample || accountProgress;
    const point = points.find(item => item.id === params.get('point'));
    const focused = point || points.find(item => item.id === ui.guideFocus) || points[1];
    const focus = focused?.id;
    const owned = new Set(p.owned);
    const scenic = points.filter(item => !isShop(item));
    const visited = scenic.filter(item => pointVisited(p, item)).length;
    const home = guideMapHref(here);
    return `<section class="chapter-map" data-focus="${h(focused?.anchor || focus)}" aria-label="${h(scene.name)}景区导览">
      <div class="terrain" aria-hidden="true"><span class="terrain-focus"></span></div>
      <header class="chapter-head"><div class="chapter-tools">
        ${link(`<b aria-hidden="true">‹</b> ${back === '#explore' ? '发现贵州' : '返回'}`, back, 'back-label')}
        ${preview ? '' : `<div>${button('地点一览', 'places', {classes: 'chapter-chip', attrs: 'aria-haspopup="dialog"'})}
          ${link('初见礼', href('gift', {from: home}), 'chapter-chip')}</div>`}</div>
        <div class="chapter-title"><p>${h(scene.label)}</p><h1>${h(scene.name)}</h1></div>
        <span class="map-progress" aria-label="已打卡景点 ${visited} 处，共 ${scenic.length} 处">已留足迹 <strong>${visited}/${scenic.length}</strong></span>
        ${params.has('point') && !point ? '<p class="guide-invalid" role="status">这个地点已不可用，请在地图上重新选择。</p>' : ''}
      </header>
      <div class="guide-markers" role="group" aria-label="景区点位">${points.map(item => marker(item, p, owned, home, focus)).join('')}</div>
      <p class="map-caption">景区示意图${preview ? ' · 评审样例' : ''}</p>
      ${overview(p, owned, home)}${nav}
    </section>${point ? pointDetail(point, p, owned, here) : ''}`;
  };
}

const renderReviewGuide = createGuide(catalog);
const renderHuangguoshu = createGuide(huangguoshu, chapterSample);

export function guidePointFor(params) {
  const chapter = params.get('id');
  const points = chapter === 'huangguoshu' ? huangguoshu.points : !chapter || chapter === 'demo' ? catalog.points : [];
  return points.find(point => point.id === params.get('point'));
}

export function sceneGuide(context) {
  if (!context.id || context.id === 'demo') return renderReviewGuide(context);
  if (context.id === 'huangguoshu') return renderHuangguoshu(context);
  const chapter = chapters.find(chapter => chapter.id === context.id);
  if (chapter) return atlasChapter(chapter, context.nav);
  return `<div class="stack"><h1>找不到这个景区</h1>${link('返回发现贵州','#explore')}</div>`;
}

export function guidePlaces({p, ui, here}) {
  const {points, activity} = catalog;
  const filters = tabs(['全部', '景点', '商家', '活动'].map(filter => button(filter, 'mapFilter', {
    value: filter, classes: 'tab', attrs: pressed(ui.filter === filter),
  })));
  const home = guideMapHref(here);
  const items = points.filter(point => ui.filter === '全部' || point.kind === ui.filter).map(point =>
    link(`${h(point.name)} <small>${visitLabel(point, pointVisited(p, point))}</small>`, pointHref(home, point.id), 'button secondary'));
  if (ui.filter === '全部' || ui.filter === '活动') items.push(link(h(activity.name), href('activity', {from: home})));
  return filters + `<div class="guide-place-list">${items.join('')}</div>`;
}

export function bindGuide(app, {dismiss, restorePoint}) {
  const map = app.querySelector('.chapter-map');
  if (!map) return;
  if (restorePoint) map.querySelector(`[data-guide-point="${CSS.escape(restorePoint)}"]`)?.focus({preventScroll: true});
  const rewards = map.querySelector('#guide-reward-list');
  const toggle = map.querySelector('[data-guide-rewards]');
  const closeRewards = map.querySelector('[data-guide-rewards-close]');
  function setRewards(open) {
    rewards.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    (open ? closeRewards : toggle).focus({preventScroll: true});
  }
  toggle.addEventListener('click', () => setRewards(rewards.hidden));
  closeRewards.addEventListener('click', () => setRewards(false));
  map.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !rewards.hidden) setRewards(false);
  });
  const dialog = app.querySelector('#guide-point-dialog');
  if (!dialog) return;
  dialog.querySelector('[data-guide-point-close]').addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => {event.preventDefault(); dismiss();});
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const {left, top, right, bottom} = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dismiss();
  });
  dialog.showModal();
}
