import {point, POINTS} from '../data.mjs';

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
      '<section class="visit-camera"><div class="camera-mark">⌖</div><h1>留下一枚足迹</h1><p>' +
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
  if (route.name === 'account') {
    return (
      '<h1>我的旅行手账</h1><p>' +
      esc(a.name) +
      ' · 本机演示身份</p><div class="card"><h2>' +
      a.events.length +
      ' 段经历</h2><p>' +
      a.owned.length +
      ' 件装扮 · ' +
      a.works.length +
      ' 张作品</p></div>' +
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
      '<h1>旅途收获</h1><section class="order-receipt"><small>黔山漫游 · 通用次数</small><div class="receipt-amount">' +
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
