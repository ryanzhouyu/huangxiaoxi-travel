import {icon as sketchIcon} from './symbols.mjs';
import {icon as paintedIcon} from './icons.mjs';
import {itemThumbnail} from './item-thumbnails.mjs';
import {locationBanner} from './map-art.mjs';
import {prepareWardrobe, renderedLook, thumbnailUrl} from './wardrobe-art.mjs';
export {renderedLook};
export {mapPins, mapPlane} from './map-art.mjs';

const picture = (name) =>
  new URL('./assets/shared/' + name + '.png', import.meta.url).href;
const textures = {};
export async function prepareArtwork() {
  await Promise.all([
    prepareWardrobe(),
    ...['map', 'night', 'inventory','travel-journal'].map(async (name) => {
      const image = new Image();
      image.src = name === 'travel-journal'
        ? new URL('./assets/scenes/travel-journal.webp', import.meta.url).href : picture(name);
      await image.decode();
      textures[name] = image;
    }),
  ]);
}
export const journalPaper = () => textures['travel-journal'];

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
  if (pointId && !look && theme === 'map')
    return locationBanner(pointId, picture);
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
  if (a.outfit)
    return (
      '<img class="item-art item-thumbnail" alt="" src="' +
      thumbnailUrl(a.id) +
      '">'
    );
  return itemThumbnail(a, textures.inventory);
}
