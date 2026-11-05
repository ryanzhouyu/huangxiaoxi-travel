import {POINTS, POOLS} from '../../data.mjs';
import {epochKey, inspectArchive, parseBackup} from '../storage.mjs';
import {
  backupArchive,
  describeArchive,
  preflight,
  replaceArchive,
} from './preparation.mjs';

const el = (id) => document.getElementById(id);
let frame;
const compact = matchMedia('(max-width:900px)');
const placeButtons = el('places');
const resumeKey = 'hxx.stage.resume';
let state, port, activePanel, pendingAction;

placeButtons.innerHTML = POINTS.map(
  (p) =>
    '<div class="place"><div><strong>' +
    p.name +
    '</strong><small id="mark-' +
    p.id +
    '">首次 +' +
    p.reward +
    ' 次</small></div>' +
    ['point', 'scan']
      .map(
        (action, i) =>
          '<button disabled data-jump="' +
          action +
          '" data-id="' +
          p.id +
          '" class="' +
          action +
          '" aria-label="' +
          (i ? '模拟扫码：' : '查看：') +
          p.name +
          '">' +
          (i ? '模拟扫码' : '查看') +
          '</button>',
      )
      .join('') +
    '</div>',
).join('');

function guidance(s) {
  if (s.error) return '中央手账读取失败。可在左侧载入已校验的备份。';
  if (s.busy) return '中央正在处理，请等结果出现。';
  if (s.modal) {
    if (s.modal.includes('装进旅行衣橱'))
      return '见面礼已收下，足迹和次数仍未增加。可以立即试穿，再决定是否保存。';
    if (s.modal.includes('新的装扮'))
      return '本次抽取已记账，获得的装扮已入衣橱。点“穿上看看”展示实际搭配。';
    if (s.modal.includes('旅途奖励'))
      return '请对照本次奖励和右栏收支，可从中央继续游玩或前往关联卡池。';
    return '先在中央处理「' + s.modal + '」，再切换地点。';
  }
  switch (s.page) {
    case 'entry':
      return '在中央选择演示身份。已有手账可继续游玩。';
    case 'onboarding':
      return '选一身初始装扮，和黄晓西一起出发。';
    case 'wardrobe':
      return s.dirty
        ? '正在试穿，尚未保存。保存后，伙伴和新作品才会穿上这一身。'
        : '可以挑选部件试穿，保存或取消后回到来源页。';
    case 'checkin':
      return '核对中央的地点与测试码，再点“验证并记录到访”。';
    case 'point': {
      const place = POINTS.find((p) => p.id === s.pointId);
      if (!place) return '从地图选择一个有效地点。';
      return (
        '这里只是查看' +
        place.name +
        '。可从中央进入核验，或在左侧模拟扫这个地点的码。'
      );
    }
    case 'activity':
      return s.claimed.includes('activity:craft')
        ? '这项活动的首次奖励已领取，可查看经历。'
        : '到店与手作分别记账。用模拟店员核验完成这次体验。';
    case 'pool':
      if (!s.pools.includes(s.poolId))
        return '本池还未开放。先到关联地点核验，购买次数也不会解锁。';
      if (!s.remaining)
        return '这池已收齐，不再扣次。可以继续探索，或翻开旅行手账。';
      if (!s.balance)
        return '本池已开放，当前没有可用次数。其他地点的首次奖励也可在这里使用。';
      if (
        s.poolId === 'cloud' &&
        s.drawnPools.includes('cloud') &&
        !s.visits.includes('ridge')
      )
        return '云山已抽过。接下来可从左侧查看望山台，再核验同一景区的另一份奖励。';
      if (s.poolId === 'bloom' && s.drawnPools.includes('bloom'))
        return '现在可翻开手账制作纪念图。想加演购买，可先选 10 次并完成模拟支付。';
      return '在中央开启一次，抽到的装扮会进入衣橱，再试穿并决定是否保存。';
    case 'wallet':
    case 'order':
      return '购买是可选支线。只有模拟支付成功才会到账，不发生真实扣款。';
    case 'compose':
      return s.preview
        ? '预览满意后收进纪念册，再保存 PNG。'
        : '已选 ' +
            s.selected +
            ' 条经历。可调整地点、标题和模板，再生成预览。';
    case 'work':
      return '在中央保存 PNG，打开下载的图片，就能展示这趟旅行的纪念。';
    case 'memories':
      return s.events
        ? '已有到访，可随时选经历制作纪念图，无需结束旅程。'
        : '完成第一次有效到访，手账里就有可制作纪念图的经历。';
    default:
      if (!s.gift)
        return '先从“游玩”打开景区地图，领取免费见面礼。线上领装不会产生足迹。';
      if (!s.visits.includes('gate'))
        return '演示可从山门入口模拟扫码，确认后解锁云山卡池。';
      if (!s.drawnPools.includes('cloud'))
        return '在云山卡池抽一次，试穿并保存。';
      if (!s.visits.includes('ridge'))
        return '接着去望山台。这里和山门共享云山卡池。';
      if (!s.claimed.includes('point:shop'))
        return '到山间手作铺模拟扫码，先展示到店奖励。';
      if (!s.claimed.includes('activity:craft'))
        return '打开手作体验，另做一次模拟店员核验。';
      if (!s.drawnPools.includes('bloom'))
        return '到花溪卡池使用景区通用次数，再抽一次。';
      return s.works
        ? '可以自由游玩，或在回忆中回看已保存的作品。'
        : '翻开旅行手账，选择想留住的经历，制作纪念图。';
  }
}
const suspended = () => !state || state.busy || state.modal || state.error;
const replacingBlocked = () =>
  state && (state.dirty || state.busy || state.modal);
function show(s) {
  state = s;
  el('identity').textContent = s.owner
    ? '游客 ' + s.owner + (s.initialized ? ' · 本机手账' : ' · 初次相遇')
    : '尚未选择身份';
  el('scene-title').textContent = s.error ? '手账读取失败' : s.title;
  el('overlay').textContent = s.busy
    ? '中央正在处理…'
    : s.modal || (s.dirty ? '试穿中 · 尚未保存' : '');
  for (const [k, v] of Object.entries({
    balance: s.balance,
    visits: s.visits.length + ' / ' + POINTS.length,
    events: s.events + ' 条',
    pools: s.pools.length + ' / ' + POOLS.length,
    draws: s.draws + ' 笔',
    works: s.works + ' 张',
  }))
    el(k).textContent = s.error ? '—' : v;
  el('ledger').textContent = s.error
    ? '无法读取'
    : s.ledger
      ? s.ledger.reason +
        '　' +
        (s.ledger.delta > 0 ? '+' : '') +
        s.ledger.delta +
        ' 次'
      : '暂无收支';
  el('milestones').textContent = s.error
    ? ''
    : [s.gift && '已领见面礼', s.events > 0 && '可制作纪念图']
        .filter(Boolean)
        .join(' · ');
  el('cue').textContent = guidance(s);
  el('point-help').textContent =
    s.busy || s.modal
      ? '请先完成中央当前操作，再切换地点。'
      : !s.initialized
        ? '可先选地点，选好身份和伙伴后会自动前往。'
        : '在中央确认到访后，才会记录足迹。';
  for (const b of document.querySelectorAll('[data-jump]'))
    b.disabled = !!suspended();
  POINTS.forEach((p) => {
    el('mark-' + p.id).textContent = s.claimed.includes('point:' + p.id)
      ? '已领取首次奖励'
      : '首次 +' + p.reward + ' 次';
  });
  el('activity').lastElementChild.textContent = s.claimed.includes(
    'activity:craft',
  )
    ? '已领取 · 查看 ›'
    : '打开活动 ›';
  el('choose').disabled = el('reset').disabled = !!replacingBlocked();
  el('file-note').textContent = replacingBlocked()
    ? '先处理中央弹窗或未保存的试穿，再载入或重新开场。'
    : '仅管理本机的 A、B 演示手账。';
  try {
    if (!s.error)
      sessionStorage.setItem(
        resumeKey,
        JSON.stringify({
          route: s.route,
          owner: s.owner,
          epoch: localStorage.getItem(epochKey),
        }),
      );
  } catch {}
}
function connect() {
  port?.close();
  const channel = new MessageChannel();
  port = channel.port1;
  port.onmessage = (e) => show(e.data);
  frame.contentWindow.postMessage('hxx.stage.connect', location.origin, [
    channel.port2,
  ]);
}
window.addEventListener('message', (e) => {
  if (
    e.source === frame.contentWindow &&
    e.origin === location.origin &&
    e.data === 'hxx.stage.ready'
  )
    connect();
});
let resume = '';
try {
  const saved = JSON.parse(sessionStorage.getItem(resumeKey));
  if (
    saved &&
    saved.owner === inspectArchive().current &&
    saved.epoch === localStorage.getItem(epochKey)
  )
    resume = '#' + saved.route;
} catch {}
// A pending storage-event reload in the previous guest must not override the restored route.
function mountGuest(hash = '') {
  const next = el('guest-view').content.firstElementChild.cloneNode();
  next.name = 'hxx-stage-' + crypto.randomUUID();
  next.src = 'index.html?stage=1' + hash;
  next.inert = !!activePanel;
  if (frame) frame.replaceWith(next);
  else document.querySelector('.screen').append(next);
  frame = next;
}
mountGuest(resume);
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-jump]');
  if (!b || suspended()) return;
  port.postMessage({action: b.dataset.jump, id: b.dataset.id});
  if (activePanel) setPanel(null);
  frame.focus();
});

function setPanel(id) {
  const old = activePanel;
  activePanel = id;
  for (const key of ['controls', 'progress']) {
    el(key).classList.toggle('open', id === key);
    document
      .querySelector('[data-panel="' + key + '"]')
      .setAttribute('aria-expanded', String(id === key));
  }
  el('shade').hidden = !id;
  frame.inert = !!id;
  document.querySelector('.mobile-bar').inert = !!id;
  if (id) el(id).querySelector('.dismiss').focus();
  else if (old && compact.matches)
    document.querySelector('[data-panel="' + old + '"]').focus();
}
document
  .querySelectorAll('[data-panel]')
  .forEach((b) => (b.onclick = () => setPanel(b.dataset.panel)));
document
  .querySelectorAll('.dismiss,#shade')
  .forEach((b) => (b.onclick = () => setPanel(null)));
document.addEventListener('keydown', (e) => {
  if (
    activePanel &&
    !document.querySelector('dialog[open]') &&
    e.key === 'Escape'
  ) {
    e.preventDefault();
    setPanel(null);
  }
});
compact.addEventListener('change', () => setPanel(null));
function fold(v) {
  document.body.classList.toggle('folded', v);
  el('bring-back').hidden = !v;
  (v ? el('bring-back') : el('fold')).focus();
}
el('fold').onclick = () => fold(true);
el('bring-back').onclick = () => fold(false);
el('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    el('feedback').textContent = '此窗口未允许全屏。可使用浏览器的全屏菜单。';
  }
};
document.addEventListener('fullscreenchange', () => {
  el('fullscreen').textContent = document.fullscreenElement
    ? '退出全屏'
    : '进入全屏';
});

function ask(title, message, action) {
  el('confirm-title').textContent = title;
  el('warning').textContent = message;
  el('apply').textContent = action ? '确认载入' : '确认重新开场';
  pendingAction = () => replaceArchive(action);
  el('confirm').showModal();
}
el('backup').onclick = () => {
  try {
    backupArchive();
    el('feedback').textContent = '已发起手账备份下载。';
  } catch (e) {
    el('feedback').textContent = e.message;
  }
};
el('reset').onclick = () =>
  ask(
    '重新开场？',
    '将清空本机 A、B 两份演示手账，包括次数、搭配及作品。需要保留时请先备份。',
    null,
  );
el('choose').onclick = () => el('restore').click();
el('restore').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const db = parseBackup(await file.text());
    if (replacingBlocked()) throw Error('请先完成中央当前操作。');
    ask(
      '载入手账备份？',
      describeArchive(db) + '\n将替换本机 A、B 手账；取消可保留当前进度。',
      db,
    );
  } catch (err) {
    el('feedback').textContent = '未载入。' + err.message;
  }
};
el('cancel').onclick = () => el('confirm').close();
el('confirm').addEventListener('close', () => {
  pendingAction = null;
});
el('apply').onclick = async () => {
  try {
    if (replacingBlocked()) throw Error('请先完成中央当前操作。');
    pendingAction();
    sessionStorage.removeItem(resumeKey);
    state = null;
    port?.close();
    document
      .querySelectorAll('[data-jump]')
      .forEach((b) => (b.disabled = true));
    mountGuest();
    el('feedback').textContent = '本机手账已更新。';
  } catch (e) {
    el('feedback').textContent = e.message;
  }
  el('confirm').close();
};
async function check() {
  try {
    await preflight();
    el('preflight').textContent = '本机素材与存档检查通过';
    delete el('preflight').dataset.fail;
  } catch (err) {
    el('preflight').textContent = '准备检查未通过：' + err.message;
    el('preflight').dataset.fail = true;
  }
}
el('confirm').addEventListener('close', () => {
  if (el('preflight').dataset.fail) check();
});
const video = el('replay').querySelector('video');
el('playback').onclick = () => {
  if (!video.getAttribute('src'))
    video.src = '../../output/stage-rehearsal/三栏连续彩排.webm';
  el('replay').showModal();
  video.play().catch(() => {
    /* Native controls remain available if autoplay is blocked. */
  });
};
el('end-replay').onclick = () => el('replay').close();
el('replay').addEventListener('close', () => video.pause());
check();
