// 原图集每行三格。只取独立单品的轮廓，卡格形状由页面负责。
const cells = {
  background: [0, 2],
  expression: [1, 2],
  pose: [2, 2],
};
const thumbnails = new Map();

function itemImage(sheet, slot) {
  const [col, row] = cells[slot];
  const size = sheet.naturalWidth / 3;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const ctx = tile.getContext('2d');
  ctx.drawImage(sheet, col * size, row * size, size, size, 0, 0, size, size);
  const frame = ctx.getImageData(0, 0, size, size);
  const p = frame.data;
  let left = size,
    top = size,
    right = 0,
    bottom = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (p[i + 3] < 24) {
        p[i + 3] = 0;
        continue;
      }
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  ctx.putImageData(frame, 0, 0);
  const result = document.createElement('canvas');
  result.width = result.height = 256;
  const w = right - left + 1,
    h = bottom - top + 1,
    scale = 232 / Math.max(w, h);
  result
    .getContext('2d')
    .drawImage(
      tile,
      left,
      top,
      w,
      h,
      (256 - w * scale) / 2,
      (256 - h * scale) / 2,
      w * scale,
      h * scale,
    );
  return result.toDataURL('image/webp', 0.95);
}

export function itemThumbnail(item, sheet) {
  if (!thumbnails.has(item.id))
    thumbnails.set(item.id, itemImage(sheet, item.slot));
  return (
    '<img class="item-art item-thumbnail" alt="" src="' +
    thumbnails.get(item.id) +
    '">'
  );
}
