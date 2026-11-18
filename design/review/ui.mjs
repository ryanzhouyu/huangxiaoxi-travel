import {icon, itemArt, stageFigure, world} from '../demo/renderer.mjs';

export {icon, itemArt, stageFigure, world};
export const h = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
export const href = (name, values = {}) => {
  const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value != null && value !== ''));
  return '#' + name + (params.size ? '?' + params : '');
};
export const link = (label, to, classes = 'button secondary') => `<a class="${classes}" href="${h(to)}">${label}</a>`;
export const button = (label, action, {value, classes = 'button primary', disabled = false, attrs = ''} = {}) =>
  `<button class="${classes}" type="button" data-action="${action}"${value === undefined ? '' : ` data-value="${h(value)}"`}${disabled ? ' disabled' : ''} ${attrs}>${label}</button>`;
export const bar = (title, back, extra = '') => `<header class="page-bar">${link('<span aria-hidden="true">‹</span><span class="sr">返回</span>', back, 'back')}<h1>${title}</h1><div class="bar-extra">${extra}</div></header>`;
export const header = (title, copy = '') => `<header class="paper-heading"><h2>${title}</h2>${copy ? `<p>${copy}</p>` : ''}</header>`;
export const section = (content, classes = '') => `<section class="paper ${classes}">${content}</section>`;
export const note = (content, classes = '') => `<p class="note ${classes}">${content}</p>`;
export const imageOf = place => `<span class="place-photo" aria-hidden="true">${world('map', undefined, place)}</span>`;
export const artifact = (item, detail = '') => `<span class="artifact-art">${itemArt(item)}</span><strong>${h(item.name)}</strong>${detail ? `<span class="tag">${detail}</span>` : ''}`;
export const status = (message, type = '') => message ? `<p class="feedback ${type}" role="${type === 'error' ? 'alert' : 'status'}">${h(message)}</p>` : '';
export const pressed = selected => `aria-pressed="${Boolean(selected)}"`;
export const day = date => new Intl.DateTimeFormat('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(date));
export const time = date => new Intl.DateTimeFormat('zh-CN', {hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(date));
export const dateKey = date => {
  const local = new Date(date);
  return [local.getFullYear(), local.getMonth() + 1, local.getDate()].map(value => String(value).padStart(2, '0')).join('-');
};
export const mask = number => number ? number.slice(0, 3) + ' **** ' + number.slice(-4) : '';
export const footer = content => `<footer class="actions">${content}</footer>`;
export const empty = (iconName, title, body, action = '') => section(`<div class="empty">${icon(iconName)}<h2>${title}</h2><p>${body}</p>${action}</div>`);
export const tabs = options => `<div class="tabs" role="group" aria-label="切换视图">${options.join('')}</div>`;

const companionPortrait = new URL('./journal-art/companion.webp', import.meta.url).href;
export const portrait = (classes = 'portrait', alt = '') => `<img class="${classes}" src="${companionPortrait}" alt="${h(alt)}">`;

const mainScenes = [
  ['partner', 'companion', '伙伴'],
  ['explore', 'map', '游玩'],
  ['memories', 'journal', '回忆'],
];

export function sceneNav(current) {
  if (!mainScenes.some(([name]) => name === current)) return '';
  const items = mainScenes.map(([name, symbol, label]) =>
    `<a class="nav-tab" href="${href(name)}"${name === current ? ' aria-current="page"' : ''}>
      <span class="nav-art nav-art-${symbol}" aria-hidden="true">${name === 'partner' ? portrait() : ''}</span>
      <span>${label}</span>
    </a>`);
  return `<nav class="main-nav" aria-label="主场景">${items.join('')}</nav>`;
}
