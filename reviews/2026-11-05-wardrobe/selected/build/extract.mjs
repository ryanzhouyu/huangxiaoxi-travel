// 离线从确认稿制作透明图集，演示端只读取成品。
import {fittings} from './fittings.mjs';
import {hems, soles, wornShoes} from './silhouettes.mjs';
const W = 660,
  H = 1020,
  CX = 330;
function surface(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
const ctx = (c) => c.getContext('2d', {willReadFrequently: true});
function crop(img, x, y, w, h) {
  const c = surface(w, h);
  ctx(c).drawImage(img, -x, -y);
  return c;
}
async function source(name) {
  const img = new Image();
  img.src = new URL('../' + name + '.png', import.meta.url);
  await img.decode();
  return img;
}

// 从四周去掉摄影底色。柔和投影允许较大亮度差，象牙白刺绣依靠边缘与色差保留。
function removeBackdrop(c, shadowY = 1.01) {
  const g = ctx(c),
    frame = g.getImageData(0, 0, c.width, c.height),
    p = frame.data;
  const w = c.width,
    h = c.height,
    n = w * h,
    visited = new Uint8Array(n),
    queue = new Int32Array(n);
  const bg = new Uint8Array(h * 3);
  for (let y = 0; y < h; y++) {
    const samples = [];
    for (const x of [0, 1, 3, w - 4, w - 2, w - 1])
      samples.push((y * w + x) * 4);
    samples.sort((a, b) => p[a + 1] - p[b + 1]);
    const i = samples[4];
    for (let k = 0; k < 3; k++) bg[y * 3 + k] = p[i + k];
  }
  let tail = 0,
    head = 0;
  function visit(i, from) {
    if (visited[i]) return;
    const y = Math.floor(i / w),
      j = 4 * i,
      b = y * 3;
    const dr = p[j] - bg[b],
      dg = p[j + 1] - bg[b + 1],
      db = p[j + 2] - bg[b + 2];
    const color = Math.max(
      Math.abs(dr - dg),
      Math.abs(dg - db),
      Math.abs(dr - db),
    );
    const dist = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
    const smooth =
      from < 0 ||
      Math.max(...[0, 1, 2].map((k) => Math.abs(p[j + k] - p[from * 4 + k]))) <=
        7;
    if (
      dist > 10 &&
      !(y > h * shadowY && dg < 0 && dg > -104 && color < 22 && smooth)
    )
      return;
    visited[i] = 1;
    queue[tail++] = i;
  }
  for (let x = 0; x < w; x++) {
    visit(x, -1);
    visit((h - 1) * w + x, -1);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w, -1);
    visit((y + 1) * w - 1, -1);
  }
  while (head < tail) {
    const i = queue[head++],
      x = i % w;
    if (x > 0) visit(i - 1, i);
    if (x < w - 1) visit(i + 1, i);
    if (i >= w) visit(i - w, i);
    if (i < n - w) visit(i + w, i);
  }
  for (let i = 0; i < n; i++) {
    if (visited[i]) {
      p[i * 4 + 3] = 0;
      continue;
    }
  }
  g.putImageData(frame, 0, 0);
  return c;
}
function bounds(c, minAlpha = 80) {
  const {data} = ctx(c).getImageData(0, 0, c.width, c.height);
  let l = c.width,
    t = c.height,
    r = -1,
    b = -1;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (data[(y * c.width + x) * 4 + 3] > minAlpha) {
        l = Math.min(l, x);
        r = Math.max(r, x);
        t = Math.min(t, y);
        b = Math.max(b, y);
      }
  if (r < 0) throw Error('Empty artwork');
  return [l, t, r - l + 1, b - t + 1];
}
function trim(c) {
  return crop(c, ...bounds(c));
}
function mask(c, path) {
  const out = surface(c.width, c.height),
    g = ctx(out);
  g.save();
  g.clip(new Path2D(path));
  g.drawImage(c, 0, 0);
  g.restore();
  return out;
}
function thumb(c) {
  const out = surface(256, 256),
    g = ctx(out),
    r = 228 / Math.max(c.width, c.height);
  g.drawImage(
    c,
    (256 - c.width * r) / 2,
    (256 - c.height * r) / 2,
    c.width * r,
    c.height * r,
  );
  return out;
}
function headMatrix(f) {
  const [ax, ay, bx, by] = f.eyes,
    dx = bx - ax,
    dy = by - ay,
    den = dx * dx + dy * dy;
  const a = (69 * dx - 9 * dy) / den,
    b = (-9 * dx - 69 * dy) / den;
  return [a, b, -b, a, 294 - a * ax + b * ay, 205 - b * ax - a * ay];
}
function headLayer(img, f, path) {
  const out = surface(),
    g = ctx(out);
  g.setTransform(...headMatrix(f));
  const part = mask(img, path);
  if (f.board === 'A4') {
    // 压低冠顶预留画面边距，保留眼睛与脸部的定位。
    g.drawImage(part, 0, 0, part.width, 156, 0, 25, part.width, 131);
    g.drawImage(
      part,
      0,
      156,
      part.width,
      part.height - 156,
      0,
      156,
      part.width,
      part.height - 156,
    );
  } else g.drawImage(part, 0, 0);
  return out;
}
function facePatch(img, f) {
  const cropped = headLayer(img, f, 'M0 0H600V300H0Z'),
    out = surface(),
    g = ctx(out);
  g.drawImage(cropped, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.filter = 'blur(3px)';
  g.beginPath();
  g.ellipse(329, 212, 62, 52, -0.12, 0, Math.PI * 2);
  g.fill();
  return out;
}
function withSmile(face) {
  // 在同一脸部纹理上收窄眼形并抬起嘴角；位移在五官边缘渐变为零。
  const out = surface(),
    g = ctx(out),
    source = ctx(face).getImageData(0, 0, W, H);
  const dest = new ImageData(new Uint8ClampedArray(source.data), W, H);
  for (let y = 164; y < 271; y++)
    for (let x = 263; x < 399; x++) {
      let sample = y;
      for (const [ex, ey] of [
        [294, 205],
        [363, 196],
      ]) {
        const dx = (x - ex) / 27,
          dy = (y - ey) / 22,
          r = dx * dx + dy * dy;
        if (r < 1) sample += 11 * dy * (1 - r) * 2 + 2 * (1 - r);
      }
      const mx = (x - 331) / 21,
        my = (y - 244) / 10,
        m = mx * mx + my * my;
      if (m < 1) sample += Math.abs(mx) * 6 * (1 - m);
      const lower = Math.floor(sample),
        t = sample - lower;
      for (let i = 0; i < 4; i++) {
        const a = source.data[(lower * W + x) * 4 + i],
          b = source.data[((lower + 1) * W + x) * 4 + i];
        dest.data[(y * W + x) * 4 + i] = a * (1 - t) + b * t;
      }
    }
  g.putImageData(dest, 0, 0);
  return out;
}
function bodyBase(legs) {
  const c = surface(),
    g = ctx(c);
  // 衣物之间共用颈部和小腿。
  const neck = g.createLinearGradient(302, 0, 359, 0);
  neck.addColorStop(0, '#d79770');
  neck.addColorStop(0.5, '#f1b88c');
  neck.addColorStop(1, '#efab7e');
  g.fillStyle = neck;
  g.fill(
    new Path2D(
      'M308 250H350L353 284Q359 297 375 302L352 336H311L286 302Q307 293 307 278Z',
    ),
  );
  const left = [
    [223, 276],
    [211, 268],
    [208, 263],
    [212, 258],
    [217, 254],
  ];
  const right = [
    [316, 368],
    [321, 376],
    [323, 379],
    [329, 378],
    [334, 373],
  ];
  for (const [center, edges] of [
    [287, left],
    [369, right],
  ]) {
    for (let y = 642; y < 944; y++) {
      const t = (y - 642) / 302,
        at = t * 3.999,
        k = Math.floor(at),
        u = at - k;
      const edge = edges[k].map((v, i) => v * (1 - u) + edges[k + 1][i] * u);
      const w = 55 - 20 * t + 7 * Math.sin(t * Math.PI * 1.55);
      g.drawImage(
        legs,
        edge[0],
        665 + t * 145,
        edge[1] - edge[0],
        1,
        center - w / 2,
        y,
        w,
        1,
      );
    }
  }
  return c;
}
function upperLayer(left, f, id, raiseCuff = false) {
  const raw = mask(left, f.upper),
    p = ctx(raw);
  if (id === 'start-a') {
    // 用斗篷对侧的同材质补齐编发下方的衣料，之后叠加可更换的辫子。
    p.save();
    p.clip(new Path2D('M345 247L404 243L407 335L395 354L362 354L355 314Z'));
    p.translate(643, 0);
    p.scale(-1, 1);
    p.drawImage(left, 0, 0);
    p.restore();
  }
  if (raiseCuff) {
    // 手从斗篷袖口抬起，厚衣摆自然下垂。
    const cuff =
      'M164 450Q182 457 202 474L180 499Q173 502 168 497L157 510L112 549L77 552L76 509L111 480L148 471Z';
    const hand = mask(raw, cuff);
    p.save();
    p.globalCompositeOperation = 'destination-out';
    p.fill(new Path2D(cuff));
    p.restore();
    p.save();
    p.globalCompositeOperation = 'destination-over';
    p.fillStyle = '#483a24';
    p.fill(new Path2D('M135 440L206 471L197 523Q171 509 149 479Z'));
    p.restore();
    p.save();
    p.translate(174, 454);
    p.rotate(1.45);
    p.translate(-183, -461);
    p.drawImage(hand, 0, 0);
    p.restore();
  }
  const out = surface(),
    g = ctx(out);
  if (id === 'mountain') {
    p.save();
    p.globalCompositeOperation = 'destination-over';
    p.fillStyle = '#28232b';
    p.fill(new Path2D('M308 386L333 385L341 438L304 438Z'));
    p.restore();
  }
  const sy = 179 / (f.waist - f.collar);
  for (let x = 0; x < raw.width; x++) {
    const distance = Math.abs(x - f.center);
    const blend = Math.max(0, Math.min(1, (distance - 60) / 88));
    const armScale = 290 / (562 - f.collar);
    const scale = sy * (1 - blend) + armScale * blend;
    g.drawImage(
      raw,
      x,
      0,
      1,
      raw.height,
      CX - f.center + x,
      285 - f.collar * scale,
      1,
      raw.height * scale,
    );
  }
  return out;
}
function lowerLayer(item, f) {
  const out = surface(),
    g = ctx(out);
  // 将腰头对齐，在下摆恢复各自的裙摆或裤腿宽度。
  const targetY = 450,
    ht = f.hem - targetY,
    targetWaist = 125;
  const y = Math.max(2, Math.round(item.height * 0.037));
  const row = ctx(item).getImageData(0, y, item.width, 1).data;
  let l = 0,
    r = item.width - 1;
  while (l < r && row[l * 4 + 3] < 100) l++;
  while (r > l && row[r * 4 + 3] < 100) r--;
  const waistScale = targetWaist / Math.max(1, r - l + 1),
    hemScale = f.lowerWidth / item.width;

  for (let i = 0; i < ht; i++) {
    const t = i / ht,
      s = waistScale + (hemScale - waistScale) * Math.min(1, t * 2.6);
    const w = item.width * s;
    g.drawImage(
      item,
      0,
      t * item.height,
      item.width,
      item.height / ht,
      CX - w / 2,
      targetY + i,
      w,
      1,
    );
  }
  return out;
}
function shoeLayer(left, item, f, id) {
  const out = surface(),
    g = ctx(out);
  const centers = [287, 369],
    sole = 975;
  if (f.shoe === 'boots') {
    const h = sole - f.shoeTop;
    const shoeWidth = id === 'start-b' ? 77 : 72;
    for (let i = 0; i < 2; i++) {
      const half = trim(
        crop(
          item,
          i * Math.floor(item.width / 2),
          0,
          Math.floor(item.width / 2),
          item.height,
        ),
      );
      g.drawImage(half, centers[i] - shoeWidth / 2, sole - h, shoeWidth, h);
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const part = crop(mask(left, wornShoes[f.board][i]), ...f.shoeRects[i]),
        h = sole - f.shoeTop,
        w = part.width;
      // 搭带鞋保留鞋口可见的脚背。
      g.drawImage(part, centers[i] - w / 2, sole - h, w, h);
    }
  }
  return out;
}
// 按肘部弯曲一侧衣袖的网格，另一侧袖子及躯干保持原位。
function waving(top, id) {
  const out = surface(),
    g = ctx(out);
  const input = ctx(top).getImageData(0, 0, W, H).data,
    dst = g.createImageData(W, H);
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const transform = (x, y) => {
    const puff = id === 'flower';
    const ex = puff ? 199 : 178,
      ey = puff ? 463 : 440;
    const edge = puff ? 250 : 260;
    const s = clamp((edge - x) / 50),
      bend = clamp((y - (ey - 43)) / 82);
    const angle = 1.92 * s * s * (3 - 2 * s) * bend * bend * (3 - 2 * bend);
    const dx = x - ex,
      dy = y - ey;
    return [
      ex + dx * Math.cos(angle) - dy * Math.sin(angle),
      ey + dx * Math.sin(angle) + dy * Math.cos(angle),
      x,
      y,
    ];
  };
  function paint(a, b, c) {
    const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(den) < 0.01) return;
    for (
      let y = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      y < Math.min(H, Math.ceil(Math.max(a[1], b[1], c[1])));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
        x < Math.min(W, Math.ceil(Math.max(a[0], b[0], c[0])));
        x++
      ) {
        const px = x + 0.5 - c[0],
          py = y + 0.5 - c[1];
        const u = ((b[1] - c[1]) * px + (c[0] - b[0]) * py) / den;
        const v = ((c[1] - a[1]) * px + (a[0] - c[0]) * py) / den,
          w = 1 - u - v;
        if (u < 0 || v < 0 || w < 0) continue;
        const sx = Math.floor(u * a[2] + v * b[2] + w * c[2]),
          sy = Math.floor(u * a[3] + v * b[3] + w * c[3]);
        const src = (sy * W + sx) * 4,
          to = (y * W + x) * 4;
        if (input[src + 3]) dst.data.set(input.subarray(src, src + 4), to);
      }
  }
  for (let y = 265; y < 730; y += 10)
    for (let x = 0; x < 660; x += 10) {
      const a = transform(x, y),
        b = transform(x + 10, y),
        c = transform(x + 10, y + 10),
        d = transform(x, y + 10);
      paint(a, b, c);
      paint(a, c, d);
    }
  g.putImageData(dst, 0, 0);
  return out;
}
function pack(layers) {
  const positions = {},
    atlasWidth = 1080,
    parts = [];
  let x = 2,
    y = 2,
    row = 0;
  for (const [key, c] of Object.entries(layers)) {
    const [dx, dy, w, h] = bounds(c, 4);
    if (x + w + 2 > atlasWidth) {
      x = 2;
      y += row + 4;
      row = 0;
    }
    positions[key] = [x, y, w, h, dx, dy];
    parts.push([c, dx, dy, w, h, x, y, w, h]);
    x += w + 4;
    row = Math.max(row, h);
  }
  const atlas = surface(atlasWidth, y + row + 2),
    g = ctx(atlas);
  for (const p of parts) g.drawImage(...p);
  return {
    frames: positions,
    image: atlas.toDataURL('image/webp', 0.96).split(',')[1],
  };
}
export async function buildSet(id) {
  const f = fittings[id],
    img = await source(f.board);
  const left = removeBackdrop(crop(img, 0, 0, 570, 1000), 0.9);
  const reference = ctx(crop(img, 0, 0, 1, 1000)).getImageData(
    0,
    0,
    1,
    1000,
  ).data;
  // 清除发丝、下颌和衣领之间封闭区域里的底色。
  const g = ctx(left),
    pixels = g.getImageData(0, 0, left.width, 395),
    px = pixels.data;
  for (let y = Math.floor(f.eyes[1]); y < Math.min(395, f.collar + 68); y++) {
    for (let x = 158; x < 468; x++) {
      const i = 4 * (y * left.width + x),
        d = Math.max(
          ...[0, 1, 2].map((k) => Math.abs(px[i + k] - reference[4 * y + k])),
        );
      if (d < 15) px[i + 3] = 0;
    }
  }
  g.putImageData(pixels, 0, 0);
  const items = f.tiles.map((r, index) => {
    if (index === 2) return trim(mask(img, hems[f.board]));
    if (index === 3) {
      const tile = removeBackdrop(crop(img, ...r), 1.01);
      const clipped = surface(tile.width, tile.height),
        g = ctx(clipped);
      g.translate(-r[0], -r[1]);
      g.clip(new Path2D(soles[f.board]));
      g.drawImage(tile, r[0], r[1]);
      return trim(clipped);
    }
    return trim(removeBackdrop(crop(img, ...r), 0.85));
  });
  const top = upperLayer(left, f, id);
  const layers = {
    hair: headLayer(left, f, f.head),
    top,
    wave: id === 'start-a' ? upperLayer(left, f, id, true) : waving(top, id),
    bottom: lowerLayer(items[2], f),
    shoes: shoeLayer(left, items[3], f, id),
  };
  if (f.frontHair) layers.braid = headLayer(left, f, f.frontHair);
  if (id === 'start-a') {
    layers.face = facePatch(left, f);
    layers.joy = withSmile(layers.face);
  }
  if (id === 'start-b') layers.base = bodyBase(left);
  const thumbs = Object.fromEntries(
    ['hair', 'top', 'bottom', 'shoes'].map((slot, i) => [
      slot,
      thumb(items[i]).toDataURL('image/webp', 0.94).split(',')[1],
    ]),
  );
  const cameo =
    id === 'start-a'
      ? thumb(trim(layers.hair)).toDataURL('image/webp', 0.94).split(',')[1]
      : undefined;
  return {...pack(layers), thumbs, cameo};
}
