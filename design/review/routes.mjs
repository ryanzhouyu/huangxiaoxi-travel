import {catalog} from './review-service.mjs';
import {href} from './ui.mjs';
import * as arrival from './pages/arrival.mjs?v=home-icons-20261118';
import * as travel from './pages/travel.mjs';
import {sceneGuide} from './pages/scene-guide.mjs';
import * as style from './pages/style.mjs';
import * as memory from './pages/memory.mjs';
import {wardrobe} from './pages/wardrobe.mjs';

const routes = {
  entry: [arrival.entry, ''],
  code: [arrival.code, '#entry'],
  onboarding: [arrival.onboarding, '#entry'],
  partner: [arrival.partner, ''],
  explore: [travel.explore, ''],
  scene: [sceneGuide, '#explore'],
  gift: [travel.gift, '#scene'],
  point: [travel.place, '#scene', catalog.points],
  checkin: [travel.checkin, '#scene', catalog.points],
  activity: [travel.activity, href('point', {id: 'shop'})],
  opportunities: [travel.opportunities, '#scene'],
  pool: [style.poolPage, '#scene', catalog.pools],
  wardrobe: [wardrobe, '#partner'],
  collection: [style.collection, '#partner'],
  outfit: [style.outfit, '#collection', catalog.outfits],
  memories: [memory.memories, ''],
  compose: [memory.compose, '#memories'],
  preview: [memory.preview, '#compose'],
  work: [memory.work, '#memories'],
  account: [arrival.account, '#partner'],
  wallet: [arrival.wallet, '#account'],
};

const parsed = value => {
  const [name, query] = value.slice(1).split(/\?(.*)/s, 2);
  return {name, params: new URLSearchParams(query)};
};

export const isRoute = route => typeof route === 'string' && route.startsWith('#') &&
  route.length < 8000 && Object.hasOwn(routes, parsed(route).name);
export const isEntry = name => ['entry', 'code', 'onboarding'].includes(name);

export function routeInfo(here) {
  const {name, params} = parsed(here);
  const id = params.get('id');
  const info = Object.hasOwn(routes, name) ? routes[name] : [];
  const from = params.get('from');
  const back = isRoute(from) && from !== here ? from : info[1] || '#partner';
  const invalid = !info[0] || (info[2] && !(name === 'checkin' && id === null) && !info[2].some(item => item.id === id));
  return {name, id, params, here, back, render: info[0], invalid};
}

export function ownsWardrobeContext(route) {
  let source = route;
  while (isRoute(source)) {
    const {name, params} = parsed(source);
    if (name === 'wardrobe') return true;
    const parent = params.get('from');
    if (!parent || parent.length >= source.length) return false;
    source = parent;
  }
  return false;
}
