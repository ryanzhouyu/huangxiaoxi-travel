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

export function renderedLook(look) {
  const key = [
    look.hair,
    look.top,
    look.bottom,
    look.shoes,
    look.expression,
    look.pose,
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
  paint(ctx, top, look.pose === 'wave' ? 'wave' : 'top');
  if (frames[hair].braid) paint(ctx, hair, 'braid');
  const result = {surface, src: surface.toDataURL('image/webp', 0.95)};
  if (looks.size === 32) looks.delete(looks.keys().next().value);
  looks.set(key, result);
  return result;
}
