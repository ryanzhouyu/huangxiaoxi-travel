# 黄晓西运行与模块说明

更新日期：2026-11-08。当前游客演示位于 `design/demo/`，复用 v0.3.1 共享业务控制器及领域规则；package.json 的 v0.3.1 是原型包版本，不是连续动画或云端产品的发布号。版本与分支见 [HANDOFF](../HANDOFF.md)。

## 启动与环境

从仓库根目录启动 `.\Start-Local.ps1`，已有本项目 8765 服务时复用；其他端口用 `-Port 8766`。也可选择：

```powershell
npm --prefix design start
```

或者 `python -m http.server 8765 --bind 127.0.0.1`。需要 Python 3；语法和业务测试需要 Node.js／npm。运行时为 HTML、CSS、原生 ES modules，无第三方运行时依赖，无安装应用包或打包步骤。不能双击 HTML 运行，电脑的 127.0.0.1 也不能供另一部手机访问。

| 用途 | 入口与状态 |
| --- | --- |
| 当前游客演示 | [demo/index.html](http://127.0.0.1:8765/design/demo/index.html) |
| 三栏投屏台 | [demo/stage.html](http://127.0.0.1:8765/design/demo/stage.html)，准备／备份／回放与游客业务分离 |
| 旧单页准备台 | [demo/presenter.html](http://127.0.0.1:8765/design/demo/presenter.html)，仍可使用 |
| 早期可操作原型 | [index.html?v=3.1](http://127.0.0.1:8765/design/index.html?v=3.1#partner)，独立存档 |
| 历史高保真 v0.2 | [hifi/index.html](http://127.0.0.1:8765/design/hifi/index.html#partner)、[21 页总览](http://127.0.0.1:8765/design/hifi/overview.html)，账号／绑定为草案 |

## 当前模块与依赖

| 入口 | 实际职责 |
| --- | --- |
| `demo/start.mjs`、`demo/profile.mjs` | 素材加载和演示适配装配 |
| `app.mjs`、`game-ui.mjs` | 共享导航守卫、交互、草稿与场景页面 |
| `store.mjs`、`data.mjs` | 本地业务、结构校验及固定配置 |
| `demo/storage.mjs` | 演示存储映射、批次与账号隔离 |
| `demo/views.mjs`、`demo/visual/pages.mjs`、`demo/visual/journal.mjs` | 演示页面、状态、场景及手账呈现 |
| `demo/wardrobe-art.mjs`、`demo/renderer.mjs`、`demo/assets/wardrobe/` | 透明图集与静态姿势、角色及单品渲染 |
| `demo/postcard.mjs`、`demo/visual/print.mjs` | PNG 合成与纪念图构图 |
| `demo/visual/*.css`、`demo/assets/scenes/` | 现行视觉样式与场景；不能仅改原型 style.css 判断演示效果 |
| `demo/stage/` | 三栏导航、只读实况、确认式备份／载入及回放 |
| `hifi/art.mjs` 及其依赖、`hifi/assets/` | 部分图标、地图和夜景仍被演示引用，虽然 hifi 页面是历史稿 |
| `visual.mjs`、`world.mjs`、`postcard.mjs`、`style.css` | 原型示意渲染／合成／样式，不能与 demo 同名能力混淆 |

固定测试配置包含一个景区、四个点位、一个活动、两池、三套初始搭配及 1／5／10 次套餐。名称、价格和样例数量不等于正式运营决策。详见[演示代码索引](demo/README.md#代码与存档)、[架构草案](../docs/模块架构与代码组织.md)。目标目录尚未整体落地。

## 检查及输出

```powershell
npm --prefix design run check
npm --prefix design test
python docs/check_docs.py
```

check 只覆盖 package.json 列出的共享模块，新增／改动的其他 JS 还需对应 `node --check`。test 执行本地域规则测试，不证明真实服务并发、手机权限或视觉合格。

文档检查默认写 `.codex/local-deploy/docs-check.json`，不覆盖历史报告。需正式归档时显式指定：

```powershell
python docs/check_docs.py --report output/housekeeping/2026-11-08/docs-check.json
```

浏览器检查与应用运行依赖分开。当前演示检查的 Playwright 包路径、Chrome、录屏组件及命令见 [demo/README](demo/README.md#复验)。其中 `node design/demo/tests/stage.mjs` 的普通模式写忽略目录；`--record` 和演示完整复演会覆盖既有输出，重跑前应选择临时副本或明确归档目标，不能无意改写历史证据。

早期原型脚本使用 Playwright CLI，先启动服务，再按需执行：

```powershell
npx --yes --package @playwright/cli playwright-cli open http://127.0.0.1:8765/design/index.html
npx --yes --package @playwright/cli playwright-cli run-code --filename design/tests/browser-flow.js
```

这些脚本用独立上下文；输出变量及验收矩阵见[测试与发布验收](../docs/测试与发布验收.md)。旧 JSON 是历史结果，新执行需另记日期／版本并查看截图。

## 部署与测试码

当前只有静态本地预览方案，正式托管、域名、身份及存储尚未确定。演示实际依赖 demo、共享模块／样式、hifi 部分模块／图片和三栏回放的 `output/stage-rehearsal/`；不能只拷贝 demo 目录或沿用旧“七个模块”清单发布。

对外部署时应从实际引用生成发布资源清单并验收，不把 .git、研究目录、个人存档或本机工具日志公开。只部署运行资源时，设计／证据链接需单独处理。原型单独部署与整套演示部署不是同一清单。

测试码脚本 `design/tests/build_test_codes.py` 需要 Node.js、Python 及 qrcode 包，支持 `--base-url`，但会重写二维码、manifest 与测试点位页。只有确定实际入口及部署范围后才重建；不要在文档检查时顺手生成。正式手机扫码需可达 URL、完整登录／初始化恢复和现场核验方案，码解析成功不证明到场。

## 存储、恢复与能力边界

原型 localStorage 键为 `hxx.interactive.v2`，演示为 `hxx.demo.v1`；草稿依身份／演示批次隔离。A/B 是本机身份，不是真实认证。更换协议、域名或端口会使用另一份存储。

演示台具备下载备份、验证载入、明确确认后重新开场的工具；旧原型不借此自动获得迁移工具。备份涉及演示手账，个人文件不提交 Git。坏数据读取时保护原值，写入失败不提交本次业务，不能通过换键、清空或复位修复。大量 PNG 仍受浏览器容量限制。

回退须保持模块与资源版本一致，数据迁移另需兼容和恢复方案；`archive/v0.1`、`archive/v0.2` 是历史体验，不作为生产回退工具。

真实账号、云端进度、支付、定位和店员服务未接入；静态姿势／表情不等于连续动画。新阶段先做账号与动画样板方案；真实手机相机、系统分享及动画性能仍需实机验证。
