# 黄晓西 · 最新游客端精简交接包

2026-11-13 已与最新完整研发分支核对。源码基线为 **e5fb44a52c8b63fb6d0b3566e2f4094e08d134d7**（codex/production-frontend-plan-20261112）；不是较旧的 main。当前游客端、业务逻辑、配置、样式、图片和原始业务测试均从该提交原样保留。

本包仅省略设计稿、研究、录像、旧页面、讨论材料及独立投屏／准备台。**没有把当前原型改成正式上线版。** 原版本已有的本地身份、核验模拟、模拟购买和订单在本包保留，便于同事研究当前实现。正式首发免费、不开放购买的产品决定仍然有效，待双方确定接口后统一实施。

## 运行

需要 Python 3 和现代浏览器，无需安装前端依赖。在根目录运行：

```powershell
.\Start-Local.ps1
```

或：

```sh
python -m http.server 8767 --bind 127.0.0.1
```

打开[游客端](http://127.0.0.1:8767/design/demo/index.html)。8767 与原项目 8765 的浏览器存储隔离，不清空或迁移已有存档。不要双击 HTML；不要只复制 demo 子目录，其上层模块及 hifi 图标／图片仍是原版本依赖。

## 阅读顺序

- [HANDOFF](HANDOFF.md)：版本及接手边界。
- [业务规则](docs/业务规则.md)：已确认目标与当前模拟实现的区别。
- [后端研判说明](docs/后端研判说明.md)：代码入口、数据和需要同事评估的问题。
- [一致性与验收](docs/精简与验收.md)：与原版逐项对照及实际结果。

当前模块：app.mjs 管路由与交互，store.mjs 管本地业务，data.mjs 管测试配置，game-ui.mjs 与 demo/visual、views.mjs 管页面，demo/renderer.mjs 与 wardrobe-art.mjs 管静态角色，demo/postcard.mjs 管纪念图。world.mjs、visual.mjs、postcard.mjs 及 hifi 的少量资源虽然来自早期版本，仍被原控制器导入，故原样保留。

## 检查

检查需要 Node.js 和 npm，本轮使用 Node 24.12.0；页面运行本身不需要 Node。

```sh
npm --prefix design run check
npm --prefix design test
```

check 核验全部源文件哈希、模块导入、素材、文档与排除项；test 执行原版本业务测试。源文件清单见 [runtime-baseline.json](docs/runtime-baseline.json)，全部原文件的去留见 [file-inventory.csv](docs/file-inventory.csv)。没有生产构建、真实认证、云端进度或正式连续动画。

上一包 df2f47b 曾额外删除购买与旧渲染，并单独修复跨标签初始化；本次已撤回这些只存在于交接包的改动。后续修复应在统一开发基线上实施，再重新提取交接包。ZIP 不含 Git 历史；原仓库保留设计资料和全部历史。
