# 黔山同行高保真原型

从仓库根目录运行 `python -m http.server 8782 --bind 127.0.0.1`，打开[游客原型](http://127.0.0.1:8782/design/review/index.html)。独立的[评审工具](http://127.0.0.1:8782/design/review/desk.html)提供凭证与故障复验。也可执行 `.\Start-Local.ps1`，通过 8765 访问。

直接从磁盘打开游客入口时，使用页面上的「进入游客预览」跳转到本机的 8782 端口。预览服务停止时，可在仓库根目录运行 `.\Start-Local.ps1 -Port 8782` 再打开该链接。

1. 用评审号码 `10000000001` 或 `10000000002` 进入，验证码为 `410625`。使用独立浏览器上下文重走新身份流程。
2. 选一身初始装扮，打开游玩地图，领见面礼并试穿。评审工具提供四个点位链接及活动凭证。直接开点位链接可复查登录、初始化和回到原地点的过程。
3. 确认有效到访，进卡池抽取，试穿并保存，选择经历和模板，生成、收藏并保存到设备。作品详情提供来源和分享回退。
4. 要试故障，在评审工具设置一次失败或响应丢失，进入对应页面操作。响应丢失后可刷新再查原结果。

[本轮场景回调对照](../../output/frontend-review/2026-11-18/scene-revision/index.html) · [上一轮评审画廊](../../output/frontend-review/2026-11-18/index.html) · [逐页复盘与优化规格](../../docs/前端体验优化与评审.md) · [前后端动作交接](../../docs/前端动作与服务交接.md)

评审原型使用本地测试身份与凭证，进度键为 `hxx.review.v1`。编辑数据按账号与标签页保留，合成结果在保存前处于预览状态。正式身份、核验、配置与动画按交接继续实施。

页面按身份、游玩、装扮、回忆拆分。路由和编辑上下文在入口协调，评审服务负责资格、余额和入库，复用原型领域规则。人物和出图复用确认素材及渲染器。提取正式工程时按素材依赖表迁移，并替换评审服务。

浏览器复验使用本机 Chrome。环境变量 `HXX_PLAYWRIGHT` 指向已安装的 Playwright 包，或使用 Node 可解析的 Playwright。启动 8782 后运行 `node design/review/tests/experience.mjs`。可用 `HXX_REVIEW_URL` 切换服务地址，用 `HXX_REVIEW_OUT` 切换输出路径。默认报告、截图和图片写入忽略目录 `.codex/frontend-review/after/`。

衣橱验证使用[独立入口](http://127.0.0.1:8782/design/review/wardrobe-study/)、[设计及验收说明](../../docs/衣橱验证设计.md)和[同数据对照](../../output/wardrobe-study/2026-11-18/index.html)。启动同一服务后运行 `node design/review/tests/wardrobe-study.mjs`。若使用其他本地端口，可设 `HXX_STUDY_ORIGIN`，如 `http://127.0.0.1:8765`；用 `HXX_STUDY_OUT` 可切换验证输出目录。

本轮[下方选衣候选](http://127.0.0.1:8782/design/review/wardrobe-study/?layout=atelier)见[竞品与同屏对照](../../docs/衣橱竞品调研与视觉复验.md)。复验命令与上面相同，另设 `HXX_STUDY_LAYOUT=atelier` 即检查候选及横滑。默认输出目录为 `.codex/wardrobe-layout-study`。

[大图选衣候选](http://127.0.0.1:8782/design/review/wardrobe-study/?layout=atelier&picker=detail)复验用 `HXX_STUDY_LAYOUT=detail`，默认输出目录为 `.codex/wardrobe-detail-study`。对照和浏览器记录见[底部操作与大图对照](../../output/wardrobe-detail-review/2026-11-18/index.html)。

[完整网格候选](http://127.0.0.1:8782/design/review/wardrobe-study/?layout=atelier&picker=grid)复验设 `HXX_STUDY_LAYOUT=grid`，默认输出目录为 `.codex/wardrobe-grid-study`。附加 `profile=stress` 打开 30 件测试上装，包含试验配色。浏览、试穿和保存回归见[网格评审记录](../../output/wardrobe-grid-review/2026-11-18/index.html)。

游客入口已接入确认衣橱和旅行手账。主线、导出及恢复复验用 `node design/review/tests/experience.mjs`，五档视口的同数据图稿用 `node design/review/tests/integration-visual.mjs`。后者可通过 `HXX_VISUAL_OUT` 指定输出目录。[接入与实屏验收](../../docs/衣橱与回忆接入计划.md)

伙伴、游玩和回忆共用 `ui.mjs` 的主导航及 `main-scenes.css` 的样式，背景由各主场景延伸至屏底。运行 `node design/review/tests/main-scenes.mjs` 检查导航、首页动作、实际搭配与底部安全区。输出目录可通过 `HXX_MAIN_OUT` 指定。[首页构图与细节对照](../../output/partner-restored/2026-11-18/index.html)
