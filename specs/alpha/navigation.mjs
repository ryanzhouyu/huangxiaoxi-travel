/**
 * R01 可执行导航契约。只决定展示入口，绝不认证用户或执行业务写入。
 * hash 是内部返回目标；外部扫码 URL 应先由入口解析为这种形式。
 */
const routes = Object.freeze({
  partner: [], explore: [], memories: ['sceneId'], account: [],
  scene: ['sceneId'], point: ['sceneId', 'pointId'],
  checkin: ['sceneId', 'pointId', 'method'],
  activity: ['sceneId', 'activityId'], pool: ['sceneId', 'poolId'],
  collection: ['outfitId'], wallet: ['sceneId'],
  order: ['sceneId', 'orderId'], work: ['sceneId', 'workId'],
});
const required = {
  scene: ['sceneId'], point: ['sceneId', 'pointId'],
  checkin: ['sceneId', 'pointId'], activity: ['sceneId', 'activityId'],
  pool: ['sceneId', 'poolId'], order: ['sceneId', 'orderId'],
  work: ['sceneId', 'workId'],
};
const id = /^[a-zA-Z0-9_-]{1,80}$/;

/** @returns {{target: string, rejected: boolean}} */
export function normalizeReturnTarget(value) {
  const fallback = {target: '#partner', rejected: true};
  if (typeof value !== 'string' || value.length > 512 || !value.startsWith('#')) return fallback;
  const match = /^#([a-z]+)(?:\?([^#]*))?$/.exec(value);
  if (!match || !Object.hasOwn(routes, match[1])) return fallback;
  const name = match[1], params = new URLSearchParams(match[2] || '');
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || keys.some(key => !routes[name].includes(key))) return fallback;
  if ((required[name] || []).some(key => !params.has(key))) return fallback;
  for (const [key, text] of params) {
    if (key === 'method' ? !['qr', 'geo-demo'].includes(text) : !id.test(text)) return fallback;
  }
  params.sort();
  return {target: '#' + name + (keys.length ? '?' + params.toString() : ''), rejected: false};
}

/**
 * @param {{authenticated: boolean, initialized?: boolean, accountId?: string}} session
 * session 必须来自服务端会话查询的可信结果；前端标志本身不是认证。
 */
export function resolveEntry(session, requestedTarget) {
  const returnTo = normalizeReturnTarget(requestedTarget);
  if (!session.authenticated) return {page: 'login', returnTo: returnTo.target, rejectedTarget: returnTo.rejected};
  if (!session.accountId) throw new Error('Authenticated session requires accountId');
  if (!session.initialized) return {page: 'onboarding', returnTo: returnTo.target, rejectedTarget: returnTo.rejected};
  return {page: 'target', returnTo: returnTo.target, rejectedTarget: returnTo.rejected};
}

/** 同一账号重新认证后只查询旧请求，绝不自动重新发送变更。 */
export function recoveryAction(pending, authenticatedAccountId) {
  if (!pending) return 'none';
  if (!authenticatedAccountId) return 'authenticate';
  if (pending.accountId !== authenticatedAccountId) return 'keep-isolated';
  return pending.status === 'unknown' || pending.status === 'submitted' ? 'query-original' : 'show-result';
}
