import {ASSETS, POINTS} from '../data.mjs';
import {prepareArtwork} from './renderer.mjs';
import {thumbnailUrl} from './wardrobe-art.mjs';
import {
  demoKey,
  inspectArchive,
  sessionPrefix,
  parseBackup,
  epochKey,
} from './storage.mjs';

const el = (id) => document.getElementById(id);
let confirmAction;
function progress() {
  const db = inspectArchive();
  el('progress').textContent =
    Object.entries(db.accounts)
      .map(
        ([id, a]) =>
          '游客 ' +
          id +
          ' · ' +
          a.events.length +
          ' 条经历 · ' +
          a.balance +
          ' 次机会 · ' +
          a.works.length +
          ' 张作品',
      )
      .join(' ／ ') || '新手账，尚无游玩记录。';
}
function ask(message, action) {
  confirmAction = action;
  el('warning').textContent = message;
  el('confirm').showModal();
}
function clearDrafts() {
  localStorage.setItem(epochKey, crypto.randomUUID());
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith(sessionPrefix))
    .forEach((k) => sessionStorage.removeItem(k));
}
el('cancel').onclick = () => el('confirm').close();
el('confirm-action').onclick = () => {
  el('confirm').close();
  try {
    confirmAction();
    progress();
    el('status').textContent = '演示手账已就绪。';
  } catch (e) {
    el('status').textContent = e.message;
  }
};
el('reset').onclick = () =>
  ask(
    '清空这套客户演示的 A、B 手账，包括足迹、订单及作品？可先下载备份。',
    () => {
      localStorage.removeItem(demoKey);
      clearDrafts();
    },
  );
el('backup').onclick = () => {
  try {
    const data = JSON.stringify(inspectArchive(), null, 2);
    const url = URL.createObjectURL(
      new Blob([data], {type: 'application/json'}),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = '黄晓西-演示手账.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (e) {
    el('status').textContent = e.message;
  }
};
el('restore').onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const raw = await file.text();
    const db = parseBackup(raw);
    ask('用所选备份替换本机客户演示手账？', () => {
      localStorage.setItem(demoKey, JSON.stringify(db));
      clearDrafts();
    });
  } catch (e) {
    el('status').textContent = '无法载入备份。' + e.message;
  }
  event.target.value = '';
};
el('points').innerHTML = POINTS.map(
  (p) =>
    '<p>' +
    p.name +
    '<code>' +
    p.code +
    '</code><a href="index.html#checkin?id=' +
    p.id +
    '&amp;code=' +
    p.code +
    '">核验入口</a></p>',
).join('');
try {
  progress();
  const probe = sessionPrefix + 'preflight';
  sessionStorage.setItem(probe, '1');
  sessionStorage.removeItem(probe);
  const storeProbe = demoKey + '.probe';
  localStorage.setItem(storeProbe, '1');
  localStorage.removeItem(storeProbe);
  const itemIds = ASSETS.filter((a) => a.outfit).map((a) => a.id);
  const thumbnails = ['cameo', ...itemIds].map(async (id) => {
    const image = new Image();
    image.src = thumbnailUrl(id);
    await image.decode();
  });
  await Promise.all([prepareArtwork(), ...thumbnails]);
  el('status').textContent = '本机素材、存档读取和写入检查通过。';
} catch (e) {
  el('status').textContent = '准备检查未通过。' + e.message;
}
window.addEventListener('storage', (e) => {
  if (e.key === demoKey) progress();
});
