// 只绘制作品；经历筛选、模板选择、保存与下载沿用原业务入口。
import {sceneStyle, journalPaper} from '../renderer.mjs';
import {point} from '../../data.mjs';
import {photoWindow} from '../map-art.mjs';

const hand = 'KaiTi, STKaiti, "Songti SC", SimSun, serif';
const colors = {
  paper: '#fff2d7',
  ink: '#4c352d',
  muted: '#705744',
  berry: '#9a4d41',
  gold: '#b58c58',
};
const time = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const day = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function photograph(c, look, id, box) {
  const scene = sceneStyle(look, id);
  const preferred = photoWindow(id, scene.name);
  const [left, top, width, height] = preferred ?? [
    0,
    0,
    scene.image.width,
    scene.image.height,
  ];
  const scale = Math.max(box.w / width, box.h / height);
  const sw = box.w / scale,
    sh = box.h / scale;
  c.drawImage(
    scene.image,
    left + (width - sw) / 2,
    top + (height - sh) * (preferred ? 0.45 : scene.position),
    sw,
    sh,
    box.x,
    box.y,
    box.w,
    box.h,
  );
  c.fillStyle = scene.wash;
  c.fillRect(box.x, box.y, box.w, box.h);
}

function stamp(c, x, y, when) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.11);
  c.strokeStyle = colors.berry;
  c.fillStyle = colors.berry;
  for (const radius of [40, 35]) {
    c.beginPath();
    c.arc(0, 0, radius, 0, Math.PI * 2);
    c.stroke();
  }
  c.textAlign = 'center';
  c.font = `23px ${hand}`;
  c.fillText('黔山', 0, -1);
  c.font = '15px Georgia, serif';
  c.fillText(when, 0, 20);
  c.restore();
}

function timeRow(c, event, y, x = 45, w = 580) {
  const at = new Date(event.at);
  c.fillStyle = colors.muted;
  c.font = '20px sans-serif';
  c.fillText(day.format(at).slice(5) + '  ' + time.format(at), x, y);
  c.fillStyle = colors.ink;
  c.font = `24px ${hand}`;
  c.fillText(event.name, x + 175, y, w - 175);
}

export function paintCard(paper, {look, events, template, title}, actor) {
  const trail = template === 'trail',
    count = trail ? events.length : Math.min(4, events.length);
  const w = 680;
  paper.width = w;
  paper.height = trail
    ? Math.max(950, 460 + count * 221)
    : 738 + count * 40 + (events.length > count ? 32 : 0);
  const h = paper.height,
    c = paper.getContext('2d'),
    last = events.at(-1);
  c.fillStyle = colors.paper;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#c9ac7f';
  c.strokeRect(7, 7, w - 14, h - 14);
  if (trail) {
    paintTrail(c, {look, events, title}, actor, w, h);
    return;
  }
  const box = {x: 20, y: 20, w: w - 40, h: 480};
  photograph(c, look, last?.pointId, box);
  const ah = box.h * 0.98,
    aw = (ah * actor.width) / actor.height;
  c.drawImage(actor, (w - aw) / 2, box.y + box.h - ah + 4, aw, ah);
  if (last) {
    const text = point(last.pointId)?.name || last.name;
    c.font = `24px ${hand}`;
    const tw = c.measureText(text).width + 40;
    c.fillStyle = '#606e53';
    c.fillRect(35, box.y + box.h - 51, tw, 38);
    c.fillStyle = '#fff2ce';
    c.fillText(text, 55, box.y + box.h - 24);
  }
  const top = box.y + box.h;
  c.fillStyle = colors.ink;
  c.font = `50px ${hand}`;
  c.fillText(title || '把黔山带回去', 36, top + 73, w - 72);
  const dates = events.map((e) => day.format(new Date(e.at))).sort();
  c.fillStyle = colors.muted;
  c.font = '19px sans-serif';
  c.fillText(
    [...new Set([dates[0], dates.at(-1)].filter(Boolean))].join(' — '),
    38,
    top + 115,
  );
  const start = top + 170;
  events
    .slice(0, count)
    .forEach((event, i) => timeRow(c, event, start + i * 40));
  if (events.length > count) {
    c.fillStyle = colors.muted;
    c.font = '18px sans-serif';
    c.fillText(
      '另有 ' + (events.length - count) + ' 条经历，详见作品手账',
      44,
      start + count * 40,
    );
  }
  c.fillStyle = colors.muted;
  c.font = `22px ${hand}`;
  c.fillText('黄晓西的黔山纪念  ·  测试到访', 39, h - 34);
  stamp(
    c,
    w - 70,
    h - 62,
    last ? day.format(new Date(last.at)).slice(5).replace('-', '.') : '',
  );
}

let paperTexture;
function paintTrail(c, {look, events, title}, actor, w, h) {
  // 只给底纸做较疏的采样，避免纸纤维消耗本机作品存储。照片、人物和字仍按输出尺寸绘制。
  if (!paperTexture) {
    const original = journalPaper();
    paperTexture = document.createElement('canvas');
    paperTexture.width = 320;
    paperTexture.height = Math.round((original.height * 320) / original.width);
    paperTexture
      .getContext('2d')
      .drawImage(original, 0, 0, paperTexture.width, paperTexture.height);
  }
  const pad = 52;
  c.save();
  c.imageSmoothingEnabled = false;
  c.drawImage(paperTexture, 0, 0, w, h);
  c.restore();
  c.fillStyle = colors.ink;
  c.font = `48px ${hand}`;
  c.fillText(title || '把黔山带回去', pad, 112, w - 2 * pad);
  c.font = '21px sans-serif';
  c.fillStyle = colors.muted;
  const dates = [...new Set(events.map((e) => day.format(new Date(e.at))))];
  c.fillText(
    (dates.length ? dates[0] + ' · ' : '') + events.length + ' 段经历',
    pad,
    163,
  );
  const dollH = Math.min(280, h * 0.27);
  // 如果背景是已经穿戴的奖励，也在人物下面的地点窗呈现。
  c.save();
  c.beginPath();
  c.arc(w * 0.71, 305, 116, 0, 2 * Math.PI);
  c.clip();
  photograph(c, look, events.at(-1)?.pointId, {
    x: w * 0.71 - 116,
    y: 189,
    w: 232,
    h: 232,
  });
  c.restore();
  c.drawImage(
    actor,
    w * 0.71 - (dollH * actor.width) / actor.height / 2,
    154,
    (dollH * actor.width) / actor.height,
    dollH,
  );
  const step = 221;
  events.forEach((event, i) => {
    const y = 265 + i * step,
      x = i % 2 ? w * 0.52 : pad,
      photoW = 206,
      photoH = Math.min(140, step * 0.6),
      tilt = i % 2 ? 0.045 : -0.045;
    if (i < events.length - 1) {
      c.save();
      c.strokeStyle = '#ad895e';
      c.setLineDash([6, 7]);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 95, y + photoH);
      c.bezierCurveTo(
        w * 0.49,
        y + step,
        w * 0.51,
        y + step * 0.5,
        (i % 2 ? pad : w * 0.52) + 90,
        y + step,
      );
      c.stroke();
      c.restore();
    }
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.fillStyle = '#fff2d9';
    c.fillRect(-5, -5, photoW + 10, photoH + 16);
    photograph(c, look, event.pointId, {x: 0, y: 0, w: photoW, h: photoH});
    c.fillStyle = '#d9bd8d';
    c.fillRect(photoW * 0.36, -8, 48, 13);
    c.restore();
    const at = new Date(event.at);
    c.fillStyle = '#fff0d7e8';
    c.fillRect(x - 5, y + photoH + 18, photoW + 14, 58);
    c.fillStyle = colors.ink;
    c.font = `26px ${hand}`;
    c.fillText(event.name, x, y + photoH + 44, 225);
    c.fillStyle = colors.muted;
    c.font = '17px sans-serif';
    c.fillText(day.format(at) + '  ' + time.format(at), x, y + photoH + 68);
  });
  c.fillStyle = colors.ink;
  c.font = `20px ${hand}`;
  c.fillText('黄晓西的黔山纪念  ·  测试到访', pad, h - 126);
  stamp(
    c,
    w - 90,
    h - 148,
    events.length
      ? day
          .format(new Date(events.at(-1).at))
          .slice(5)
          .replace('-', '.')
      : '',
  );
}
