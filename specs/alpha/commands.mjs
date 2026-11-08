/** R01 输入契约候选。结构验证不是身份、拥有、核验凭证或事务授权。 */
export class ContractError extends Error {
  constructor(field) { super('Invalid command field: ' + field); this.code = 'INVALID_INPUT'; }
}
const stableId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const text = max => value => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const oneOf = values => value => values.includes(value);
const revision = value => Number.isSafeInteger(value) && value >= 0;
const slots = ['hair', 'top', 'bottom', 'shoes', 'expression', 'pose', 'background'];
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function look(value) {
  return plain(value) && Object.keys(value).length === slots.length && slots.every(key => Object.hasOwn(value, key) && stableId(value[key]));
}
const ids = value => Array.isArray(value) && value.length > 0 && value.length <= 200 && value.every(stableId) && new Set(value).size === value.length;
// optional 仅表达结构可选，不改变服务端按资源所属景区进行的校验。
const rules = Object.freeze({
  initializeCompanion: {required: {starterId: stableId}},
  claimScenicGift: {required: {sceneId: stableId}},
  verifyVisit: {required: {sceneId: stableId, pointId: stableId, method: oneOf(['qr', 'geo-demo']), proof: text(2048)}},
  verifyActivity: {required: {sceneId: stableId, activityId: stableId, proof: text(2048)}},
  drawReward: {required: {sceneId: stableId, poolId: stableId}},
  createDemoOrder: {required: {sceneId: stableId, packageId: stableId}, optional: {sourcePoolId: stableId}},
  settleDemoOrder: {required: {orderId: stableId, simulationReceiptId: stableId}},
  saveCompanionLook: {required: {look, expectedLookRevision: revision}},
  prepareMemory: {required: {sceneId: stableId, visitIds: ids, templateId: oneOf(['postcard', 'trail']), title: text(16), expectedLookRevision: revision}},
  finalizeMemory: {required: {preparationId: stableId}},
  cancelDemoOrder: {required: {orderId: stableId}},
});
export const commandNames = Object.freeze(Object.keys(rules));

/** @returns {{requestId: string, input: object}} 不接收 accountId、金额、余额或客户端成功状态。 */
export function validateCommand(name, body) {
  if (typeof name !== 'string' || !Object.hasOwn(rules, name) || !plain(body)) throw new ContractError('command');
  if (Object.keys(body).length !== 2 || !Object.hasOwn(body, 'requestId') || !Object.hasOwn(body, 'input')) throw new ContractError('envelope');
  if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.requestId)) throw new ContractError('requestId');
  if (!plain(body.input)) throw new ContractError('input');
  const {required: fields, optional = {}} = rules[name];
  for (const [key, check] of Object.entries(fields)) if (!Object.hasOwn(body.input, key) || !check(body.input[key])) throw new ContractError(key);
  for (const [key, value] of Object.entries(body.input)) {
    if (!Object.hasOwn(fields, key) && (!Object.hasOwn(optional, key) || !optional[key](value))) throw new ContractError(key);
  }
  return structuredClone(body);
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (plain(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

/**
 * 服务端使用自己的 accountId 形成请求归属。摘要由服务重算，不接受客户端摘要。
 * 这只是可执行语义示例；持久化去重和并发锁必须在正式服务事务内实现。
 */
export async function requestIdentity(accountId, name, envelope) {
  if (!stableId(accountId)) throw new ContractError('server accountId');
  const validated = validateCommand(name, envelope);
  const bytes = new TextEncoder().encode(canonical(validated.input));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return {
    key: JSON.stringify([accountId, name, validated.requestId]),
    inputHash: [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join(''),
  };
}
