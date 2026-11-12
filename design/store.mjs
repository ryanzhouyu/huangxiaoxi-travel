import {
  ASSETS,
  STARTERS,
  ACTIVITY,
  lookFor,
  asset,
  pool,
  point,
} from "./data.mjs";
export const KEY = "hxx.interactive.v2";
const clone = (v) => JSON.parse(JSON.stringify(v));
export const initialDB = () => ({ version: 2, current: null, accounts: {} });
// orders 仅兼容旧手账读取；研判版没有购买入口或结算方法。
export function account(name) {
  return {
    name,
    initialized: false,
    owned: [],
    look: null,
    gifts: [],
    claimed: [],
    unlocked: [],
    balance: 0,
    events: [],
    ledger: [],
    draws: [],
    orders: [],
    works: [],
  };
}
function record(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function strings(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
function dated(v) {
  return typeof v === "string" && Number.isFinite(Date.parse(v));
}
function validLook(v, owned) {
  return (
    record(v) &&
    Object.keys(lookFor("start-a")).every(
      (slot) =>
        typeof v[slot] === "string" &&
        asset(v[slot])?.slot === slot &&
        owned.includes(v[slot]),
    )
  );
}
function validAccount(a) {
  if (
    !record(a) ||
    typeof a.name !== "string" ||
    typeof a.initialized !== "boolean" ||
    !Number.isSafeInteger(a.balance) ||
    a.balance < 0
  )
    return false;
  if (
    !["owned", "gifts", "claimed", "unlocked"].every((k) => strings(a[k])) ||
    new Set(a.owned).size !== a.owned.length
  )
    return false;
  if (a.initialized ? !validLook(a.look, a.owned) : a.look !== null)
    return false;
  if (
    !["events", "ledger", "draws", "orders", "works"].every((k) =>
      Array.isArray(a[k]),
    )
  )
    return false;
  if (
    !a.events.every(
      (e) =>
        record(e) &&
        typeof e.id === "string" &&
        typeof e.name === "string" &&
        typeof e.pointId === "string" &&
        typeof e.kind === "string" &&
        typeof e.method === "string" &&
        dated(e.at) &&
        Number.isSafeInteger(e.reward) &&
        e.reward >= 0 &&
        strings(e.unlocked),
    )
  )
    return false;
  if (
    !a.ledger.every(
      (e) =>
        record(e) &&
        typeof e.id === "string" &&
        typeof e.reason === "string" &&
        Number.isSafeInteger(e.delta) &&
        Number.isSafeInteger(e.balance) &&
        e.balance >= 0 &&
        dated(e.at),
    )
  )
    return false;
  if (
    !a.draws.every(
      (e) =>
        record(e) &&
        typeof e.id === "string" &&
        typeof e.assetId === "string" &&
        typeof e.poolId === "string" &&
        dated(e.at),
    )
  )
    return false;
  if (
    !a.orders.every(
      (e) =>
        record(e) &&
        typeof e.id === "string" &&
        Number.isSafeInteger(e.count) &&
        e.count > 0 &&
        typeof e.price === "string" &&
        ["pending", "paid", "cancelled", "failed"].includes(e.status) &&
        dated(e.at),
    )
  )
    return false;
  return a.works.every(
    (w) =>
      record(w) &&
      typeof w.id === "string" &&
      typeof w.title === "string" &&
      dated(w.at) &&
      strings(w.events) &&
      Array.isArray(w.snapshots) &&
      w.snapshots.every(
        (e) =>
          record(e) &&
          typeof e.name === "string" &&
          typeof e.method === "string" &&
          dated(e.at),
      ) &&
      validLook(w.look, a.owned) &&
      typeof w.image === "string" &&
      w.image.startsWith("data:image/png;"),
  );
}
export function readDB(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return initialDB();
    const db = JSON.parse(raw);
    if (
      !record(db) ||
      db.version !== 2 ||
      !record(db.accounts) ||
      !(
        db.current === null ||
        (typeof db.current === "string" &&
          Object.hasOwn(db.accounts, db.current))
      ) ||
      !Object.values(db.accounts).every(validAccount)
    )
      throw Error();
    return db;
  } catch {
    throw Error("进度读取失败，请检查浏览器存储。原有记录不会被覆盖。");
  }
}
export function commit(storage, db, fn) {
  const draft = clone(db);
  const result = fn(draft);
  try {
    storage.setItem(KEY, JSON.stringify(draft));
  } catch {
    throw Error(
      "未能保存进度，可能是浏览器存储已满或不可用。本次操作未生效，请重试。",
    );
  }
  return { db: draft, result };
}
function need(a) {
  if (!a?.initialized) throw Error("请先选择初始伙伴。");
}
export function initialize(a, id) {
  if (a.initialized) return;
  if (!STARTERS.some((s) => s.id === id)) throw Error("请选择有效初始搭配。");
  a.initialized = true;
  a.owned = ASSETS.filter(
    (x) =>
      x.outfit?.startsWith("start-") ||
      ["calm", "stand", "paper"].includes(x.id),
  ).map((x) => x.id);
  a.look = lookFor(id);
}
export function gift(a) {
  need(a);
  if (a.gifts.includes("demo")) return false;
  a.gifts.push("demo");
  a.owned.push(...ASSETS.filter((x) => x.outfit === "gift").map((x) => x.id));
  return true;
}
function credit(a, n, reason, ref, now) {
  a.balance += n;
  a.ledger.unshift({ id: ref, delta: n, reason, at: now, balance: a.balance });
}
export function checkin(
  a,
  { pointId, method = "qr", code, requestId, now = new Date().toISOString() },
) {
  need(a);
  const p = point(pointId);
  if (!p) throw Error("找不到这个测试点位。");
  if (method !== "qr" && method !== "geo-demo") throw Error("核验方式无效。");
  if (method === "qr" && code !== p.code)
    throw Error("二维码不属于此点位或已经失效，请重新扫描。");
  const old = a.events.find((e) => e.id === requestId);
  if (old) return old;
  if (
    a.events.some(
      (e) =>
        e.pointId === p.id &&
        e.method === method &&
        Date.parse(now) - Date.parse(e.at) >= 0 &&
        Date.parse(now) - Date.parse(e.at) < 60000,
    )
  )
    throw Error("刚刚已经记录本次到访，请稍后再记录。奖励每个地点仅领取一次。");
  const key = `point:${p.id}`,
    reward = a.claimed.includes(key) ? 0 : p.reward;
  const unlocked = p.pools.filter((x) => !a.unlocked.includes(x));
  a.unlocked.push(...unlocked);
  if (reward) {
    a.claimed.push(key);
    credit(a, reward, `${p.name}·首次到访`, requestId, now);
  }
  const e = {
    id: requestId,
    pointId: p.id,
    name: p.name,
    kind: p.kind,
    method,
    at: now,
    reward,
    unlocked,
    look: clone(a.look),
    demo: true,
  };
  a.events.push(e);
  return e;
}
export function activity(a, { requestId, now = new Date().toISOString() }) {
  need(a);
  const old = a.events.find((e) => e.id === requestId);
  if (old) return old;
  const key = `activity:${ACTIVITY.id}`;
  if (a.claimed.includes(key))
    throw Error("本项体验奖励已经领取，每个账号一次。");
  a.claimed.push(key);
  const p = point(ACTIVITY.point);
  const unlocked = p.pools.filter((x) => !a.unlocked.includes(x));
  a.unlocked.push(...unlocked);
  credit(a, ACTIVITY.reward, `${ACTIVITY.name}·体验完成`, requestId, now);
  const e = {
    id: requestId,
    pointId: p.id,
    name: ACTIVITY.name,
    kind: "体验活动",
    method: "staff-demo",
    at: now,
    reward: ACTIVITY.reward,
    unlocked,
    look: clone(a.look),
    demo: true,
  };
  a.events.push(e);
  return e;
}
export function eligible(a, id) {
  const p = pool(id);
  return p ? p.assets.filter((x) => !a.owned.includes(x)) : [];
}
export function draw(
  a,
  { poolId, requestId, random = Math.random, now = new Date().toISOString() },
) {
  need(a);
  const old = a.draws.find((d) => d.id === requestId);
  if (old) return old;
  if (!pool(poolId)) throw Error("卡池不存在。");
  if (!a.unlocked.includes(poolId))
    throw Error("先到访关联地点，才能解锁这个卡池。");
  const ids = eligible(a, poolId);
  if (!ids.length) throw Error("这个卡池已收齐，不会扣除次数。");
  if (a.balance < 1) throw Error("本景区通用次数不足。");
  const id =
    ids[
      Math.min(ids.length - 1, Math.max(0, Math.floor(random() * ids.length)))
    ];
  credit(a, -1, `${pool(poolId).name}·抽取`, requestId, now);
  a.owned.push(id);
  const d = { id: requestId, poolId, assetId: id, at: now };
  a.draws.unshift(d);
  return d;
}
export function saveLook(a, look) {
  need(a);
  for (const slot of Object.keys(lookFor("start-a"))) {
    if (!a.owned.includes(look[slot]) || asset(look[slot])?.slot !== slot)
      throw Error("这套搭配包含未拥有或部位不匹配的装扮。");
  }
  a.look = clone(look);
}
export function saveWork(a, work) {
  need(a);
  if (
    !work.events.length ||
    work.events.some((id) => !a.events.some((e) => e.id === id))
  )
    throw Error("请选择至少一条有效到访经历。");
  if (a.works.some((w) => w.id === work.id)) return;
  if (JSON.stringify(work.look) !== JSON.stringify(a.look))
    throw Error("搭配已改变，请重新预览后生成。");
  a.works.unshift(clone(work));
}
