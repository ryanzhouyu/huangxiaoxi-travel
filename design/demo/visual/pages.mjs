import {lookFor, asset, point, pool, POINTS, STARTERS} from '../../data.mjs';
import {icon, itemArt, stageFigure, world} from '../renderer.mjs';
import {renderJournal} from './journal.mjs';

const look = (id) => stageFigure(lookFor(id));
const cameo = '<span class="cameo" aria-hidden="true"></span>';

export function companionNote(words) {
  return `<aside class="companion-note">${cameo}<div><strong>黄晓西</strong><p>${words}</p></div></aside>`;
}

export function visitPhoto(pointId) {
  const place = point(pointId);
  return place
    ? `<div class="visit-print" aria-hidden="true" data-place="${place.id}">${world('map', undefined, place.id)}</div>`
    : '';
}

function entry({accounts, button}) {
  const choices = ['A', 'B']
    .map((id) => {
      const account = accounts[id];
      const hint = account?.initialized
        ? `${account.events.length} 段经历 · 继续原来的手账`
        : '新手账 · 初次见面';
      return button(
        `${icon('book')}<span><strong>游客 ${id}</strong><small>${hint}</small></span><b>打开 ›</b>`,
        'login',
        'account-choice',
        `data-id="${id}"`,
      );
    })
    .join('');
  return `<section class="arrival-stage"><div class="arrival-logo"><span>贵州 · 黔山漫游</span><h1>黄晓西</h1></div>
    <div class="arrival-companion">${stageFigure({...lookFor('gift'), expression: 'joy', pose: 'wave'})}</div>
    <div class="arrival-panel paper"><span class="ribbon">给同行的你</span><h2>我在山门等你，一起出发吧。</h2>
    ${choices}<p class="fine">演示账号 · 进度保存在当前浏览器</p></div></section>`;
}

function onboarding({ui, button}) {
  const captions = {
    'start-a': '这件小斗篷，山里起风也不怕。',
    'start-b': '穿上这件夹克，今天轻快出发。',
    'start-c': '这裙子的颜色，和溪水好像。',
  };
  return `<section class="first-meeting"><div class="meeting-heading"><span class="scene-label">初次相遇</span><h1 class="ribbon">挑一身出发装</h1></div>
    <div class="meeting-character">${look(ui.starter)}</div><div class="meeting-bottom paper">
    ${companionNote(captions[ui.starter] || captions['start-a'])}
    <div class="starter-list">${STARTERS.map((o) => button(`${itemArt(asset(o.id + '-top'))}<span>${o.name}</span>`, 'starter', 'starter ' + (o.id === ui.starter ? 'selected' : ''), `data-id="${o.id}" aria-pressed="${o.id === ui.starter}"`)).join('')}</div>
    <p>三套都免费拥有，之后可以换着穿。</p>${button('就这一身，一起出发', 'initialize', 'gold full')}${button('换一个演示账号', 'logout', 'text full')}
    </div></section>`;
}

function partner({a, ui, art, link, button}) {
  const messages = a.events.length
    ? [
        '刚才走过的地方，我都记住啦。',
        '想换一身去走走吗？',
        '今天还想去哪里？我陪你慢慢逛。',
      ]
    : [
        '桥上的灯都亮啦。陪我走一段好吗？',
        '你也看见那盏小灯啦？我们走近看看。',
        '听说山间有家手作铺，一起去看看吧。',
      ];
  const tool = (symbol, label, action, attrs = '') =>
    button(`${icon(symbol)}<span>${label}</span>`, action, 'hud-orb', attrs);
  return `<section class="companion-world">${art.world('night', a.look)}
    <div class="home-hud">${link(`${cameo}<span><strong>黄晓西</strong><small>我的旅行伙伴</small></span>`, 'account', 'identity-button')}
    ${link(`${icon('ticket')}<b>${a.balance}</b> ›`, 'wallet', 'hud-ticket')}</div>
    <div class="world-location">${link('黔山漫游 ›', 'scene', 'location-plaque')}</div>
    <div class="home-tools">${tool('bag', '衣橱', 'home-dress')}${tool('book', '图鉴', 'home-catalog')}${tool('scan', '打卡', 'go', 'data-target="checkin"')}</div>
    <div class="home-side-tools">${tool('flower', '动作', 'home-pose')}${a.gifts.includes('demo') ? '' : tool('gift', '初见礼', 'go', 'data-target="scene"')}</div>
    <button class="companion-character ${ui.greeting ? 'greeting' : ''}" data-action="greet" aria-label="和黄晓西打招呼">${stageFigure(a.look)}</button>
    <div class="companion-dialogue">${cameo}<div><strong>黄晓西</strong><button class="dialogue-line" data-action="greet">${messages[(ui.lineIndex || 0) % messages.length]}</button></div></div></section>`;
}

function explore({a, link}) {
  const count = new Set(a.events.map((e) => e.pointId)).size;
  return `<section class="travel-atlas"><h1 class="scene-label">发现贵州</h1><div class="region-label">贵州</div>
    <div class="destination-island paper"><small>贵州 · 测试景区</small><h2>黔山漫游</h2><p>山门的灯、花溪的水，还有一间手作铺。</p>
    ${link('打开景区游玩图', 'scene', 'gold full')}<small>${count ? '已留足迹 ' + count + ' 处' : '景区有一份免费的见面礼'} · 示意地图</small></div></section>`;
}

const placeLines = {
  gate: '山门到了。我们在这里留个印记吧。',
  ridge: '站在这里，远处的山一层接着一层。',
  brook: '听，水声就从花丛后面传过来。',
  shop: '屋里摆着针线，进去看看他们在做什么？',
};
function placeDetails({route, a, art, button, link, poolCard}) {
  const p = point(route.params.get('id')) || POINTS[0];
  const claimed = a.claimed.includes('point:' + p.id);
  const shop = p.kind === '商家';
  return `<section class="location-story"><div class="location-portrait">${art.world('map', undefined, p.id)}
    <div class="location-sign"><h1>${p.name}</h1><span>${p.spot}</span></div></div><div class="story-paper paper">
    ${companionNote(placeLines[p.id])}
    <div class="checkin-reward">${icon('ticket')}<div><strong>${shop ? '首次到店' : '首次到访'}</strong><small>重复到访仍可留下足迹</small></div><b>${claimed ? '首次奖励已领' : '+' + p.reward + ' 次'}</b></div>
    ${p.pools.map((id) => poolCard(pool(id))).join('')}
    ${shop ? link('一枚旅行手作　·　了解活动 ›', 'activity', 'activity-link full') : ''}
    ${button(shop ? '扫码记录到店' : '扫码记录到访', 'open-checkin', 'gold full', `data-id="${p.id}"`)}
    ${button('定位打卡 · 模拟', 'geo', 'text full', `data-id="${p.id}"`)}
    <p class="fine">${p.desc} 测试点位 · 定位与店员核验使用模拟结果。</p></div></section>`;
}

export function poolInventory(record, collected, shelf) {
  const clothes = record.assets.filter((id) => asset(id).outfit);
  const extras = record.assets.filter((id) => !asset(id).outfit);
  return `${shelf(clothes)}<p class="pool-includes">另含　${extras.map((id) => asset(id).name).join(' · ')}</p>
    <section class="pool-supplement"><h2>本池的装扮</h2><p>本池已收集 ${collected} / ${record.assets.length}</p>
    ${shelf(extras)}</section>`;
}

export function sourcePicture(item) {
  return `<div class="source-art">${itemArt(item)}</div>`;
}

export function composeSummary(events) {
  return `<div class="preview-caption"><h2>照片洗好啦。</h2><p>${events.length} 段经历 · 当前保存搭配</p></div>`;
}

export const pages = {
  entry,
  onboarding,
  partner,
  explore,
  point: placeDetails,
  memories: renderJournal,
};
