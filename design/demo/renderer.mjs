import {asset, OUTFITS} from '../data.mjs';
import {icon as sketchIcon} from '../world.mjs';
import {icon as paintedIcon} from '../hifi/art.mjs';

import {itemThumbnail} from './item-thumbnails.mjs';
import {locationBanner} from './map-art.mjs';
export {mapPins,mapPlane} from './map-art.mjs';

const picture = (name) =>
  new URL('../hifi/assets/' + name + '.png', import.meta.url).href;
const textures = {};
const looks = new Map();
const width = 448;
const height = 672;

function canvas() {
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  return surface;
}

export async function prepareArtwork() {
  await Promise.all(
    ['companion', 'map', 'night', 'inventory'].map(async (name) => {
      const image = new Image();
      image.src = picture(name);
      await image.decode();
      textures[name] = image;
    }),
  );
}

// 闭合区域采用原概念立绘的 1024 × 1536 坐标。保留刺绣明暗和皮肤，分别处理衣袖、裙、鞋履和冠饰。
const regions = {
  top: [
    [231, 737],
    [315, 647],
    [381, 526],
    [454, 478],
    [534, 533],
    [570, 480],
    [635, 513],
    [722, 660],
    [795, 784],
    [666, 865],
    [622, 765],
    [531, 774],
    [359, 752],
    [318, 822],
  ],
  bottom: [
    [363, 753],
    [430, 766],
    [610, 769],
    [657, 879],
    [801, 1051],
    [780, 1082],
    [793, 1095],
    [705, 1141],
    [606, 1168],
    [496, 1168],
    [395, 1152],
    [303, 1128],
    [210, 1065],
    [229, 1040],
    [202, 1012],
  ],
  hair: [
    [255, 205],
    [283, 70],
    [431, 16],
    [576, 13],
    [708, 93],
    [728, 177],
    [672, 309],
    [626, 317],
    [609, 247],
    [385, 264],
    [349, 338],
    [312, 322],
  ],
  shoes: [
    [442, 1360],
    [531, 1360],
    [550, 1505],
    [443, 1512],
  ],
  rightShoe: [
    [603, 1318],
    [666, 1283],
    [696, 1330],
    [703, 1453],
    [666, 1483],
    [602, 1471],
  ],
  arm: [
    [415, 510],
    [397, 578],
    [389, 670],
    [364, 722],
    [316, 825],
    [259, 851],
    [94, 863],
    [96, 784],
    [224, 744],
    [277, 661],
    [349, 568],
  ],
};
function path(points) {
  const shape = new Path2D();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  return shape;
}
let original;
let masks;
function prepareMasks() {
  const base = canvas();
  const ctx = base.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(textures.companion, 0, 0, width, height);
  original = ctx.getImageData(0, 0, width, height);
  masks = {};
  for (const [name, points] of Object.entries(regions)) {
    ctx.resetTransform();
    ctx.clearRect(0, 0, width, height);
    ctx.scale(width / 1024, height / 1536);
    ctx.fill(path(points));
    masks[name] = ctx.getImageData(0, 0, width, height).data;
  }
}
const palettes = {
  'start-a': ['#866c38', '#a32a25', '#432c37', '#892f30'],
  'start-b': ['#b48e41', '#c28824', '#625c41', '#a36932'],
  'start-c': ['#709e96', '#288d88', '#325779', '#2e6d70'],
  gift: ['#9686b3', '#7362a4', '#454575', '#76547d'],
  mountain: ['#7297b6', '#36719f', '#384d73', '#3c5b86'],
  flower: ['#b77383', '#be6175', '#734665', '#a54a65'],
};
function rgb(value) {
  return [1, 3, 5].map((offset) =>
    parseInt(value.slice(offset, offset + 2), 16),
  );
}
function colorsFor(look) {
  return ['hair', 'top', 'bottom', 'shoes'].map((slot, i) =>
    rgb(palettes[asset(look[slot]).outfit][i]),
  );
}
// 每套的衣襟和裙摆分别使用对应织纹，混搭时独立读取槽位。
function embroidery(ctx, look) {
  const motifs = [
    'M-10 4Q-8 -9 0 -6Q8 -9 10 4Q2 1 0 8Q-2 1 -10 4Z',
    'M0 -9L4 -3L10 0L4 3L0 9L-4 3L-10 0L-4 -3Z',
    'M-12 6Q-2 5 4 -8Q6 0 12 -2M-8 8Q0 8 7 0',
    'M0 6Q-15 2 -10 -7Q-4 -8 0 0Q6 -10 12 -7Q14 1 0 6Z',
    'M-12 7L-4 -5L0 1L5 -8L13 7M-10 10L11 10',
    'M0 -8Q10 -13 6 -3Q17 0 6 5Q3 16 -3 7Q-14 12 -8 2Q-15 -6 -4 -5Z',
  ];
  const stitch = (x, y, slot, scale) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const index = OUTFITS.findIndex((o) => o.id === asset(look[slot]).outfit);
    const shape = new Path2D(motifs[index]);
    ctx.fillStyle = '#fbdaa6';
    ctx.strokeStyle = '#5d4038';
    ctx.lineWidth = 1.7;
    ctx.stroke(shape);
    ctx.fill(shape);
    ctx.restore();
  };
  for (const x of [383, 407, 564, 588]) stitch(x, 737, 'top', 0.8);
  for (let i = 0; i < 11; i++) {
    const x = 279 + i * 44;
    stitch(x, 1044 + 35 * Math.sin((Math.PI * i) / 10), 'bottom', 1);
  }
}
function ornament(ctx, look) {
  const index = OUTFITS.findIndex((o) => o.id === asset(look.hair).outfit);
  const color = palettes[asset(look.hair).outfit][0];
  ctx.save();
  ctx.translate(622, 174);
  ctx.rotate(-0.12 * index);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#f7dca9';
  ctx.lineWidth = 2.5;
  const petals = 4 + index;
  for (let turn = 0; turn < petals; turn++) {
    ctx.rotate((Math.PI * 2) / petals);
    ctx.beginPath();
    ctx.ellipse(0, -13, 8, 15, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#ffeab7';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}
function smile(ctx) {
  // 沿原眼眶局部压缩眼形并提高嘴角，眉、脸型和发际线继续使用同一母版。
  const copy = canvas();
  copy.getContext('2d').drawImage(ctx.canvas, 0, 0);
  for (const [x, y, w, h] of [
    [376, 319, 77, 66],
    [502, 304, 82, 72],
  ]) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    for (let row = 0; row < h; row++) {
      const u = (row + 0.5) / h;
      const sample =
        u < 0.3
          ? u * 0.5
          : u < 0.72
            ? 0.15 + (u - 0.3) * 1.72
            : 0.872 + (u - 0.72) * 0.457;
      ctx.drawImage(
        copy,
        (x * width) / 1024,
        ((y + sample * h) * height) / 1536,
        (w * width) / 1024,
        1,
        x,
        y + row,
        w,
        1.5,
      );
    }
    ctx.restore();
  }
  ctx.strokeStyle = '#ad5350';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(456, 418);
  ctx.quadraticCurveTo(478, 436, 505, 414);
  ctx.stroke();
}
export function renderedLook(look) {
  const key = JSON.stringify(look);
  if (looks.has(key)) return looks.get(key);
  if (!original) prepareMasks();
  const layer = canvas(),
    ctx = layer.getContext('2d');
  const frame = new ImageData(
    new Uint8ClampedArray(original.data),
    width,
    height,
  );
  const pixels = frame.data,
    shades = colorsFor(look);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 12) continue;
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    const redCloth = r > g * 1.38 && r > b * 1.3;
    let slot = -1,
      intensity = 0;
    if (masks.top[i + 3] && redCloth) {
      slot = 1;
      intensity = 0.92;
    } else if (masks.bottom[i + 3] && (redCloth || Math.max(r, g, b) < 120)) {
      slot = 2;
      intensity = 0.86;
    } else if ((masks.shoes[i + 3] || masks.rightShoe[i + 3]) && redCloth) {
      slot = 3;
      intensity = 0.95;
    } else if (masks.hair[i + 3] && r > 95 && g > 65) {
      slot = 0;
      intensity = 0.35;
    }
    if (slot < 0) continue;
    const shade = shades[slot],
      light = (0.38 * r + 0.45 * g + 0.17 * b) / 140;
    for (let channel = 0; channel < 3; channel++)
      pixels[i + channel] =
        pixels[i + channel] * (1 - intensity) +
        (shade[channel] * light + Math.max(0, light - 0.95) * 85) * intensity;
  }
  ctx.putImageData(frame, 0, 0);
  ctx.scale(width / 1024, height / 1536);
  embroidery(ctx, look);
  ornament(ctx, look);
  if (look.expression === 'joy') smile(ctx);
  if (look.pose === 'wave') {
    const arm = canvas(),
      hand = arm.getContext('2d');
    hand.scale(width / 1024, height / 1536);
    hand.clip(path(regions.arm));
    hand.drawImage(layer, 0, 0, 1024, 1536);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill(path(regions.arm));
    ctx.restore();
    ctx.save();
    ctx.translate(405, 544);
    ctx.rotate(0.85);
    ctx.translate(-405, -544);
    ctx.drawImage(arm, 0, 0, 1024, 1536);
    ctx.restore();
  }
  const result = {surface: layer, src: layer.toDataURL('image/webp', 0.94)};
  if (looks.size >= 32) looks.delete(looks.keys().next().value);
  looks.set(key, result);
  return result;
}
export function stageFigure(look) {
  return (
    '<img class="figure stage-figure" alt="黄晓西的当前搭配" src="' +
    renderedLook(look).src +
    '">'
  );
}
export function sceneStyle(look, pointId = 'gate') {
  const name =
    look?.background === 'mountain-bg' ||
    pointId === 'brook' ||
    pointId === 'ridge'
      ? 'map'
      : 'night';
  const position =
    {gate: 0.68, ridge: 0.15, brook: 0.73, shop: 0.38}[pointId] ?? 0.5;
  const wash =
    look?.background === 'flower-bg'
      ? 'rgba(208,115,153,.24)'
      : look?.background === 'mountain-bg'
        ? 'rgba(63,114,134,.16)'
        : 'transparent';
  return {image: textures[name], name, position, wash};
}
export function world(theme, look, pointId) {
  if (pointId && !look && theme==='map') return locationBanner(pointId,picture);
  const scene = sceneStyle(look, pointId);
  const name = theme === 'map' && !look && !pointId ? 'map' : scene.name;
  return (
    '<div aria-hidden="true" class="world-art demo-scenery" style="background-image:linear-gradient(' +
    scene.wash +
    ',' +
    scene.wash +
    '),url(' +
    picture(name) +
    ');background-position:50% ' +
    scene.position * 100 +
    '%"></div>'
  );
}
export function icon(name) {
  const aliases = {
    scan: 'camera',
    wardrobe: 'bag',
    foot: 'pin',
    memories: 'book',
  };
  if (name === 'pose' || name === 'star') return sketchIcon(name);
  if (name === 'partner')
    return '<span aria-hidden="true" class="ui-icon cameo"></span>';
  return paintedIcon(aliases[name] || name).replace(
    'class="icon',
    'class="ui-icon',
  );
}
export function itemArt(a) {
  return itemThumbnail(a,textures.inventory,palettes[a.outfit]);
}
