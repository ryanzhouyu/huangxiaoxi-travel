// 原图集每行三格。只取独立单品的轮廓，卡格形状由页面负责。
const cells = {
  hair: [0, 0],
  top: [1, 0],
  bottom: [2, 0],
  shoes: [0, 1],
  background: [0, 2],
  expression: [1, 2],
  pose: [2, 2],
};
const slots = ['hair', 'top', 'bottom', 'shoes'];
const thumbnails = new Map();

function itemImage(sheet, slot, palette) {
  const [col, row] = cells[slot];
  const size = sheet.naturalWidth / 3;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const ctx = tile.getContext('2d');
  ctx.drawImage(sheet, col * size, row * size, size, size, 0, 0, size, size);
  const frame = ctx.getImageData(0, 0, size, size);
  const p = frame.data;
  const rgb = palette?.[slots.indexOf(slot)]
    ?.match(/[a-f\d]{2}/gi)
    ?.map((n) => parseInt(n, 16));
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
      if (!rgb) continue;
      const r = p[i],
        g = p[i + 1],
        b = p[i + 2];
      const cloth = r > g * 1.38 && r > b * 1.3;
      const skirtShadow = slot === 'bottom' && Math.max(r, g, b) < 120;
      if (slot !== 'hair' && !cloth && !skirtShadow) continue;
      const strength = slot === 'hair' ? 0.35 : 0.9;
      const light = (0.38 * r + 0.45 * g + 0.17 * b) / 140;
      for (let c = 0; c < 3; c++)
        p[i + c] =
          p[i + c] * (1 - strength) +
          (rgb[c] * light + Math.max(0, light - 0.95) * 85) * strength;
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

export function itemThumbnail(item, sheet, palette) {
  if (!thumbnails.has(item.id))
    thumbnails.set(item.id, itemImage(sheet, item.slot, palette));
  return (
    '<img class="item-art item-thumbnail" alt="" src="' +
    thumbnails.get(item.id) +
    '">'
  );
}
