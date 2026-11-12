import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../store.mjs";
import * as D from "../data.mjs";
const create = () => {
  const a = S.account("测试");
  S.initialize(a, "start-a");
  return a;
};
const visit = (a, id, now = "2026-10-19T02:00:00Z", requestId = id) =>
  S.checkin(a, { pointId: id, code: D.point(id).code, now, requestId });
test("初始化所有初始装扮，选项只影响默认搭配", () => {
  const a = create();
  assert.equal(a.owned.length, 15);
  assert.ok(a.owned.includes("start-c-shoes"));
  assert.equal(a.look.top, "start-a-top");
  S.initialize(a, "start-b");
  assert.equal(a.look.top, "start-a-top");
});
test("领装不穿戴、不产生到访且幂等", () => {
  const a = create(),
    look = JSON.stringify(a.look);
  assert.equal(S.gift(a), true);
  assert.equal(S.gift(a), false);
  assert.equal(a.owned.length, 19);
  assert.equal(a.events.length, 0);
  assert.equal(a.balance, 0);
  assert.equal(JSON.stringify(a.look), look);
});
test("二维码不合法时不产生任何业务变化", () => {
  const a = create(),
    before = JSON.stringify(a);
  assert.throws(() =>
    S.checkin(a, { pointId: "gate", code: "wrong", requestId: "x" }),
  );
  assert.equal(JSON.stringify(a), before);
});
test("打卡记录、发奖、共享池解锁；同请求重试不重复", () => {
  const a = create(),
    e = visit(a, "gate");
  assert.equal(e.reward, 2);
  assert.equal(a.balance, 2);
  assert.deepEqual(a.unlocked, ["cloud"]);
  visit(a, "gate");
  assert.equal(a.events.length, 1);
  assert.equal(a.balance, 2);
  visit(a, "ridge");
  assert.equal(a.balance, 4);
  assert.deepEqual(a.unlocked, ["cloud"]);
});
test("重复到访不发奖，跨日持续积累且不需要结束动作", () => {
  const a = create();
  visit(a, "gate");
  visit(a, "gate", "2026-10-22T06:00:00Z", "again");
  assert.equal(a.events.length, 2);
  assert.equal(a.events[1].reward, 0);
  assert.equal(a.balance, 2);
  assert.throws(
    () => visit(a, "gate", "2026-10-22T06:00:05Z", "too-fast"),
    /刚刚/,
  );
});
test("商家到店与体验各一次；活动可单独记录有效参与", () => {
  const a = create();
  visit(a, "shop");
  S.activity(a, { requestId: "craft" });
  assert.equal(a.balance, 3);
  assert.deepEqual(a.claimed, ["point:shop", "activity:craft"]);
  assert.equal(a.events.length, 2);
  S.activity(a, { requestId: "craft" });
  assert.equal(a.balance, 3);
  assert.throws(() => S.activity(a, { requestId: "craft-again" }), /已经领取/);
});
test("有次数也不能越过未解锁卡池", () => {
  const a = create();
  visit(a, "brook");
  assert.equal(a.balance, 2);
  assert.throws(
    () => S.draw(a, { poolId: "cloud", requestId: "locked" }),
    /先到访/,
  );
  assert.equal(a.balance, 2);
});
test("次数跨点通用、跨池排除共有资产；等概率按当前候选序列选择", () => {
  const a = create();
  visit(a, "gate");
  visit(a, "brook");
  visit(a, "ridge");
  visit(a, "shop");
  S.activity(a, { requestId: "craft-fund" });
  const eligible = S.eligible(a, "cloud");
  const index = eligible.indexOf("joy");
  const d = S.draw(a, {
    poolId: "cloud",
    requestId: "joy",
    random: () => index / eligible.length + 0.001,
  });
  assert.equal(d.assetId, "joy");
  assert.ok(!S.eligible(a, "bloom").includes("joy"));
  const b = a.balance;
  S.draw(a, { poolId: "cloud", requestId: "joy" });
  assert.equal(a.balance, b);
  assert.equal(a.draws.length, 1);
  while (S.eligible(a, "cloud").length)
    S.draw(a, {
      poolId: "cloud",
      requestId: crypto.randomUUID(),
      random: () => 0,
    });
  assert.equal(new Set(a.draws.map((d) => d.assetId)).size, a.draws.length);
  const before = a.balance;
  assert.throws(
    () => S.draw(a, { poolId: "cloud", requestId: "full" }),
    /已收齐/,
  );
  assert.equal(a.balance, before);
  assert.equal(a.events.length, 5);
});
test("余额不足不扣次、不发物", () => {
  const a = create();
  visit(a, "gate");
  S.draw(a, { poolId: "cloud", requestId: "one" });
  S.draw(a, { poolId: "cloud", requestId: "two" });
  const before = JSON.stringify(a);
  assert.throws(
    () => S.draw(a, { poolId: "cloud", requestId: "three" }),
    /不足/,
  );
  assert.equal(JSON.stringify(a), before);
});
test("未拥有不可保存；当前搭配与到访时搭配分离", () => {
  const a = create();
  visit(a, "gate");
  assert.throws(
    () => S.saveLook(a, { ...a.look, top: "mountain-top" }),
    /未拥有/,
  );
  S.saveLook(a, D.lookFor("start-b"));
  assert.equal(a.events[0].look.top, "start-a-top");
  assert.equal(a.look.top, "start-b-top");
  assert.throws(
    () => S.saveLook(a, { ...a.look, top: "start-a-shoes" }),
    /不匹配/,
  );
});
test("作品只使用已有经历和已保存搭配；后续搭配变化不改写作品", () => {
  const a = create();
  const work = { id: "w", events: [], look: structuredClone(a.look) };
  assert.throws(() => S.saveWork(a, work), /至少/);
  visit(a, "gate");
  work.events = ["gate"];
  S.saveWork(a, work);
  S.saveLook(a, D.lookFor("start-c"));
  assert.equal(a.works[0].look.top, "start-a-top");
  assert.equal(a.look.top, "start-c-top");
  assert.throws(
    () =>
      S.saveWork(a, {
        ...work,
        id: "wrong",
        events: ["nonexistent"],
        look: a.look,
      }),
    /有效到访/,
  );
});
test("原子写入失败不扣钱不发奖，原数据和另一账号不变", () => {
  let value = null;
  const storage = {
    getItem: () => value,
    setItem: (k, v) => {
      value = v;
    },
  };
  let db = S.initialDB();
  db.accounts.A = create();
  db.accounts.B = create();
  db.current = "A";
  db = S.commit(storage, db, (d) => visit(d.accounts.A, "gate")).db;
  const before = JSON.stringify(db),
    stored = value;
  assert.throws(
    () =>
      S.commit(
        {
          setItem() {
            throw Error();
          },
        },
        db,
        (d) => S.draw(d.accounts.A, { poolId: "cloud", requestId: "f" }),
      ),
    /未能保存/,
  );
  assert.equal(JSON.stringify(db), before);
  assert.equal(value, stored);
  assert.equal(db.accounts.B.balance, 0);
  assert.equal(db.accounts.B.events.length, 0);
});
test("损坏的进度阻止写入，不悄悄清空", () => {
  assert.throws(() => S.readDB({ getItem: () => "{oops" }), /读取失败/);
});
test("合法 JSON 的不完整账号、无效当前账号和坏作品都保护性报错", () => {
  const db = S.initialDB();
  db.current = "A";
  db.accounts.A = create();
  const cases = [
    { ...db, accounts: { A: { initialized: true } } },
    { ...db, current: "missing" },
    { ...db, accounts: { A: { ...create(), works: [{ id: "broken" }] } } },
  ];
  for (const value of cases) {
    const raw = JSON.stringify(value);
    let wrote = false;
    assert.throws(
      () =>
        S.readDB({
          getItem: () => raw,
          setItem() {
            wrote = true;
          },
        }),
      /读取失败/,
    );
    assert.equal(wrote, false);
  }
  assert.deepEqual(S.readDB({ getItem: () => JSON.stringify(db) }), db);
});

test("旧订单兼容读取且不提供新增购买能力", () => {
  const db = S.initialDB();
  db.current = "A";
  db.accounts.A = create();
  const old = {
    id: "legacy",
    count: 1,
    price: "1.00",
    status: "paid",
    at: "2026-11-01T00:00:00Z",
  };
  db.accounts.A.orders = [old];
  const restored = S.readDB({ getItem: () => JSON.stringify(db) });
  S.gift(restored.accounts.A);
  assert.deepEqual(restored.accounts.A.orders, [old]);
  assert.equal(S.createOrder, undefined);
  assert.equal(S.pay, undefined);
  assert.equal(D.PACKS, undefined);
});
