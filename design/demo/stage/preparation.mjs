import {ASSETS} from '../../data.mjs';
import {prepareArtwork} from '../renderer.mjs';
import {thumbnailUrl} from '../wardrobe-art.mjs';
import {demoKey, epochKey, inspectArchive, sessionPrefix} from '../storage.mjs';

export function describeArchive(db) {
  return (
    Object.entries(db.accounts)
      .map(
        ([id, a]) =>
          '游客 ' +
          id +
          '：' +
          a.events.length +
          ' 条经历、' +
          a.balance +
          ' 次机会、' +
          a.works.length +
          ' 张作品',
      )
      .join('；') || '新手账，尚无游玩记录。'
  );
}

export async function preflight() {
  inspectArchive();
  for (const [store, key] of [
    [sessionStorage, sessionPrefix],
    [localStorage, demoKey],
  ]) {
    const probe = key + '.probe.' + crypto.randomUUID();
    store.setItem(probe, '1');
    store.removeItem(probe);
  }
  const scenes = [
    'cloud-pavilion',
    'flower-creek',
    'gift-box',
    'letter-desk',
    'photo-studio',
    'travel-journal',
    'village-post',
    'wardrobe-studio',
  ];
  const urls = [
    ...['cameo', ...ASSETS.filter((a) => a.outfit).map((a) => a.id)].map(
      thumbnailUrl,
    ),
    ...scenes.map(
      (name) =>
        new URL('../assets/scenes/' + name + '.webp', import.meta.url).href,
    ),
  ];
  await Promise.all([
    prepareArtwork(),
    ...urls.map(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
    }),
  ]);
}

export function backupArchive() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(inspectArchive(), null, 2)], {
      type: 'application/json',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = '黄晓西-演示手账.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// Replace only the demo archive after explicit confirmation. An epoch also invalidates other tabs' drafts.
export function replaceArchive(db) {
  const epoch = crypto.randomUUID();
  if (db) localStorage.setItem(demoKey, JSON.stringify(db));
  else localStorage.removeItem(demoKey);
  localStorage.setItem(epochKey, epoch);
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith(sessionPrefix)) sessionStorage.removeItem(key);
}
