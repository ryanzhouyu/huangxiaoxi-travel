const suits = new Map([
  ['flower', {name: '花溪漫步', art: './assets/outfit-A6-detail.webp'}],
  ['d2', {name: '套装样例 2'}],
  ['mountain', {name: '云山拾光', art: './assets/outfit-B5-detail.webp'}],
  ['w2', {name: '套装样例 4'}],
  ['t1', {name: '套装样例 5'}],
  ['t2', {name: '套装样例 6'}],
]);
const pools = new Map([
  ['duopotang', {name: '陡坡塘卡池', suits: ['flower', 'd2'], unlocked: true,
    expression: ['smile', 'wonder'], pose: ['wave'], background: ['falls']}],
  ['waterfall', {name: '大瀑布卡池', suits: ['mountain', 'w2'], unlocked: true,
    expression: ['smile'], pose: ['wave', 'look'], background: ['falls', 'ridge']}],
  ['tianxing', {name: '天星桥卡池', suits: ['t1', 't2'], unlocked: false,
    expression: ['peace'], pose: ['look'], background: ['shallow']}],
]);
const prizeNames = new Map([
  ['smile', '开心笑眼'], ['wonder', '惊喜睁眼'], ['peace', '安静微笑'],
  ['wave', '挥手问候'], ['look', '驻足眺望'],
  ['falls', '瀑前水雾'], ['ridge', '层崖远望'], ['shallow', '石桥浅滩'],
]);
const prizeCategories = [['expression', '表情'], ['pose', '动作'], ['background', '背景']];
const parts = ['hair', 'top', 'bottom', 'shoes'];
const owned = new Set([
  ...['flower', 'mountain'].flatMap(suit => parts.map(part => `${suit}.${part}`)),
  'd2.top', 'smile', 'look', 'ridge',
]);
const places = [
  {id: 'duopotang', name: '陡坡塘', poolIds: ['duopotang'], visited: true, claim: true, reward: 2},
  {id: 'waterfall', name: '大瀑布', poolIds: ['waterfall'], visited: true, claim: true, reward: 2},
  {id: 'tianxing', name: '天星桥', poolIds: ['tianxing'], visited: false, claim: false, reward: 2},
  {id: 'market', name: '手作铺', poolIds: ['waterfall'], visited: false, claim: false, reward: 1, merchant: true},
];

const guide = document.querySelector('.overview-guide');
const nodes = document.querySelector('#guide-markers');
const pointDialog = document.querySelector('#point-dialog');
const pointPools = document.querySelector('#point-pools');
const pointScroll = document.querySelector('.point-dialog-scroll');
const poolList = document.querySelector('#pool-list');
const overview = document.querySelector('#pool-overview');
const toggle = document.querySelector('#collection-toggle');
const close = document.querySelector('#close-overview');
const feedback = document.querySelector('#reward-feedback');
let activeMarker;

const unique = values => [...new Set(values)];
const countSuitParts = id => parts.filter(part => owned.has(`${id}.${part}`)).length;
const countComplete = ids => ids.filter(id => countSuitParts(id) === parts.length).length;
const poolCount = pool => `${countComplete(pool.suits)}/${pool.suits.length} 套`;
const visitLabel = place => `${place.visited ? '已' : '未'}${place.merchant ? '到店' : '打卡'}`;
const poolPlaces = id => places.filter(place => place.poolIds.includes(id));
const countCategory = category => new Set([...pools.values()].flatMap(pool => pool[category])).size;
const suitStamps = (total, collected) => Array.from({length: total}, (_, index) =>
  `<span class="suit-stamp${index < collected ? ' collected' : ''}"></span>`).join('');

function fitPointDialog() {
  const frame = guide.getBoundingClientRect();
  pointDialog.style.setProperty('--point-center', `${frame.left + frame.width / 2}px`);
  pointDialog.style.setProperty('--point-width', `${frame.width - 24}px`);
}

function highlightMarker(marker) {
  if (activeMarker) activeMarker.removeAttribute('data-active');
  activeMarker = marker;
  marker.dataset.active = 'true';
  guide.dataset.place = marker.dataset.place;
}

function renderPointSuit(id) {
  const suit = suits.get(id);
  const count = countSuitParts(id);
  const complete = count === parts.length;
  const status = complete ? '已集齐' : `部件 ${count}/${parts.length}`;
  const preview = suit.art
    ? `<img src="${suit.art}" alt="">`
    : `<span class="suit-stamp" aria-hidden="true"></span>`;
  return `<li class="point-suit" data-suit="${id}" data-complete="${complete}">
    <div class="point-suit-art">${preview}</div>
    <p>${suit.name}</p><small>${complete ? '✓ ' : ''}${status}</small>
  </li>`;
}

function renderPoolPrizes(pool) {
  return prizeCategories.map(([type, label]) => {
    const ids = pool[type];
    const count = ids.filter(id => owned.has(id)).length;
    const items = ids.map(id => {
      const collected = owned.has(id);
      return `<li data-prize="${id}" data-collected="${collected}">
        <span class="prize-mark" aria-hidden="true">${collected ? '✓' : '○'}</span><span class="prize-name">${prizeNames.get(id)}</span>
        <span class="prize-status">${collected ? '已收集' : '未收集'}</span>
      </li>`;
    }).join('');
    return `<div class="point-prize-type" data-type="${type}">
      <dt>${label} <span>${count}/${ids.length}</span></dt><dd><ul>${items}</ul></dd>
    </div>`;
  }).join('');
}

function renderPointPool(id, place) {
  const pool = pools.get(id);
  const related = poolPlaces(id);
  const shared = related.filter(point => point.id !== place.id).map(point => point.name);
  const hint = pool.unlocked
    ? (shared.length ? `与${shared.join('、')}共用` : '')
    : `${related.map(point => point.name).join('或')}首次有效到访后解锁`;
  return `<section class="point-pool" data-pool="${id}" aria-labelledby="point-pool-${id}">
    <header class="point-pool-head">
      <h4 id="point-pool-${id}">${pool.name}</h4>
      <span class="point-pool-status" data-unlocked="${pool.unlocked}">${pool.unlocked ? '已解锁' : '待解锁'}</span>
    </header>
    ${hint ? `<p class="point-pool-hint">${hint}</p>` : ''}
    <div class="point-suit-progress">
      <strong>套装已集齐 <span>${poolCount(pool)}</span></strong>
      <span class="pool-stamps" aria-hidden="true">${suitStamps(pool.suits.length, countComplete(pool.suits))}</span>
    </div>
    <ul class="point-suits">${pool.suits.map(renderPointSuit).join('')}</ul>
    <h5 class="point-prize-heading">其他奖品</h5>
    <dl class="point-prizes">${renderPoolPrizes(pool)}</dl>
  </section>`;
}

function openPoint(place, marker) {
  if (!overview.hidden) setOverview(false);
  highlightMarker(marker);
  const prop = marker.querySelector('.map-prop');
  const visit = document.querySelector('#point-visit');
  document.querySelector('#point-prop').className = prop.className;
  document.querySelector('#point-title').textContent = place.name;
  visit.textContent = visitLabel(place);
  visit.dataset.visited = String(place.visited);
  document.querySelector('#point-reward-label').textContent = place.merchant ? '首次到店奖励' : '首次打卡奖励';
  document.querySelector('#point-ticket').classList.toggle('point-ticket-redeemed', place.claim);
  document.querySelector('#point-reward').textContent = place.claim ? `已领取 ${place.reward} 次抽卡机会` : `可获 ${place.reward} 次抽卡机会`;
  pointPools.innerHTML = place.poolIds.map(id => renderPointPool(id, place)).join('');
  fitPointDialog();
  marker.focus({preventScroll: true});
  pointDialog.showModal();
  pointScroll.scrollTop = 0;
}

function makeMarker(place) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = `level-marker marker-${place.id}`;
  marker.dataset.place = place.id;
  marker.dataset.visited = String(place.visited);
  marker.setAttribute('aria-haspopup', 'dialog');
  marker.setAttribute('aria-controls', pointDialog.id);
  const unlockedPools = place.poolIds.map(id => pools.get(id)).filter(pool => pool.unlocked);
  const unlockedSuits = unique(unlockedPools.flatMap(pool => pool.suits));
  const hasUnlockedPool = unlockedPools.length > 0;
  marker.dataset.unlocked = String(hasUnlockedPool);
  const prop = place.merchant ? 'shop' : place.visited ? 'visited' : 'pending';
  const reward = place.claim ? `首访 ${place.reward} 次已领` : `首次${place.merchant ? '到店' : '打卡'} +${place.reward} 次`;
  const poolInfo = hasUnlockedPool ? `关联卡池已解锁，已收集 ${countComplete(unlockedSuits)}/${unlockedSuits.length} 套` : '关联卡池到访后解锁';
  marker.setAttribute('aria-label', `${place.name}，${visitLabel(place)}，${poolInfo}，${reward}`);
  marker.innerHTML = `<span class="map-prop prop-${prop}" aria-hidden="true"></span>
    <span class="trail-name">${place.name}<b aria-hidden="true">›</b></span>
    ${hasUnlockedPool ? `<span class="marker-suits" aria-hidden="true">${suitStamps(unlockedSuits.length, countComplete(unlockedSuits))}</span>` : ''}
    ${place.claim ? `<span class="reward-ticket reward-redeemed" aria-hidden="true">${place.reward}次已领</span>`
      : `<span class="reward-ticket" aria-hidden="true">+${place.reward}次</span>`}`;
  marker.addEventListener('click', () => openPoint(place, marker));
  return marker;
}

function renderOverview() {
  const sceneSuits = unique([...pools.values()].flatMap(pool => pool.suits));
  const completed = countComplete(sceneSuits);
  document.querySelector('#collection-count').textContent = `${completed}/${sceneSuits.length} 套`;
  document.querySelector('#suit-progress').innerHTML = suitStamps(sceneSuits.length, completed);
  document.querySelector('#featured-looks').innerHTML = ['mountain', 'flower'].map(id => {
    const suit = suits.get(id);
    return `<figure class="featured-look"><img class="featured-photo" src="${suit.art}" alt=""><figcaption>${suit.name}</figcaption></figure>`;
  }).join('');
  document.querySelector('#reward-counts').textContent = `表情 ${countCategory('expression')} · 动作 ${countCategory('pose')} · 背景 ${countCategory('background')}`;
  poolList.innerHTML = [...pools].map(([id, pool]) => `<article class="pool-preview">
    <div class="pool-row"><strong>${pool.name}</strong><span class="pool-stamps" aria-hidden="true">${suitStamps(pool.suits.length, countComplete(pool.suits))}</span>
    <span class="pool-row-status">${pool.unlocked ? `已收集 ${poolCount(pool)}` : `待解锁 · ${pool.suits.length} 套`}</span></div>
    <p>${pool.suits.map(id => suits.get(id).name).join(' · ')}</p>
    <small>${poolPlaces(id).map(place => place.name).join('或')}有效到访解锁</small>
  </article>`).join('');
}

function setRewardState(state) {
  const ready = state === 'ready';
  for (const selector of ['.scene-collection', '#featured-looks', '.collection-footer']) {
    guide.querySelector(selector).hidden = !ready;
  }
  feedback.hidden = ready;
  feedback.querySelector('span').textContent = state === 'error' ? '奖励暂时未能读取' : '正在读取景区奖励…';
  feedback.querySelector('button').hidden = state !== 'error';
  if (ready) renderOverview();
}

function setOverview(open) {
  overview.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  (open ? close : toggle).focus();
}

toggle.addEventListener('click', () => setOverview(overview.hidden));
close.addEventListener('click', () => setOverview(false));
pointDialog.addEventListener('click', event => {
  if (event.target !== pointDialog) return;
  const {left, right, top, bottom} = pointDialog.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) pointDialog.close();
});
guide.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !overview.hidden) setOverview(false);
});
feedback.querySelector('button').addEventListener('click', () => {
  setRewardState('ready');
  toggle.focus();
});

nodes.append(...places.map(makeMarker));
highlightMarker(nodes.querySelector('.marker-waterfall'));
const sampleState = new URLSearchParams(location.search).get('rewards');
setRewardState(['loading', 'error'].includes(sampleState) ? sampleState : 'ready');
addEventListener('resize', () => {
  if (pointDialog.open) fitPointDialog();
});
