import {renderedLook, sceneStyle} from './renderer.mjs';

function paintCard(paper, {look, events, template, title}, actor) {
  const trail = template === 'trail';
  paper.width = 680;
  const rows = trail ? events.length : Math.min(4, events.length);
  paper.height =
    (trail ? 894 : 720) + rows * 43 + (events.length > rows ? 30 : 0);
  const c = paper.getContext('2d');
  const w = paper.width,
    h = paper.height;
  c.fillStyle = '#f8eedb';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#b99b64';
  c.strokeRect(17, 17, w - 34, h - 34);
  c.fillStyle = '#576b58';
  c.font = '17px serif';
  c.fillText('黔 山 纪 游    /    黄 晓 西', 42, 58);
  c.fillStyle = '#493a29';
  c.font = 'bold 34px serif';
  c.fillText(title || '把黔山带回去', 40, 118, w - 80);
  const day = (t) => new Date(t).toLocaleDateString('en-CA');
  const dates = events.map((e) => day(e.at)).sort();
  c.fillStyle = '#7b6b54';
  c.font = '16px sans-serif';
  c.fillText(
    dates.length ? [...new Set([dates[0], dates.at(-1)])].join(' — ') : '',
    42,
    147,
  );
  const box = {x: 39, y: 172, w: 602, h: trail ? 530 : 370};
  const scene = sceneStyle(look, events.at(-1)?.pointId);
  const cropH = Math.min(
    scene.image.height,
    (scene.image.width * box.h) / box.w,
  );
  c.drawImage(
    scene.image,
    0,
    (scene.image.height - cropH) * scene.position,
    scene.image.width,
    cropH,
    box.x,
    box.y,
    box.w,
    box.h,
  );
  c.fillStyle = scene.wash;
  c.fillRect(box.x, box.y, box.w, box.h);
  const actorH = box.h * 0.92;
  const actorW = (actorH * actor.width) / actor.height;
  c.drawImage(
    actor,
    (w - actorW) / 2,
    box.y + box.h - actorH - 5,
    actorW,
    actorH,
  );
  c.fillStyle = '#4c614d';
  c.font = 'bold 23px serif';
  c.fillText(trail ? '沿途足迹' : '记得这次相遇', 43, box.y + box.h + 49);
  const start = box.y + box.h + 89;
  events.slice(0, rows).forEach((e, i) => {
    const y = start + i * 43;
    c.fillStyle = '#ab864f';
    c.beginPath();
    c.arc(49, y - 6, 4, 0, 2 * Math.PI);
    c.fill();
    c.font = '16px sans-serif';
    c.fillStyle = '#70654e';
    const clock = new Date(e.at).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    c.fillText(day(e.at).slice(5) + '  ' + clock, 68, y);
    c.fillStyle = '#443d30';
    c.font = '21px serif';
    c.fillText(e.name, 218, y, 390);
  });
  if (events.length > rows) {
    c.fillStyle = '#756852';
    c.font = '16px serif';
    c.fillText(
      '另有 ' + (events.length - rows) + ' 条经历，详见作品手账',
      68,
      start + rows * 43,
    );
  }
  c.fillStyle = '#837259';
  c.font = '15px serif';
  c.fillText('黔山漫游   ·   测试到访纪念', 42, h - 40);
}

export const draftMarkup =
  '<canvas class="draft-postcard" role="img" aria-label="当前搭配与所选经历的纪念图草稿"></canvas>';

export function paintDraft(canvas, options) {
  paintCard(canvas, options, renderedLook(options.look).surface);
}

export async function composeImage(options) {
  if (!options.events.length) throw Error('请先选择一段到访经历。');
  const paper = document.createElement('canvas');
  const bitmap = await createImageBitmap(renderedLook(options.look).surface);
  try {
    paintCard(paper, options, bitmap);
    return paper.toDataURL('image/png');
  } finally {
    bitmap.close();
  }
}
