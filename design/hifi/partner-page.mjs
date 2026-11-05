import {figure} from './art.mjs';
import {partnerIcon} from './partner-art.mjs';

/** 仅组织伙伴首页展示；data-go / data-action 仍由原阅览交互处理。 */
export function renderPartnerPage(state, {go}) {
  const firstVisit = state === 'first-visit';
  const balance = firstVisit ? 0 : 3;
  const shortcuts = [
    ['wardrobe', '衣橱', 'wardrobe'],
    ['collection', '图鉴', 'catalog'],
    ['checkin', '打卡', 'camera'],
  ];
  const navigation = [
    ['partner', '伙伴', `<span class="home-cameo">${figure()}</span>`],
    ['explore', '游玩', partnerIcon('map')],
    ['memories', '回忆', partnerIcon('memories')],
  ];

  return `<div class="night-screen partner-scene">
    <div class="home-top">
      ${go(`<span class="mini-avatar">${figure()}</span><span class="home-identity-copy"><b>我的黄晓西</b><small>陪你收集贵州的风景</small></span>`, 'account', 'identity-pill')}
      ${go(`${partnerIcon('ticket')}<b>${balance}</b><span class="home-counter-plus">+</span>`, 'wallet', 'counter', `aria-label="景区通用次数 ${balance}，查看次数与订单"`)}
    </div>
    <div class="place-ribbon"><span class="home-place-mark" aria-hidden="true"></span>黔山漫游 · 灯火初上</div>
    <div class="side-tools">
      ${shortcuts.map(([target, label, art]) => go(`${partnerIcon(art)}<span>${label}</span>`, target, 'tool-medal')).join('')}
    </div>
    <button class="character-touch" data-action="talk" aria-label="和黄晓西互动">${figure()}</button>
    <div class="floating-petals"><i></i><i></i><i></i></div>
    <section class="speech-paper" aria-label="伙伴的话">
      <span class="speaker"><i aria-hidden="true"></i>黄晓西</span>
      <p id="companion-line">${firstVisit ? '听说山里藏着一份见面礼，我们去看看？' : '今天的山风，好像也想和我们一起旅行。'}</p>
      ${go(firstVisit ? '去看看免费见面礼<span aria-hidden="true">→</span>' : '再去收集一点风景<span aria-hidden="true">→</span>', 'scene', 'text-button')}
    </section>
    <nav class="game-nav" aria-label="游玩导航">
      ${navigation.map(([target, label, art]) => go(`${art}<span>${label}</span>`, target, target === 'partner' ? 'selected' : '', target === 'partner' ? 'aria-current="page"' : '')).join('')}
    </nav>
  </div>`;
}
