const regionButton = document.querySelector('#region-filter');
const regionLabel = document.querySelector('#region-label');
const regionSheet = document.querySelector('#region-sheet');
const regionOptions = [...regionSheet.querySelectorAll('.region-options button')];
const categoryOptions = [...document.querySelectorAll('.category-filter button')];
const postcards = [...document.querySelectorAll('.postcard')];
const list = document.querySelector('.destination-scroll');
const noResults = document.querySelector('#no-results');
const resultCount = document.querySelector('#result-count');
let region = 'all';
let category = 'all';

function showSelection() {
  for (const option of regionOptions) {
    const selected = option.value === region;
    option.setAttribute('aria-pressed', String(selected));
    if (selected) regionLabel.textContent = option.textContent;
  }
  regionButton.dataset.active = String(region !== 'all');
  for (const option of categoryOptions) {
    option.setAttribute('aria-pressed', String(option.dataset.category === category));
  }
  for (const postcard of postcards) {
    const matchesRegion = region === 'all' || postcard.dataset.region === region;
    const matchesCategory = category === 'all' || postcard.dataset.type === category;
    postcard.hidden = !(matchesRegion && matchesCategory);
  }
  const count = postcards.filter(postcard => !postcard.hidden).length;
  noResults.hidden = count > 0;
  resultCount.textContent = count ? `显示 ${count} 个景区` : '这组条件下暂无景区';
  list.scrollTop = 0;
}

regionButton.addEventListener('click', () => {
  regionSheet.returnValue = 'cancel';
  regionSheet.showModal();
  regionButton.setAttribute('aria-expanded', 'true');
  regionOptions.find(option => option.value === region).focus();
});
regionSheet.addEventListener('close', () => {
  regionButton.setAttribute('aria-expanded', 'false');
  const selected = regionOptions.find(option => option.value === regionSheet.returnValue);
  if (!selected) return;
  region = selected.value;
  showSelection();
});
for (const option of categoryOptions) {
  option.addEventListener('click', () => {
    category = option.dataset.category;
    showSelection();
  });
}
document.querySelector('#reset-filters').addEventListener('click', () => {
  region = 'all';
  category = 'all';
  showSelection();
  regionButton.focus();
});
