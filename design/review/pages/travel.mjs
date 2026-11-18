import {catalog} from '../review-service.mjs';
import {mapPins, mapPlane} from '../../demo/renderer.mjs';
import {h, href, link, button, bar, section, header, icon, world, imageOf, stageFigure, artifact, note, status, pressed, empty, tabs, footer} from '../ui.mjs';

const points = catalog.points;
const pools = catalog.pools;
const activityRecord = catalog.activity;
const seen = (p, point) => p.events.some(event => event.pointId === point.id && event.kind !== '体验活动');
const claimed = (p, point) => p.claimed.includes('point:' + point.id);
const activityClaimed = p => p.claimed.includes('activity:' + activityRecord.id);
const pointStatus = (p, point) => claimed(p, point) ? '已留足迹' : '首次 +' + point.reward + ' 次';
const pointUrl = (point, from) => href('point', {id: point.id, from});
const poolUrl = (pool, from) => href('pool', {id: pool.id, from});

function placeRow(point, p, from) {
  return link(`${imageOf(point.id)}<span><strong>${point.name}</strong><small>${point.kind} · ${pointStatus(p, point)}</small></span><span aria-hidden="true">›</span>`, pointUrl(point, from), 'row place-row');
}

export function explore({p, nav}) {
  return `<section class="destination root-world scene">
    ${world('map')}
    <div class="destination-body">
      <header class="destination-head"><span>黄晓西 · 黔山同行</span><h1>发现贵州</h1></header>
      ${section(`<div class="destination-kicker">贵州 · 评审景区</div>${header('黔山漫游', '从山门出发，去花溪边停一停。')}
      ${p.events.length ? '<p class="stamp">' + points.filter(point => seen(p, point)).length + ' 处地点已留足迹</p>' : ''}
      ${link('打开游玩地图', href('scene', {from: '#explore'}), 'button primary')}`, 'destination-card')}
    </div>
    ${nav}
  </section>`;
}

export function scene({p, ui, back, here}) {
  const visible = points.filter(point => ui.filter === '全部' || point.kind === ui.filter);
  const selection = ui.filter === '活动' ? [points.find(point => point.id === activityRecord.point)] : visible;
  const pins = selection.map(point => {
    const [x, y] = mapPins[point.id];
    const isActivity = ui.filter === '活动';
    return link(`${icon(isActivity ? 'flower' : seen(p, point) ? 'check' : point.kind === '商家' ? 'shop' : 'pin')}<span>${isActivity ? activityRecord.name : point.name}</span>`,
      isActivity ? href('activity', {from: here}) : pointUrl(point, here), 'map-pin')
      .replace('class="map-pin"', `class="map-pin" style="--x:${x}%;--y:${y}%"`);
  }).join('');
  return `${bar('黔山漫游', back, '<span class="small">示意地图</span>')}
    <div class="map-view">
      ${mapPlane(world('map'), pins)}
      <div class="map-tabs">${tabs(['全部', '景点', '商家', '活动'].map(filter => button(filter, 'mapFilter', {value: filter, classes: 'tab', attrs: pressed(ui.filter === filter)})))}</div>
      ${button('地点一览', 'places', {classes: 'light-chip map-list'})}
    </div>
    <div class="stack map-paper">
      ${link(`${icon('gift')}<span><strong>黔山初见</strong><small>${p.gifts.includes('demo') ? '免费套装已收下' : '景区免费见面礼'}</small></span><span aria-hidden="true">›</span>`, href('gift', {from: here}), 'paper row gift-row')}
      ${section(header('沿途装扮') + `<div class="pool-grid">${pools.map(pool => link(`<span class="pool-mini">${stageFigure(catalog.lookFor(pool.outfits[0]))}</span><strong>${pool.name}</strong><small>${p.unlocked.includes(pool.id) ? '已解锁' : '到访后解锁'}</small>`, poolUrl(pool, here), 'pool-card')).join('')}</div>`)}
    </div>`;
}

export function placesContent({p, ui, here}) {
  if (ui.filter === '活动') return link(icon('flower') + '一枚旅行手作', href('activity', {from: here}));
  return points.filter(point => ui.filter === '全部' || point.kind === ui.filter).map(point => placeRow(point, p, here)).join('');
}

export function gift({p, ui, back, here}) {
  const received = p.gifts.includes('demo');
  return `${bar('景区见面礼', back)}
    <div class="theater gift-theater"><div class="theater-caption"><span>黔山漫游</span><h2>黔山初见</h2></div>${stageFigure(catalog.lookFor('gift'))}</div>
    <div class="stack overlap">${section(`${header(received ? '这套装扮已收进衣橱' : '一份免费的见面礼', '在线领取即可获得四件装扮。')}
      <div class="part-strip">${catalog.assets.filter(item => item.outfit === 'gift').map(item => `<span>${artifact({...item, name: catalog.slots[item.slot]})}</span>`).join('')}</div>
      ${status(ui.error, 'error')}
      ${received ? link('去试穿', href('wardrobe', {item: 'gift-top', from: here}), 'button primary') : button('领取整套装扮', 'gift', {disabled: ui.busy})}
      ${note('领取后由你决定何时换上。')}`)}</div>`;
}

const placeLines = {
  gate: '到山门啦。一起在这里留个印记吧。',
  ridge: '站在这里，远处的山一层接着一层。',
  brook: '听，溪水就在花丛后面。',
  shop: '屋里摆着针线，进去看看吧。',
};

export function place({p, back, here, id}) {
  const point = points.find(item => item.id === id);
  const shop = point.kind === '商家';
  return `${bar(point.name, back)}
    <div class="place-hero">${world('map', undefined, id)}<div><small>${point.kind} · 评审点位</small><h2>${point.name}</h2><p>${point.spot}</p></div></div>
    <div class="stack overlap">
      ${section(`<div class="small-talk">${icon('partner')}<p>${placeLines[id]}</p></div><p>${point.desc}</p>
        <div class="fact">${icon('ticket')}<span>${shop ? '首次到店' : '首次到访'}</span><strong>${claimed(p, point) ? '奖励已领' : '+' + point.reward + ' 次'}</strong></div>
        ${claimed(p, point) ? note('再次到访仍会留下足迹。') : ''}
        ${point.pools.map(id => pools.find(pool => pool.id === id)).map(pool => link(`${icon(p.unlocked.includes(pool.id) ? 'check' : 'lock')}${pool.name} · ${p.unlocked.includes(pool.id) ? '已解锁' : '到访后解锁'}`, poolUrl(pool, here))).join('')}
      `)}
      ${shop ? section(header('店内体验', '到店和完成活动分别记录。') + link('了解旅行手作', href('activity', {from: here}))) : ''}
    </div>
    ${footer(link(shop ? '记录到店' : '记录到访', href('checkin', {id, from: here}), 'button primary'))}`;
}

export function checkin({p, ui, back, here, id, params}) {
  const point = points.find(item => item.id === id);
  if (!point) return `${bar('地点核验', back)}<div class="stack">${section(header('选择要核验的地点', '也可直接打开评审工具提供的点位链接。') + points.map(point => link(point.name, href('checkin', {id: point.id, from: here}))).join(''))}</div>`;
  return `${bar('确认到访', back)}
    <div class="place-hero short">${world('map', undefined, id)}<div><span>到访地点</span><h2>${point.name}</h2></div></div>
    <div class="stack overlap">${section(`
      ${header('核对地点与凭证', claimed(p, point) ? '本次会记录新足迹，首次奖励已领。' : '首次有效到访可获 ' + point.reward + ' 次。')}
      <form class="form-stack" data-submit="visit">
        <label class="field">测试凭证<input name="proof" data-model="proof" autocomplete="off" value="${h(ui.proof ?? params.get('code') ?? '')}" required></label>
        ${status(ui.error, 'error')}
        <button class="button primary" type="submit" ${ui.busy || ui.pending ? 'disabled' : ''}>${ui.busy ? '正在核验…' : '确认并记录到访'}</button>
      </form>
      ${note('本次使用评审凭证。正式扫码相机与到场核验需对接现场服务。')}
    `)}</div>`;
}

export function activity({p, ui, back, here}) {
  const done = activityClaimed(p);
  return `${bar('店内体验', back)}
    <div class="activity-hero scene"><span>山间手作铺</span><h2>一枚旅行手作</h2></div>
    <div class="stack overlap">${section(`${header('把今天做的小物，也记到手账里。', '到店参加约 20 分钟的手作体验。完成后，请店员确认。')}
      <div class="fact">${icon('ticket')}<span>首次完成奖励</span><strong>${done ? '已领取' : '+' + activityRecord.reward + ' 次'}</strong></div>
      ${note('活动奖励和到店奖励分别核算，每个账号各一次。')}
      ${done ? link('翻开旅行手账', '#memories') : `<form class="form-stack" data-submit="activity">
        <label class="field">评审用店员凭证<input name="proof" data-model="proof" value="${h(ui.proof)}" autocomplete="off" required></label>
        ${status(ui.error, 'error')}<button class="button primary" type="submit" ${ui.busy || ui.pending ? 'disabled' : ''}>提交店员凭证</button>
      </form>`}
      ${link('查看山间手作铺', pointUrl(points.find(point => point.id === activityRecord.point), here), 'button secondary')}
    `)}</div>`;
}

export function opportunities({p, back, here}) {
  const available = points.filter(point => !claimed(p, point));
  const activity = !activityClaimed(p);
  return `${bar('免费次数从哪里来', back)}<div class="stack">
    ${available.length || activity ? section(header('还有机会留下新足迹', '次数可用于本景区已解锁的卡池。') +
      available.map(point => placeRow(point, p, here)).join('') +
      (activity ? link(`${icon('flower')}<span><strong>一枚旅行手作</strong><small>活动首次完成 +${activityRecord.reward} 次</small></span>`, href('activity', {from: here}), 'row') : ''))
      : empty('ticket', '已领完当前的免费次数', '你仍可以继续游玩和制作纪念图。', link('翻开手账', '#memories'))}
  </div>`;
}
