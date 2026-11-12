// 当前界面使用的线性图标与分隔装饰。
export function icon(name,cls=''){
 const paths={
  partner:'<circle cx="12" cy="8" r="3.6"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M4 4l1-2m15 3 2-1"/>',
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16"/><circle cx="14" cy="10" r="2.5"/>',
  wardrobe:'<path d="m8 4-5 3-2 5 5 2v7h12v-7l5-2-2-5-5-3c0 5-8 5-8 0Z"/>',
  book:'<path d="M4 3h15a1 1 0 0 1 1 1v17H5a3 3 0 0 1 0-6h15M5 3v12m4-9h7m-5 3h4"/>',
  bag:'<rect x="5" y="7" width="14" height="15" rx="3"/><path d="M8 7V5a4 4 0 0 1 8 0v2M5 11h14m-10 0v3m6-3v3M9 18h6"/>',
  scan:'<path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6M1 12h22M8 8h2v2H8zm6 6h2v2h-2z"/>',
  ticket:'<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Zm12 0v3m0 3v2m0 3v3M7 9l3 3-3 3"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  gift:'<path d="M3 10h18v5H3Zm2 5v7h14v-7M12 10v12m0-12C2 10 4 1 8 4l4 6c10 0 8-9 4-6Z"/>',
  pin:'<path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="9" r="2.5"/>',
  shop:'<path d="M3 11h18l-2-7H5Zm2 0v10h14V11M9 21v-6h6v6M3 8h18"/>',
  camera:'<path d="m8 5 2-3h4l2 3h5v16H3V5Z"/><circle cx="12" cy="12" r="5"/>',
  pose:'<circle cx="12" cy="4" r="2"/><path d="M12 7v8m0-5L5 7 3 3m9 7 7-4 2-4M12 15l-6 7m6-7 7 7"/>',
  flower:'<path d="M12 9C1-4 0 14 9 12-4 21 14 24 12 15c12 13 15-5 6-3 13-12-5-15-6-3Z"/><circle cx="12" cy="12" r="2"/>',
  foot:'<ellipse cx="10" cy="15" rx="4" ry="6" transform="rotate(25 10 15)"/><circle cx="14" cy="5" r="2"/><path d="m8 4 1 1m-4 2 1 1m12 0 1 1"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  check:'<path d="m5 12 5 5L20 6"/>',
 };
 return `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.star}</svg>`;
}
export const flourish=()=>`<span class="flourish" aria-hidden="true">✧ <i></i> ❀ <i></i> ✧</span>`;
