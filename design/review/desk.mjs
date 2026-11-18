import {catalog, deskKey} from './review-service.mjs';
import {href, link} from './ui.mjs';

document.querySelector('#proof-links').innerHTML = catalog.points.map(point =>
  link(point.name, './index.html' + href('checkin', {id: point.id, code: point.code}))
).join('');

const panel = document.querySelector('#fault');
const action = panel.elements.action;
const fault = panel.elements.fault;
function adjust() {
  const mayWrite = !['sendCode', 'renderPrint'].includes(action.value);
  fault.options[1].disabled = !mayWrite;
  if (!mayWrite) fault.value = 'reject';
}
panel.addEventListener('change', adjust);
adjust();
panel.addEventListener('submit', event => {
  event.preventDefault();
  try {
    sessionStorage.setItem(deskKey, JSON.stringify({action: action.value, fault: fault.value}));
    location.href = './index.html';
  } catch {
    const note = document.querySelector('#fault-note');
    note.hidden = false;
    note.textContent = '当前浏览器无法保存评审设置。';
  }
});
