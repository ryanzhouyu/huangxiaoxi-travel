import {ACTIVITY, OUTFITS, point, pool} from '../../data.mjs';
import {eligible} from '../../store.mjs?v=3.1';

// The stage gets a read-only summary, never the archive, images or a transaction handle.
export function connectStage(read, navigate) {
  const origin = location.origin;
  let port,
    pending = false;
  function publish() {
    if (!port || pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      const {
        account: a,
        owner,
        route,
        pageTitle,
        modal,
        dirty,
        busy,
        error,
        preview,
        selected,
      } = read();
      const id = route.params.get('id');
      const object = ['checkin', 'point'].includes(route.name)
        ? point(id)?.name
        : route.name === 'pool'
          ? pool(id)?.name
          : route.name === 'activity'
            ? ACTIVITY.name
            : route.name === 'work'
              ? a?.works.find((w) => w.id === id)?.title
              : route.name === 'collection'
                ? OUTFITS.find((o) => o.id === id)?.name
                : '';
      port.postMessage({
        page: route.name,
        pointId: ['point', 'checkin'].includes(route.name) ? id : null,
        poolId: route.name === 'pool' ? id : null,
        remaining: route.name === 'pool' && a ? eligible(a, id).length : null,
        route: route.name + (route.params.size ? '?' + route.params : ''),
        title: [pageTitle, object].filter(Boolean).join(' · '),
        modal,
        dirty,
        busy,
        error,
        preview,
        selected,
        owner,
        initialized: !!a?.initialized,
        gift: !!a?.gifts.includes('demo'),
        balance: a?.balance ?? 0,
        visits: [...new Set(a?.events.map((e) => e.pointId))],
        claimed: a?.claimed || [],
        events: a?.events.length || 0,
        pools: a?.unlocked || [],
        draws: a?.draws.length || 0,
        drawnPools: [...new Set(a?.draws.map((d) => d.poolId))],
        works: a?.works.length || 0,
        ledger: a?.ledger[0]
          ? {reason: a.ledger[0].reason, delta: a.ledger[0].delta}
          : null,
      });
    });
  }
  window.addEventListener('message', (e) => {
    if (
      e.origin !== origin ||
      e.source !== parent ||
      e.data !== 'hxx.stage.connect' ||
      !e.ports[0]
    )
      return;
    port?.close();
    port = e.ports[0];
    port.onmessage = ({data}) => {
      const {error, busy, modal} = read();
      if (error || busy || modal || !data) return publish();
      const p = point(data.id);
      const target =
        data.action === 'activity'
          ? 'activity'
          : !p
            ? null
            : data.action === 'point'
              ? 'point?id=' + p.id
              : data.action === 'scan'
                ? 'checkin?' + new URLSearchParams({id: p.id, code: p.code})
                : null;
      if (target) navigate(target); // The normal account, initialization and unsaved-look guards apply.
      publish();
    };
    publish();
  });
  parent.postMessage('hxx.stage.ready', origin);
  return publish;
}
