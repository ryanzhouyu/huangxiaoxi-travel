import {asset, point, POINTS, POOLS, ACTIVITY} from '../data.mjs';

import {visitPhoto,companionNote} from './visual/pages.mjs';

const orderStatus = {
  pending: '待模拟支付',
  paid: '已到账',
  cancelled: '已取消',
  failed: '支付失败',
};

export function renderDetails({route, a, button, link, esc, fmt}) {
  const id = route.params.get('id');
  if (route.name === 'checkin') {
    const p = point(id);
    const code = route.params.get('code') || '';
    return (
      '<section class="visit-camera">' + (p ? visitPhoto(p.id) : '') + '<h1>留下一枚足迹</h1><p>' +
      esc(p?.name || '选择沿途地点') +
      '</p></section>' +
      '<section class="visit-paper"><h2>' +
      esc(p?.name || '地点核验') +
      '</h2><p>' +
      (p
        ? a.claimed.includes('point:' + p.id)
          ? '已收过首次奖励，再来仍可留足迹。'
          : '首次' +
            (p.kind === '商家' ? '到店' : '到访') +
            '可获 ' +
            p.reward +
            ' 次景区通用次数。'
        : '输入点位码，确认本次到访地点。') +
      '</p>' +
      '<label class="field">测试点位码或扫码链接<input id="checkin-code" autocomplete="off" placeholder="输入地点码" value="' +
      esc(code) +
      '"></label>' +
      button('验证并记录到访', 'verify-code', 'gold full') +
      (p
        ? button(
            '填入此地点的测试码',
            'test-code',
            'secondary full',
            'data-id="' + p.id + '"',
          )
        : '<details><summary>查看测试点位</summary>' +
          POINTS.map((x) =>
            link(x.name, 'checkin?id=' + x.id, 'secondary full'),
          ).join('') +
          '</details>') +
      '<p class="fine">此处核对测试码内容。定位及店员确认使用模拟结果。</p></section>'
    );
  }
  if (route.name === 'activity') {
    const claimed = a.claimed.includes('activity:' + ACTIVITY.id);
    return `<section class="craft-setting"><h1>${ACTIVITY.name}</h1></section><div class="craft-paper paper">
      ${companionNote('把今天做的小物，也记到我们的手账里。')}
      <p>${ACTIVITY.description}</p><section class="craft-line"><strong>完成手作体验</strong><b>+${ACTIVITY.reward} 次</b></section>
      <p class="fine">完成后请店员确认，每个账号首次完成可领。到店奖励独立记录。</p>
      ${claimed ? '<p class="notice">这项活动奖励已领取。</p>'+link('查看回忆','memories','full') : button('演示店员核验','staff','gold full')}
      ${link('查看山间手作铺','point?id=shop','text full')}<p class="fine">仅模拟体验核验。</p></div>`;
  }
  if (route.name === 'account') {
    return (
      '<section class="identity-card paper"><span class="ribbon">我的旅行手账</span><div class="identity-owner"><span class="cameo"></span><h1>' +
      esc(a.name) +
      '</h1></div><p>本机演示身份</p><div class="account-totals"><h2>' +
      a.events.length +
      ' 段经历</h2><p>' +
      a.owned.length +
      ' 件装扮 · ' +
      a.works.length +
      ' 张作品</p></div></section>' +
      link('查看次数与订单', 'wallet', 'secondary full') +
      button('切换演示身份', 'logout', 'text full')
    );
  }
  if (route.name === 'order') {
    const order = a.orders.find((o) => o.id === id);
    if (!order)
      return '<h1>未找到这笔订单</h1>' + link('返回收支手账', 'wallet', 'full');
    return (
      '<div class="order-receipt"><small>黔山漫游 · 模拟订单</small><h1>' +
      orderStatus[order.status] +
      '</h1><div class="receipt-amount">¥' +
      esc(order.price) +
      '</div><h2>' +
      order.count +
      ' 次景区通用次数</h2><p>' +
      fmt(order.at) +
      ' · ' +
      esc(order.id.slice(0, 8)) +
      '</p></div>' +
      (order.status === 'pending'
        ? button(
            '继续模拟支付',
            'resume-order',
            'gold full',
            'data-id="' + esc(id) + '"',
          )
        : '') +
      link('查看收支与订单', 'wallet', 'secondary full') +
      (order.sourcePool
        ? link('回到来源卡池', 'pool?id=' + order.sourcePool, 'text full')
        : '') +
      '<p class="fine">不产生真实扣款。购买次数不会解锁卡池。</p>'
    );
  }
  if (route.name === 'wallet') {
    return (
      '<section class="order-receipt wallet-ticket"><span class="ribbon">景区通用次数</span><div class="receipt-amount">' +
      a.balance +
      ' 次</div>' +
      button('模拟购买次数', 'purchase-wallet', 'secondary') +
      '</section><h2>收支记录</h2>' +
      (a.ledger
        .map(
          (l) =>
            '<div class="ledger"><span>' +
            esc(l.reason) +
            '<small>' +
            fmt(l.at) +
            '</small></span><b>' +
            (l.delta > 0 ? '+' : '') +
            l.delta +
            '</b></div>',
        )
        .join('') || '<p class="fine">有效到访后，在这里查看获得的次数。</p>') +
      '<h2>模拟订单</h2>' +
      (a.orders
        .map((o) =>
          link(
            o.count + ' 次 · ¥' + o.price + '　' + orderStatus[o.status],
            'order?id=' + o.id,
            'secondary full',
          ),
        )
        .join('') || '<p class="fine">还没有模拟订单。</p>')
    );
  }
  return null;
}

export function collectionExtras(outfit, account, shelf) {
  const related = POOLS.find((pool) => pool.outfits.includes(outfit.id));
  if (!related) return '';
  const extras = related.assets.filter((id) => asset(id).outfit !== outfit.id);
  const collected = related.assets.filter((id) =>
    account.owned.includes(id),
  ).length;
  return (
    '<section class="extra-collection"><h2>同池的表情、姿势与背景</h2>' +
    '<p>' +
    related.name +
    ' · 含服饰已收集 ' +
    collected +
    ' / ' +
    related.assets.length +
    '</p>' +
    shelf(extras) +
    '</section>'
  );
}
