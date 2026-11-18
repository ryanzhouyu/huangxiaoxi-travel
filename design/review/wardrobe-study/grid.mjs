import {h} from '../ui.mjs';

export function partStatus(label, saved) {
  if (!label) return '';
  const mark = saved ? '<span class="saved-mark" aria-hidden="true"></span>' : '';
  return `${mark}<span class="sr">${h(label)}</span>`;
}

export function partGrid(items, {slot, nameFor, imageFor, labelFor, currentId, savedId, stress}) {
  const cards = items.map(item => {
    const name = nameFor(item);
    const state = labelFor(item);
    const saved = item.id === savedId;
    const imageStyle = item.filter ? ` style="filter:${item.filter}"` : '';
    return `<div class="grid-item">
      <button type="button" class="grid-choice" data-action="grid-equip" data-id="${item.id}" data-saved="${saved}" aria-pressed="${item.id === currentId}"${saved ? ` title="${h(state)}"` : ''}>
        <img src="${imageFor(item)}" alt=""${imageStyle}>
        <span class="grid-name">${h(name)}</span>
        ${partStatus(state, saved)}
      </button>
      <button type="button" class="grid-detail" data-action="grid-inspect" data-id="${item.id}"
        title="查看大图" aria-label="查看${h(name)}大图"><span aria-hidden="true"></span></button>
    </div>`;
  }).join('');
  const sampleNote = stress && slot === 'top' ? '<p class="grid-sample">含评审用配色</p>' : '';
  return `${sampleNote}<div class="all-parts" data-slot="${slot}"${items.length <= 6 ? ' data-compact' : ''}>${cards}</div>`;
}
