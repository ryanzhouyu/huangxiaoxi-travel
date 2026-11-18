import {chapters} from '../chapter-catalog.mjs';
import {h, href, link, pressed} from '../ui.mjs';

const regions = [['all','全部市州'], ['anshun','安顺市'], ['guiyang','贵阳市'], ['qiannan','黔南州']];
const categories = [['all','全部'], ['nature','自然风光'], ['culture','人文']];
const choiceName = (choices, value) => choices.find(([id]) => id === value)[1];

export function exploreAtlas({nav, ui}) {
  const {region, category} = ui.atlas;
  return `<section class="destination root-world scene atlas" aria-label="发现贵州">
    <div class="atlas-art" aria-hidden="true"></div>
    <div class="atlas-content">
      <header class="destination-head atlas-header"><span>黄晓西 · 黔山同行</span><h1>发现贵州</h1></header>
      <div class="atlas-filters">
        <div class="region-control" id="region-control">
          <button class="region-filter" id="region-filter" type="button" aria-controls="region-options" aria-expanded="false">
            <span class="sr">地市州</span><span id="region-label">${choiceName(regions, region)}</span><span class="caret" aria-hidden="true"></span>
          </button>
          <div class="region-dropdown" id="region-options" role="group" aria-label="按地市州筛选" hidden>
            ${regions.map(([key,name]) => `<button type="button" value="${key}" ${pressed(region === key)}>${name}</button>`).join('')}
          </div>
        </div>
        <div class="category-filter" role="group" aria-label="景区类别">
          ${categories.map(([key,name]) => `<button type="button" data-category="${key}" ${pressed(category === key)}>${name}</button>`).join('')}
        </div>
      </div>
      <div class="map-labels" role="group" aria-label="景区章节">
        ${chapters.map(({id,name,city,region,category}) => `<a class="chapter-pin pin-${id}" data-chapter="${id}" data-region="${region}" data-type="${category}"
          href="${h(href('scene',{id}))}" aria-label="${h(`${name}，${city}，打开景区章节`)}">
          <span class="landmark-cutout" aria-hidden="true"><span class="landmark-art"></span></span>
          <span class="pin-point" aria-hidden="true"></span>
          <span class="chapter-sign"><strong>${h(name)}</strong><small>${h(city)}</small></span>
        </a>`).join('')}
      </div>
      <p class="sr" id="result-count" role="status"></p>
      <div class="empty-map" id="no-results" hidden><p>这组条件下暂无景区</p><button id="reset-filters" type="button">查看全部景区</button></div>
      <p class="map-caption">游玩示意图</p>
    </div>${nav}</section>`;
}

export function atlasChapter(chapter, nav) {
  return `<section class="destination root-world scene atlas" data-chapter="${chapter.id}" aria-label="${h(chapter.name)}景区导览">
    <div class="atlas-art" aria-hidden="true"></div>
    <div class="atlas-content"><div class="chapter-view">
      <header class="chapter-heading">${link('<span aria-hidden="true">‹</span> 贵州地图','#explore','return-map')}
        <div class="destination-head"><span>${h(chapter.city)}</span><h1>${h(chapter.name)}</h1></div></header>
      <section class="chapter-journal" aria-labelledby="stage-title">
        <div class="journal-heading"><h2 id="stage-title">景点关卡</h2><span>导览预览</span></div>
        <div class="stage-nodes" role="group" aria-label="景点关卡">
          ${chapter.stages.map(([name,seal]) => `<button class="stage-node" type="button" data-stage="${h(name)}" aria-pressed="false">
            <span class="stage-seal" aria-hidden="true">${h(seal)}</span>${h(name)}</button>`).join('')}
        </div><p class="stage-status" role="status">选择一个景点，查看足迹状态</p>
      </section>
    </div></div>${nav}</section>`;
}

export function bindAtlas(app, {selection, navigate, restoreChapter}) {
  const atlas = app.querySelector('.atlas');
  if (!atlas) return;
  if (atlas.hasAttribute('data-chapter')) {
    const stages = [...atlas.querySelectorAll('[data-stage]')];
    for (const stage of stages) stage.addEventListener('click', () => {
      for (const button of stages) button.setAttribute('aria-pressed', String(button === stage));
      atlas.querySelector('.stage-status').textContent = `${stage.dataset.stage} · 待到访`;
    });
    return;
  }

  const regionControl = atlas.querySelector('#region-control');
  const regionButton = atlas.querySelector('#region-filter');
  const regionMenu = atlas.querySelector('#region-options');
  const regionOptions = [...regionMenu.querySelectorAll('button')];
  const categoryOptions = [...atlas.querySelectorAll('[data-category]')];
  const pins = [...atlas.querySelectorAll('.chapter-pin')];
  let entering;

  function updateFilters() {
    atlas.querySelector('#region-label').textContent = choiceName(regions, selection.region);
    regionButton.dataset.active = String(selection.region !== 'all');
    for (const option of regionOptions) option.setAttribute('aria-pressed', String(option.value === selection.region));
    for (const option of categoryOptions) option.setAttribute('aria-pressed', String(option.dataset.category === selection.category));
    for (const pin of pins) pin.hidden = (selection.region !== 'all' && selection.region !== pin.dataset.region) ||
      (selection.category !== 'all' && selection.category !== pin.dataset.type);
    const count = pins.filter(pin => !pin.hidden).length;
    atlas.querySelector('#no-results').hidden = count > 0;
    atlas.querySelector('#result-count').textContent = count ? `地图显示 ${count} 个景区` : '这组条件下暂无景区';
  }

  function setRegionMenu(open) {
    regionMenu.hidden = !open;
    regionButton.setAttribute('aria-expanded', String(open));
  }

  regionButton.addEventListener('click', () => setRegionMenu(regionMenu.hidden));
  regionControl.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || regionMenu.hidden) return;
    setRegionMenu(false);
    regionButton.focus();
  });
  regionControl.addEventListener('focusout', event => {
    if (event.relatedTarget && !regionControl.contains(event.relatedTarget)) setRegionMenu(false);
  });
  const closeOutside = event => {
    if (!regionControl.contains(event.target)) setRegionMenu(false);
  };
  document.addEventListener('pointerdown', closeOutside);
  for (const option of regionOptions) option.addEventListener('click', () => {
    selection.region = option.value;
    updateFilters();
    setRegionMenu(false);
    regionButton.focus();
  });
  for (const option of categoryOptions) option.addEventListener('click', () => {
    selection.category = option.dataset.category;
    updateFilters();
  });
  atlas.querySelector('#reset-filters').addEventListener('click', () => {
    Object.assign(selection,{region:'all',category:'all'});
    updateFilters();
    regionButton.focus();
  });
  for (const pin of pins) pin.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (entering || pin.hidden) return;
    setRegionMenu(false);
    const open = () => {
      delete pin.dataset.entering;
      entering = false;
      if (pin.isConnected && !pin.hidden) navigate(pin.getAttribute('href'));
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return open();
    entering = true;
    pin.dataset.entering = '';
    // 让触屏先显示确认高光，再切换到景区导览。
    setTimeout(open, 180);
  });
  updateFilters();
  pins.find(pin => pin.dataset.chapter === restoreChapter && !pin.hidden)?.focus({preventScroll:true});
  return () => document.removeEventListener('pointerdown', closeOutside);
}
