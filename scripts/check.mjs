// 不依赖第三方工具，检查交接包是否自包含；浏览器体验仍须另验。
import {readdir, readFile, access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASSETS, OUTFITS} from '../design/data.mjs';
import {frames} from '../design/demo/assets/wardrobe/frames.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const ignored = new Set(['.git', '.codex', '.playwright-cli', 'node_modules', 'output', '__pycache__']);
async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, {withFileTypes: true})) {
    if (ignored.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(p));
    else files.push(p);
  }
  return files;
}
const files = await walk(root);
const relative = p => path.relative(root, p).replaceAll('\\', '/');
const sources = files.filter(p => /\.(mjs|js)$/.test(p));
for (const p of sources) {
  const r = spawnSync(process.execPath, ['--check', p], {encoding: 'utf8'});
  if (r.status !== 0) errors.push({file: relative(p), kind: 'syntax', detail: r.stderr});
}

const graph = new Map();
let referenceCount = 0;
const optionalReferences = [];
async function reference(file, ref, module = false) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(ref) || ref.includes('${')) return;
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (!clean) return;
  const target = path.resolve(path.dirname(file), clean);
  // 原控制器保留对独立投屏宿主页的条件判断；该入口不属于游客端交接范围。
  if (relative(file) === 'design/app.mjs' && relative(target) === 'design/demo/stage.html') {
    optionalReferences.push({file:relative(file),ref,reason:'external presentation host excluded'});
    return;
  }
  const location = path.relative(root, target);
  if (location.startsWith('..') || path.isAbsolute(location)) {
    errors.push({file: relative(file), kind: 'outside-package', ref});
    return;
  }
  referenceCount++;
  try { await access(target); }
  catch { errors.push({file: relative(file), kind: 'missing-reference', ref}); }
  if (module) {
    if (!graph.has(file)) graph.set(file, []);
    graph.get(file).push(target);
  }
}
for (const p of files.filter(p => /\.(mjs|js|css|html|md)$/.test(p))) {
  const text = await readFile(p, 'utf8');
  if (/\.(mjs|js)$/.test(p)) {
    for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g)) {
      if (m[1].startsWith('.')) await reference(p, m[1], true);
    }
    for (const m of text.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g)) await reference(p, m[1]);
  }
  if (p.endsWith('.html')) for (const m of text.matchAll(/(?:src|href)="([^"#]+)"/g)) await reference(p, m[1], /\.mjs$/.test(m[1]));
  if (p.endsWith('.css')) for (const m of text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) await reference(p, m[1]);
  if (p.endsWith('.md')) for (const m of text.matchAll(/\]\(([^)]+)\)/g)) await reference(p, m[1]);
}

// 找出交付中游离于唯一入口之外的运行模块。
const reached = new Set();
function visit(p) {
  if (reached.has(p)) return;
  reached.add(p);
  for (const child of graph.get(p) || []) visit(child);
}
visit(path.join(root, 'design/demo/index.html'));
for (const p of sources.filter(p => relative(p).startsWith('design/') && !relative(p).includes('/tests/'))) {
  if (!reached.has(p)) errors.push({file: relative(p), kind: 'unreachable-runtime-module'});
}

const manifest = JSON.parse(await readFile(path.join(root, 'docs/runtime-baseline.json'), 'utf8'));
for (const item of manifest.files) {
  try {
    const raw = await readFile(path.join(root, item.path));
    if (raw.length !== item.bytes || createHash('sha256').update(raw).digest('hex') !== item.sha256) errors.push({file:item.path, kind:'differs-from-latest-source'});
  } catch { errors.push({file:item.path,kind:'missing-source-file'}); }
}
// 动态 URL 无法靠文本扫描枚举，按当前配置和帧表查全所有衣服及部件。
for (const outfit of OUTFITS) {
  if (!frames[outfit.id]) errors.push({kind:'missing-frames',id:outfit.id});
  await reference(path.join(root, 'design/demo/index.html'), 'assets/wardrobe/'+outfit.id+'.webp');
}
for (const asset of ASSETS.filter(a=>a.outfit)) await reference(path.join(root, 'design/demo/index.html'), 'assets/wardrobe/'+asset.id+'.webp');

const forbiddenPaths = /^(?:research\/|reviews\/|specs\/|design\/(?:archive\/|index\.html|test-points\.html)|design\/hifi\/.*\.html|design\/demo\/(?:stage\.html|presenter\.))/;
for (const p of files) if (forbiddenPaths.test(relative(p))) errors.push({file:relative(p),kind:'excluded-content'});
const runtime = sources.filter(p=>relative(p).startsWith('design/')&&!relative(p).includes('/tests/'));
for (const p of runtime) {
  if (!manifest.files.some(item=>item.path===relative(p))) errors.push({file:relative(p),kind:'runtime-not-in-baseline'});
}
console.log(JSON.stringify({passed:!errors.length,files:files.length,syntaxModules:sources.length,runtimeModules:runtime.length,localReferences:referenceCount,exactSourceFiles:manifest.files.length,verifiedImages:manifest.files.filter(i=>/\.(png|webp)$/.test(i.path)).length,optionalReferences,errors},null,2));
if (errors.length) process.exitCode = 1;
