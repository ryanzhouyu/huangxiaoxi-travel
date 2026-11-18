const get = id => document.getElementById(id);
const screen = get('screen');
const size = get('size');
const caption = get('caption');
let manifest;

function showPicture(anchor, url) {
  anchor.hidden = !url;
  if (url) {
    anchor.href = url;
    anchor.querySelector('img').src = url;
  } else {
    anchor.removeAttribute('href');
    anchor.querySelector('img').removeAttribute('src');
  }
}

function render() {
  const record = manifest.screens.find(item => item.id === screen.value);
  const selectedSize = [...size.options].some(item => item.value === size.value && record.sizes.includes(item.value)) ? size.value : record.sizes[0];
  size.replaceChildren(...record.sizes.map(label => new Option(label.replace('x', '×'), label)));
  size.value = selectedSize;
  get('title').textContent = record.title;
  caption.textContent = record.note || '画面来自隔离评审手账中的实际界面。';
  showPicture(get('before').querySelector('a'), record.before ? './before/' + record.before + '.webp' : '');
  get('no-before').hidden = !!record.before;
  get('after-title').textContent = '优化后 · ' + size.value.replace('x', '×');
  showPicture(get('after'), './after/' + size.value + '/' + record.id + '.webp');
  history.replaceState(null, '', '#' + record.id);
}

try {
  const response = await fetch('./screens.json');
  if (!response.ok) throw Error();
  manifest = await response.json();
  screen.replaceChildren(...manifest.screens.map(record => new Option(record.title, record.id)));
  const requested = location.hash.slice(1);
  screen.value = manifest.screens.some(item => item.id === requested) ? requested : 'partner';
  screen.onchange = size.onchange = render;
  const step = delta => {
    screen.selectedIndex = (screen.selectedIndex + delta + screen.length) % screen.length;
    render();
  };
  get('previous').onclick = () => step(-1);
  get('next').onclick = () => step(1);
  render();
} catch {
  caption.textContent = '无法载入截图索引，请从项目本地预览服务打开此页面。';
}
