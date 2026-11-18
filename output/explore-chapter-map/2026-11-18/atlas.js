const chapters = {
  huangguoshu: {
    name: '黄果树', region: '安顺市',
    stages: [['大瀑布', '瀑'], ['陡坡塘', '塘'], ['天星桥', '桥']],
  },
  jiaxiu: {
    name: '甲秀楼', region: '贵阳市',
    stages: [['浮玉桥', '桥'], ['甲秀楼', '楼'], ['翠微园', '园']],
  },
  xiaoqikong: {
    name: '小七孔', region: '黔南州',
    stages: [['小七孔古桥', '桥'], ['翠谷瀑布', '瀑'], ['卧龙潭', '潭']],
  },
};

const atlas = document.querySelector('.atlas');
const regionControl = document.querySelector('#region-control');
const regionButton = document.querySelector('#region-filter');
const regionLabel = document.querySelector('#region-label');
const regionMenu = document.querySelector('#region-options');
const regionOptions = [...regionMenu.querySelectorAll('button')];
const categoryOptions = [...document.querySelectorAll('.category-filter button')];
const chapterPins = [...document.querySelectorAll('.chapter-pin')];
const mapElements = [...document.querySelectorAll('#map-header, #filters, #map-labels, #map-caption')];
const noResults = document.querySelector('#no-results');
const resultCount = document.querySelector('#result-count');
const chapterView = document.querySelector('#chapter-view');
const chapterTitle = document.querySelector('#chapter-title');
const chapterRegion = document.querySelector('#chapter-region');
const stageNodes = document.querySelector('#stage-nodes');
const stageStatus = document.querySelector('#stage-status');
let region = 'all';
let category = 'all';
let sourcePin;
let pendingPin;

function showMatches() {
  for (const option of regionOptions) {
    const selected = option.value === region;
    option.setAttribute('aria-pressed', String(selected));
    if (selected) regionLabel.textContent = option.textContent;
  }
  regionButton.dataset.active = String(region !== 'all');
  for (const option of categoryOptions) {
    option.setAttribute('aria-pressed', String(option.dataset.category === category));
  }
  for (const pin of chapterPins) {
    const matchesRegion = region === 'all' || pin.dataset.region === region;
    const matchesCategory = category === 'all' || pin.dataset.type === category;
    pin.hidden = !(matchesRegion && matchesCategory);
  }
  const count = chapterPins.filter(pin => !pin.hidden).length;
  noResults.hidden = count > 0;
  resultCount.textContent = count ? `地图显示 ${count} 个景区` : '这组条件下暂无景区';
}

function setRegionMenu(open) {
  regionMenu.hidden = !open;
  regionButton.setAttribute('aria-expanded', String(open));
}

regionButton.addEventListener('click', () => setRegionMenu(regionMenu.hidden));
for (const option of regionOptions) {
  option.addEventListener('click', () => {
    region = option.value;
    showMatches();
    setRegionMenu(false);
    regionButton.focus();
  });
}
regionControl.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || regionMenu.hidden) return;
  setRegionMenu(false);
  regionButton.focus();
});
regionControl.addEventListener('focusout', event => {
  if (event.relatedTarget && !regionControl.contains(event.relatedTarget)) setRegionMenu(false);
});
document.addEventListener('pointerdown', event => {
  if (!regionMenu.hidden && !regionControl.contains(event.target)) setRegionMenu(false);
});
for (const option of categoryOptions) {
  option.addEventListener('click', () => {
    category = option.dataset.category;
    showMatches();
  });
}
document.querySelector('#reset-filters').addEventListener('click', () => {
  region = 'all';
  category = 'all';
  showMatches();
  regionButton.focus();
});

function renderStage([name, seal]) {
  const button = document.createElement('button');
  button.className = 'stage-node';
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  const stamp = document.createElement('span');
  stamp.className = 'stage-seal';
  stamp.setAttribute('aria-hidden', 'true');
  stamp.textContent = seal;
  button.append(stamp, name);
  button.addEventListener('click', () => {
    for (const node of stageNodes.children) {
      node.setAttribute('aria-pressed', String(node === button));
    }
    stageStatus.textContent = `${name} · 待到访`;
  });
  return button;
}

function openChapter(pin) {
  sourcePin = pin;
  setRegionMenu(false);
  const id = pin.dataset.chapter;
  const chapter = chapters[id];
  atlas.dataset.chapter = id;
  for (const element of mapElements) element.hidden = true;
  chapterTitle.textContent = chapter.name;
  chapterRegion.textContent = chapter.region;
  stageNodes.replaceChildren(...chapter.stages.map(renderStage));
  stageStatus.textContent = '选择一个景点，查看足迹状态';
  chapterView.hidden = false;
  chapterTitle.focus();
}

function returnToMap() {
  delete atlas.dataset.chapter;
  chapterView.hidden = true;
  for (const element of mapElements) element.hidden = false;
  sourcePin.focus();
}

for (const pin of chapterPins) {
  pin.addEventListener('click', () => {
    if (pendingPin || pin.hidden || !chapterView.hidden) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      openChapter(pin);
      return;
    }
    pendingPin = pin;
    pin.dataset.entering = '';
    // 先让触屏用户看到地标亮起，再开始镜头切换。
    setTimeout(() => {
      delete pin.dataset.entering;
      pendingPin = undefined;
      if (!pin.hidden) openChapter(pin);
    }, 180);
  });
}
document.querySelector('#return-map').addEventListener('click', returnToMap);
document.querySelector('#explore-tab').addEventListener('click', event => {
  if (chapterView.hidden) return;
  event.preventDefault();
  returnToMap();
});
