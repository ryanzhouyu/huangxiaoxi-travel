// 仅用于确认稿的人像边缘。衣料保留独立的剪影，避免浅色衬衫和米白底色一起消失。
export function refinePortrait(canvas, paper, fit) {
  const g = canvas.getContext('2d', {willReadFrequently: true});
  const w = canvas.width,
    h = Math.min(398, canvas.height);
  const frame = g.getImageData(0, 0, w, h);
  const source = frame.data.slice(),
    out = frame.data;
  // 银冠、发梳、花簪及耳坠本身有亮色高光，不能按深色发丝的透光比例扣掉。
  const ornaments = {
    A1: [
      [353, 68, 426, 151],
      [364, 263, 399, 312],
    ],
    A2: [
      [296, 16, 367, 73],
      [210, 220, 246, 278],
      [346, 204, 376, 273],
    ],
    C3: [
      [312, 24, 414, 105],
      [245, 218, 275, 281],
      [366, 205, 397, 269],
    ],
    A4: [
      [148, 4, 445, 205],
      [222, 241, 254, 297],
      [345, 229, 385, 294],
    ],
    B5: [
      [314, 27, 421, 141],
      [242, 221, 274, 285],
      [373, 208, 410, 280],
    ],
    A6: [
      [330, 29, 459, 185],
      [249, 219, 283, 282],
      [375, 210, 413, 275],
    ],
  };
  const keep = new Uint8Array(w * h);
  for (const [x1, y1, x2, y2] of ornaments[fit.board])
    for (let y = y1; y < y2; y++) keep.fill(1, y * w + x1, y * w + x2);
  const distance = new Uint8Array(w * h);
  for (let i = 0; i < distance.length; i++) {
    const j = i * 4,
      b = Math.floor(i / w) * 4;
    const contrast = Math.max(
      ...[0, 1, 2].map((k) => Math.abs(source[j + k] - paper[b + k])),
    );
    distance[i] = source[j + 3] && (keep[i] || contrast > 19) ? 32 : 0;
    if (!distance[i]) out[j + 3] = 0;
  }
  // 耳环内和耳旁发丝围出的原纸色是成片的，金属反光则通常是小亮点。
  const visited = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  const paperPixel = (i) => {
    if (i < 0 || i >= w * h || visited[i] || !keep[i] || !distance[i])
      return false;
    const j = 4 * i,
      b = 4 * Math.floor(i / w);
    return (
      Math.max(
        ...[0, 1, 2].map((k) => Math.abs(source[j + k] - paper[b + k])),
      ) < 15
    );
  };
  for (let i = (Math.ceil(fit.eyes[1]) + 8) * w; i < w * h; i++) {
    if (!paperPixel(i)) continue;
    let count = 1;
    queue[0] = i;
    visited[i] = 1;
    for (let n = 0; n < count; n++) {
      const p = queue[n];
      for (const q of [p - 1, p + 1, p - w, p + w])
        if (paperPixel(q)) {
          visited[q] = 1;
          queue[count++] = q;
        }
    }
    if (count < 12) continue;
    for (let n = 0; n < count; n++) {
      const q = queue[n];
      distance[q] = 0;
      out[4 * q + 3] = 0;
    }
  }
  // 到轮廓的像素距离；只在窄边带内估计混合比例。
  for (let y = 1; y < h; y++)
    for (let x = 1; x < w; x++) {
      const i = y * w + x;
      distance[i] = Math.min(
        distance[i],
        1 + distance[i - 1],
        1 + distance[i - w],
      );
    }
  for (let y = h - 2; y >= 0; y--)
    for (let x = w - 2; x >= 0; x--) {
      const i = y * w + x;
      distance[i] = Math.min(
        distance[i],
        1 + distance[i + 1],
        1 + distance[i + w],
      );
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        radius = distance[i];
      if (!radius || radius > (keep[i] ? 2 : 9)) continue;
      const j = i * 4,
        b = y * 4;
      const rgb = [0, 1, 2].map((k) => source[j + k] - paper[b + k]);
      let alpha = 1,
        best = 0;
      // 用同一缕发丝内侧的颜色反推覆盖率；颜色方向不符的银饰、皮肤不得用来推断发色。
      for (let dy = -6; dy <= 6; dy += 2)
        for (let dx = -6; dx <= 6; dx += 2) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
          const q = yy * w + xx;
          if (distance[q] <= radius && !(radius <= 2 && distance[q] >= 1))
            continue;
          const v = [0, 1, 2].map((k) => source[q * 4 + k] - paper[b + k]);
          const norm = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
          if (norm < 400) continue;
          const t = (rgb[0] * v[0] + rgb[1] * v[1] + rgb[2] * v[2]) / norm;
          if (t <= 0 || t >= 1) continue;
          const err = Math.max(
            ...v.map((value, k) => Math.abs(rgb[k] - t * value)),
          );
          const score =
            ((1 - t) * Math.max(0, 1 - err / 20)) /
            (1 + 0.025 * (Math.abs(dx) + Math.abs(dy)));
          if (score > best) {
            best = score;
            alpha = t;
          }
        }
      if (!best) continue;
      alpha =
        1 -
        (1 - alpha) * Math.min(1, best * 8) * Math.min(1, (10 - radius) / 4);
      if (keep[i]) alpha = Math.max(0.82, alpha);
      if (alpha < 0.12) {
        out[j + 3] = 0;
        continue;
      }
      for (let k = 0; k < 3; k++) out[j + k] = paper[b + k] + rgb[k] / alpha;
      out[j + 3] = Math.round(255 * alpha);
    }
  g.putImageData(frame, 0, 0);
}
