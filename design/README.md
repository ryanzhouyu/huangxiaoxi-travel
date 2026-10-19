# 黄晓西运行与部署说明

更新日期：2026-10-19。当前应用 v0.3.1，是场景化游玩的本地交互原型；本次文档整理没有改变应用版本。产品和工程说明从[文档入口](../docs/README.md)进入。

另有独立的[高保真视觉设计](hifi/index.html#partner)和[逐页总览](hifi/overview.html)，包含正式登录／绑定草案，不读取或写入本原型进度；设计说明及单独检查见[hifi README](hifi/README.md)。

## 环境与启动

需要 Node.js／npm 执行业务检查，Python 运行静态服务；应用运行时为 HTML、CSS、原生 ES modules，无第三方运行时依赖，无打包步骤。当前命令已按 package.json 核对，不要求为了运行原型新增框架或安装构建链。

从工作区根目录选择一种启动方式；8765 已有本项目服务时直接复用：

```powershell
npm --prefix design start
```

或者：

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

访问 `http://127.0.0.1:8765/design/index.html?v=3.1#partner`。不能双击 file URL 运行 ES modules。当前只绑定本机地址，外部手机不能访问电脑的 127.0.0.1。

## 当前模块与配置

`data.mjs` 集中固定测试配置；`store.mjs` 处理本地业务及持久化；`app.mjs` 处理路由与交互；`game-ui.mjs` 渲染游玩页面；`visual.mjs/world.mjs` 绘制伙伴、场景、部件及图标；`postcard.mjs` 实际合成 PNG；`style.css` 为当前样式。

现配置一个测试景区、四个点位、一个活动、两池、三套初始搭配及 1／5／10 次测试套餐。修改业务配置先检查资产 ID、点位／池关联、奖励资格和所属景区；样例名称、价格及次数不是正式运营规则。目标模块拆分见[架构说明](../docs/模块架构与代码组织.md)，不能把目标目录当作现有文件。

## 检查命令与浏览器准备

```powershell
npm --prefix design run check
npm --prefix design test
python docs/check_docs.py
```

浏览器检查需要静态服务和 Playwright CLI 浏览器页面。已有 CLI 页面时复用；没有时先执行：

```powershell
npx --yes --package @playwright/cli playwright-cli open http://127.0.0.1:8765/design/index.html
```

再根据改动运行所需脚本，例如：

```powershell
npx --yes --package @playwright/cli playwright-cli run-code --filename design/tests/browser-flow.js
```

首次使用 CLI 可能需要安装其运行包及浏览器环境，按工具实际提示处理；这不是应用运行时依赖。其他脚本与结果变量见[测试与发布验收](../docs/测试与发布验收.md)。脚本使用独立上下文，不修改当前游客账号；控制台中的结果变量需另外读取后才能归档，执行脚本不会自动刷新已有 JSON 文件。当前结果文件保留的是 v0.3.1 历史证据。

## 部署与二维码

当前支持静态部署，不依赖服务器路由重写；hash 路由由前端解析。面向外部演示优先部署 design 运行文件及需要的测试二维码，不把整个研究目录、Git 或测试日志作为发布资源。

部署目录需包含 `index.html`、`style.css` 及七个 `.mjs` 运行模块；后续增加模块时同步部署依赖。可选提供 `test-points.html/test-codes/` 作演示。只部署 design 时，现有桌面说明和验收工具中的 `../docs/` 外链不包含在内；需要外部可读时另部署文档或在发布阶段处理这些外链，不宣称它们自然可用。

- 挂在站点根目录时，入口为 `https://实际域名/index.html`。
- 保留 `/design/` 子目录时，入口为 `https://实际域名/design/index.html`。
- 真正域名、托管平台及环境配置尚未确定；以上不是已创建的地址。

测试二维码脚本需 Node.js、Python 和 Python `qrcode` 包。部署地址确定后按实际入口重建，例如根目录部署：

```powershell
python design/tests/build_test_codes.py --base-url https://实际域名/index.html
```

base-url 不带 query 或 hash。脚本会重写 `design/test-points.html`、四张二维码及 manifest；不要在文档检查中顺手重建或改变当前测试码。部署后用手机实际扫码验证前置恢复与核验，码内容有效不证明实际到场。

## 进度、恢复与回退

业务数据在当前来源域的 localStorage，键为 `hxx.interactive.v2`；编辑会话在按账号隔离的 sessionStorage。A/B 是同浏览器中选择的身份，共享选择可在多标签同步，并非真正的云端认证。更换协议、域名或端口会进入另一份浏览器存储，不表示旧进度被迁移。

目前无内置存档导入导出工具。涉及存储迁移前先设计并验证备份／恢复机制；必要的人工备份通过浏览器开发工具保存在用户指定本地位置，不将游客数据提交仓库。不能用清空存储、重置账号或更换键名解决读取失败。

坏数据读取失败时保护原值；空间不足写入失败时不提交本次业务。大量 PNG 长期保存仍可能达到容量上限，未来作品文件存储在服务阶段设计。

文件版本回退时同步恢复引用的 CSS／模块及资源版本，保持依赖匹配；浏览器已有存档必须继续可读。存在数据迁移时，单纯替换旧静态文件不足以保证回退，需同时使用经过演练的数据恢复方案。历史界面在 `archive/v0.1` 和 `archive/v0.2`，仅作参考，不作为生产回退工具。

## 未接入与后续发布

尚无真实账号、云端同步、支付、定位、店员端、服务端权威结算及生产并发保证；静态公开部署不会补齐这些能力。角色和背景是代码示意，手机系统分享与相机完整链路需实机验证。

真实服务接入后在本文补充实际环境、身份及配置项、数据／文件存储、日志诊断和发布恢复步骤；当前不编造环境变量或服务地址。发布前执行[发布清单](../docs/测试与发布验收.md)。
