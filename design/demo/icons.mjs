import {partnerIcon} from './painted-icons.mjs';

const shapes={
  back:'<path d="m15 5-7 7 7 7M8 12h13"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  partner:'<path d="M8 14c-4 0-6 3-6 7h20c0-4-2-7-6-7"/><circle cx="12" cy="8" r="5"/>',
  book:'<path d="M3 4c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2V4Zm9 2v16"/>',
  bag:'<rect x="4" y="7" width="16" height="15" rx="3"/><path d="M8 7V5c0-5 8-5 8 0v2M4 12h16m-9-2v5h2v-5"/>',
  camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="13" r="4"/>',
  pin:'<path d="M19 9c0 5-7 13-7 13S5 14 5 9a7 7 0 1 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
  ticket:'<path d="M3 5h18v5c-4 0-4 4 0 4v5H3v-5c4 0 4-4 0-4V5Zm13 0v14"/>',
  gift:'<path d="M3 9h18v5H3V9Zm2 5v8h14v-8m-7-5v13M12 9C0 6 8-3 12 9Zm0 0c12-3 4-12 0 0Z"/>',
  check:'<path d="m5 12 5 5L21 5"/>',
  lock:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
  chat:'<path d="M21 11c0 5-5 9-11 8l-5 3v-5C-2 10 4 2 12 3c5 0 9 3 9 8Z"/><circle cx="8" cy="10" r=".7"/><circle cx="15" cy="10" r=".7"/>',
  shield:'<path d="m12 2 9 4v7c-1 5-9 9-9 9S4 18 3 13V6l9-4Z"/><path d="m7 11 4 4 6-7"/>',
  flower:'<path d="M12 9C3-5-4 12 9 12c-14 9 3 16 3 3 9 14 16-3 3-3C29 3 12-4 12 9Z"/><circle cx="12" cy="12" r="3"/>',
  shop:'<path d="M3 9h18l-3-6H6L3 9Zm1 0v12h16V9M9 21v-8h6v8"/>',
  arrow:'<path d="M3 12h18m-7-7 7 7-7 7"/>',
  download:'<path d="M12 2v14m-5-5 5 5 5-5M3 16v6h18v-6"/>',
};
const paintedNames = {partner:'companion',map:'map',book:'memories',bag:'wardrobe',camera:'camera',pin:'pin',ticket:'ticket',gift:'gift',check:'check',lock:'lock',phone:'phone',chat:'chat',shield:'shield',flower:'flower',shop:'shop',download:'download'};
export const icon=(name,cls='')=>paintedNames[name]
  ? partnerIcon(paintedNames[name]).replace('class="partner-art"',`class="icon ui-art ${cls}"`)
  : `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.arrow}</svg>`;
