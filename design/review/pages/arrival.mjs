import {catalog} from '../review-service.mjs';
import {h, href, link, button, bar, section, header, note, icon, stageFigure, itemArt, status, pressed, mask, day, time, empty, world} from '../ui.mjs';

const art = id => stageFigure(catalog.lookFor(id));

export function entry({ui, params}) {
  const byCode = params.get('resume') === '1' && ui.challenge;
  return `<section class="arrival scene">
    <header class="arrival-heading"><span>黔山同行</span><h1>黄晓西</h1><p>山门见，一起走吧。</p></header>
    <div class="arrival-doll">${art('gift')}</div>
    ${section(`<p class="stamp">评审原型</p>
      ${header('用手机号进入', '使用评审用号码。本原型不会发送短信。')}
      ${byCode ? link('返回验证码', href('code')) : ''}
      <form data-submit="sendCode" class="form-stack">
        <label class="field">手机号<input name="phone" inputmode="numeric" autocomplete="tel-national" maxlength="11" value="${h(ui.phone)}" data-model="phone" required></label>
        ${status(ui.error, 'error')}
        <label class="consent"><input type="checkbox" name="consent" data-model="consent"${ui.consent ? ' checked' : ''}>我同意本机评审说明</label>
        ${button('查看评审说明', 'terms', {classes: 'text compact'})}
        <button class="button primary" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '正在获取…' : '获取验证码'}</button>
      </form>`, 'arrival-paper')}
  </section>`;
}

export function code({ui}) {
  return `${bar('确认验证码', href('entry', {resume: 1}), button('更正号码', 'changeNumber', {classes: 'text compact'}))}
    <div class="stack">
    ${section(`${header('输入评审验证码', '号码 ' + mask(ui.challenge.number))}
      <form class="form-stack" data-submit="verifyCode">
        <label class="field">验证码<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
        ${status(ui.error, 'error')}
        <button class="button primary" type="submit" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '正在恢复手账…' : '验证并进入'}</button>
        ${button('重新获取', 'resend', {classes: 'text', attrs: 'data-resend'})}
      </form>`, 'signal-paper')}
    </div>`;
}

export function onboarding({ui}) {
  return `<section class="onboarding scene">
    <div class="stage-top"><div><span class="scene-kicker">初次相遇</span><h1>挑一身出发装</h1></div>${button('退出', 'logoutAsk', {classes: 'light-chip'})}</div>
    <div class="welcome-doll">${art(ui.starter)}</div>
    ${section(`<div class="starter-rack">${catalog.starters.map(outfit => {
      const top = catalog.assets.find(item => item.id === outfit.id + '-top');
      return button(`${itemArt(top)}<strong>${outfit.name}</strong>`, 'starter', {value: outfit.id, classes: 'starter', attrs: pressed(ui.starter === outfit.id)});
    }).join('')}</div>
    ${note('三套初始装扮都免费拥有，选中的一套会先穿在身上。')}
    ${status(ui.error, 'error')}
    ${button('就这一身，一起出发', 'initialize', {disabled: ui.busy})}`, 'meeting-paper')}
  </section>`;
}

export function partner({p, ui}) {
  const words = p.events.length
    ? ['刚才走过的地方，我都记住啦。', '要换一身再出门吗？', '有空一起翻翻手账吧。']
    : ['桥上的灯亮了，陪我走走吧。', '你也看见那盏小灯啦。', '听说山里有家手作铺。'];
  const tools = [
    ['bag', '衣橱', href('wardrobe', {from: '#partner'})],
    ['book', '图鉴', href('collection', {from: '#partner'})],
    ['camera', '打卡', href('checkin', {from: '#partner'})],
  ];
  return `<section class="partner-scene scene">
    ${world('night', p.look)}
    <header class="partner-head">
      ${link(`${icon('partner')}<span><strong>黄晓西</strong><small>旅行伙伴</small></span>`, href('account', {from: '#partner'}), 'identity light-chip')}
      ${link(`${icon('ticket')}<span>${p.balance} 次</span>`, href('wallet', {from: '#partner'}), 'light-chip balance-chip')}
    </header>
    ${link('黔山漫游 ›', href('scene', {from: '#partner'}), 'location-chip')}
    ${button(stageFigure(ui.greet ? {...p.look, pose: p.owned.includes('wave') ? 'wave' : p.look.pose} : p.look), 'greet', {classes: 'companion-doll' + (ui.greet ? ' responding' : ''), attrs: 'aria-label="和黄晓西打招呼"'})}
    <aside class="satchel" aria-label="随身道具">${tools.map(([symbol, label, to]) => link(icon(symbol) + `<span>${label}</span>`, to, 'tool')).join('')}
      ${button(icon('pose') + '<span>动作</span>', 'openPoses', {classes: 'tool'})}
    </aside>
    ${!p.gifts.includes('demo') ? link(icon('gift') + '初见礼', href('gift', {from: '#partner'}), 'gift-shortcut light-chip') : ''}
    ${button(`${icon('partner')}<span><strong>黄晓西</strong><span>${words[ui.line % words.length]}</span></span><span aria-hidden="true">›</span>`, 'greet', {classes: 'speech', attrs: 'aria-live="polite"'})}
  </section>`;
}

export function account({p, back}) {
  return `${bar('我的旅行身份', back)}<div class="stack desk-scene">
    ${section(`<div class="identity-card">${icon('partner')}<div><span class="stamp">本机评审身份</span><h2>${h(p.name)}</h2><p class="muted">${mask('1000000000' + p.id.at(-1))}</p></div></div>
    ${note('当前手账保存在本浏览器。重新进入同一评审身份可查看记录。')}`)}
    ${section(`${link(icon('ticket') + '次数与收支', href('wallet', {from: '#account'}))}`)}
    ${button('退出当前手账', 'logoutAsk', {classes: 'button secondary'})}
  </div>`;
}

export function wallet({p, back, here}) {
  return `${bar('次数与收支', back)}<div class="stack desk-scene">
    ${section(`<div class="ticket-total">${icon('ticket')}<span>黔山漫游通用次数</span><strong>${p.balance}</strong></div>`, 'ticket-paper')}
    ${p.ledger.length ? section(header('收支记录') + p.ledger.map(row =>
      button(`<span><strong>${h(row.reason)}</strong><small>${day(row.at)} · ${time(row.at)}</small></span><b>${row.delta > 0 ? '+' : ''}${row.delta}</b>`, 'ledger', {value: row.id, classes: 'row ledger-row'})
    ).join('')) : empty('ticket', '暂时没有记录', '首次有效到访或完成可领奖的体验，可以获得免费次数。', link('查看免费机会', href('opportunities', {from: here})))}
  </div>`;
}
