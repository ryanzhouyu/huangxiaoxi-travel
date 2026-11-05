import {icon, world, stageFigure} from '../renderer.mjs';

const calendarDay = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
});
const clock = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function dayGroups(events) {
  const groups = new Map();
  for (const event of events) {
    const key = new Date(event.at).toLocaleDateString('en-CA');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.values()];
}

function entry(event, esc, showLook) {
  const received = event.reward ? `收获 ${event.reward} 次` : '再访留念';
  const kind =
    event.kind === '体验活动'
      ? '完成体验'
      : event.kind === '商家'
        ? '到店'
        : '到访';
  const art =
    showLook && event.look
      ? `<span class="event-cameo" aria-hidden="true">${stageFigure(event.look)}</span>`
      : `<span class="journal-print" aria-hidden="true">${world('map', undefined, event.pointId)}</span>`;
  return `<button class="journal-event" data-action="event" data-id="${esc(event.id)}">
    ${art}
    <span class="event-story"><small>${clock.format(new Date(event.at))} · ${kind}</small>
    <strong>${esc(event.name)}</strong><span>${received}</span></span></button>`;
}

export function renderJournal({
  a,
  ui,
  button,
  link,
  esc,
  workCard,
  filteredByRange,
  rangeFields,
}) {
  const works = ui.memoryTab === 'works';
  const events = filteredByRange().slice().reverse();
  const tabs = ['一路足迹', '纪念作品']
    .map((name, i) =>
      button(
        name,
        'memory-tab',
        works === Boolean(i) ? 'selected' : '',
        `data-value="${i ? 'works' : 'events'}"`,
      ),
    )
    .join('');
  let body;
  if (works && a.works.length) {
    body = `<div class="work-grid">${a.works.map(workCard).join('')}</div>`;
  } else if (!works && a.events.length) {
    const days = dayGroups(events)
      .map(
        (
          group,
          index,
        ) => `<section class="journal-day ${index ? 'past-day' : 'latest-day'}">
      <h2 class="ribbon">${calendarDay.format(new Date(group[0].at))}</h2>
      <div class="journal-trail">${group.map((e, i) => entry(e, esc, index === 0 && i === 1 && e.pointId === group[0].pointId)).join('')}</div></section>`,
      )
      .join('');
    body = `<div class="journal-range">${rangeFields()}</div>${days || '<p class="notice">这一天还没有足迹，可以换个日期看看。</p>'}
      <div class="journal-action">${button('用这些经历做纪念', 'begin-compose', 'gold full', events.length ? '' : 'disabled')}</div>`;
  } else {
    const canMake = works && a.events.length > 0;
    body = `<div class="journal-empty">${canMake ? `<div class="journal-print" data-place="${esc(a.events[0].pointId)}"></div>` : icon('book')}
      <div class="paper"><span class="speaker">黄晓西</span><h2>${works ? '收下第一张纪念图' : '第一页给你留好啦'}</h2>
      <p>${canMake ? '已经走过的这一站，要做成我们的第一张照片吗？' : '到达景区，打一次卡，就能在这里记下第一站。'}</p></div>
      ${link(canMake ? '用这次经历做纪念' : '去看看游玩地点', canMake ? 'compose' : 'scene', 'gold full')}</div>`;
  }
  return `<section class="travel-journal"><header class="journal-heading"><h1>旅行手账</h1><span>黔山漫游</span></header><div class="segmented">${tabs}</div>${body}</section>`;
}
