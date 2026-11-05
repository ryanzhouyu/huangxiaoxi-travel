# 黄晓西换装与旅行回忆体验

以数字伙伴承载游客的贵州游玩经历，通过到访、收集、换装和纪念图片形成陪伴体验。当前有本地业务交互原型 v0.3.1，以及独立高保真视觉稿 v0.2；尚未接入正式账号、云端业务、支付或角色动画系统。

GitHub 私有仓库：[ryanzhouyu/huangxiaoxi-travel](https://github.com/ryanzhouyu/huangxiaoxi-travel)，默认分支 `main`。访问和克隆需要拥有此仓库权限的 GitHub 账号。

## 11 月 6 日客户演示

连续演示交付在 `codex/presenter-console-20261106` 分支。新电脑执行 `git clone -b codex/presenter-console-20261106 https://github.com/ryanzhouyu/huangxiaoxi-travel.git`，进入目录后运行 `.\Start-Local.ps1`。电脑投屏从[三栏演示台](http://127.0.0.1:8765/design/demo/stage.html)进入，开场、四个地点的模拟扫码、实操和回放都在同一窗口。也可单独打开[游客手账](http://127.0.0.1:8765/design/demo/index.html)。现场顺序与备用录屏见[演示者说明](design/demo/README.md)。

## 接手项目

- [AGENTS.md](AGENTS.md)：项目工作要求与设计、实施约束。
- [HANDOFF.md](HANDOFF.md)：当前阶段、下一步与关键未决事项，换电脑或新对话先看。
- [产品与开发文档](docs/README.md)：规则、流程、页面、架构、契约和验收的统一入口。
- [GitHub 与双机协作](docs/GitHub与双机协作.md)：首次推送、克隆、日常交接与不随 Git 同步的内容。
- [本机部署与接续验收](docs/本机部署与接续验收.md)：2026-10-20 新电脑启动、验证证据与继续工作的位置。
- [全页面 UI 调整方案与验收](docs/全页面UI调整方案与验收.md)：21 页逐页方案、统一修订与本轮验收；[状态截图索引](output/playwright/all-ui-review/gallery.html)包含全部 60 个验收展示视图。

## 在另一台电脑运行

把仓库完整克隆到本地：

```powershell
git clone https://github.com/ryanzhouyu/huangxiaoxi-travel.git
cd huangxiaoxi-travel
```

在仓库根目录启动：

```powershell
.\Start-Local.ps1
```

脚本优先使用本机 Codex 附带的 Python 3，也支持 PATH 中的 Python 3；已有本项目服务时直接复用。新启动时保持终端打开，按 Ctrl+C 停止。需要其他端口可传入 `-Port 8766`。也可在已配置 Python 的环境直接运行：

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

再打开：

- 高保真阅览：`http://127.0.0.1:8765/design/hifi/index.html#partner`
- 高保真总览：`http://127.0.0.1:8765/design/hifi/overview.html`
- 业务交互原型：`http://127.0.0.1:8765/design/index.html?v=3.1#partner`

高保真稿共 21 页及 31 个关键状态，登录和绑定仅为设计演示；原型演示账号进度只在当前浏览器保存。不能直接双击 index.html 运行 ES modules。

## 环境与检查

2026-11-05 当前工作机观察值：Node.js v24.14.0、npm 11.9.0、Python 3.12.14。换机使用不同版本时先执行检查，不把这些观察值当成已经验证过的兼容矩阵。

应用没有第三方运行时依赖，无需 `npm install` 或打包即可浏览。Node.js 用于语法与业务测试；只查看页面时 Python 静态服务即可。维护研究索引、渲染流程图或重建二维码时，可在独立 Python 环境安装 `requirements-tools.txt`。原归档中的部分绘图脚本使用 Windows 字体路径，非 Windows 运行这些维护脚本前需调整字体；已生成页面和图片不受影响。

```powershell
npm --prefix design run check
npm --prefix design test
python docs/check_docs.py
```

浏览器检查另需 Playwright CLI，准备及命令见[运行说明](design/README.md)和[高保真说明](design/hifi/README.md)。现有 JSON 记录是历史验证证据，不表示新电脑已经执行测试。

## 仓库目录

| 目录 | 内容与同步方式 |
| --- | --- |
| `docs/` | 当前规范、历史修订和文档检查脚本，纳入 Git |
| `design/` | 原型、测试、高保真稿及引用的概念资产，纳入 Git |
| `research/` | 用户原画板、研究依据、原始图片和离线索引，当前阶段保留同步 |
| `output/` | 已交付页面图及被文档引用的验收素材保留；临时复测图按忽略规则排除 |
| `.playwright-cli/` | 本机自动化会话和日志，忽略 |

角色概念图和原始参考均已保存到项目目录，正常查看无需依赖旧电脑的 generated_images 路径。正式美术、服务接入及技术选型的状态见 HANDOFF，不根据文件存在推断它们已经完成。
