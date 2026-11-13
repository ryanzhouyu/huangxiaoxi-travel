import {PACKS, pool} from '../data.mjs';
import {KEY, readDB} from '../store.mjs';
export const demoKey = 'hxx.demo.v1';
export const sessionPrefix = 'hxx.demo.session.';
export function demoStorage(storage) {
  const mapped = (key) => {
    if (key !== KEY) throw Error('未知的演示存档类型。');
    return demoKey;
  };
  return {
    getItem: (key) => storage.getItem(mapped(key)),
    setItem: (key, value) => storage.setItem(mapped(key), value),
  };
}
export function inspectArchive(storage = localStorage) {
  return readDB(demoStorage(storage));
}

// 备份文件来自本机文件选择器。只接受业务结构、可识别的 ID 与规范 PNG。
export function parseBackup(raw) {
  if (!raw.trim()) throw Error('备份文件为空。');
  const db = readDB({getItem: () => raw});
  const safeId = (value) =>
    typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,128}$/.test(value);
  const safeEvent = (e) =>
    safeId(e.id) && safeId(e.pointId) && !/[<>&"']/.test(e.name);
  for (const [id, a] of Object.entries(db.accounts)) {
    if (
      !['A', 'B'].includes(id) ||
      !a.events.every(safeEvent) ||
      !a.orders.every(
        (o) =>
          safeId(o.id) &&
          (!o.sourcePool || pool(o.sourcePool)) &&
          PACKS.some(
            (pack) =>
              pack.id === o.packId &&
              pack.count === o.count &&
              pack.price === o.price,
          ),
      ) ||
      !a.works.every(
        (w) =>
          safeId(w.id) &&
          w.snapshots.every(safeEvent) &&
          /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(
            w.image,
          ),
      )
    ) {
      throw Error('备份中的身份、经历或作品格式无效。');
    }
  }
  return db;
}
export const epochKey = demoKey + '.epoch';
