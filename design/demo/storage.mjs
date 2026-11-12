import {KEY} from '../store.mjs';
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
// 保留既有命名，避免改键或覆盖本机进度。
export const epochKey = demoKey + '.epoch';
