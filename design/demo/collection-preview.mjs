import {ASSETS, OUTFITS, SLOTS, lookFor} from '../data.mjs';
import {itemArt, stageFigure} from './renderer.mjs';

export function giftPreview(outfitId) {
  const outfit = OUTFITS.find((entry) => entry.id === outfitId);
  const pieces = ASSETS.filter((entry) => entry.outfit === outfitId);
  return `<section class="gift-preview" aria-label="${outfit.name}套装预览">
    <div class="gift-portrait" role="img" aria-label="黄晓西穿着${outfit.name}的整套示例">
      ${stageFigure(lookFor(outfitId))}
    </div>
    <div class="gift-inventory">
      <h3>${outfit.name}</h3>
      <p>全套 ${pieces.length} 件</p>
      <ul aria-label="已收入衣橱的部件">
        ${pieces.map((piece) => `<li>${itemArt(piece)}<span>${SLOTS[piece.slot]}</span></li>`).join('')}
      </ul>
    </div>
  </section><p class="gift-fitting-note">试穿并保存后，伙伴就会换上这身装扮。</p>`;
}

export function poolProgress(pool, collected) {
  const total = pool.assets.length;
  return `<div class="pool-progress">
    <div class="pool-progress-label"><span>本池收集</span><strong>${collected} / ${total}</strong></div>
    <progress aria-label="${pool.name}奖品收集进度" aria-valuetext="已收集 ${collected} 件，共 ${total} 件" value="${collected}" max="${total}"></progress>
  </div>`;
}
