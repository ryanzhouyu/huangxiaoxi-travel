# 黄晓西项目接续说明

更新时间：2026-11-05。换电脑或开启新 Codex 对话时先读本文；业务规则以对应产品文档为准。

## 当前接手位置

- 当前处于**高保真视觉评审阶段**。业务原型 v0.3.1；高保真稿 v0.2 在 `design/hifi/`，覆盖 21 页、31 个清单关键状态及 8 个额外弹层，共 60 个展示视图。整套视觉仍待用户最终评审。
- 已按用户批准的方案完成首页及全页面 UI 修订：保留色彩、人物场景和功能结构，采用填色道具插画、轻纸面材质、可读字号，调整按钮比例及内距。没有改变业务原型、存档键或经济规则。
- 本次将上一轮尚未提交的源码、页面 PNG、验收资料和启动脚本一起整理提交，目标为私有仓库 [ryanzhouyu/huangxiaoxi-travel](https://github.com/ryanzhouyu/huangxiaoxi-travel) 的 `main`。实际同步状态用 `git fetch origin`、`git status -sb` 和 `git log -1` 核对，不在本文手填最新 SHA。
- 2026-11-05 已恢复本地预览。旧记录中“Git 身份缺失、未提交”描述的是 2026-10-20 当时状态，不作为本次交接结论。

## 新 Codex 接手步骤

1. 完整克隆仓库，或在已有目录先检查分支和未提交改动。工作区干净时再 `git pull --ff-only`，有改动时先保护和核对，不能直接覆盖。
2. 读取 [AGENTS.md](AGENTS.md)、本文和 [docs/README.md](docs/README.md)，再按具体任务查阅产品规则、设计和实施文件。
3. 从仓库根目录启动服务，打开首页、总览和状态截图索引，确认图片完整，再继续用户指定的评审或修改。
4. 业务改动先读 [产品规则](docs/一期产品规则与业务流程.md) 和 [测试与发布验收](docs/测试与发布验收.md)；只改 UI 时保留功能结构和数据行为，核对受影响页面的手机及桌面显示。

首次克隆：

```powershell
git clone https://github.com/ryanzhouyu/huangxiaoxi-travel.git
cd huangxiaoxi-travel
git status -sb
git log -1 --oneline
.\Start-Local.ps1
```

已有目录同步（工作区干净时）：

```powershell
git status -sb
git switch main
git pull --ff-only
.\Start-Local.ps1
```

私有仓库需要新电脑的 GitHub 访问权限。Windows 脚本自动查找 Codex 附带或 PATH 中的 Python 3，新启动服务时保持终端打开；支持 `-Port 8766`。其他系统可从根目录运行 `python -m http.server 8765 --bind 127.0.0.1`。没有应用依赖安装或打包步骤，不能双击 HTML 运行 ES modules。端口被其他项目占用时换端口，不终止不明服务。

| 预览内容 | 本地入口 |
| --- | --- |
| 高保真伙伴首页 | http://127.0.0.1:8765/design/hifi/index.html#partner |
| 21 页总览 | http://127.0.0.1:8765/design/hifi/overview.html |
| 60 个展示视图及验收证据 | http://127.0.0.1:8765/output/playwright/all-ui-review/gallery.html |
| 可实际导出 PNG 的业务原型 | http://127.0.0.1:8765/design/index.html?v=3.1#partner |

## 修改入口与资料

| 内容 | 当前入口 |
| --- | --- |
| 高保真页面、状态及构图 | `design/hifi/catalog.mjs`、`pages.mjs`、`app.mjs` |
| 伙伴首页 | `design/hifi/partner-page.mjs`、`partner.css` |
| 共用道具插画 | `design/hifi/partner-art.mjs` 经 `art.mjs` 按语义复用 |
| 共用材质、文字、按钮、弹层 | `design/hifi/ui-system.css` |
| 分页样式 | `design/hifi/` 下 `ui-auth.css`、`ui-journey.css`、`ui-wardrobe.css`、`ui-memory.css`、`ui-account.css` |
| 业务原型职责 | [运行说明](design/README.md)、[模块架构](docs/模块架构与代码组织.md) |
| 最新逐页方案与验收 | [全页面 UI 调整方案与验收](docs/全页面UI调整方案与验收.md) |
| 首页专项历史依据 | [伙伴首页 UI 修订与验收](docs/伙伴首页UI修订与验收.md) |
| 启动与跨机协作 | [README](README.md)、[GitHub 与双机协作](docs/GitHub与双机协作.md) |

## 验收记录如何使用

2026-10-20 的 UI 验收结果在 `output/playwright/all-ui-review/`：四尺寸 240 视图共 1743 项检查、交互及对比度 70 项、高保真回归 216 项、首页专项 141 项、业务浏览器主线 91 项均通过；实际纪念 PNG 已下载并打开检查。范围、两轮问题及限制见逐页验收文档。`page-manifest.json` 记录逐页实现及图片哈希，`gallery.html` 提供截图入口。

以上是**历史执行证据**，不表示新电脑已执行或用户已认可最终视觉。`design/hifi/verification.json` 属于更早的 v0.1 历史记录。本次同步复核单独见 [2026-11-05 检查记录](output/handoff/2026-11-05/sync-checks.json)，没有将旧浏览器验收写成今日重新执行。

常用检查（需要 Node.js／npm 和可用的 Python 3）：

```powershell
npm --prefix design run check
npm --prefix design test
python docs/check_docs.py
```

高保真新增模块需另做 `node --check`。浏览器验收需启动服务并准备独立 Playwright 上下文，脚本及结果变量见 [高保真说明](design/hifi/README.md)。不要清空用户浏览器进度测试。

## 下一步与未决事项

1. 按用户下一次明确反馈继续整套视觉评审，重点是图标与精细人物场景的协调、字号、按钮内距和页面平衡。保留“伙伴／游玩／回忆”三个主场景。
2. 视觉方向明确后，再讨论固定身份角色母版、分层素材、逐件穿戴、动作与互动需求，并以小型验证确定渲染技术。当前概念形象和部件图集不是生产换装资产，不具备真实逐件穿戴及动画能力。
3. 正式登录与绑定已设计、接入后置。短信／微信渠道、手机号是否必须、恢复及冲突合并政策仍待确认。
4. 真实账号、云同步、支付、定位和店员核验未接入。高保真展示独立设计场景；实际本地业务进度及 PNG 导出在业务原型中验证。不能自行开始生产衣橱、账号服务或大规模重构。
5. 地图摘要面板及收齐后剩余次数用途仍是建议，不擅自加入清零、兑换、有效期或退款规则。后续工程化见 [实施计划](docs/开发实施任务与里程碑.md)。

## 不随 Git 迁移的内容

聊天上下文、Codex／GitHub 登录、本机工具配置、服务进程、浏览器 localStorage／sessionStorage 不随仓库同步。新浏览器出现新演示进度是预期行为，当前没有一键存档迁移工具。不复制凭证、整个用户目录或旧电脑代理端口。依赖环境、临时日志及浏览器自动化会话已忽略；查看所需素材和正式截图保留在仓库。

## 可直接复制给另一端 Codex

> 请在克隆的 huangxiaoxi-travel 仓库根目录工作，先读取 AGENTS.md、HANDOFF.md、docs/README.md，核对分支、最新提交和未提交改动，再按 README 启动本地预览。当前业务原型 v0.3.1，高保真 v0.2 已完成 21 页 UI 修订和历史验收，仍处于视觉评审阶段。请先概括当前状态和未决事项，保留已确认规则和已有工作，然后继续我本次指定的任务。正式账号、云同步、支付及生产角色换装／动作尚未接入，不要自行开发这些能力或大规模重构；历史验收不能冒充新环境实测。

完成实质阶段后更新本文的状态、决定和下一步，与代码、规范及必要证据一起提交。提交号与推送结果以实际 Git 状态为准。
