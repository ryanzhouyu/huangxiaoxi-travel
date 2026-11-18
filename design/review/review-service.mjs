import * as domain from '../store.mjs';
import {ACTIVITY, ASSETS, OUTFITS, POINTS, POOLS, SCENE, STARTERS, SLOTS, lookFor} from '../data.mjs';

export const progressKey = 'hxx.review.v1';
export const deskKey = 'hxx.review.desk.v1';
export const reviewNumbers = ['10000000001', '10000000002'];
export const reviewCode = '410625';
export const catalog = {scene: SCENE, points: POINTS, pools: POOLS, activity: ACTIVITY, assets: ASSETS, outfits: OUTFITS, starters: STARTERS, slots: SLOTS, lookFor};

const delay = () => new Promise(resolve => setTimeout(resolve, 220));
const storage = {
  getItem: () => localStorage.getItem(progressKey),
  setItem: (_, value) => localStorage.setItem(progressKey, value),
};

export class ReviewError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function settings() {
  try { return JSON.parse(sessionStorage.getItem(deskKey)) || {}; }
  catch { return {}; }
}

function takeFault(action) {
  const config = settings();
  if (config.action !== action) return '';
  sessionStorage.removeItem(deskKey);
  return config.fault;
}

function view(db) {
  const account = db.accounts[db.current];
  if (!account) return null;
  return {
    name: account.name,
    initialized: account.initialized,
    owned: account.owned,
    look: account.look,
    gifts: account.gifts,
    claimed: account.claimed,
    unlocked: account.unlocked,
    balance: account.balance,
    events: account.events,
    ledger: account.ledger,
    works: account.works,
    id: db.current,
    eligible: Object.fromEntries(POOLS.map(pool => [pool.id, domain.eligible(account, pool.id)])),
    lookVersion: account.lookVersion ?? 0,
  };
}

function assertAccount(db, id) {
  if (!id || db.current !== id || !db.accounts[id]) {
    throw new ReviewError('SESSION', '手账身份已变化，请重新进入原手账。');
  }
  return db.accounts[id];
}

const commands = {
  initialize: (account, input) => domain.initialize(account, input.starterId),
  gift: account => domain.gift(account),
  visit: (account, input) => domain.checkin(account, {pointId: input.pointId, code: input.proof, requestId: input.requestId, now: input.now}),
  activity: (account, input) => {
    if (input.proof !== 'HXX-CRAFT-REVIEW') throw new ReviewError('PROOF', '店员凭证未通过核验，请向店员确认后重试。');
    return domain.activity(account, input);
  },
  draw: (account, input) => domain.draw(account, input),
  saveLook: (account, input) => {
    if ((account.lookVersion ?? 0) !== input.version) {
      throw new ReviewError('CONFLICT', '另一页面已经保存搭配。可保留这次试穿，并在确认后再次保存。');
    }
    domain.saveLook(account, input.look);
    account.lookVersion = (account.lookVersion ?? 0) + 1;
    return account.look;
  },
  saveWork: (account, {work, version}) => {
    if ((account.lookVersion ?? 0) !== version) {
      throw new ReviewError('CONFLICT', '已保存搭配发生变化，请重新生成预览。');
    }
    domain.saveWork(account, work);
    return {id: work.id};
  },
};

/** 评审专用异步服务。读取最新存档后原子提交，页面不直接写资格、次数与库存。 */
export const reviewService = {
  async renderImage(makeImage) {
    await delay();
    if (takeFault('renderPrint')) throw new ReviewError('RENDER', '暂时无法合成图片，内容已保留。请重新生成。');
    return makeImage();
  },
  async read() {
    return view(domain.readDB(storage));
  },
  async sendCode(number) {
    await delay();
    if (takeFault('sendCode')) throw new ReviewError('LIMITED', '暂时无法获取评审码，请稍后重试。');
    if (!reviewNumbers.includes(number)) throw new ReviewError('NUMBER', '请输入评审工具中的测试号码。');
    return {number, expiresAt: Date.now() + 5 * 60_000, resendAt: Date.now() + 30_000};
  },
  async verifyCode(challenge, code) {
    await delay();
    if (!challenge || !reviewNumbers.includes(challenge.number) || Date.now() >= challenge.expiresAt) {
      throw new ReviewError('EXPIRED', '验证码已过期，请重新获取。');
    }
    if (code !== reviewCode) throw new ReviewError('CODE', '验证码不正确，请核对后再试。');
    const id = 'review-' + challenge.number.at(-1);
    const {db} = domain.commit(storage, domain.readDB(storage), draft => {
      draft.current = id;
      draft.accounts[id] ??= domain.account('评审旅伴 ' + challenge.number.at(-1));
    });
    return view(db);
  },
  async logout(id) {
    await delay();
    domain.commit(storage, domain.readDB(storage), db => {
      assertAccount(db, id);
      db.current = null;
    });
  },
  async execute(action, input) {
    const handler = commands[action];
    if (!handler) throw new ReviewError('ACTION', '操作不可用。');
    await delay();
    const fault = takeFault(action);
    if (fault === 'reject') throw new ReviewError('REJECTED', '本次操作未生效。请保留当前内容并重试。');
    const current = domain.readDB(storage);
    const owner = assertAccount(current, input.accountId);
    const previous = owner.reviewResults?.[input.requestId];
    if (previous && previous.action !== action) throw new ReviewError('REQUEST', '这次请求与原操作不一致。');
    if (previous) return {progress: view(current), result: previous.result};
    const {db, result} = domain.commit(storage, current, next => {
      const account = assertAccount(next, input.accountId);
      const result = handler(account, input);
      const results = account.reviewResults ??= {};
      results[input.requestId] = {action, result: result ?? null};
      if (Object.keys(results).length > 100) delete results[Object.keys(results)[0]];
      return result ?? null;
    });
    if (fault === 'unknown') throw new ReviewError('UNKNOWN', '操作结果待确认。请查询这次结果。');
    return {progress: view(db), result};
  },
  async findResult(accountId, requestId) {
    await delay();
    const db = domain.readDB(storage);
    const account = assertAccount(db, accountId);
    const previous = account.reviewResults?.[requestId];
    if (!previous) throw new ReviewError('MISSING', '暂未查到结果，请稍后再次查询。');
    return {progress: view(db), result: previous.result};
  },
};
