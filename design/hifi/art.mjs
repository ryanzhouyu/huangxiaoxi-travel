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
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.flower}</svg>`;
export const floral=()=>`<svg viewBox="0 0 80 80" class="floral" aria-hidden="true"><path d="M4 74C22 40 36 26 74 7M7 56C4 28 24 37 25 40M31 31c0-29 22-16 17-8M46 18C49 0 66 3 65 10" fill="none" stroke="#8c8d53" stroke-width="3"/><g fill="#f3e7c5" stroke="#bd9457" stroke-width="1"><ellipse cx="24" cy="49" rx="7" ry="14"/><ellipse cx="24" cy="49" rx="7" ry="14" transform="rotate(60 24 49)"/><ellipse cx="24" cy="49" rx="7" ry="14" transform="rotate(120 24 49)"/><circle cx="24" cy="49" r="5" fill="#d2a755"/><ellipse cx="55" cy="19" rx="5" ry="10"/><ellipse cx="55" cy="19" rx="5" ry="10" transform="rotate(60 55 19)"/><ellipse cx="55" cy="19" rx="5" ry="10" transform="rotate(120 55 19)"/><circle cx="55" cy="19" r="3.5" fill="#d2a755"/></g><path d="M6 65c-6-18 17-17 10-3m22-36c-10-18 13-24 9-9" fill="#75805a" stroke="#626c48"/></svg>`;
export const ornament=()=>`<span class="ornament left">${floral()}</span><span class="ornament right">${floral()}</span>`;
export const figure=(cls='')=>`<img class="figure ${cls}" src="assets/companion.png" alt="黄晓西伙伴形象设计示意">`;
export function item(type='top',color='#ae4232'){
  const cells={hair:[0,0],top:[1,0],bottom:[2,0],shoes:[0,1],hat:[1,1],pin:[2,1],background:[0,2],expression:[1,2],pose:[2,2]};
  if(arguments.length===1&&cells[type]){
    const [col,row]=cells[type];
    return `<span class="item-art atlas-item" style="--col:${col};--row:${row}" aria-hidden="true"></span>`;
  }
  const body={
    hair:'<path d="M15 31c-7-28 56-35 51 0l-8-13c-8 12-18 15-34 9l-9 4Z" fill="#352a29"/><path d="M14 30 20 14l8 8 12-17 12 17 10-8 5 17-5 11H19Z" fill="url(#metal)"/><path d="M18 28h46M22 37h37" stroke="#fff4d6"/><g fill="#ded6c6"><circle cx="25" cy="26" r="5"/><circle cx="40" cy="22" r="6"/><circle cx="55" cy="26" r="5"/></g><path d="M21 41v17m9-16v12m22-12v12m9-13v17" stroke="#aaa28d" stroke-width="2"/>',
    top:`<path d="m26 15-16 12 6 17 12-5v25h27V39l12 5 6-17-17-12-15 7Z" fill="${color}" stroke="#723b2b"/><path d="m27 17 14 13 15-13M40 30v32M19 37l-4-8m47 8 5-9" fill="none" stroke="#e4bd6b" stroke-width="2"/><path d="M29 32c6 18 18 18 24 0M29 35c6 23 18 23 24 0" fill="none" stroke="#d9d7cb" stroke-width="3"/><g fill="#e9cf89"><circle cx="24" cy="27" r="2"/><circle cx="58" cy="27" r="2"/><circle cx="33" cy="54" r="2"/><circle cx="49" cy="54" r="2"/></g>`,
    bottom:`<path d="M25 17h31l14 45c-17 9-40 9-57 0Z" fill="#383737" stroke="#222"/><path d="M26 25h28M19 55h45M16 62h51" stroke="${color}" stroke-width="5"/><path d="m31 27-5 28m13-28v28m8-28 7 28" stroke="#ba865a" stroke-width="3"/><g fill="#dba84b"><circle cx="29" cy="40" r="3"/><circle cx="40" cy="44" r="3"/><circle cx="50" cy="39" r="3"/></g>`,
    shoes:`<path d="m18 29 16 3-2 19c13 4 12 15 0 15H11C2 61 13 44 18 29Zm30 0 16 3-2 19c13 4 12 15 0 15H41c-9-5 2-22 7-37Z" fill="${color}" stroke="#7c4330"/><path d="M14 55h18m13 0h17M18 34l14 4m16-4 14 4" stroke="#dec680" stroke-width="3"/>`,
    expression:'<circle cx="40" cy="39" r="25" fill="#e8c498" stroke="#b18d5b"/><path d="M25 35q6-8 12 0m9 0q6-8 12 0M31 49q10 11 20 0" stroke="#6c4933" fill="none" stroke-width="3"/>',
    pose:'<circle cx="38" cy="15" r="8" fill="#c3ac7e"/><path d="M38 27v26m0-20 19-13 6-14M38 34 20 46m18 7L25 71m13-18 17 17" stroke="#a88148" fill="none" stroke-width="8" stroke-linecap="round"/>',
    background:'<path d="m7 57 23-38 13 22 12-26 20 43Z" fill="#718a71"/><path d="m12 60 22-20 20 21 19-15v21H12Z" fill="#a5ad80"/><circle cx="62" cy="15" r="8" fill="#d7b669"/>',
  };
  return `<svg class="item-art" viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="metal" x2=".7" y2="1"><stop stop-color="#fff5dd"/><stop offset=".5" stop-color="#a29b8d"/><stop offset="1" stop-color="#e6dfcf"/></linearGradient></defs>${body[type]||body.top}</svg>`;
}
