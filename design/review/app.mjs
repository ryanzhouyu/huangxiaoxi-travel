import {prepareArtwork} from '../demo/renderer.mjs';
import {composeImage, paintDraft} from '../demo/postcard.mjs';
import {catalog, progressKey, reviewService as service} from './review-service.mjs';
import {isEntry, isRoute, ownsWardrobeContext, routeInfo} from './routes.mjs';
import {defaultFilter, readEditors, readTab, writeTab, makeCompose} from './drafts.mjs';
import {filterEvents, eventContent} from './pages/memory.mjs';
import {placesContent} from './pages/travel.mjs';
import {sourceContent} from './pages/style.mjs';
import {h, href, link, button, icon, artifact, empty, note, day, time, dateKey, stageFigure} from './ui.mjs';

const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const sheetTitle = document.querySelector('#sheet-title');
const sheetBody = document.querySelector('#sheet-body');
const toast = document.querySelector('#toast');
const ui = {
  phone: '', consent: false, challenge: readTab('challenge'), starter: 'start-a', line: 0, greet: false,
  filter: '全部', memoryTab: 'events', memory: {...defaultFilter}, wardrobe: null, compose: null,
  preview: null, pending: null, proof: undefined, busy: false, error: '',
};
const scrollPositions = new Map();
const initialHash = location.hash || '#partner';
let route = routeInfo(initialHash);
let progress = null;
let target = readTab('target', '#partner');
let ready = false;
let fatal = '';
let historyIndex = history.state?.hxxReview ?? 0;
let toastTimer;
let returnFocus;
let leaveIntent;
let newComposeIntent;
let bounced = false;
let accountEpoch = 0;

const findAsset = id => catalog.assets.find(item => item.id === id);
const findEvent = id => progress.events.find(entry => entry.id === id);
const ctx = () => ({...route, p: progress, ui});
const currentImage = () => route.name === 'work' ? progress.works.find(work => work.id === route.id) : ui.preview;
const dirtyWardrobe = () => ui.wardrobe && progress?.look && JSON.stringify(ui.wardrobe.look) !== JSON.stringify(progress.look);
const validTarget = value => isRoute(value) && !isEntry(routeInfo(value).name) ? value : '#partner';

function say(message) {
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {toast.textContent = '';}, 4800);
}

function rememberTarget(value) {
  target = validTarget(value);
  writeTab('target', target);
}

function putDraft(name, value) {
  if (!writeTab(progress.id + '.' + name, value)) say('本浏览器无法暂存编辑内容。刷新前请先保存。');
}

function draftsFor(next) {
  if (!next) return;
  const drafts = readEditors(next);
  ui.wardrobe = drafts.wardrobe;
  ui.compose = drafts.compose;
  ui.memory = drafts.memory.filter;
  ui.memoryTab = drafts.memory.tab;
  ui.pending = readTab(next.id + '.request');
}

function guard(value) {
  const name = routeInfo(value).name;
  if (!progress) {
    if (name === 'code' && ui.challenge) return value;
    if (name === 'entry') return value;
    if (!isEntry(name)) rememberTarget(value);
    return '#entry';
  }
  if (!progress.initialized) {
    if (!isEntry(name)) rememberTarget(value);
    return '#onboarding';
  }
  return isEntry(name) ? validTarget(target) : value;
}

function prepare(previous) {
  if (route.name === 'wardrobe' && !route.invalid && progress?.look) {
    const hadDraft = !!ui.wardrobe;
    ui.wardrobe ??= {look: {...progress.look}, version: progress.lookVersion, slot: 'top'};
    const item = findAsset(route.params.get('item'));
    if (item && progress.owned.includes(item.id) && (!hadDraft || (!ownsWardrobeContext(previous ?? '') && previous !== route.here))) {
      ui.wardrobe.look[item.slot] = item.id;
      ui.wardrobe.slot = item.slot;
    }
    putDraft('wardrobe', ui.wardrobe);
  }
  if (route.name === 'compose' && progress?.events.length) {
    if (!ui.compose) {
      ui.compose = makeCompose(route, progress);
      ui.compose.selected ??= filterEvents(progress.events, ui.compose).map(event => event.id);
      putDraft('compose', ui.compose);
    }
  }
}

function activeControl() {
  const active = document.activeElement;
  if (!app.contains(active)) return null;
  if (active.dataset.model) return `[data-model="${CSS.escape(active.dataset.model)}"]` +
    (active.dataset.model === 'selected' ? `[value="${CSS.escape(active.value)}"]` : '');
  if (active.name) return `[name="${CSS.escape(active.name)}"]`;
  if (active.dataset.action) return `[data-action="${CSS.escape(active.dataset.action)}"]` +
    (active.dataset.value ? `[data-value="${CSS.escape(active.dataset.value)}"]` : '');
  return null;
}

function paint() {
  const canvas = document.querySelector('#draft-print');
  if (!canvas) return;
  try {
    paintDraft(canvas, printInputs());
  } catch {
    canvas.replaceWith(Object.assign(document.createElement('p'), {className: 'empty-frame', textContent: '暂时无法显示草稿。可重试生成预览。'}));
  }
}

function updateCooldown() {
  const control = app.querySelector('[data-resend]');
  if (!control || !ui.challenge) return;
  const seconds = Math.max(0, Math.ceil((ui.challenge.resendAt - Date.now()) / 1000));
  control.disabled = !!seconds || ui.busy;
  control.textContent = seconds ? `重新获取（${seconds} 秒）` : '重新获取';
}

function render({focus = false} = {}) {
  if (!ready) return;
  const active = activeControl();
  const codeValue = route.name === 'code' ? app.querySelector('[name="code"]')?.value : '';
  const root = ['partner', 'explore', 'memories'].includes(route.name);
  app.dataset.page = route.name;
  app.dataset.root = String(root);
  app.setAttribute('aria-busy', String(ui.busy));
  if (fatal) {
    app.innerHTML = '<div class="stack">' + empty('book', '暂时无法打开手账', h(fatal), button('重新读取', 'reload')) + '</div>';
    return;
  }
  const invalidWork = route.name === 'work' && !progress?.works.some(item => item.id === route.id);
  const body = route.invalid || invalidWork ?
    '<div class="stack">' + empty('pin', '找不到这个页面', '此链接可能已经失效，或不属于当前手账。', link('返回', route.back, 'button primary')) + '</div>' :
    route.render(ctx());
  const pending = ui.pending ? `<aside class="pending-note" role="status"><p>${h(ui.pending.message)}</p>${button('查询这次结果', 'recover', {disabled: ui.busy})}</aside>` : '';
  const nav = root ? `<nav class="main-nav" aria-label="主场景">${[['partner', 'partner', '伙伴'], ['explore', 'map', '游玩'], ['memories', 'book', '回忆']].map(([name, symbol, label]) =>
    link(icon(symbol) + `<span>${label}</span>`, '#' + name, 'nav-tab').replace('<a ', name === route.name ? '<a aria-current="page" ' : '<a ')
  ).join('')}</nav>` : '';
  app.innerHTML = pending + body + nav;
  if (codeValue) app.querySelector('[name="code"]').value = codeValue;
  if (ui.busy) app.querySelectorAll('form input, form select').forEach(control => {control.disabled = true;});
  paint();
  updateCooldown();
  if (focus) {
    const heading = app.querySelector('h1, h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({preventScroll: true});
    }
  } else if (active) app.querySelector(active)?.focus({preventScroll: true});
}

function openSheet(title, html) {
  if (!sheet.open) returnFocus = document.activeElement;
  sheetTitle.textContent = title;
  sheetBody.innerHTML = html;
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('[data-action="close"]').focus();
}

function closeSheet() {
  if (!sheet.open) return;
  sheet.close();
  leaveIntent = null;
  newComposeIntent = null;
  if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
}

function show(value, {replace = false, pop = false, index, focus = true} = {}) {
  const previous = route.here;
  value = guard(value);
  if (previous !== value || pop) {
    scrollPositions.set(previous, scrollY);
    ui.error = '';
    ui.proof = undefined;
    ui.greet = false;
  }
  closeSheet();
  if (pop) {
    historyIndex = index;
    if (value !== location.hash) history.replaceState({hxxReview: historyIndex}, '', value);
  } else if (replace || previous === value) {
    history.replaceState({hxxReview: historyIndex}, '', value);
  } else {
    historyIndex++;
    history.pushState({hxxReview: historyIndex}, '', value);
  }
  route = routeInfo(value);
  if (route.name === 'memories' && route.params.get('view') === 'works') ui.memoryTab = 'works';
  if (route.name === 'entry' && previous === '#code' && !ui.challenge) ui.consent = false;
  prepare(previous);
  render({focus});
  window.scrollTo(0, scrollPositions.get(value) ?? 0);
}

function navigate(value, options = {}) {
  if (!ready) return;
  if (ui.busy) return say('正在处理本次操作，请稍候。');
  if (!options.skipDraft && dirtyWardrobe() && ownsWardrobeContext(route.here) && !ownsWardrobeContext(value)) {
    leaveIntent = {value, options};
    openSheet('这身试穿还没保存', note('可以保存后离开，也可以保留原搭配。') +
      button('保存并继续', 'saveAndLeave') +
      button('放弃并继续', 'dropAndLeave', {classes: 'button secondary'}) +
      button('继续试穿', 'close', {classes: 'button text'}));
    return;
  }
  const incoming = routeInfo(value);
  const hasNewSelection = ['visit', 'copy', 'range'].some(key => incoming.params.has(key));
  if (!options.skipCompose && incoming.name === 'compose' && ui.compose && hasNewSelection && ui.compose.source !== value &&
    !(ownsWardrobeContext(route.here) || route.name === 'preview')) {
    newComposeIntent = {value, options};
    openSheet('照相馆里还有一张草稿', note('可以继续原草稿，或用这次选中的经历开始一张新的。') +
      button('继续原草稿', 'keepCompose') + button('用这次选择开始', 'replaceCompose', {classes: 'button secondary'}));
    return;
  }
  if (!ownsWardrobeContext(value) && ownsWardrobeContext(route.here) && ui.wardrobe && !dirtyWardrobe()) {
    ui.wardrobe = null;
    putDraft('wardrobe', null);
  }
  show(value, options);
}

async function run(operation, complete) {
  if (ui.busy) return;
  const epoch = accountEpoch;
  ui.busy = true;
  ui.error = '';
  render();
  try {
    const result = await operation();
    if (epoch !== accountEpoch) return;
    ui.busy = false;
    await complete(result);
  } catch (error) {
    if (epoch !== accountEpoch) return;
    ui.busy = false;
    ui.error = error.message || '暂时无法完成，请重试。';
    render();
    if (sheet.open) closeSheet();
    say(ui.error);
  }
}

const id = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), v => v.toString(16)).join('-');

function send(action, fields = {}, continuation = {}) {
  if (ui.pending) return say('请先查询上一次操作的结果。');
  const requestId = id();
  const accountId = progress.id;
  const request = {action, requestId, accountId, source: route.here, ...continuation};
  return run(async () => {
    try {
      return await service.execute(action, {requestId, accountId, ...fields});
    } catch (error) {
      if (error.code === 'UNKNOWN') {
        ui.pending = {...request, message: error.message};
        putDraft('request', ui.pending);
      }
      if (error.code === 'CONFLICT') {
        const latest = await service.read();
        if (latest?.id !== accountId) throw error;
        progress = latest;
        ui.preview = null;
        if (ui.wardrobe) {
          ui.wardrobe.version = latest.lookVersion;
          putDraft('wardrobe', ui.wardrobe);
        }
      }
      throw error;
    }
  }, response => committed(request, response));
}

function receipt(event, source) {
  const names = event.unlocked.map(id => catalog.pools.find(pool => pool.id === id)).filter(Boolean);
  return `<div class="receipt-stamp">${icon('check')}<strong>${h(event.name)}</strong></div>
    <p>${day(event.at)} · ${time(event.at)}</p>
    ${note(event.reward ? '获得 ' + event.reward + ' 次景区通用次数。' : '本次记录足迹，首次奖励已领。')}
    ${names.map(pool => link('已解锁 · ' + pool.name, href('pool', {id: pool.id, from: source}))).join('')}
    ${link('用这一段经历做纪念', href('compose', {visit: event.id, from: source}))}
    ${button('继续游玩', 'continueTravel', {classes: 'button primary', value: href('scene', {from: '#explore'})})}`;
}

function reveal(result, source) {
  const item = findAsset(result.assetId);
  const previewLook = item.slot === 'expression' || item.slot === 'pose' ? {...progress.look, [item.slot]: item.id} : null;
  const art = previewLook ? `<div class="prize-look ${item.slot}">${stageFigure(previewLook)}</div><strong>${h(item.name)}</strong>` : artifact(item);
  return `<div class="source-art prize">${art}</div>${note('已收进衣橱 · 剩余 ' + progress.balance + ' 次')}
    ${link('去衣橱看看', href('wardrobe', {item: item.id, from: source}), 'button primary')}
    ${button(progress.eligible[result.poolId].length ? '收好，返回卡池' : '已经收齐，返回卡池', 'continueTravel', {value: source, classes: 'button secondary'})}`;
}

function committed(request, {progress: next, result}) {
  if (next?.id !== request.accountId || progress?.id !== next.id) return;
  progress = next;
  ui.pending = null;
  putDraft('request', null);
  closeSheet();
  if (request.action === 'initialize') {
    const destination = target;
    rememberTarget('#partner');
    show(destination, {replace: true});
  } else if (request.action === 'saveLook') {
    ui.preview = null;
    ui.wardrobe = null;
    putDraft('wardrobe', null);
    show(request.destination || '#partner', {replace: true});
    say('搭配已保存。');
  } else if (request.action === 'saveWork') {
    ui.preview = null;
    ui.compose = null;
    putDraft('compose', null);
    show(href('work', {id: result.id, from: '#memories?view=works'}), {replace: true});
    say('已收进纪念册。');
  } else {
    render();
    if (request.action === 'gift') openSheet('见面礼已收好', `<div class="prize-look">${stageFigure(catalog.lookFor('gift'))}</div>` +
      note('四件装扮已收进衣橱，当前穿着不变。') +
      link('立即试穿', href('wardrobe', {item: 'gift-top', from: request.source}), 'button primary') +
      button('先收好', 'close', {classes: 'button secondary'}));
    if (request.action === 'visit' || request.action === 'activity') openSheet('足迹已写进手账', receipt(result, request.source));
    if (request.action === 'draw') openSheet('旅途收获', reveal(result, request.source));
  }
}

function printInputs() {
  const events = progress.events.filter(event => ui.compose.selected.includes(event.id)).sort((a, b) => a.at.localeCompare(b.at));
  const dateLabel = events.length ? [...new Set([events[0], events.at(-1)].map(event => dateKey(event.at)))].join(' — ') : '';
  return {
    look: {...progress.look},
    title: ui.compose.title.trim() || '把黔山带回去',
    template: ui.compose.template,
    events,
    dateLabel,
  };
}

function saveLook(destination = route.back) {
  if (!dirtyWardrobe()) return;
  send('saveLook', {look: {...ui.wardrobe.look}, version: ui.wardrobe.version}, {destination});
}

function storeMemory() {
  putDraft('memory', {tab: ui.memoryTab, filter: ui.memory});
}

const actions = {
  reload: () => location.reload(),
  close: closeSheet,
  terms: () => openSheet('本机评审说明', note('请使用提供的评审身份和凭证。输入不会发送给后端。换装、足迹和纪念图保存在当前浏览器。')),
  changeNumber: () => {
    ui.challenge = null;
    writeTab('challenge', null);
    show('#entry', {replace: true});
  },
  resend: () => {
    if (Date.now() < ui.challenge.resendAt) return;
    requestCode(ui.challenge.number);
  },
  starter: value => {ui.starter = value; render();},
  initialize: () => send('initialize', {starterId: ui.starter}),
  greet: () => {ui.line++; ui.greet = true; render();},
  openPoses: () => openSheet('黄晓西的姿势', catalog.assets.filter(item => item.slot === 'pose' && progress.owned.includes(item.id)).map(item =>
    link(artifact(item), href('wardrobe', {item: item.id, from: route.here}), 'artifact pose-option')).join('')),
  logoutAsk: () => openSheet('退出这本手账？', note('已保存的内容仍可在同一评审身份中找到。未保存的编辑会留在当前标签页。') +
    button('确认退出', 'logout') + button('继续使用', 'close', {classes: 'button secondary'})),
  logout: () => {
    if (ui.pending) return say('请先查询这次操作的结果。');
    closeSheet();
    run(() => service.logout(progress.id), () => {
      progress = null;
      ui.preview = null;
      ui.wardrobe = null;
      ui.compose = null;
      ui.proof = undefined;
      ui.phone = '';
      ui.consent = false;
      ui.challenge = null;
      writeTab('challenge', null);
      rememberTarget('#partner');
      show('#entry', {replace: true});
    });
  },
  mapFilter: value => {ui.filter = value; render();},
  places: () => openSheet('地点一览', placesContent(ctx())),
  unlockPlaces: () => {
    const region = document.querySelector('#unlock-places');
    region?.scrollIntoView({block: 'center'});
    region?.focus({preventScroll: true});
  },
  gift: () => send('gift'),
  draw: poolId => send('draw', {poolId}),
  source: value => {
    const item = findAsset(value);
    if (item) openSheet('装扮来源', sourceContent(item, progress, route.here));
  },
  slot: value => {ui.wardrobe.slot = value; putDraft('wardrobe', ui.wardrobe); render();},
  equip: value => {
    const item = findAsset(value);
    if (!item || !progress.owned.includes(value)) return;
    ui.wardrobe.look[item.slot] = value;
    putDraft('wardrobe', ui.wardrobe);
    render();
  },
  resetLook: () => {
    ui.wardrobe = {look: {...progress.look}, version: progress.lookVersion, slot: ui.wardrobe.slot};
    putDraft('wardrobe', ui.wardrobe);
    render();
  },
  saveLook: () => saveLook(),
  saveAndLeave: () => {
    const next = leaveIntent?.value;
    closeSheet();
    if (next) saveLook(next);
  },
  dropAndLeave: () => {
    const intent = leaveIntent;
    ui.wardrobe = null;
    putDraft('wardrobe', null);
    if (intent) navigate(intent.value, {...intent.options, skipDraft: true});
  },
  continueTravel: value => {
    closeSheet();
    if (value !== route.here) navigate(value);
  },
  ledger: value => {
    const row = progress.ledger.find(row => row.id === value);
    if (row) openSheet(row.reason, `<p>${day(row.at)} · ${time(row.at)}</p><p>变动 ${row.delta > 0 ? '+' : ''}${row.delta} 次 · 当时剩余 ${row.balance} 次</p>`);
  },
  memoryTab: value => {ui.memoryTab = value; storeMemory(); render();},
  clearRange: () => {ui.memory = {...defaultFilter}; storeMemory(); render();},
  event: value => {const event = findEvent(value); if (event) openSheet('这一枚足迹', eventContent(event, route.here));},
  template: value => {
    ui.compose.template = value;
    ui.preview = null;
    putDraft('compose', ui.compose);
    render();
  },
  renderPrint: () => {
    const inputs = printInputs();
    if (!inputs.events.length) return;
    const version = progress.lookVersion;
    const source = route.here;
    run(() => service.renderImage(() => composeImage(inputs)), image => {
      if (progress.lookVersion !== version) {
        ui.error = '搭配已经变化，请重新生成。';
        render();
        return;
      }
      ui.preview = {...inputs, image, version, workId: id()};
      show(href('preview', {from: source}));
    });
  },
  keepCompose: () => {
    const destination = newComposeIntent?.value;
    closeSheet();
    if (destination) navigate(ui.compose.source || destination, {skipCompose: true});
  },
  replaceCompose: () => {
    const intent = newComposeIntent;
    closeSheet();
    if (!intent) return;
    ui.compose = null;
    ui.preview = null;
    putDraft('compose', null);
    navigate(intent.value, {...intent.options, skipCompose: true});
  },
  saveWork: () => {
    const print = ui.preview;
    if (!print) return;
    const work = {id: print.workId, title: print.title, image: print.image, look: print.look,
      at: new Date().toISOString(), template: print.template, events: print.events.map(event => event.id),
      snapshots: print.events};
    send('saveWork', {work, version: print.version});
  },
  zoom: () => {
    const print = currentImage();
    if (print) openSheet(print.title, `<img class="zoom-image" src="${h(print.image)}" alt="${h(print.title)}">`);
  },
  share: async () => {
    const print = currentImage();
    if (!print) return;
    const bytes = Uint8Array.from(atob(print.image.split(',')[1]), char => char.charCodeAt(0));
    const file = new File([bytes], '黔山同行.png', {type: 'image/png'});
    if (navigator.canShare?.({files: [file]})) {
      try { await navigator.share({files: [file], title: print.title}); return; }
      catch (error) { if (error.name === 'AbortError') return say('已取消分享。'); }
    }
    openSheet('保存后分享', note('当前环境未能打开图片分享。可以保存图片，再从相册分享。') +
      link('保存 PNG 图片', print.image, 'button primary').replace('<a ', '<a download="黔山同行.png" '));
  },
  recover: () => {
    const request = ui.pending;
    if (request) run(() => service.findResult(request.accountId, request.requestId), answer => committed(request, answer));
  },
};

function requestCode(number) {
  if (!ui.consent) {
    ui.error = '阅读并同意评审说明后，再获取验证码。';
    render();
    return;
  }
  run(() => service.sendCode(number), challenge => {
    ui.challenge = challenge;
    writeTab('challenge', challenge);
    show('#code');
  });
}

const forms = {
  sendCode: form => requestCode(String(form.get('phone')).trim()),
  verifyCode: form => run(() => service.verifyCode(ui.challenge, String(form.get('code')).trim()), next => {
    progress = next;
    draftsFor(next);
    ui.challenge = null;
    writeTab('challenge', null);
    const destination = next.initialized ? target : '#onboarding';
    if (next.initialized) rememberTarget('#partner');
    show(destination, {replace: true});
  }),
  visit: form => send('visit', {pointId: route.id, proof: String(form.get('proof')).trim()}),
  activity: form => send('activity', {proof: String(form.get('proof')).trim()}),
};

document.addEventListener('click', event => {
  const control = event.target.closest('a[href^="#"], [data-action]');
  if (!control || control.disabled || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (control.matches('a')) {
    event.preventDefault();
    navigate(control.getAttribute('href'));
  } else if ((!ui.busy || control.dataset.action === 'close') && Object.hasOwn(actions, control.dataset.action)) {
    actions[control.dataset.action](control.dataset.value);
  }
});

document.addEventListener('submit', event => {
  if (!Object.hasOwn(forms, event.target.dataset.submit)) return;
  event.preventDefault();
  if (!ui.busy) forms[event.target.dataset.submit](new FormData(event.target));
});

document.addEventListener('input', event => {
  const model = event.target.dataset.model;
  if (!model || ui.busy) return;
  const {value, checked} = event.target;
  if (['phone', 'proof'].includes(model)) ui[model] = value;
  if (model === 'consent') ui.consent = checked;
  if (model === 'compose.title') {
    ui.compose.title = value;
    ui.preview = null;
    putDraft('compose', ui.compose);
    paint();
  }
});

document.addEventListener('change', event => {
  const model = event.target.dataset.model;
  if (!model || ui.busy) return;
  const {value, checked} = event.target;
  if (model === 'selected') {
    const selected = new Set(ui.compose.selected);
    if (checked) selected.add(value);
    else selected.delete(value);
    ui.compose.selected = [...selected];
    ui.preview = null;
    putDraft('compose', ui.compose);
    render();
  }
  const [group, field] = model.split('.');
  if (['memory', 'compose'].includes(group) && ['range', 'from', 'to'].includes(field)) {
    ui[group][field] = value;
    if (group === 'memory') storeMemory();
    else putDraft('compose', ui.compose);
    render();
  }
});

sheet.addEventListener('cancel', event => {
  event.preventDefault();
  closeSheet();
});
window.addEventListener('popstate', event => {
  if (!ready) return;
  if (bounced) {bounced = false; return;}
  const destination = location.hash || '#partner';
  const index = event.state?.hxxReview;
  if (ui.busy || (dirtyWardrobe() && ownsWardrobeContext(route.here) && !ownsWardrobeContext(destination))) {
    if (Number.isInteger(index) && historyIndex !== index) {
      bounced = true;
      history.go(historyIndex - index);
    } else history.replaceState({hxxReview: historyIndex}, '', route.here);
    navigate(destination, {replace: true});
  } else show(destination, {pop: true, index: Number.isInteger(index) ? index : historyIndex});
});
window.addEventListener('beforeunload', event => {
  if (!dirtyWardrobe()) return;
  event.preventDefault();
  event.returnValue = true;
});

window.addEventListener('storage', async event => {
  if (event.key !== progressKey || !ready) return;
  try {
    const latest = await service.read();
    const previous = progress;
    if (latest?.id !== previous?.id) {
      accountEpoch++;
      ui.busy = false;
      ui.preview = null;
      ui.wardrobe = null;
      ui.compose = null;
      ui.pending = null;
      progress = latest;
      draftsFor(latest);
      rememberTarget('#partner');
      show(latest ? '#partner' : '#entry', {replace: true});
      say('当前评审身份已在另一页面变化。');
      return;
    }
    if (ui.busy) return;
    progress = latest;
    if (latest?.lookVersion !== previous?.lookVersion) {
      ui.preview = null;
      if (!dirtyWardrobe() || JSON.stringify(ui.wardrobe?.look) === JSON.stringify(previous?.look)) {
        if (ui.wardrobe) ui.wardrobe = {...ui.wardrobe, look: {...latest.look}, version: latest.lookVersion};
      }
    }
    show(route.here, {replace: true, focus: false});
  } catch (error) {
    fatal = error.message;
    render();
  }
});

try {
  [progress] = await Promise.all([service.read(), prepareArtwork()]);
  draftsFor(progress);
  if (ui.challenge) {
    ui.phone = ui.challenge.number;
    ui.consent = true;
  }
  ready = true;
  show(initialHash, {replace: true, focus: false});
  setInterval(updateCooldown, 1000);
} catch (error) {
  ready = true;
  fatal = error.message || '请检查本地预览服务。';
  render();
}
