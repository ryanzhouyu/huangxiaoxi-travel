// 只读候选迁移审查。输入为显式选取的备份文本；不读取浏览器、不写本地或云端。
import {createHash} from 'node:crypto';
import {parseBackup} from '../../design/demo/storage.mjs';
import {ASSETS, ACTIVITY, POINTS, POOLS} from '../../design/data.mjs';

const MAX_BYTES = 25 * 1024 * 1024;
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
};
const digest = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const sameSet = (left, right) => left.size === right.size && [...left].every(id => right.has(id));

/**
 * @param {string} raw 未经信任的演示备份文本
 * @param {'A'|'B'} sourceProfile 必须显式选择，不采用备份 current 字段
 * @returns {{sourceProfile:string, fingerprint:string, structurallyConsistent:boolean,
 * canApply:false, issues:Array<{code:string,ref:string}>, counts:Object, limits:string[]}}
 */
export function previewMigration(raw, sourceProfile) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
    throw new Error('ARCHIVE_SIZE_OR_TYPE');
  }
  if (!['A', 'B'].includes(sourceProfile)) throw new Error('SOURCE_PROFILE_REQUIRED');
  const db = parseBackup(raw);
  if (!Object.hasOwn(db.accounts, sourceProfile)) throw new Error('SOURCE_PROFILE_MISSING');
  const account = db.accounts[sourceProfile];
  const issues = [];
  const issue = (code, ref = '') => issues.push({code, ref});
  if (!account.initialized && (account.balance !== 0 ||
    ['owned', 'gifts', 'claimed', 'unlocked', 'events', 'ledger', 'draws', 'orders', 'works'].some(key => account[key].length))) {
    issue('UNINITIALIZED_PROGRESS');
  }
  const unique = (values, label) => {
    if (new Set(values).size !== values.length) issue('DUPLICATE_' + label);
  };
  for (const key of ['gifts', 'claimed', 'unlocked']) unique(account[key], key.toUpperCase());
  for (const key of ['events', 'ledger', 'draws', 'orders', 'works']) {
    unique(account[key].map(item => item.id), key.toUpperCase());
  }
  const assets = new Map(ASSETS.map(asset => [asset.id, asset]));
  const points = new Map(POINTS.map(point => [point.id, point]));
  const pools = new Map(POOLS.map(pool => [pool.id, pool]));
  for (const id of account.owned) if (!assets.has(id)) issue('UNKNOWN_ASSET', id);
  for (const id of account.gifts) if (id !== 'demo') issue('UNKNOWN_GIFT', id);
  for (const id of account.unlocked) if (!pools.has(id)) issue('UNKNOWN_POOL', id);
  const expectedOwned = new Set(account.initialized
    ? ASSETS.filter(asset => asset.outfit?.startsWith('start-') || ['calm', 'stand', 'paper'].includes(asset.id)).map(asset => asset.id)
    : []);
  if (account.gifts.includes('demo')) {
    for (const asset of ASSETS.filter(asset => asset.outfit === 'gift')) expectedOwned.add(asset.id);
  }
  const expectedClaims = new Set();
  const expectedUnlocks = new Set();
  const expectedLedger = new Map();
  const addLedger = (id, delta) => {
    if (expectedLedger.has(id)) issue('DUPLICATE_OPERATION_SOURCE', id);
    expectedLedger.set(id, delta);
  };
  for (const event of account.events) {
    const point = points.get(event.pointId);
    if (!point) { issue('UNKNOWN_POINT', event.id); continue; }
    const activity = event.method === 'staff-demo';
    if (!['qr', 'geo-demo', 'staff-demo'].includes(event.method) || activity && point.id !== ACTIVITY.point) {
      issue('UNKNOWN_VISIT_METHOD', event.id);
    }
    for (const poolId of point.pools) expectedUnlocks.add(poolId);
    if (event.unlocked.some(id => !point.pools.includes(id))) issue('VISIT_POOL_MISMATCH', event.id);
    if (event.reward > 0) {
      const claim = activity ? `activity:${ACTIVITY.id}` : `point:${point.id}`;
      if (expectedClaims.has(claim)) issue('REPEATED_REWARD', event.id);
      expectedClaims.add(claim);
      if (event.reward !== (activity ? ACTIVITY.reward : point.reward)) issue('REWARD_MISMATCH', event.id);
      addLedger(event.id, event.reward);
    }
  }
  for (const draw of account.draws) {
    if (!pools.get(draw.poolId)?.assets.includes(draw.assetId)) issue('DRAW_ASSET_MISMATCH', draw.id);
    if (!expectedUnlocks.has(draw.poolId)) issue('DRAW_WITHOUT_UNLOCK', draw.id);
    if (expectedOwned.has(draw.assetId)) issue('REPEATED_ASSET', draw.id);
    expectedOwned.add(draw.assetId);
    addLedger(draw.id, -1);
  }
  for (const order of account.orders) if (order.status === 'paid') addLedger(order.id, order.count);
  if (!sameSet(new Set(account.owned), expectedOwned)) issue('OWNERSHIP_PROVENANCE_MISMATCH');
  if (!sameSet(new Set(account.claimed), expectedClaims)) issue('CLAIM_PROVENANCE_MISMATCH');
  if (!sameSet(new Set(account.unlocked), expectedUnlocks)) issue('UNLOCK_PROVENANCE_MISMATCH');
  let balance = 0;
  for (const entry of [...account.ledger].reverse()) {
    if (expectedLedger.get(entry.id) !== entry.delta) issue('LEDGER_SOURCE_MISMATCH', entry.id);
    expectedLedger.delete(entry.id);
    balance += entry.delta;
    if (!Number.isSafeInteger(balance) || balance < 0 || balance !== entry.balance) issue('LEDGER_CHAIN_MISMATCH', entry.id);
  }
  if (expectedLedger.size) issue('MISSING_LEDGER_ENTRIES');
  if (balance !== account.balance) issue('BALANCE_MISMATCH');
  const events = new Map(account.events.map(event => [event.id, event]));
  for (const work of account.works) {
    if (!work.events.length || work.events.some(id => !events.has(id))) issue('WORK_EVENT_MISSING', work.id);
    unique(work.events, 'WORK_EVENT_IDS');
    const snapshots = new Map(work.snapshots.map(event => [event.id, event]));
    if (snapshots.size !== work.snapshots.length || !sameSet(new Set(work.events), new Set(snapshots.keys()))) issue('WORK_SNAPSHOT_MISMATCH', work.id);
    for (const id of work.events) {
      const source = events.get(id), snapshot = snapshots.get(id);
      if (source && snapshot && ['pointId', 'name', 'method', 'at'].some(key => source[key] !== snapshot[key])) {
        issue('WORK_SNAPSHOT_MISMATCH', work.id);
      }
    }
    if (!['postcard', 'trail'].includes(work.template)) issue('UNKNOWN_WORK_TEMPLATE', work.id);
  }
  return {
    sourceProfile, fingerprint: digest({format: 'legacy-v2-profile', sourceProfile, account}),
    structurallyConsistent: issues.length === 0, canApply: false, issues,
    counts: {owned: account.owned.length, visits: account.events.length, draws: account.draws.length,
      remainingTickets: account.balance, works: account.works.length,
      archivedOrders: account.orders.length, pendingOrders: account.orders.filter(order => order.status === 'pending').length},
    limits: ['需要服务端审批与目标账号授权', '一致性不证明存档真实或属于上传者',
      '图片仅检查旧备份编码格式，尚未解码校验', '不合并已有云进度，不迁移浏览器草稿',
      '原始 JSON 未记录可靠设备身份、epoch 或素材版本，不能补造'],
  };
}
