import {h, href, link, button, bar, section, header, note, icon, imageOf, stageFigure, status, pressed, day, time, dateKey, footer, tabs, empty} from '../ui.mjs';

const sorted = events => [...events].sort((a, b) => a.at.localeCompare(b.at));
export function filterEvents(events, filter) {
  if (filter.range === 'today') return events.filter(event => dateKey(event.at) === dateKey(new Date()));
  if (filter.range !== 'custom') return events;
  return events.filter(event => (!filter.from || dateKey(event.at) >= filter.from) && (!filter.to || dateKey(event.at) <= filter.to));
}

const composeUrl = (from, options = {}) => href('compose', {from, ...options});
const templates = [['single', '单页纪念'], ['trail', '足迹长图']];

function chooser(filter, field) {
  const options = [['all', '全部日期'], ['today', '今天'], ['custom', '自选日期']];
  return `<label class="field compact-field">经历范围<select data-model="${field}.range">${options.map(([id, name]) => `<option value="${id}"${filter.range === id ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
    ${filter.range === 'custom' ? `<div class="two date-fields"><label class="field">起始日期<input type="date" data-model="${field}.from" value="${h(filter.from)}"></label><label class="field">截止日期<input type="date" data-model="${field}.to" value="${h(filter.to)}"></label></div>` : ''}`;
}

function byDay(events) {
  const groups = new Map();
  for (const event of events) {
    const label = day(event.at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(event);
  }
  return groups;
}

export function memories({p, ui, here}) {
  const works = ui.memoryTab === 'works';
  const events = sorted(filterEvents(p.events, ui.memory)).reverse();
  let body = '';
  if (works) {
    body = p.works.length ? `<div class="works-grid">${p.works.map(work => link(`<img src="${h(work.image)}" alt=""><strong>${h(work.title)}</strong><small>${day(work.at)}</small>`, href('work', {id: work.id, from: here}), 'paper work-card')).join('')}</div>` :
      empty('camera', '相册里还没有作品', p.events.length ? '选一段足迹，做成第一张纪念图。' : '有了第一条到访记录，就能制作纪念图。',
        p.events.length ? link('制作第一张纪念图', composeUrl(here), 'button primary') : link('去看看游玩地点', '#explore'));
  } else if (!p.events.length) {
    body = empty('pin', '第一枚足迹，等你来。', '有效到访后，地点和时间会写进这本手账。', link('去游玩', '#explore', 'button primary'));
  } else {
    body = section(chooser(ui.memory, 'memory'), 'range-paper') + (events.length ? [...byDay(events)].map(([date, rows]) =>
      `<section class="journal-day"><h2>${date}</h2><div class="journal-thread">${rows.map((event, index) =>
        button(`${imageOf(event.pointId)}<span class="entry-slip"><small>${time(event.at)} · ${h(event.kind)}</small><strong>${h(event.name)}</strong><span>${event.reward ? '收获 +' + event.reward + ' 次' : '留下一枚足迹'}</span></span>`, 'event', {value: event.id, classes: 'journal-entry' + (index % 2 ? ' reverse' : '')})
      ).join('')}</div></section>`
    ).join('') : empty('book', '这个日期范围没有足迹', '可以调整起止日期，或查看全部。', button('查看全部', 'clearRange', {classes: 'button secondary'})));
  }
  return `<section class="journal"><header class="journal-head"><span>黔山同行</span><h1>旅行手账</h1></header>
    ${tabs([['events', '一路足迹'], ['works', '纪念作品']].map(([id, label]) => button(label, 'memoryTab', {value: id, classes: 'tab', attrs: pressed(ui.memoryTab === id)})))}
    <div class="stack">${body}</div>
    ${!works && events.length ? footer(link('用这些经历做纪念', composeUrl(here, {range: ui.memory.range, start: ui.memory.from, end: ui.memory.to}), 'button primary')) : ''}
  </section>`;
}

export function eventContent(event, here) {
  return `<div class="receipt-photo">${imageOf(event.pointId)}</div>
    <h3>${h(event.name)}</h3><p>${day(event.at)} · ${time(event.at)} · ${h(event.kind)}</p>
    ${note(event.reward ? '获得 ' + event.reward + ' 次景区通用次数。' : '本次保留足迹，未新增次数。')}
    ${link('用这一段经历制作', composeUrl(here, {visit: event.id}), 'button primary')}`;
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
          <input type="checkbox" value="${h(event.id)}" data-model="selected"${draft.selected.includes(event.id) ? ' checked' : ''}>${imageOf(event.pointId)}
          <span><strong>${h(event.name)}</strong><small>${time(event.at)} · ${h(event.kind)}</small></span>
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
      <div class="two">${link('保存到设备', print.image, 'button primary').replace('<a ', `<a download="${h(print.title.replace(/[\\/:*?"<>|]/g, '-'))}.png" `)}
      ${button('分享图片', 'share', {classes: 'button secondary'})}</div>
    `)}
    ${section(`${header('这张图来自…')}${print.snapshots.map(event => `<div class="row static-row">${imageOf(event.pointId)}<span><strong>${h(event.name)}</strong><small>${day(event.at)} · ${time(event.at)}</small></span></div>`).join('')}`)}
    ${link('用当前搭配再做一张', composeUrl(here, {copy: print.id}), 'button secondary')}</div>`;
}
