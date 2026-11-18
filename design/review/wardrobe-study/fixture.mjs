import {POINTS} from '../../data.mjs';
import * as store from '../../store.mjs';

export const sources = {
  partner: {title: '伙伴', hash: '#partner'},
  gift: {title: '景区见面礼', hash: '#gift?from=%23scene'},
  pool: {title: '云山卡池', hash: '#pool?id=cloud&from=%23scene'},
  compose: {title: '回忆照相馆', hash: '#compose?visit=study-gate&from=%23memories%3Fday%3D2026-11-18'},
};

export const composeDraft = {title: '与晓西看山色', template: 'trail', selected: ['study-gate', 'study-ridge']};

// 样本在独立标签页使用，库存由既有规则构成，两个对照入口使用同一份数据。
export function makeFixture(profile = 'full') {
  const db = store.initialDB();
  db.current = 'review-1';
  const account = db.accounts[db.current] = store.account('衣橱评审');
  store.initialize(account, 'start-c');
  if (profile === 'starter') return db;
  store.gift(account);
  for (const [index, point] of POINTS.entries()) {
    store.checkin(account, {pointId: point.id, code: point.code, requestId: 'study-' + point.id,
      now: new Date(Date.UTC(2026, 10, 18, 1, index * 10)).toISOString()});
  }
  store.activity(account, {requestId: 'study-activity', now: '2026-11-18T02:05:00Z'});
  const picks = {
    cloud: ['mountain-top', 'mountain-shoes', 'mountain-bottom', 'mountain-hair', 'joy', 'wave', 'mountain-bg'],
    bloom: ['flower-top', 'flower-bg'],
  };
  for (const [poolId, items] of Object.entries(picks)) for (const id of items) {
    const eligible = store.eligible(account, poolId);
    const index = eligible.indexOf(id);
    store.draw(account, {poolId, requestId: 'study-' + id, random: () => (index + .5) / eligible.length, now: '2026-11-18T02:20:00Z'});
  }
  return db;
}
