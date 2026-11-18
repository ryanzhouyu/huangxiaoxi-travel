import {asset} from '../data.mjs';
import {frames} from './assets/wardrobe/frames.mjs';

const wardrobeRoot = new URL('./assets/wardrobe/', import.meta.url);
const atlases = new Map();
const looks = new Map();
export const thumbnailUrl = (assetId) =>
  new URL(assetId + '.webp', wardrobeRoot).href;

export async function prepareWardrobe() {
  await Promise.all(
    Object.keys(frames).map(async (id) => {
      const image = new Image();
      image.src = new URL(id + '.webp', wardrobeRoot).href;
      await image.decode();
      atlases.set(id, image);
    }),
  );
}

function paint(ctx, outfit, part) {
  const [x, y, w, h, left, top] = frames[outfit][part];
  ctx.drawImage(atlases.get(outfit), x, y, w, h, left, top, w, h);
}

function paintTintedTop(ctx, outfit, part, filter) {
  const [x, y, width, height, left, top] = frames[outfit][part];
  const tile = document.createElement('canvas');
  tile.width = width;
  tile.height = height;
  const pixels = tile.getContext('2d', {willReadFrequently: true});
  const draw = () => pixels.drawImage(atlases.get(outfit), x, y, width, height, 0, 0, width, height);
  draw();
  const original = pixels.getImageData(0, 0, width, height);
  pixels.clearRect(0, 0, width, height);
  pixels.filter = filter;
  draw();
  const dyed = pixels.getImageData(0, 0, width, height);
  // 上装素材含手臂和手部。保留两侧的原有肤色，中央服饰继续用配色渲染。
  for (let column = 0; column < width; column++) {
    if (column > width * .29 && column < width * .71) continue;
    for (let row = 0; row < height; row++) {
      const index = (row * width + column) * 4;
      const red = original.data[index], green = original.data[index + 1], blue = original.data[index + 2];
      const warm = green - blue;
      const spread = red - blue;
      if (red >= 165 && red - green >= 19 && warm >= 10 && warm <= 57 && warm > spread * .21 && warm < spread * .68) {
        dyed.data[index] = red;
        dyed.data[index + 1] = green;
        dyed.data[index + 2] = blue;
      }
    }
  }
  pixels.putImageData(dyed, 0, 0);
  ctx.drawImage(tile, left, top);
}

export function renderedLook(look, {topFilter = 'none'} = {}) {
  const key = [
    look.hair,
    look.top,
    look.bottom,
    look.shoes,
    look.expression,
    look.pose,
    topFilter,
  ].join('/');
  if (looks.has(key)) return looks.get(key);
  const surface = document.createElement('canvas');
  surface.width = 440;
  surface.height = 680;
  const ctx = surface.getContext('2d', {willReadFrequently: true});
  ctx.scale(surface.width / 660, surface.height / 1020);
  const hair = asset(look.hair).outfit,
    top = asset(look.top).outfit;
  paint(ctx, 'start-b', 'base');
  paint(ctx, asset(look.shoes).outfit, 'shoes');
  paint(ctx, asset(look.bottom).outfit, 'bottom');
  paint(ctx, top, 'neck');
  paint(ctx, hair, 'hair');
  paint(ctx, 'start-a', look.expression === 'joy' ? 'joy' : 'face');
  const topPart = look.pose === 'wave' ? 'wave' : 'top';
  if (topFilter === 'none') paint(ctx, top, topPart);
  else paintTintedTop(ctx, top, topPart, topFilter);
  if (frames[hair].braid) paint(ctx, hair, 'braid');
  const result = {surface, src: surface.toDataURL('image/webp', 0.95)};
  if (looks.size === 32) looks.delete(looks.keys().next().value);
  looks.set(key, result);
  return result;
}
