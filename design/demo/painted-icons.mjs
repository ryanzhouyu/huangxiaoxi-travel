/** 全稿共用的道具插画；沿用首页材质，辅助方向符号另由 art.mjs 绘制。 */
let artworkInstance = 0;
export function partnerIcon(name) {
  const id = `painted-${name}-${++artworkInstance}`;
  const shapes = {
    shield: `
      <path d="m32 5 23 9v18c-2 13-13 22-23 27C22 54 11 45 9 32V14Z" fill="url(#${id}-gold)" stroke="#987344" stroke-width="1.3"/>
      <path d="m32 11 17 7v14c-2 9-9 17-17 21-8-4-15-12-17-21V18Z" fill="url(#${id}-green)"/>
      <path d="m21 31 7 8 16-17" stroke="#fff0c8" stroke-width="5" fill="none"/>
      <path d="m17 18 15-6 15 6" stroke="#eed9a8" stroke-width="1.3" fill="none"/>`,
    phone: `
      <rect x="16" y="4" width="32" height="56" rx="8" fill="url(#${id}-gold)" stroke="#9c794b" stroke-width="1.4"/>
      <rect x="20" y="10" width="24" height="40" rx="3" fill="url(#${id}-green)"/>
      <path d="m23 35 7-8 6 5 5-6v20H23Z" fill="#ced2ad"/>
      <circle cx="32" cy="55" r="2.5" fill="#fff2d2"/><path d="M28 7h8" stroke="#fff2d2" stroke-width="1.5"/>
      <circle cx="37" cy="20" r="4" fill="#f5d7a0"/>`,
    chat: `
      <path d="M35 17c13 0 23 8 23 18 0 5-3 10-7 13l2 10-11-6h-7c-13 0-23-8-23-17s10-18 23-18Z" fill="url(#${id}-gold)" stroke="#ac8851"/>
      <path d="M28 5C13 5 4 14 4 25c0 6 4 12 9 15l-2 11 13-7h5c15 0 25-9 25-19S43 5 28 5Z" fill="url(#${id}-green)" stroke="#617354" stroke-width="1.2"/>
      <ellipse cx="21" cy="24" rx="2.5" ry="3" fill="#fff2d3"/><ellipse cx="37" cy="24" rx="2.5" ry="3" fill="#fff2d3"/>
      <path d="M14 14c7-6 17-6 23-4" stroke="#d5dabb" stroke-width="1.5" fill="none"/>`,
    gift: `
      <path d="M11 24h42v33H11Z" fill="url(#${id}-rose)" stroke="#9c5941" stroke-width="1.3"/>
      <rect x="7" y="18" width="50" height="13" rx="3" fill="url(#${id}-gold)" stroke="#a8824e"/>
      <path d="M28 19h8v38h-8Z" fill="#eed8a9"/>
      <path d="M32 19C8 19 14-4 26 6c5 4 6 13 6 13Zm0 0C56 19 50-4 38 6c-5 4-6 13-6 13Z" fill="url(#${id}-gold)" stroke="#a68149"/>
      <path d="m28 10 4 9 5-9M15 35v16" stroke="#f7c3a1" stroke-width="1.5" fill="none"/>`,
    pin: `
      <path d="M32 4C18 4 9 14 9 26c0 15 23 34 23 34s23-19 23-34C55 14 46 4 32 4Z" fill="url(#${id}-gold)" stroke="#9d7849" stroke-width="1.4"/>
      <path d="M32 9c-11 0-18 8-18 17 0 10 12 23 18 28 6-5 18-18 18-28 0-9-7-17-18-17Z" fill="url(#${id}-green)"/>
      <circle cx="32" cy="26" r="9" fill="#fff0ca"/><circle cx="32" cy="26" r="5" fill="#b5ba91"/>`,
    flower: `
      <path d="M31 56c-2-14 0-27 7-37M30 49C12 51 6 39 8 34c12-1 20 4 22 15Zm5-8c17 1 22-11 20-17-12 0-19 6-20 17Z" fill="url(#${id}-green)" stroke="#69805b"/>
      <g fill="url(#${id}-paper)" stroke="#bfa16a" stroke-width="1"><ellipse cx="29" cy="21" rx="8" ry="15"/><ellipse cx="29" cy="21" rx="8" ry="15" transform="rotate(60 29 21)"/><ellipse cx="29" cy="21" rx="8" ry="15" transform="rotate(120 29 21)"/></g>
      <circle cx="29" cy="21" r="7" fill="url(#${id}-gold)"/><circle cx="29" cy="21" r="3" fill="#f9e4b4"/>`,
    lock: `
      <path d="M19 27V18a13 13 0 0 1 26 0v9" stroke="url(#${id}-gold)" stroke-width="8" fill="none"/>
      <rect x="10" y="25" width="44" height="34" rx="8" fill="url(#${id}-green)" stroke="#586f50" stroke-width="1.4"/>
      <rect x="15" y="30" width="34" height="24" rx="5" fill="none" stroke="#d3d1a2"/>
      <circle cx="32" cy="39" r="5" fill="#f5dfac"/><path d="m30 42-2 7h8l-2-7" fill="#f5dfac"/>`,
    shop: `
      <path d="M10 27h44v32H10Z" fill="url(#${id}-paper)" stroke="#a78553"/>
      <path d="M6 20 13 7h38l7 13v9H6Z" fill="url(#${id}-green)" stroke="#61764f"/>
      <path d="m17 7-3 13v9h9v-9l1-13m16 0 1 13v9h9v-9L47 7" fill="#f5e6bf"/>
      <path d="M9 29c4 3 8 3 11 0 4 3 8 3 12 0 4 3 8 3 12 0 4 3 8 3 11 0" stroke="#9d824f" fill="none"/>
      <rect x="17" y="36" width="12" height="23" rx="2" fill="#9b7150"/><rect x="35" y="36" width="12" height="12" rx="2" fill="#adc0a3" stroke="#bc9d63"/><circle cx="25" cy="48" r="1.5" fill="#f6dc9e"/>`,
    check: `
      <circle cx="32" cy="32" r="27" fill="url(#${id}-gold)" stroke="#a8844f"/>
      <circle cx="32" cy="32" r="22" fill="url(#${id}-green)"/>
      <path d="m19 32 9 9 18-21" stroke="#fff1cb" stroke-width="6" fill="none"/>`,
    download: `
      <path d="M9 22h46v36H9Z" fill="url(#${id}-gold)" stroke="#a17d48" stroke-width="1.4"/>
      <path d="m14 32 7 10h22l7-10v20H14Z" fill="url(#${id}-green)"/>
      <path d="M26 5h12v19h10L32 41 16 24h10Z" fill="url(#${id}-green)" stroke="#61714e" stroke-width="1.2"/>
      <path d="M29 9v17h-5" stroke="#dce0be" stroke-width="2" fill="none"/>`,
    wardrobe: `
      <path d="M29 13c0-6 8-7 9-2 1 4-6 5-6 8" fill="none" stroke="url(#${id}-gold)" stroke-width="3" stroke-linecap="round"/>
      <path d="m32 18 23 12H9Z" fill="#e9c889" stroke="#997343" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="m23 24 9 5 9-5 15 11-8 10-7-5 3 17H20l3-17-7 5-8-10Z" fill="url(#${id}-rose)" stroke="#884837" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="m24 25 8 6 8-6-4 15h-8Z" fill="#f6dfb7"/>
      <path d="m32 32-4 8 4 14 4-14Z" fill="#b78e54"/>
      <path d="M23 43c5 4 13 4 18 0M22 48c7 4 14 4 20 0" fill="none" stroke="#e4bd81" stroke-width="1.7"/>
      <path d="m16 32-4 4 5 5M48 32l4 4-5 5M24 55h16" fill="none" stroke="#f2d6a2" stroke-width="2"/>
      <path d="m25 34-3 6m17-6 3 6" stroke="#eeaa8d" stroke-width="1.5"/>`,
    catalog: `
      <path d="m15 10 33-3 5 44-35 6-7-5Z" fill="#644c37"/>
      <path d="m17 12 30-3 3 40-31 5Z" fill="#fff0ce"/>
      <path d="m12 9 33-3c3 0 5 2 5 5v39l-34 6c-5 1-8-1-8-5V16c0-4 1-6 4-7Z" fill="url(#${id}-green)" stroke="#546443" stroke-width="1.4"/>
      <path d="M16 9v42" stroke="#b8ae76" stroke-width="2"/>
      <path d="m21 15 22-3v31l-22 4Z" fill="none" stroke="#d9c58e" stroke-width="1"/>
      <path d="m21 15 5-1-5 6m17-8 5 6v-6M21 47l5-1-5-5m17 3 5-6v5" fill="#e7ce94"/>
      <path d="M32 22c-9-6-15 9-3 10-4 11 12 14 10 2 11-4 2-18-7-12Z" fill="url(#${id}-gold)"/>
      <circle cx="32" cy="30" r="4" fill="#efe3b4"/>
      <path d="m26 50 1 12 5-4 5 3-1-13" fill="#b96e54"/>
      <path d="m17 56 29-5" stroke="#ead7ae" stroke-width="1.3"/>`,
    camera: `
      <path d="M19 18 24 9h16l6 9" fill="url(#${id}-green)" stroke="#5b674c" stroke-width="1.4"/>
      <rect x="7" y="18" width="50" height="36" rx="9" fill="url(#${id}-gold)" stroke="#987749" stroke-width="1.4"/>
      <path d="M8 29h48v14H8Z" fill="url(#${id}-green)"/>
      <path d="M14 21h36" stroke="#fff1ca" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="36" r="15" fill="#f5deb0" stroke="#a7814e" stroke-width="1.5"/>
      <circle cx="32" cy="36" r="11" fill="#617365" stroke="#c6ae78" stroke-width="2"/>
      <circle cx="32" cy="36" r="7.5" fill="url(#${id}-glass)"/>
      <path d="M28 32a6 6 0 0 1 6-2" fill="none" stroke="#d4e5d0" stroke-width="2" stroke-linecap="round"/>
      <rect x="46" y="22" width="7" height="5" rx="1.5" fill="#fff1d0"/>
      <rect x="12" y="13" width="9" height="5" rx="2" fill="#aa8050"/>
      <circle cx="14" cy="47" r="2" fill="#f8eac4"/>`,
    map: `
      <path d="m6 14 17-6 18 6 17-6-3 43-17 6-17-6-17 6Z" fill="url(#${id}-paper)" stroke="#a58652" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="m23 8-2 43 17 6 3-43Z" fill="#cdd2a9"/>
      <path d="m10 34 9-12 8 9 9-12 13 15 5-5-1 12-15 6-16-5-13 5Z" fill="#90a181"/>
      <path d="m19 22 3 5-6 1m20-9 4 6-7 2" fill="#f8edcd"/>
      <path d="m12 47 7-10 10 4 10-9 12-5" fill="none" stroke="#b18b50" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>
      <path d="M49 7c-7 0-11 6-9 12 1 4 9 11 9 11s8-7 9-11C60 13 56 7 49 7Z" fill="url(#${id}-rose)" stroke="#9c5940" stroke-width="1.3"/>
      <circle cx="49" cy="16" r="3.5" fill="#ffe5b6"/>
      <path d="m23 12-2 35m20-28-2 33" stroke="#a8ae85" stroke-width="1"/>`,
    memories: `
      <path d="m13 8 37 3 4 43-37 3-7-5Z" fill="#835e3f"/>
      <path d="m17 8 31 3 3 40-32 3Z" fill="#fff1d0"/>
      <path d="m12 7 35 3 4 43-35 4c-4 0-6-2-6-5L8 13c0-4 1-5 4-6Z" fill="url(#${id}-gold)" stroke="#9f7747" stroke-width="1.3"/>
      <path d="m15 11 3 40m3-38 21 2 2 30-22 3Z" fill="none" stroke="#f8e5b9" stroke-width="1.1"/>
      <path d="m25 10 1 16 5-4 5 4-1-15" fill="#849277"/>
      <g transform="rotate(-12 38 39)"><rect x="24" y="24" width="31" height="33" rx="2" fill="#fff6dc" stroke="#bea276" stroke-width="1"/><path d="M28 28h23v18H28Z" fill="#bcc8ad"/><path d="m28 42 8-9 7 7 8-4v10H28Z" fill="#788e72"/><circle cx="45" cy="32" r="3" fill="#f6db9f"/><path d="M31 51h15" stroke="#baa17a" stroke-width="1.4"/></g>
      <path d="M10 18h7m-6 10h7m-6 10h7" stroke="#866641" stroke-width="2" stroke-linecap="round"/>`,
    ticket: `
      <path d="M8 14h48v12c-9 0-9 12 0 12v12H8V38c9 0 9-12 0-12Z" fill="url(#${id}-gold)" stroke="#a4824f" stroke-width="1.5"/>
      <path d="M14 19h36v7c-6 3-6 9 0 12v7H14v-7c6-3 6-9 0-12Z" fill="url(#${id}-paper)" stroke="#b89b64"/>
      <path d="m30 23 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#8b9a73"/>
      <path d="M43 20v24" stroke="#bd9e63" stroke-width="1.2" stroke-dasharray="2 3"/>`,
  };
  return `<svg class="partner-art" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-gold" x1="14" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#f6e3b5"/><stop offset=".48" stop-color="#d3ad70"/><stop offset="1" stop-color="#b58a50"/></linearGradient>
      <linearGradient id="${id}-paper" x1="16" y1="12" x2="47" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#fff4d8"/><stop offset="1" stop-color="#e6cd9a"/></linearGradient>
      <linearGradient id="${id}-green" x1="14" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#b6c09a"/><stop offset=".5" stop-color="#839473"/><stop offset="1" stop-color="#52684e"/></linearGradient>
      <linearGradient id="${id}-rose" x1="17" y1="22" x2="46" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#d79879"/><stop offset=".5" stop-color="#b95e49"/><stop offset="1" stop-color="#873c35"/></linearGradient>
      <radialGradient id="${id}-glass" cx=".35" cy=".3" r=".8"><stop stop-color="#9ab6ad"/><stop offset=".5" stop-color="#42695f"/><stop offset="1" stop-color="#263e36"/></radialGradient>
    </defs>
    <g stroke-linecap="round" stroke-linejoin="round">${shapes[name] || shapes.memories}</g>
  </svg>`;
}
