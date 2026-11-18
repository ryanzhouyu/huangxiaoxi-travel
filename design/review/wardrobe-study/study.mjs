import {ASSETS, OUTFITS, SLOTS, asset, lookFor} from '../../data.mjs';
import {prepareWardrobe, renderedLook, thumbnailUrl} from '../../demo/wardrobe-art.mjs';
import {saveLook} from '../../store.mjs';
import {h} from '../ui.mjs';
import {composeDraft, makeFixture, sources} from './fixture.mjs';

const params = new URLSearchParams(location.search);
const atelier = params.get('layout') === 'atelier';
const sourceId = Object.hasOwn(sources, params.get('source')) ? params.get('source') : 'partner';
const source = sources[sourceId];
const profile = params.get('profile') === 'starter' ? 'starter' : 'full';
const requestedItem = asset(params.get('item'));
const db = makeFixture(profile);
const sample = db.accounts[db.current];
const sourceDraft = sourceId === 'compose' ? {
  ...composeDraft, selected: composeDraft.selected.map(id => sample.events.find(event => event.id === id))
    .filter(Boolean).map(event => event.name),
} : null;
const root = document.querySelector('#study');
if (atelier) document.body.dataset.layout = 'atelier';
const sheet = document.querySelector('#sheet');
const title = document.querySelector('#sheet-title');
const sheetBody = sheet.querySelector('.sheet-body');
const announcement = document.querySelector('#announcement');
const thumbs = new Map();
const wardrobeHome = '#wardrobe';
const templateLabels = {single: '单页纪念', trail: '足迹长图'};
const draftKey = 'hxx.wardrobe-study.v1.' + sourceId + '.' + profile + '.' + (requestedItem?.id || 'plain') +
  (atelier ? '.atelier' : '');
const scenes = {paper: 'travel-journal.webp', 'mountain-bg': 'cloud-pavilion.webp', 'flower-bg': 'flower-creek.webp'};
const sceneUrl = filename => new URL('../../demo/assets/scenes/' + filename, import.meta.url);
const owned = item => item && sample.owned.includes(item.id);
let draft = {...sample.look};
let slot = 'top', error = '', busy = false, returned = '', view = 'wardrobe';
let failNext = params.get('save') === 'reject';
let lastFocus;
const scrollBySlot = new Map();

function readDraft() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey));
    if (!saved || !Object.hasOwn(SLOTS, saved.slot)) return false;
    for (const part of Object.keys(SLOTS)) {
      if (!owned(asset(saved.draft?.[part])) || asset(saved.draft[part]).slot !== part) return false;
    }
    slot = saved.slot;
    draft = {...saved.draft};
    return true;
  } catch { return false; }
}
function persistDraft() {
  try {
    if (dirty()) sessionStorage.setItem(draftKey, JSON.stringify({slot, draft}));
    else sessionStorage.removeItem(draftKey);
  } catch {
    announcement.textContent = '本标签页暂时无法在刷新后恢复试穿。';
  }
}

if (!readDraft() && owned(requestedItem)) {
  slot = requestedItem.slot;
  draft[slot] = requestedItem.id;
}
const dirty = () => Object.keys(SLOTS).some(part => draft[part] !== sample.look[part]);
const makeAction = (action, label, classes = 'plain', state = '') =>
  `<button type="button" data-action="${action}" class="${classes}" ${state}>${label}</button>`;
const exit = () => { error = ''; draft = {...sample.look}; persistDraft(); showSource('cancel'); };

function term(item) {
  return OUTFITS.find(outfit => outfit.id === item.outfit)?.name || item.name;
}
function faceCrop(item) {
  if (!thumbs.has(item.id)) {
    const canvas = document.createElement('canvas');
    canvas.width = 162;
    canvas.height = 141;
    const source = renderedLook({...lookFor('start-c'), expression: item.id}).surface;
    canvas.getContext('2d').drawImage(source, 137, 49, 162, 141, 0, 0, 162, 141);
    thumbs.set(item.id, canvas.toDataURL('image/webp', .94));
  }
  return thumbs.get(item.id);
}
function imageFor(item) {
  if (item.outfit) return thumbnailUrl(item.id);
  if (item.slot === 'expression') return faceCrop(item);
  if (item.slot === 'pose') return renderedLook({...lookFor('start-c'), pose: item.id}).src;
  return sceneUrl(scenes[item.id]).href;
}
function figure(look, klass = 'figure') {
  return `<img class="${klass}" src="${renderedLook(look).src}" alt="黄晓西的全身搭配">`;
}
function railCard(item) {
  const saved = sample.look[slot] === item.id;
  const selected = draft[slot] === item.id;
  const label = saved ? '已保存穿着' : selected ? '正在试穿' : '';
  const partClass = atelier ? 'part-' + item.slot : item.slot;
  return makeAction('equip', `<img src="${imageFor(item)}" class="thumb ${partClass}" alt=""><span class="piece">${h(term(item))}</span>${label ? `<span class="wear-state">${label}</span>` : ''}`,
    'hanger', `data-id="${item.id}" data-saved="${saved}" aria-pressed="${selected}"`);
}

function wardrobe() {
  const available = ASSETS.filter(item => item.slot === slot && owned(item));
  const hasChange = dirty();
  const activeName = asset(draft[slot]).name;
  const stage = slot === 'background' ? scenes[draft.background] : 'wardrobe-studio.webp';
  const categories = Object.entries(SLOTS).map(([part, name]) =>
    makeAction('slot', name, 'slot', `aria-pressed="${part === slot}" data-slot="${part}"`)).join('');
  const actions = {
    save: makeAction('save', busy ? '正在保存…' : '保存搭配并返回', 'primary', !hasChange || busy ? 'disabled' : ''),
    reset: makeAction('reset', '恢复上次保存', 'text', !hasChange || busy ? 'disabled' : ''),
    leave: makeAction('leave', '取消并返回', 'text', busy ? 'disabled' : ''),
  };
  const rail = `<div class="hangers" data-slot="${slot}" aria-label="${SLOTS[slot]}部件">${available.map(railCard).join('')}</div>`;
  const rack = atelier ? '' : `<aside class="rack" aria-label="${SLOTS[slot]}衣架">
      <div class="rack-strip"><strong>${SLOTS[slot]}</strong><span>${available.length} 件</span></div>${rail}
      <div class="rack-foot" aria-hidden="true"><span class="more-cue">继续下滑</span></div>
    </aside>`;
  const selection = atelier
    ? `<div class="picked"><strong>${h(activeName)}</strong><span class="rail-count">${available.length} 件<span class="more-cue" aria-hidden="true"> · 左右滑动</span></span></div>${rail}`
    : `<div class="picked"><span>${slot === 'background' ? '预览背景' : SLOTS[slot]}</span><strong>${h(activeName)}</strong></div>`;
  const finish = atelier
    ? `<div class="finish">${actions.leave}${actions.reset}${actions.save}</div>`
    : `${actions.save}<div class="secondary-row">${actions.reset}${actions.leave}</div>`;
  return `<section class="room" style="--scene:url('${sceneUrl(stage).href}')">
    <header class="top"><div class="identity">${makeAction('leave', '‹<span class="sr">返回</span>', 'back') }<h1>旅行衣橱</h1></div>${makeAction('catalog','套装图鉴','wood-button')}</header>
    <div class="stage">
      <div class="doll"><p class="stage-note ${hasChange ? 'changed' : ''}">${hasChange ? '试穿中 · 尚未保存' : '当前搭配'}</p>${figure(draft)}</div>
      ${rack}
    </div>
  </section>
  <section class="desk" aria-label="搭配操作">
    <div class="desk-inlay"><nav class="slots" aria-label="装扮分类">${categories}</nav>
      ${selection}
      <div class="write-error" role="alert" ${error?'':'hidden'}>${h(error)}</div>
      ${finish}
    </div>
  </section>`;
}
function catalog() {
  return `<div class="catalog"><header class="top"><div class="identity">${makeAction('wardrobe','‹<span class="sr">返回衣橱</span>','back')}<h1>套装图鉴</h1></div></header>
    <div class="catalog-grid">${OUTFITS.map(outfit => {
      const count = ASSETS.filter(item => item.outfit===outfit.id && owned(item)).length;
      return makeAction('outfit', `<div class="collection-doll">${figure(lookFor(outfit.id))}</div><strong>${outfit.name}</strong><small>${count} / 4 件</small>`, 'collection-card', `data-id="${outfit.id}"`);
    }).join('')}</div></div>`;
}
function showOutfit(id) {
  const outfit=OUTFITS.find(set=>set.id===id);
  if(!outfit)return;
  openSheet(outfit.name, `<div class="source-parts">${ASSETS.filter(item=>item.outfit===id).map(item=>`<div><img src="${imageFor(item)}" alt=""><span>${SLOTS[item.slot]}</span><small>${owned(item)?'已拥有':'未拥有'}</small></div>`).join('')}</div><p class="hint">${outfit.source}</p>`);
}
function sourcePage(){
  const context = sourceDraft ? `<dl><dt>标题</dt><dd>${h(sourceDraft.title)}</dd><dt>模板</dt><dd>${h(templateLabels[sourceDraft.template])}</dd><dt>已选经历</dt><dd>${h(sourceDraft.selected.join('、') || '尚未选择')}</dd></dl>` : '';
  return `<div class="source-page"><header class="top"><h1>${source.title}</h1></header><section class="source-note">
    <p>${returned==='save'?'搭配已保存。':'已返回，原搭配未变。'}</p>
    <div class="source-figure">${figure(sample.look)}</div>${context}
    ${makeAction('wardrobe','返回衣橱','primary')}
  </section></div>`;
}
function showSource(result){
  returned=result;
  closeSheet(false);
  history.replaceState(null,'',location.pathname+location.search+source.hash);
  render('source',{focus:true});
}

const axis = atelier
  ? {size: 'scrollWidth', client: 'clientWidth', offset: 'scrollLeft', start: 'left', end: 'right'}
  : {size: 'scrollHeight', client: 'clientHeight', offset: 'scrollTop', start: 'top', end: 'bottom'};

function updateOverflow(){
  const rack = root.querySelector('.hangers');
  if (!rack) return;
  const overflow = rack[axis.size] - rack[axis.client];
  const remaining = atelier ? overflow : overflow - rack[axis.offset];
  root.querySelector('.more-cue').hidden = remaining < 4;
}
function rememberRail(){
  const rack=root.querySelector('.hangers');
  if(rack)scrollBySlot.set(rack.dataset.slot,rack[axis.offset]);
}
function revealSelection(){
  const rack = root.querySelector('.hangers');
  const current = rack.querySelector('[aria-pressed=true]').getBoundingClientRect();
  const rail = rack.getBoundingClientRect();
  const end = current[axis.end] - rail[axis.end];
  const start = rail[axis.start] - current[axis.start];
  if (end > 0) rack[axis.offset] += Math.ceil(end) + 2;
  else if (start > 0) rack[axis.offset] -= Math.ceil(start) + 2;
}
function wheelRail(event) {
  if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  const rail = event.currentTarget;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rail.clientWidth : 1;
  const previous = rail.scrollLeft;
  rail.scrollLeft += event.deltaY * unit;
  if (rail.scrollLeft !== previous) event.preventDefault();
}
function render(next=view,{focus=false,control=null}={}){
  rememberRail();
  view=next;
  root.dataset.view=view;
  root.dataset.look=Object.values(draft).join('/');
  root.dataset.saved=Object.values(sample.look).join('/');
  root.setAttribute('aria-busy',String(busy));
  root.innerHTML=view==='wardrobe'?wardrobe():view==='catalog'?catalog():sourcePage();
  const rack=root.querySelector('.hangers');
  if(rack){
    rack[axis.offset]=scrollBySlot.get(slot)||0;
    rack.addEventListener('scroll',updateOverflow,{passive:true});
    if (atelier) rack.addEventListener('wheel', wheelRail, {passive:false});
    updateOverflow();
  }
  if(control) root.querySelector(control)?.focus({preventScroll:true});
  if(focus){
    const heading=root.querySelector('h1');
    heading.tabIndex=-1;
    heading.focus({preventScroll:true});
  }
}
function openSheet(label,body){
  if(!sheet.open)lastFocus=document.activeElement;
  title.textContent=label;
  sheetBody.innerHTML=body;
  if(!sheet.open)sheet.showModal();
  title.tabIndex=-1;
  title.focus({preventScroll:true});
}
function closeSheet(restore=true){
  if(!sheet.open)return;
  sheet.close();
  if(restore && lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
function askLeave(){
  if(!dirty())return exit();
  openSheet('试穿尚未保存', `<p class="hint">可以保存这一身再返回，或放弃这次试穿。</p><div class="sheet-actions">
    ${makeAction('save','保存并返回','primary')}${makeAction('discard','放弃试穿并返回','secondary')}${makeAction('close','继续试穿','text')}</div>`);
}
async function submit(){
  if(busy || !dirty())return;
  closeSheet(false);
  busy=true;
  error='';
  render();
  await new Promise(resolve=>setTimeout(resolve,180));
  try{
    if(failNext){failNext=false;throw new Error('暂时无法保存。你的试穿还在，可以重试。');}
    saveLook(sample,draft);
    persistDraft();
  }catch(problem){
    busy=false;
    error=problem.message;
    render(view,{control:'[data-action=save]'});
    revealSelection();
    return;
  }
  busy=false;
  showSource('save');
}

document.addEventListener('click',event=>{
  const control=event.target.closest('button[data-action]');
  if(!control || control.disabled || busy)return;
  const {action,id,slot:part}=control.dataset;
  if(action==='close') closeSheet();
  if(action==='outfit') showOutfit(id);
  if(action==='catalog'){history.replaceState(null,'','#catalog');render('catalog',{focus:true});}
  if(action==='wardrobe'){
    history.replaceState(null,'',wardrobeHome);
    render('wardrobe',view==='catalog' ? {control:'[data-action=catalog]'} : {focus:true});
  }
  if(action==='leave') askLeave();
  if(action==='discard') exit();
  if(action==='save') void submit();
  if(action==='reset'){
    draft={...sample.look};
    error='';
    persistDraft();
    announcement.textContent='已恢复到最近一次保存的搭配。';
    render(view,{control:`button.slot[data-slot="${slot}"]`});
  }
  if(action==='slot' && Object.hasOwn(SLOTS,part)){slot=part;persistDraft();render(view,{control:`button.slot[data-slot="${part}"]`});}
  if(action==='equip'){
    const item=asset(id);
    if(!owned(item) || item.slot!==slot)return;
    draft[slot]=id;
    error='';
    persistDraft();
    announcement.textContent=(item.id===sample.look[slot]?'已保存穿着 ':'正在试穿 ')+item.name;
    render(view,{control:`button.hanger[data-id="${id}"]`});
    revealSelection();
  }
});
sheet.addEventListener('cancel',event=>{event.preventDefault();closeSheet();});
new ResizeObserver(updateOverflow).observe(root);
try{
  await prepareWardrobe();
  history.replaceState(null,'',wardrobeHome);
  render();
}catch(problem){
  root.textContent='衣橱素材读取失败。请从项目本地服务打开。';
  console.error(problem);
}
