import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReturnTarget, resolveEntry, recoveryAction} from './navigation.mjs';
import {validateCommand, requestIdentity} from './commands.mjs';
import {initialAnimationState, transition} from './animation-state.mjs';

const requestId = '9a3c7e3d-47e2-4cbd-bec6-748522ab1a35';
const command = input => ({requestId, input});

test('候选认证与初始化守卫保留新用户扫码目标，导航不产生业务写入', () => {
  const target = '#checkin?sceneId=demo&pointId=gate&method=qr';
  const login = resolveEntry({authenticated: false}, target);
  assert.equal(login.page, 'login');
  const onboard = resolveEntry({authenticated: true, accountId: 'U1', initialized: false}, login.returnTo);
  assert.equal(onboard.page, 'onboarding');
  const ready = resolveEntry({authenticated: true, accountId: 'U1', initialized: true}, onboard.returnTo);
  assert.equal(ready.page, 'target');
  assert.equal(ready.returnTo, '#checkin?method=qr&pointId=gate&sceneId=demo');
  assert.deepEqual(Object.keys(ready).sort(), ['page', 'rejectedTarget', 'returnTo']);
});

test('返回地址拒绝外站、脚本、双重编码、重复字段、缺失归属和伪操作', () => {
  for (const input of ['https://example.org', '//example.org', 'javascript:alert(1)', '#login', '#checkin?pointId=gate', '#point?sceneId=demo&pointId=%252Fadmin', '#point?sceneId=demo&pointId=gate&pointId=shop', '#pool?sceneId=demo&poolId=cloud&pay=1', '#partner?returnTo=https://example.org', '#checkin?sceneId=demo&pointId=gate&method=staff-demo', '#partner#work']) {
    assert.deepEqual(normalizeReturnTarget(input), {target: '#partner', rejected: true}, input);
  }
});

test('登录到另一账号不会重放原账号抽取；原账号恢复先查结果', () => {
  const pending = {accountId: 'U1', status: 'unknown', requestId};
  assert.equal(recoveryAction(pending, null), 'authenticate');
  assert.equal(recoveryAction(pending, 'U2'), 'keep-isolated');
  assert.equal(recoveryAction(pending, 'U1'), 'query-original');
  assert.equal(recoveryAction({...pending, status: 'succeeded'}, 'U1'), 'show-result');
});

test('浏览器不能提交拥有者、余额、金额或模拟成功状态作为可信事实', () => {
  assert.throws(() => validateCommand('drawReward', {...command({sceneId: 'demo', poolId: 'cloud'}), accountId: 'U2'}));
  for (const injected of [{balance: 10}, {assetId: 'flower-top'}, {amount: 0}]) assert.throws(() => validateCommand('drawReward', command({sceneId: 'demo', poolId: 'cloud', ...injected})));
  assert.throws(() => validateCommand('settleDemoOrder', command({orderId: 'order-1', status: 'paid'})));
  assert.doesNotThrow(() => validateCommand('settleDemoOrder', command({orderId: 'order-1', simulationReceiptId: 'receipt-1'})));
});

test('重试摘要忽略对象字段顺序，改变输入可识别，账号不同归属不同', async () => {
  const original = await requestIdentity('U1', 'drawReward', command({sceneId: 'demo', poolId: 'cloud'}));
  const reordered = await requestIdentity('U1', 'drawReward', command({poolId: 'cloud', sceneId: 'demo'}));
  const changed = await requestIdentity('U1', 'drawReward', command({sceneId: 'demo', poolId: 'bloom'}));
  const other = await requestIdentity('U2', 'drawReward', command({sceneId: 'demo', poolId: 'cloud'}));
  assert.deepEqual(original, reordered);
  assert.equal(original.key, changed.key);
  assert.notEqual(original.inputHash, changed.inputHash);
  assert.notEqual(original.key, other.key);
});

test('保存搭配携带专用版本，结构有效不代表已拥有', () => {
  const look = {hair:'start-a-hair', top:'start-a-top', bottom:'start-a-bottom', shoes:'start-a-shoes', expression:'calm', pose:'stand', background:'paper'};
  const input = {look, expectedLookRevision: 0};
  const valid = validateCommand('saveCompanionLook', command(input));
  assert.notEqual(valid.input.look, look);
  assert.throws(() => validateCommand('saveCompanionLook', command({...input, expectedLookRevision: -1})));
  assert.throws(() => validateCommand('saveCompanionLook', command({...input, look: {...look, balance: 20}})));
  assert.throws(() => validateCommand('saveCompanionLook', command({...input, revision: 5})));
});

test('制作请求必须有经历，不能注入图片URL或伪造来源快照', () => {
  const input = {sceneId:'demo', visitIds:['visit-1','visit-2'], templateId:'trail', title:'黔山同行', expectedLookRevision:1};
  assert.doesNotThrow(() => validateCommand('prepareMemory', command(input)));
  for (const extra of [{visitIds:[]}, {visitIds:['visit-1','visit-1']}, {imageUrl:'https://example.org/image.png'}, {snapshots:[]}]) assert.throws(() => validateCommand('prepareMemory', command({...input, ...extra})));
});

test('无效请求ID、非对象、隐式空值与原型属性不能通过输入契约', () => {
  for (const body of [null, [], {requestId:'1',input:{}}, {requestId:[requestId],input:{sceneId:'demo',poolId:'cloud'}}, {requestId,input:null}, command({sceneId:'demo',poolId:undefined})]) assert.throws(() => validateCommand('drawReward', body));
  assert.throws(() => validateCommand('toString', command({})));
  assert.throws(() => validateCommand(['drawReward'], command({sceneId:'demo',poolId:'cloud'})));
  const inherited = Object.create({sceneId:'demo', poolId:'cloud'});
  assert.throws(() => validateCommand('drawReward', command(inherited)));
});

function machine() {
  let state = initialAnimationState();
  return {send(event) { const next = transition(state, event); state = next.state; return next; }, get state() {return state;}};
}
function ready(m, handle='A') {
  m.send({type:'load',look:'A'});
  m.send({type:'loaded',request:m.state.request,handle});
}

test('快速换装 A→B：迟到资源被释放，只接受最后请求', () => {
  const m = machine();
  m.send({type:'load',look:'A'}); const first = m.state.request;
  m.send({type:'load',look:'B'}); const last = m.state.request;
  m.send({type:'loaded',request:last,handle:'B'});
  const stale = m.send({type:'loaded',request:first,handle:'A'});
  assert.equal(m.state.handle,'B');
  assert.deepEqual(stale.effects,[{type:'dispose-handle',handle:'A'}]);
});

test('换装失败保留旧形象并明确错误；重试成功才释放旧资源', () => {
  const m=machine(); ready(m);
  m.send({type:'load',look:'B'});
  m.send({type:'failed',request:m.state.request,code:'MISSING_LAYER'});
  assert.equal(m.state.handle,'A'); assert.equal(m.state.phase,'error');
  assert.deepEqual(m.send({type:'tap'}).effects,[]);
  m.send({type:'load',look:'B'});
  const accepted=m.send({type:'loaded',request:m.state.request,handle:'B'});
  assert.deepEqual(accepted.effects.slice(0,2),[{type:'activate',handle:'B'},{type:'dispose-handle',handle:'A'}]);
});

test('重复完成通知及重新加载同一缓存句柄不能释放正在展示的资源', () => {
  const m=machine(); ready(m);
  assert.deepEqual(m.send({type:'loaded',request:m.state.request,handle:'A'}).effects,[]);
  assert.equal(m.state.handle,'A');
  m.send({type:'load',look:'A'});
  const loaded=m.send({type:'loaded',request:m.state.request,handle:'A'});
  assert.equal(loaded.state.handle,'A');
  assert.equal(loaded.effects.some(effect=>effect.type==='dispose-handle'),false);
});

test('回应中连续点击不排队，旧动作结束不影响新搭配', () => {
  const m=machine(); ready(m);
  const first=m.send({type:'tap'}); const motion=m.state.motion;
  assert.equal(first.effects[0].type,'tapResponse');
  for(let i=0;i<20;i++) assert.deepEqual(m.send({type:'tap'}).effects,[]);
  m.send({type:'load',look:'B'});
  m.send({type:'loaded',request:m.state.request,handle:'B'});
  m.send({type:'response-ended',motion});
  assert.equal(m.state.handle,'B');assert.equal(m.state.phase,'idle');
});

test('笑眼不叠加眨眼；点击回应中断眨眼，旧眨眼回调被忽略', () => {
  const m=machine();ready(m);
  assert.deepEqual(m.send({type:'blink',expression:'joy'}).effects,[]);
  m.send({type:'blink',expression:'calm'});const blink=m.state.motion;
  m.send({type:'tap'});m.send({type:'blink-ended',motion:blink});
  assert.equal(m.state.phase,'responding');assert.equal(m.state.blinking,false);
});

test('后台完成加载时不播放，20次前后台后只保留一个当前句柄', () => {
  const m=machine();m.send({type:'load',look:'A'});m.send({type:'hide'});
  const loaded=m.send({type:'loaded',request:m.state.request,handle:'A'});
  assert.equal(m.state.phase,'hidden');assert.equal(loaded.effects.at(-1).type,'pause');
  for(let i=0;i<20;i++){m.send({type:'show'});m.send({type:'tap'});m.send({type:'hide'});}
  m.send({type:'show'});assert.equal(m.state.handle,'A');assert.equal(m.state.phase,'idle');
});

test('卸载释放资源并拦截迟到加载；卸载后点击不复活', () => {
  const m=machine();ready(m);m.send({type:'load',look:'B'});const pending=m.state.request;
  const disposed=m.send({type:'dispose'});
  assert.ok(disposed.effects.some(x=>x.type==='dispose-handle'&&x.handle==='A'));
  assert.deepEqual(m.send({type:'loaded',request:pending,handle:'B'}).effects,[{type:'dispose-handle',handle:'B'}]);
  assert.deepEqual(m.send({type:'tap'}).effects,[]);assert.equal(m.state.phase,'disposed');
});
