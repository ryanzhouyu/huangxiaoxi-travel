import * as D from "./data.mjs";
import * as S from "./store.mjs?v=3.1";
import { flourish } from "./demo/symbols.mjs";

export function renderGamePage(F) {
  const { world, icon, stageFigure, itemArt } = F.art;
  const {
    route,
    a,
    ui,
    button: B,
    link: L,
    esc,
    fmt,
    dirty,
    ownedCount,
    assetCard,
    pointCard,
    poolCard,
    workCard,
    filteredByRange,
    rangeFields,
  } = F;
  const r = route.name,
    id = route.params.get("id"),
    p = D.point(id) || D.POINTS[0],
    pool = D.pool(id) || D.POOLS[0];
  const plaque = (text, sub = "") =>
    `<div class="title-plaque">${flourish()}<h1>${text}</h1>${sub ? `<p>${sub}</p>` : ""}</div>`;
  const assetShelf = (ids, action = "source") =>
    `<div class="asset-grid reward-shelf">${ids.map((x) => assetCard(D.asset(x), action)).join("")}</div>`;
  const pinPositions = F.art?.mapPins || {
    gate: [31, 70],
    ridge: [61, 28],
    brook: [67, 51],
    shop: [35, 45],
  };
  const atlas = () => {
    const points = D.POINTS.filter(
      (x) =>
        ui.filter === "全部" ||
        x.kind === ui.filter ||
        (ui.filter === "活动" && x.id === "shop"),
    );
    const pins = points
      .map((x) => {
        const visited = a.events.some((e) => e.pointId === x.id);
        const [px, py] = pinPositions[x.id];
        return `<button class="map-pin ${visited ? "visited" : ""} ${x.kind === "商家" ? "merchant" : ""}" style="--x:${px}%;--y:${py}%" data-action="go" data-target="${ui.filter === "活动" ? "activity" : "point?id=" + x.id}"><span class="pin-medal">${icon(visited ? "check" : x.kind === "商家" ? "shop" : "pin")}</span><span class="pin-label">${ui.filter === "活动" ? "一枚旅行手作" : x.name}<small>${visited ? "已留足迹" : `首次 +${x.reward} 次`}</small></span></button>`;
      })
      .join("");
    const background = world("map");
    return `<div class="atlas-map" aria-label="黔山漫游示意地图">${F.art?.mapPlane ? F.art.mapPlane(background, pins) : background + pins}<span class="map-caption">黔山漫游 · 示意导览</span></div>`;
  };
  const visitorPage = F.presentation?.pages[r];
  if (visitorPage) return visitorPage(F);
  switch (r) {
    case "scene":
      return `<div class="scenic-play">${atlas()}<div class="map-heading">${plaque("黔山漫游", "不赶路，慢慢收集沿途风景")}</div><div class="map-filter" role="group" aria-label="地点分类">${[
        ["全部", "map"],
        ["景点", "pin"],
        ["商家", "shop"],
        ["活动", "flower"],
      ]
        .map(([f, i]) =>
          B(
            `${icon(i)}<span>${f}</span>`,
            "filter",
            ui.filter === f ? "selected" : "",
            `data-value="${f}"`,
          ),
        )
        .join(
          "",
        )}</div><div class="map-gift">${B(`${icon("gift")}<span>黔山初见<small>${a.gifts.includes("demo") ? "已领取 · 试穿" : "免费见面礼"}</small></span>`, a.gifts.includes("demo") ? "try-gift" : "gift", "gift-medal")}</div><div class="map-bottom"><div class="footprint-counter">${icon("foot")}<span>已留足迹 <b>${new Set(a.events.map((e) => e.pointId)).size}</b> / 4</span>${B("地点一览", "map-list", "text")}</div><div class="map-pools">${D.POOLS.map((p) => L(`${F.presentation ? stageFigure(D.lookFor(p.outfits[0])) : icon("wardrobe")}<span>${p.name}<small>${S.eligible(a, p.id).length === 0 ? "已收齐" : a.unlocked.includes(p.id) ? "已解锁 · 去收集" : "到访后解锁"}</small></span>`, "pool?id=" + p.id, "pool-charm")).join("")}</div><small>点地点看故事与奖励 · 测试点位</small></div></div>`;
    case "pool": {
      const unlocked = a.unlocked.includes(pool.id),
        remaining = S.eligible(a, pool.id),
        collected = pool.assets.length - remaining.length;
      return `<div class="collection-pavilion" data-pool="${pool.id}"><div class="pool-ambience">${world("night")}</div><div class="pool-paper"><div class="pool-title">${plaque(pool.name, pool.subtitle)}<div class="pool-currency">${icon("ticket")}<strong>${a.balance}</strong>${L("明细", "wallet", "text")}</div></div><div class="outfit-showcase"><div class="showcase-ring"></div><div class="showcase-character">${stageFigure(D.lookFor(pool.outfits[0]))}</div><div class="showcase-note"><span>本期装扮</span><h2>${D.OUTFITS.find((o) => o.id === pool.outfits[0]).name}</h2><p>服装 · 表情 · 姿势 · 背景</p>${F.poolProgress?.(pool, collected) ?? `<div class="collection-count"><b>${collected}</b> / ${pool.assets.length}<small>已收集</small></div>`}${L("查看套装图鉴", "collection?id=" + pool.outfits[0], "text")}</div></div><h2 class="ribbon-heading">把喜欢的，一件件收进衣橱</h2>${F.presentation?.poolInventory(pool, collected, assetShelf) ?? assetShelf(pool.assets)}<p class="pool-rules">已拥有奖励跨池排除 · 剩余 ${remaining.length} 件等概率${remaining.length ? `，各约 ${(100 / remaining.length).toFixed(1)}%` : ""}</p>${remaining.length === 0 ? `<div class="collection-complete">${icon("check")}<h2>这一份风景，收齐啦。</h2><p>这个卡池已收齐，不再扣次。</p>${L("看看其他装扮", "scene", "secondary full")}</div>` : !unlocked ? `<div class="unlock-note"><h3>去过这里，才解锁这份相遇</h3><p>到访以下任意一处即可解锁。</p><div>${pool.points.map((x) => L(D.point(x).name, "point?id=" + x, "secondary")).join("")}</div></div>` : `<div class="gacha-dock">${B(`${icon("star")}<span>${a.balance ? "抽取一次" : "次数不足，去找找机会"}<small>${a.balance ? "消耗 1 次景区通用次数" : "打卡或完成活动获得次数"}</small></span>`, a.balance ? "draw" : "no-balance", "gacha-button", `data-id="${pool.id}"`)}</div>`}${'<div class="pool-exits">' + L("继续游玩", "scene", "secondary") + L("翻开旅行手账", "memories", "secondary") + "</div>"}</div></div>`;
    }
    case "wardrobe": {
      if (!ui.draft) ui.draft = structuredClone(a.look);
      ui.returnTo = route.params.get("from") || ui.returnTo || "partner";
      const catalog = ui.wardrobeTab === "catalog";
      return `<div class="dressroom" data-background="${esc(ui.draft.background)}">${world("night", ui.draft)}<div class="dressing-top"><div class="dressing-plaque">${icon(catalog ? "book" : "bag")}<h1>${catalog ? "旅行图鉴" : "旅行衣橱"}</h1></div><div class="segmented">${B("换装", "wardrobe-tab", !catalog ? "selected" : "", 'data-value="dress"')}${B("图鉴", "wardrobe-tab", catalog ? "selected" : "", 'data-value="catalog"')}</div></div>${
        catalog
          ? `<div class="catalog-album"><p>把走过的风景，收成喜欢的模样。</p><div class="catalog-grid">${D.OUTFITS.map((o) => `<button class="catalog-outfit" data-action="go" data-target="collection?id=${o.id}"><span class="catalog-figure">${stageFigure(D.lookFor(o.id))}</span><strong>${o.name}</strong><small>${o.source} · ${ownedCount(o.id)}/4 件</small><span class="collection-dots">${Array.from({ length: 4 }, (_, i) => `<i class="${i < ownedCount(o.id) ? "owned" : ""}"></i>`).join("")}</span></button>`).join("")}</div></div>`
          : `<div class="dressing-workspace"><div class="dressing-actor"><div class="dressing-platform"></div><div class="dressed-character">${stageFigure(ui.draft)}</div><div class="dressing-state">${dirty() ? "试穿中 · 尚未保存" : "当前已保存搭配"}</div><div class="dressing-tools">${B(`${icon("pose")} 动作`, "quick-category", ui.category === "pose" ? "selected" : "", 'data-value="pose"')}${B(`${icon("flower")} 表情`, "quick-category", ui.category === "expression" ? "selected" : "", 'data-value="expression"')}</div></div><div class="wardrobe-cabinet"><div class="cabinet-categories" role="group" aria-label="装扮分类">${Object.entries(
              D.SLOTS,
            )
              .map(([k, v]) =>
                B(
                  v,
                  "category",
                  ui.category === k ? "selected" : "",
                  `data-value="${k}"`,
                ),
              )
              .join(
                "",
              )}</div><div class="inventory-scroll"><div class="asset-grid">${D.ASSETS.filter(
              (x) => x.slot === ui.category && a.owned.includes(x.id),
            )
              .map((x) => assetCard(x, "equip", ui.draft[x.slot] === x.id))
              .join(
                "",
              )}</div></div><div class="chosen-item"><small>正在搭配 · ${D.SLOTS[ui.category]}</small><strong>${esc(D.asset(ui.draft[ui.category])?.name)}</strong><p>选择部件立即试穿，保存才会更新伙伴。</p></div></div></div><div class="dressing-save">${B(`${icon("check")} ${ui.returnTo ? "保存并返回" : "保存搭配"}`, "save-look", "gold")}${ui.returnTo ? B("取消并返回", "wardrobe-return", "text") : B("恢复原搭配", "restore-look", "text", dirty() ? "" : "disabled")}</div>`
      }</div>`;
    }
    case "collection": {
      const o = D.OUTFITS.find((x) => x.id === id) || D.OUTFITS[4],
        ids = D.ASSETS.filter((x) => x.outfit === o.id).map((x) => x.id),
        count = ownedCount(o.id);
      return `<div class="outfit-folio" data-outfit="${o.id}">${plaque(o.name, o.source)}<div class="folio-display"><div class="folio-sun"></div>${stageFigure(D.lookFor(o.id))}<div class="folio-stamp">${count === ids.length ? "收 齐" : "收 集 中"}<small>${count} / ${ids.length}</small></div></div>${F.presentation ? `<div class="folio-progress"><strong>${o.name}的四件套</strong><b>${count} / ${ids.length}</b><progress value="${count}" max="${ids.length}" aria-label="套装收集进度"></progress></div>` : ""}${assetShelf(ids)}${count === ids.length ? B("试穿这套搭配", "try-outfit", "gold full", `data-id="${o.id}"`) : '<p class="fine center">点未获得的部件，看看去哪儿能遇见它。</p>'}${F.collectionExtras?.(o, a, assetShelf) || ""}</div>`;
    }
    case "compose": {
      if (!a.events.length)
        return `<div class="journal-empty">${icon("camera")}<h1>等一段属于你的经历。</h1><p>先完成一次测试打卡，再把伙伴与足迹做成纪念。</p>${L("去打卡", "scene", "gold full")}</div>`;
      if (ui.selected === null) ui.selected = a.events.map((e) => e.id);
      const chosen = filteredByRange().filter((e) =>
        ui.selected.includes(e.id),
      );
      return `<div class="photo-studio">${plaque("回忆照相馆", "留下这一刻的你和黄晓西")}<div class="studio-preview compose-preview"><div class="photo-corners"></div>${ui.preview ? `<img src="${ui.preview}" alt="待保存的纪念图预览">` : F.draftMarkup ? F.draftMarkup : studioPreview(a.look, ui.title || "把黔山带回去", F.art, chosen.at(-1)?.pointId)}</div>${ui.preview && F.presentation ? F.presentation.composeSummary(chosen) : ""}${B(`${icon("wardrobe")} 给伙伴换一身`, "compose-dress", "secondary full")}<div class="studio-controls"><div class="two-actions">${B("单页纪念", "template", ui.template === "postcard" ? "selected secondary" : "secondary", 'data-value="postcard"')}${B("足迹长图", "template", ui.template === "trail" ? "selected secondary" : "secondary", 'data-value="trail"')}</div><label class="field">写在相片上的话<input id="work-title" maxlength="16" value="${esc(ui.title || "把黔山带回去")}" placeholder="最多 16 个字"></label>${rangeFields()}<fieldset class="event-picker"><legend>带上哪几段经历？ · ${chosen.length} 条</legend>${
        filteredByRange()
          .map(
            (e) =>
              `<label><input type="checkbox" data-event="${e.id}" ${ui.selected.includes(e.id) ? "checked" : ""}><span><strong>${e.name}</strong><small>${fmt(e.at)}</small></span></label>`,
          )
          .join("") || "<p>这段日期没有经历。</p>"
      }</fieldset></div><div class="sticky-action">${B(ui.preview ? "收进我的纪念册" : "生成纪念图预览", ui.preview ? "save-work" : "preview-work", "gold full", chosen.length ? "" : "disabled")}${ui.preview ? B("重新生成预览", "preview-work", "text full") : ""}</div></div>`;
    }
    default:
      return null;
  }
}

export function rewardPresentation(a, { itemArt }) {
  return `<div class="reward-reveal"><span class="reveal-kicker">旅 途 的 新 相 遇</span><div class="reveal-rays"></div><div class="reward-art">${itemArt(a)}</div><span class="reward-kind">${D.SLOTS[a.slot]}</span><h3>${a.name}</h3><span class="reward-spark s1">✧</span><span class="reward-spark s2">✧</span></div>`;
}
export function studioPreview(look, title, { world, stageFigure }, pointId) {
  const safe = String(title).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
  return `<div class="studio-scene">${world("map", look, pointId)}${stageFigure(look)}<span>${safe}</span></div>`;
}
