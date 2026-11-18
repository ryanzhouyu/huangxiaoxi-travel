import {renderedLook, thumbnailUrl} from '../../demo/wardrobe-art.mjs';
import {catalog} from '../review-service.mjs';
import {partGrid, partStatus} from '../wardrobe-study/grid.mjs';
import {button, h, href, link, pressed, stageFigure} from '../ui.mjs';

const sceneFiles = {paper:'travel-journal.webp', 'mountain-bg':'cloud-pavilion.webp', 'flower-bg':'flower-creek.webp'};
const scene = name => new URL('../../demo/assets/scenes/' + name, import.meta.url).href;
const thumbs = new Map();
const nameFor = item => catalog.outfits.find(outfit => outfit.id === item.outfit)?.name ?? item.name;
const ownedParts = (progress, slot) => catalog.assets.filter(item => item.slot === slot && progress.owned.includes(item.id));
const byId = id => catalog.assets.find(item => item.id === id);
const countLabel = (slot, count) => '全部' + catalog.slots[slot] + ' · ' + count + (slot === 'background' ? ' 张' : ' 件');
const changed = (progress, draft) => Object.keys(catalog.slots).some(slot => progress.look[slot] !== draft.look[slot]);

function partImage(item) {
  if (item.outfit) return thumbnailUrl(item.id);
  if (item.slot === 'background') return scene(sceneFiles[item.id]);
  const base = catalog.lookFor('start-c');
  if (item.slot === 'pose') return renderedLook({...base, pose:item.id}).src;
  if (!thumbs.has(item.id)) {
    const canvas = document.createElement('canvas');
    canvas.width = 162;
    canvas.height = 141;
    const source = renderedLook({...base, expression:item.id}).surface;
    canvas.getContext('2d').drawImage(source, 137, 49, 162, 141, 0, 0, 162, 141);
    thumbs.set(item.id, canvas.toDataURL('image/webp', .94));
  }
  return thumbs.get(item.id);
}

function wear(progress, draft, item) {
  if (progress.look[item.slot] === item.id) return item.outfit ? '已保存穿着' : '已保存';
  if (draft.look[item.slot] !== item.id) return '';
  return item.outfit ? '正在试穿' : '正在预览';
}

function quickParts(items, saved, current) {
  if (items.length <= 6) return items;
  const pinned = new Set([saved, current]);
  for (const item of items) {
    if (pinned.size === 6) break;
    pinned.add(item.id);
  }
  return items.filter(item => pinned.has(item.id));
}

export function wardrobe({p, ui, here, back}) {
  const draft = ui.wardrobe;
  const {slot} = draft;
  const dirty = changed(p, draft);
  const items = ownedParts(p, slot);
  const saved = p.look[slot];
  const current = draft.look[slot];
  const tabs = Object.entries(catalog.slots).map(([part, label]) =>
    button(label, 'slot', {value:part, classes:'slot', attrs:pressed(part === slot)})).join('');
  const quick = quickParts(items, saved, current).map(item => {
    const label = wear(p, draft, item);
    return button(`<img src="${partImage(item)}" class="thumb part-${item.slot}" alt="">
      <span class="piece">${h(nameFor(item))}</span>${partStatus(label, item.id === saved)}`, 'equip', {
      value:item.id, classes:'hanger', attrs:`${pressed(item.id === current)} data-saved="${item.id === saved}"`,
    });
  }).join('');
  const background = slot === 'background' ? sceneFiles[draft.look.background] : 'wardrobe-studio.webp';
  return `<section class="room" style="--scene:url('${scene(background)}')">
    <header class="top"><div class="identity">${link('<span class="sr">返回</span>', back, 'back')}<h1>旅行衣橱</h1></div>
      ${link('套装图鉴', href('collection', {from:here}), 'wood-button')}
    </header>
    <div class="stage"><div class="doll"><p class="stage-note${dirty ? ' changed' : ''}">${dirty ? '试穿中 · 尚未保存' : '当前搭配'}</p>${stageFigure(draft.look)}</div></div>
  </section>
  <section class="desk" aria-label="搭配操作"><div class="desk-inlay">
    <nav class="slots" aria-label="装扮分类">${tabs}</nav>
    <div class="hangers" data-slot="${slot}" role="group" aria-label="${catalog.slots[slot]}部件">${quick}</div>
    ${ui.error ? `<p class="write-error" role="alert">${h(ui.error)}</p>` : ''}
    <div class="finish">
      ${button(countLabel(slot, items.length), 'open-grid', {classes:'text inspect', attrs:'aria-haspopup="dialog"', disabled:ui.busy})}
      ${button('恢复上次保存', 'resetLook', {classes:'text', disabled:!dirty || ui.busy || !!ui.pending})}
      ${button(ui.busy ? '正在保存…' : '保存并返回', 'saveLook', {classes:'primary', disabled:!dirty || ui.busy || !!ui.pending})}
    </div>
  </div></section>`;
}

export function wardrobeControls({app, sheet, state, openSheet, closeSheet, equip}) {
  const rails = new Map();
  const grids = new Map();
  let inspection;
  const restoreControl = (list, position) => {
    if (position?.id) list.querySelector(`[data-action="${position.action}"][data-id="${CSS.escape(position.id)}"]`)?.focus({preventScroll:true});
  };
  function rememberGrid(control = document.activeElement) {
    const list = sheet.querySelector('.all-parts');
    if (!sheet.open || !list) return;
    const own = list.contains(control) ? control.dataset : grids.get(list.dataset.slot);
    grids.set(list.dataset.slot, {offset:list.scrollTop, id:own?.id, action:own?.action});
  }
  function openGrid(value, control) {
    const {p, ui} = state();
    const draft = ui.wardrobe;
    const {slot} = draft;
    const items = ownedParts(p, slot);
    inspection = undefined;
    openSheet(countLabel(slot, items.length), partGrid(items, {
      slot, nameFor, imageFor:partImage, labelFor:item => wear(p, draft, item),
      currentId:draft.look[slot], savedId:p.look[slot],
    }), 'wardrobe-grid', control);
    const list = sheet.querySelector('.all-parts');
    const position = grids.get(slot);
    list.scrollTop = position?.offset ?? 0;
    restoreControl(list, position);
  }
  function showPart(focusAction) {
    const {p, ui} = state();
    const {items, index} = inspection;
    const item = items[index];
    const current = ui.wardrobe.look[item.slot] === item.id;
    const trial = item.outfit ? '试穿这一件' : item.slot === 'background' ? '预览这个背景' : '用于当前搭配';
    const paging = items.length > 1 ? `<nav class="inspection-paging" aria-label="浏览同类部件">
      ${button('上一件','inspect-previous',{classes:'text',disabled:index===0})}
      <span class="inspection-count" aria-live="polite">${index+1} / ${items.length}</span>
      ${button('下一件','inspect-next',{classes:'text',disabled:index+1===items.length})}
    </nav>` : '';
    openSheet(item.name, `<figure class="inspection-media"><img src="${partImage(item)}" class="detail-${item.slot}" alt="${h(item.name)}"><figcaption>${wear(p, ui.wardrobe,item)}</figcaption></figure>${paging}
      <div class="inspection-actions">${button('返回列表','return-grid',{classes:'text'})}
      ${button(current ? '返回衣橱' : trial, current ? 'close' : 'apply-inspection', {classes:'primary',value:item.id})}</div>`, 'wardrobe-inspection');
    if (focusAction) sheet.querySelector(`[data-action="${focusAction}"]:enabled`)?.focus({preventScroll:true});
  }
  function step(amount, action) {
    const next = inspection.index + amount;
    if (next < 0 || next >= inspection.items.length) return;
    inspection.index = next;
    showPart(action);
  }
  function pick(value, control) {
    rememberGrid(control);
    closeSheet();
    equip(value, true);
  }
  return {
    actions: {
      'open-grid':openGrid,
      'return-grid':() => openGrid(),
      'grid-equip':pick,
      'grid-inspect':(value, control) => {
        rememberGrid(control);
        const {p,ui} = state();
        const items = ownedParts(p, ui.wardrobe.slot);
        const index = items.findIndex(item => item.id === value);
        if (index < 0) return;
        inspection = {items,index};
        showPart();
      },
      'inspect-previous':() => step(-1,'inspect-previous'),
      'inspect-next':() => step(1,'inspect-next'),
      'apply-inspection':pick,
    },
    beforeRender() {
      const rail = app.querySelector('.hangers');
      if (rail) rails.set(rail.dataset.slot,rail.scrollLeft);
    },
    afterRender() {
      const rail = app.querySelector('.hangers');
      if (!rail) return;
      rail.scrollLeft = rails.get(rail.dataset.slot) ?? 0;
      rail.addEventListener('wheel', event => {
        if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
        const previous = rail.scrollLeft;
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rail.clientWidth : 1;
        rail.scrollLeft += event.deltaY * unit;
        if (rail.scrollLeft !== previous) event.preventDefault();
      }, {passive:false});
    },
    reveal(value, focus=false) {
      const rail = app.querySelector('.hangers');
      const card = rail?.querySelector(`[data-value="${CSS.escape(value)}"]`);
      if (!card) return;
      const outer = rail.getBoundingClientRect();
      const inner = card.getBoundingClientRect();
      if (inner.right > outer.right) rail.scrollLeft += Math.ceil(inner.right - outer.right) + 2;
      else if (inner.left < outer.left) rail.scrollLeft -= Math.ceil(outer.left - inner.left) + 2;
      if (focus) card.focus({preventScroll:true});
    },
    closing() { rememberGrid(); inspection = undefined; },
    cancel() {
      if (!inspection) return false;
      openGrid();
      return true;
    },
    keydown(event) {
      if (!inspection || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const previous = event.key === 'ArrowLeft';
      step(previous ? -1 : 1, previous ? 'inspect-previous' : 'inspect-next');
    },
    clear() { rails.clear(); grids.clear(); inspection = undefined; },
  };
}
