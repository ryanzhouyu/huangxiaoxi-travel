import {POINTS} from '../data.mjs';
import {demoKey, inspectArchive, parseBackup} from './storage.mjs';
import {
  backupArchive,
  describeArchive,
  preflight,
  replaceArchive,
} from './stage/preparation.mjs';

const el = (id) => document.getElementById(id);
let confirmAction;
function progress() {
  el('progress').textContent = describeArchive(inspectArchive());
}
function ask(message, action) {
  confirmAction = action;
  el('warning').textContent = message;
  el('confirm').showModal();
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
      replaceArchive(null);
    },
  );
el('backup').onclick = () => {
  try {
    backupArchive();
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
    ask(describeArchive(db) + '。用所选备份替换本机 A、B 演示手账？', () => {
      replaceArchive(db);
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
  await preflight();
  el('status').textContent = '本机素材、存档读取和写入检查通过。';
} catch (e) {
  el('status').textContent = '准备检查未通过。' + e.message;
}
window.addEventListener('storage', (e) => {
  if (e.key === demoKey) progress();
});
