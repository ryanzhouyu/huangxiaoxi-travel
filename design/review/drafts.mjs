const prefix = 'hxx.review.editor.v1.';
export const readTab = (key, fallback = null) => {
  try { return JSON.parse(sessionStorage.getItem(prefix + key)) ?? fallback; }
  catch { return fallback; }
};
export function writeTab(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(prefix + key);
    else sessionStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export const defaultFilter = {range: 'all', from: '', to: ''};
export function readEditors(progress) {
  const wardrobe = readTab(progress.id + '.wardrobe');
  const compose = readTab(progress.id + '.compose');
  const memory = readTab(progress.id + '.memory');
  return {
    wardrobe: wardrobe?.look && Object.values(wardrobe.look).every(item => progress.owned.includes(item)) ? wardrobe : null,
    compose: Array.isArray(compose?.selected) ? {...compose, selected: compose.selected.filter(id => progress.events.some(event => event.id === id))} : null,
    memory: memory?.filter ? memory : {tab: 'events', filter: {...defaultFilter}},
  };
}

export function makeCompose(route, progress) {
  const {params} = route;
  const copy = progress.works.find(work => work.id === params.get('copy'));
  const single = params.get('visit');
  const range = ['all', 'today', 'custom'].includes(params.get('range')) ? params.get('range') : 'all';
  return {
    ...defaultFilter,
    source: route.here,
    range,
    from: params.get('start') ?? '',
    to: params.get('end') ?? '',
    title: copy?.title ?? '',
    template: copy?.template ?? 'single',
    selected: copy ? copy.events.filter(id => progress.events.some(event => event.id === id)) :
      single ? progress.events.filter(event => event.id === single).map(event => event.id) : null,
  };
}
