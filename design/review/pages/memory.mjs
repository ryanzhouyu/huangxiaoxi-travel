import {h, href, link, button, bar, section, header, note, stageFigure, status, pressed, day, time, dateKey, footer, empty, portrait} from '../ui.mjs';
import {catalog} from '../review-service.mjs';

const sorted = events => [...events].sort((a, b) => a.at.localeCompare(b.at));
export function filterEvents(events, filter) {
  if (filter.range === 'today') return events.filter(event => dateKey(event.at) === dateKey(new Date()));
  if (filter.range !== 'custom') return events;
  return events.filter(event => (!filter.from || dateKey(event.at) >= filter.from) && (!filter.to || dateKey(event.at) <= filter.to));
}

const composeUrl = (from, options = {}) => href('compose', {from, ...options});
const templates = [['single', '单页纪念'], ['trail', '足迹长图']];
const photo = name => new URL('../journal-art/' + name + '.webp', import.meta.url).href;
const dateLabel = key => Number(key.slice(5,7)) + ' 月 ' + Number(key.slice(8,10)) + ' 日';
const rangeLabel = range => ({all:'全部日期',today:'今天',custom:'自选日期'})[range] ?? '全部日期';
const isShop = event => event.kind === '商家' || event.kind === '商家到店';
const eventKind = event => event.kind === '体验活动' ? '完成体验' :
  (event.reward ? '首次' : '再次') + (isShop(event) ? '到店' : '到访');

function memoryArt(event, detail = false) {
  const hero = detail ? ' sheet-hero' : '';
  if (event.kind === '体验活动' || isShop(event)) {
    const shop = isShop(event);
    return `<span class="stamp ${shop ? 'shop' : 'craft'}${hero}" aria-hidden="true"><b>${shop ? '到店' : '手作'}</b></span>`;
  }
  if (!['gate','ridge','brook'].includes(event.pointId)) {
    return `<span class="stamp${hero}" aria-hidden="true"><b>到访</b></span>`;
  }
  return `<img class="photo${hero}" src="${photo(event.pointId)}" alt="${h(event.name)}景观插画">`;
}

export function journalFilter(filter) {
  return `<form class="date-form" data-submit="journalRange">
    <div class="range-picks" role="group" aria-label="日期范围">${['all','today','custom'].map(range =>
    button(rangeLabel(range), 'journalRangeMode', {value:range, classes:'secondary', attrs:pressed(filter.range === range)})).join('')}</div>
    <input name="range" type="hidden" value="${h(filter.range)}">
    <div class="date-fields"${filter.range === 'custom' ? '' : ' hidden'}>
      <label>起始日期<input name="from" type="date" value="${h(filter.from)}"></label>
      <label>截至日期<input name="to" type="date" value="${h(filter.to)}"></label>
    </div>
    <p class="error" role="alert" hidden>结束日期不能早于起始日期。</p>
    <button class="primary" type="submit">查看足迹</button>
  </form>`;
}

function chooser(filter, field) {
  const options = [['all', '全部日期'], ['today', '今天'], ['custom', '自选日期']];
  return `<label class="field compact-field">经历范围<select data-model="${field}.range">${options.map(([id, name]) => `<option value="${id}"${filter.range === id ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
    ${filter.range === 'custom' ? `<div class="two date-fields"><label class="field">起始日期<input type="date" data-model="${field}.from" value="${h(filter.from)}"></label><label class="field">截止日期<input type="date" data-model="${field}.to" value="${h(filter.to)}"></label></div>` : ''}`;
}

function byDay(events, labelFor = day) {
  const groups = new Map();
  for (const event of events) {
    const label = labelFor(event.at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(event);
  }
  return groups;
}

export function memories({p, ui, here, nav}) {
  const works = ui.memoryTab === 'works';
  const events = sorted(filterEvents(p.events, ui.memory)).reverse();
  let body;
  if (!p.events.length && (!works || !p.works.length)) {
    body = `<section class="blank">${portrait('partner-medal', '黄晓西')}
      <h2>第一枚足迹，等你来。</h2><p>到访后，晓西会把地点和时间一起留在手账里。</p>${link('去游玩','#explore','primary')}</section>`;
  } else if (works) {
    body = p.works.length ? `<div class="works-grid">${p.works.map(print => {
      const long = print.template === 'trail';
      return button(`<span class="work-photo${long ? ' long' : ''}"><img src="${h(print.image)}" alt="${h(print.title)}${long ? '长图局部' : '单页原图'}">${long ? '<em>长图</em>' : ''}</span>
        <span class="works-title">${h(print.title)}</span><span class="work-meta">${dateLabel(dateKey(print.at))}<span>${long ? '' : '单页'}</span></span>`, 'journalWork', {
        value:print.id, classes:'work', attrs:`title="${h(print.title)}"`,
      });
    }).join('')}</div>` : `<section class="blank"><div class="blank-print" aria-hidden="true"></div>
      <h2>第一张纪念图等着冲洗</h2><p>选一段走过的路，和晓西做一张旅行纪念。</p>
      ${link('制作第一张纪念图',composeUrl(here),'primary')}</section>`;
  } else if (events.length) {
    const days = byDay(events, dateKey);
    body = [...days].map(([date, rows]) => `<section class="day"><h2>${dateLabel(date)}</h2><div class="rows">${rows.map(event => button(
      `${memoryArt(event)}<span><strong>${h(event.name)}</strong><span class="sub">${time(event.at)} · ${eventKind(event)}</span></span><span class="chevron" aria-hidden="true">›</span>`,
      'event', {value:event.id, classes:'experience'}
    )).join('')}</div></section>`).join('');
  } else {
    const {range, from, to} = ui.memory;
    const label = from && to ? [...new Set([dateLabel(from),dateLabel(to)])].join(' — ') : from ? dateLabel(from) + '起' : to ? '截至' + dateLabel(to) : rangeLabel(range);
    body = `<section class="filter-empty"><p class="range">${label}</p><h2>这段日期没有足迹</h2>
      <p>可以换一段日期，或返回全部足迹。</p>${button('清除筛选','clearRange',{classes:'secondary'})}</section>`;
  }
  const {range, from, to} = ui.memory;
  const tabs = [['events','一路足迹'],['works','纪念作品']].map(([id, label]) =>
    button(label, 'memoryTab', {value:id, classes:'chapter', attrs:pressed(ui.memoryTab === id)})).join('');
  const filter = !works && p.events.length ? button('<span class="cal" aria-hidden="true"></span>' + rangeLabel(range), 'journalFilter', {classes:'filter',attrs:'aria-haspopup="dialog"'}) : '';
  const print = !works && events.length ? link('用 ' + events.length + ' 段足迹做纪念', composeUrl(here,{range,start:from,end:to}), 'primary') : '';
  const key = works ? 'works' : [range,from,to].join('/');
  return `<div class="memory-review"><div class="reading" data-journal-key="${h(key)}"><div class="book">
    <header class="book-head"><div class="book-headline"><h1>旅行手账</h1><span class="place">黔山漫游</span></div>
      <div class="chapters" role="group" aria-label="手账章节">${tabs}${filter}</div></header>
    <div class="content">${body}</div><div class="book-tail" aria-hidden="true"></div>
    </div></div><footer class="dock">${print}${nav}</footer></div>`;
}

export function eventContent(event, here) {
  const location = catalog.points.find(point => point.id === event.pointId)?.name;
  return `${memoryArt(event,true)}<ul class="facts">
    <li>${dateLabel(dateKey(event.at))} · ${time(event.at)} · ${eventKind(event)}</li>
    ${event.kind === '体验活动' && location ? `<li>地点 · ${h(location)}</li>` : ''}
    <li>${event.reward ? '获得 ' + event.reward + ' 次景区通用次数。' : '本次保留足迹，未新增次数。'}</li>
    </ul>${link('用这段经历做纪念', composeUrl(here,{visit:event.id}), 'primary')}`;
}

export function journalWork(print, here) {
  return `<div class="print-view"><img class="full-print" src="${h(print.image)}" alt="${h(print.title)}完整原图"></div>
    <p class="status-line">${print.template === 'trail' ? '长图' : '单页'} · ${print.snapshots.length} 段经历 · ${dateLabel(dateKey(print.at))}保存</p>
    <div class="sheet-actions">${downloadPrint(print, '下载原图', 'primary')}${link('打开完整作品', href('work', {id:print.id,from:here}), 'secondary')}</div>`;
}

function downloadPrint(print, label, classes) {
  const title = print.title.replace(/[\\/:*?"<>|]/g, '-');
  return `<a class="${classes}" href="${h(print.image)}" download="${h(title)}.png">${label}</a>`;
}

export function compose({p, ui, here, back}) {
  if (!p.events.length) return `${bar('回忆照相馆', back)}<div class="stack">${empty('camera', '有了足迹，就能做纪念图', '完成一次有效到访后再来。', link('去游玩', '#explore'))}</div>`;
  const draft = ui.compose;
  const selected = draft.selected.length;
  const filtered = sorted(filterEvents(p.events, draft)).reverse();
  return `${bar('回忆照相馆', back)}
    <div class="studio scene"><div class="studio-frame">${selected ? '<canvas id="draft-print" role="img" aria-label="纪念图草稿"></canvas>' : '<div class="empty-frame">先选一段旅行经历</div>'}</div></div>
    <div class="stack overlap">
      ${section(`${header('纪念图样式')}
        <div class="template-grid">${templates.map(([id, label]) => button(`<span class="template-thumb ${id}" aria-hidden="true"></span><strong>${label}</strong>`, 'template', {value: id, classes: 'template', attrs: pressed(draft.template === id)})).join('')}</div>
        <label class="field">标题 <small>最多 16 字</small><input data-model="compose.title" maxlength="16" value="${h(draft.title)}" placeholder="把黔山带回去"></label>`)}
      ${section(`<div class="look-strip">${stageFigure(p.look)}<div><strong>当前保存的搭配</strong><p>会穿进这张纪念图。</p></div>
        ${link('调整搭配', href('wardrobe', {from: here}), 'button secondary')}</div>`)}
      ${section(`${header('挑选旅行经历', '已选 ' + selected + ' 段，可跨日选择。')}
        ${chooser(draft, 'compose')}
        ${filtered.length ? [...byDay(filtered)].map(([date, rows]) => `<fieldset class="visit-stack"><legend>${date}</legend>${rows.map(event => `<label class="visit-option">
          <input type="checkbox" value="${h(event.id)}" data-model="selected"${draft.selected.includes(event.id) ? ' checked' : ''}><span class="memory-visit-art">${memoryArt(event)}</span>
          <span><strong>${h(event.name)}</strong><small>${time(event.at)} · ${eventKind(event)}</small></span>
        </label>`).join('')}</fieldset>`).join('') : note('这个日期范围没有经历。已选的其他日期经历仍会保留。')}`)}
      ${status(ui.error, 'error')}
    </div>
    ${footer(button(ui.busy ? '正在合成…' : '生成纪念图预览', 'renderPrint', {disabled: !selected || ui.busy}))}`;
}

export function preview({ui, back}) {
  if (!ui.preview) return `${bar('纪念图预览', back)}<div class="stack">${empty('camera', '请重新生成预览', '编辑内容或搭配后，需要生成新的图片。', link('回到照相馆', back, 'button primary'))}</div>`;
  const print = ui.preview;
  return `${bar('纪念图预览', back)}
    <div class="studio preview-studio scene">${button(`<img src="${h(print.image)}" alt="${h(print.title)}">`, 'zoom', {classes: 'print-object', attrs: 'aria-label="放大预览"'})}</div>
    <div class="stack">${section(header('照片洗好啦。', print.events.length + ' 段经历 · 当前保存搭配') + status(ui.error, 'error'))}</div>
    ${footer(button('收进我的纪念册', 'saveWork', {disabled: ui.busy || !!ui.pending}) + link('返回编辑', back, 'button text'))}`;
}

export function work({p, id, here, back}) {
  const print = p.works.find(work => work.id === id);
  return `${bar('我的纪念图', back)}
    <div class="studio preview-studio scene">${button(`<img src="${h(print.image)}" alt="${h(print.title)}">`, 'zoom', {classes: 'print-object', attrs: 'aria-label="放大作品"'})}</div>
    <div class="stack">${section(`${header(h(print.title), day(print.at) + ' · ' + print.snapshots.length + ' 段经历')}
      <div class="two">${downloadPrint(print, '保存到设备', 'button primary')}
      ${button('分享图片', 'share', {classes: 'button secondary'})}</div>
    `)}
    ${section(`${header('这张图来自…')}${print.snapshots.map(event => `<div class="row static-row"><span class="memory-visit-art">${memoryArt(event)}</span><span><strong>${h(event.name)}</strong><small>${day(event.at)} · ${time(event.at)}</small></span></div>`).join('')}`)}
    ${link('用当前搭配再做一张', composeUrl(here, {copy: print.id}), 'button secondary')}</div>`;
}
