import test from 'node:test';
import assert from 'node:assert/strict';
import * as legacy from '../../design/store.mjs';
import {previewMigration} from './migration-preview.mjs';

function fixture() {
  const db = legacy.initialDB();
  db.accounts.A = legacy.account('测试 A');
  db.accounts.B = legacy.account('测试 B');
  const a = db.accounts.A;
  legacy.initialize(a, 'start-a');
  legacy.gift(a);
  legacy.checkin(a, {pointId:'gate',code:'HXX-GATE-2026',requestId:'visit-1',now:'2026-11-08T01:00:00Z'});
  legacy.draw(a, {poolId:'cloud',requestId:'draw-1',random:()=>0,now:'2026-11-08T01:01:00Z'});
  legacy.createOrder(a, {packId:'five',id:'order-1',now:'2026-11-08T01:02:00Z'});
  legacy.pay(a, {id:'order-1',status:'paid',now:'2026-11-08T01:03:00Z'});
  legacy.createOrder(a, {packId:'one',id:'pending-1',now:'2026-11-08T01:04:00Z'});
  db.current = 'B';
  return db;
}
const preview = db => previewMigration(JSON.stringify(db), 'A');

test('正常演示流生成可读迁移摘要，但永不直接准许导入且不改变原数据', () => {
  const db=fixture(), before=JSON.stringify(db), report=preview(db);
  assert.equal(report.structurallyConsistent,true);
  assert.equal(report.canApply,false);
  assert.deepEqual(report.counts,{owned:20,visits:1,draws:1,remainingTickets:6,works:0,archivedOrders:2,pendingOrders:1});
  assert.equal(JSON.stringify(db),before);
});
test('必须显式选 A 或 B，备份 current 和另一手账不决定目标或摘要', () => {
  const db=fixture(), first=preview(db);
  assert.throws(()=>previewMigration(JSON.stringify(db)),/SOURCE_PROFILE_REQUIRED/);
  db.current='A';db.accounts.B.name='另一手账';
  assert.equal(preview(db).fingerprint,first.fingerprint);
  assert.equal(previewMigration(JSON.stringify(db),'B').counts.visits,0);
  db.accounts.B.owned.push('start-a-top');
  assert.ok(previewMigration(JSON.stringify(db),'B').issues.some(x=>x.code==='UNINITIALIZED_PROGRESS'));
  delete db.accounts.B;
  assert.throws(()=>previewMigration(JSON.stringify(db),'B'),/SOURCE_PROFILE_MISSING/);
});
test('篡改余额不能通过账链一致性；缺流水也必须阻断审批准备', () => {
  const db=fixture();db.accounts.A.balance+=100;
  assert.ok(preview(db).issues.some(x=>x.code==='BALANCE_MISMATCH'));
  db.accounts.A.ledger=[];
  assert.ok(preview(db).issues.some(x=>x.code==='MISSING_LEDGER_ENTRIES'));
});
test('未知装扮、凭空领奖和凭空解锁保留为问题，不静默删除或发奖', () => {
  const db=fixture();db.accounts.A.owned.push('unknown-hair');db.accounts.A.claimed.push('point:shop');db.accounts.A.unlocked.push('bloom');
  const report=preview(db);
  for (const code of ['UNKNOWN_ASSET','OWNERSHIP_PROVENANCE_MISMATCH','CLAIM_PROVENANCE_MISMATCH','UNLOCK_PROVENANCE_MISMATCH']) {
    assert.ok(report.issues.some(x=>x.code===code),code);
  }
});
test('重复到访奖励和重复抽取资产不能被迁移再次放大', () => {
  const db=fixture();db.accounts.A.events.push({...db.accounts.A.events[0],id:'visit-2'});
  db.accounts.A.draws.push({...db.accounts.A.draws[0],id:'draw-2'});
  const report=preview(db);
  assert.ok(report.issues.some(x=>x.code==='REPEATED_REWARD'));
  assert.ok(report.issues.some(x=>x.code==='REPEATED_ASSET'));
});
test('作品必须有原经历及一致快照；检查不重新生成或修改 PNG', () => {
  const db=fixture(), a=db.accounts.A;
  // 仅用于结构测试的 PNG 编码占位；不是有效图片解码证据。
  const image='data:image/png;base64,iVBORw0KGgo=';
  a.works.push({id:'work-1',title:'测试图',at:'2026-11-08T03:00:00Z',events:['visit-1'],snapshots:structuredClone(a.events),look:structuredClone(a.look),template:'postcard',image});
  assert.equal(preview(db).structurallyConsistent,true);
  a.works[0].snapshots[0].at='2026-11-08T04:00:00Z';
  assert.ok(preview(db).issues.some(x=>x.code==='WORK_SNAPSHOT_MISMATCH'));
  a.works[0].events=['missing'];
  assert.ok(preview(db).issues.some(x=>x.code==='WORK_EVENT_MISSING'));
  assert.equal(a.works[0].image,image);
});
test('同一所选存档对象键顺序不影响指纹，内容变更会改变指纹', () => {
  const db=fixture(), first=preview(db).fingerprint;
  db.accounts.A=Object.fromEntries(Object.entries(db.accounts.A).reverse());
  assert.equal(preview(db).fingerprint,first);
  db.accounts.A.name='变更后的测试 A';
  assert.notEqual(preview(db).fingerprint,first);
});
test('损坏、超限、未知版本或不合法图片编码拒绝解析，不触碰存储', () => {
  assert.throws(()=>previewMigration('{broken','A'));
  assert.throws(()=>previewMigration(' '.repeat(25*1024*1024+1),'A'),/ARCHIVE_SIZE_OR_TYPE/);
  const db=fixture();db.version=999;
  assert.throws(()=>preview(db));
  db.version=2;
  db.accounts.A.works.push({id:'bad-image',title:'错误图片',at:'2026-11-08T03:00:00Z',events:['visit-1'],snapshots:structuredClone(db.accounts.A.events),look:structuredClone(db.accounts.A.look),template:'postcard',image:'https://example.invalid/not-a-png'});
  assert.throws(()=>preview(db));
});
