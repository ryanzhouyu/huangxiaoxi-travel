import {figure} from './visual.mjs';

// Code-native scenery and UI symbols: layout prototypes, not final destination artwork.
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
export function stageFigure(look){
 return figure(look,{label:false})
 .replace(/<rect[^>]*\/>/,'')
 .replace(/<circle cx="180" cy="151"[^>]*\/>/,'')
 .replace(/<path d="M24 292[^>]*\/>/,'')
 .replace('viewBox="0 0 360 400"','viewBox="85 45 190 335"')
 .replace('class="figure"','class="figure stage-figure"');
}
export function itemArt(a){
 const c=a.color||'#d7b777';
 const shapes={
  hair:`<path d="M24 66V40C23 7 74 7 73 40v27l-12-9V38L47 28 35 39v24Z" fill="${c}"/><path d="M35 42c0 29 27 30 27 0" fill="#f0d6b6"/>`,
  top:`<path d="m29 22-18 9 7 22 13-5v29h37V48l13 5 6-22-21-9q-17 20-37 0Z" fill="${c}" stroke="#756047" stroke-width="1.5"/><path d="M30 23q18 21 37 0M37 56h22" fill="none" stroke="#fff7" stroke-width="3"/>`,
  bottom:`<path d="M32 19h34l17 58Q48 91 15 77Z" fill="${c}" stroke="#756047" stroke-width="1.5"/><path d="M32 27h34M37 35l-8 42m20-42v46m11-46 9 42" stroke="#fff5" stroke-width="2"/>`,
  shoes:`<path d="M17 33h22v23l9 7v12H10V60l7-5Zm43 0h22v22l8 8v12H53V63l7-7Z" fill="${c}" stroke="#756047" stroke-width="1.5"/><path d="M15 68h29m14 0h28" stroke="#ecd8b5" stroke-width="3"/>`,
  expression:`<circle cx="48" cy="48" r="29" fill="#f1d7b7" stroke="#b89a70"/><path d="M32 45q5-8 10 0m13 0q5-8 10 0M39 59q10 12 20 0" fill="none" stroke="#725643" stroke-width="3" stroke-linecap="round"/><circle cx="27" cy="55" r="4" fill="#dc9c8b"/><circle cx="68" cy="55" r="4" fill="#dc9c8b"/>`,
  pose:`<circle cx="46" cy="24" r="9" fill="#d9b58b"/><path d="M46 37v25m0-18L25 54 14 34m32 10 21-11 8-17M46 62 27 83m19-21 23 21" fill="none" stroke="#8c9d7a" stroke-width="9" stroke-linecap="round"/>`,
  background:`<rect x="10" y="17" width="77" height="64" rx="4" fill="${c}" stroke="#a58d60"/><circle cx="66" cy="34" r="9" fill="#f5e0ac"/><path d="m10 76 27-33 20 19 14-17 16 31Z" fill="#718d77"/><path d="M11 76h75" stroke="#b8d1bf" stroke-width="4"/>`,
 };
 return `<svg class="item-art" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shapes[a.slot]||''}</svg>`;
}
function trees(x,y,scale=1){return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 100V5" stroke="#405d51" stroke-width="8"/><path d="M-40 65 0 5 40 65-30 45 0 0 30 45-23 24 0-18 23 24Z" fill="#254c45"/><path d="m0 10 23 34M0 38l-29 25" stroke="#76927a" stroke-width="2" opacity=".4"/></g>`;}
function pavilion(){return `<g transform="translate(244 299)"><path d="M-82 46Q-40 40 0 8q40 32 84 38L63 58H-63Z" fill="#1c3835" stroke="#c3a56b" stroke-width="2"/><path d="M-100 76q48-2 100-34 48 32 101 34L79 91H-79Z" fill="#233f3c" stroke="#c7a765" stroke-width="2"/><path d="M-63 91v123m126-123v123M-42 91v123m84-123v123" stroke="#876444" stroke-width="7"/><path d="M-61 110H62v72H-61Z" fill="#d4a358" opacity=".8"/><path d="M-62 112H62m-124 23H62m-124 23H62m-124 22H62M-41 111v70m21-70v70m20-70v70m21-70v70m21-70v70" stroke="#654d3d" stroke-width="3"/><rect x="-34" y="90" width="68" height="30" rx="3" fill="#335549" stroke="#d9bb7e"/><text x="0" y="111" text-anchor="middle" fill="#ead09a" font-size="14" font-family="serif">黔山小憩</text><path d="M-78 214H78m-89 12H89m-100 13H100" stroke="#648174" stroke-width="8"/><path d="M-95 191H95m-81-22v47m34-47v47m66-47v47m34-47v47" stroke="#9b875b" stroke-width="4"/></g>`;}
export function world(theme='night'){
 const night=theme==='night',map=theme==='map';
 return `<svg class="world-art world-${theme}" viewBox="0 0 460 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="sky-${theme}" x2="0" y2="1"><stop stop-color="${night?'#132b38':'#c5dbcf'}"/><stop offset=".65" stop-color="${night?'#4b736c':'#f0e9ca'}"/><stop offset="1" stop-color="#93b9a1"/></linearGradient><linearGradient id="water-${theme}" x2=".4" y2="1"><stop stop-color="#a4d8c1"/><stop offset="1" stop-color="${night?'#294f4c':'#6baf99'}"/></linearGradient><radialGradient id="glow-${theme}"><stop stop-color="#f8df9b" stop-opacity=".65"/><stop offset="1" stop-color="#e6b772" stop-opacity="0"/></radialGradient></defs><rect width="460" height="900" fill="url(#sky-${theme})"/>
 <circle cx="357" cy="124" r="${night?33:43}" fill="${night?'#f3e3b5':'#f7efd2'}" opacity=".9"/>
 <path d="M-30 370Q20 230 65 290L117 172 165 295 224 219 279 339 351 191 399 275 475 246V630H-30Z" fill="${night?'#284c50':'#a6bd9a'}"/><path d="m-20 418 70-123 56 76 64-121 67 142 64-64 51-114 67 174 61-59v294H-20Z" fill="${night?'#345c58':'#7f9f80'}"/><path d="m-20 449 83-44 48 66 41-115 66 77 53-32 38 58 82-145 81 109v251H-20Z" fill="${night?'#234b43':'#527f67'}"/>
 <path d="M0 448q92 15 147-10t142 13 177-20v23q-112 31-178 8t-137-11T0 463Z" fill="#d4e5cd" opacity=".2"/>
 <path d="M260 398q-16 69-40 121t12 67q57 58-8 95t-11 104l74 115H92q105-96 51-160t49-122q64-42-2-72t39-148Z" fill="url(#water-${theme})"/>
 ${map?`<path d="M259 390q-3 62-29 103" stroke="#e7f5d8" stroke-width="9" fill="none" opacity=".65"/><path d="M99 683q75-61 120-55t92-114" fill="none" stroke="#ece3b2" stroke-width="4" stroke-dasharray="3 9" opacity=".6"/>`:pavilion()}
 ${trees(35,375,1.1)}${trees(432,382,1.4)}${trees(1,560,1.8)}${trees(469,605,1.5)}${map?trees(121,532,.7):''}
 ${night?'<path d="M-20 698Q209 623 481 683V900H-20Z" fill="#304b43"/><path d="M0 745Q195 662 460 731M-2 799Q214 713 460 774M0 864Q204 782 460 838" fill="none" stroke="#8d9675" stroke-width="2" opacity=".4"/><path d="M25 654v-139m415 143V512" stroke="#293c32" stroke-width="9"/><path d="M6 532h39l-6 13H12ZM421 529h39l-7 13h-25Z" fill="#d5ad68"/><path d="M13 548h26v43H13Zm414-3h26v43h-26Z" fill="#e8bd6b" stroke="#a7834d" stroke-width="3"/><circle cx="25" cy="564" r="72" fill="url(#glow-night)"/><circle cx="440" cy="564" r="72" fill="url(#glow-night)"/>':'<path d="M-20 841q74-66 146-4t168-6 192 32v57H-20Z" fill="#4f7757"/>'}
 <g fill="#edcd86" opacity="${night?.8:.5}"><circle cx="52" cy="154" r="1.5"/><circle cx="191" cy="80" r="1"/><circle cx="276" cy="202" r="2"/><circle cx="68" cy="646" r="2.5"/><circle cx="395" cy="706" r="2"/><circle cx="325" cy="583" r="2"/><circle cx="132" cy="378" r="1.8"/></g>
 <path d="M0 0q42 53 106 52M460 0q-37 50-92 56" fill="none" stroke="#233e34" stroke-width="15"/><g fill="#526d49"><ellipse cx="36" cy="23" rx="23" ry="8" transform="rotate(20 36 23)"/><ellipse cx="75" cy="44" rx="21" ry="7" transform="rotate(-20 75 44)"/><ellipse cx="426" cy="24" rx="25" ry="8" transform="rotate(-15 426 24)"/><ellipse cx="387" cy="46" rx="22" ry="7" transform="rotate(14 387 46)"/></g></svg>`;
}
export const flourish=()=>`<span class="flourish" aria-hidden="true">✧ <i></i> ❀ <i></i> ✧</span>`;
