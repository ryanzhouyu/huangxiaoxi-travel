# 黄晓西换装与旅行回忆体验

以黄晓西数字伙伴承载游客的贵州游玩经历，通过到访、收集、换装和纪念图形成陪伴体验。当前可运行成果是采用「黔山同行」视觉的游客演示与三栏投屏台；进度保存在本浏览器。真实账号、云端进度和连续角色动画是已确认的下一阶段目标，尚未实现。

私有仓库：[ryanzhouyu/huangxiaoxi-travel](https://github.com/ryanzhouyu/huangxiaoxi-travel)。**最新接手分支、冻结演示版本及验收状态只看 [HANDOFF](HANDOFF.md)**，默认分支 `main` 暂不代表最新演示成果。

## 启动当前成果

首次获取当前账号／动画设计与契约验证分支：

```powershell
git clone -b codex/account-animation-design-20261108 https://github.com/ryanzhouyu/huangxiaoxi-travel.git
cd huangxiaoxi-travel
.\Start-Local.ps1
```

已有工作目录先按[双机协作](docs/GitHub与双机协作.md)核对分支和改动，不能直接覆盖。Windows 脚本会查找 Python 3，已有本项目服务时复用，新启动时保持终端打开；端口冲突可传 `-Port 8766`。其他系统或已配置 Python 的环境可在根目录运行 `python -m http.server 8765 --bind 127.0.0.1`。

| 用途 | 入口 |
| --- | --- |
| 当前游客演示 | [打开游客页](http://127.0.0.1:8765/design/demo/index.html) |
| 电脑三栏投屏与存档备份 | [打开演示台](http://127.0.0.1:8765/design/demo/stage.html) |
| 已确认整套视觉 | [黔山同行设计说明](docs/高保真设计说明.md) |
| 已确认六套服装与重建来源 | [拆件说明](reviews/2026-11-05-wardrobe/selected/README.md) |
| 早期业务原型／独立高保真稿 | [历史入口与依赖说明](design/README.md) |

不能双击 HTML 运行 ES modules。本机地址仅供本机访问；新电脑需独立启动服务。演示 A/B 手账不是正式账号，浏览器存档不随 Git 迁移；可由演示台手动备份／载入。

## 工作与资料入口

- [AGENTS](AGENTS.md)：工作方法、模块化、视觉检查和交付标准。
- [HANDOFF](HANDOFF.md)：当前状态、分支、能力边界和下一步。
- [文档索引](docs/README.md)：现行规则、工程草案、视觉基线和历史证据。
- [详细实施计划](docs/开发实施任务与里程碑.md)：下一阶段目标、45 项任务、61 项未来验收用例与阶段关口；真实账号、云端与动画尚未实施。
- [R00 阶段结果](docs/R00阶段验收记录.md)：范围确认、素材盘点、隔离设计与实际证据；G0 已通过；后续接续进度见下项。
- [账号与动画接续结果](docs/账号动画接续执行记录.md)：账号状态与接口、动画制作规格、演示迁移设计、23 项验证及资源缺口；G1/G2 尚未通过。
- [项目复盘与资料整理记录](docs/项目复盘与资料整理记录.md)：经验教训、保留／归档／精简清单及本轮验收。
- [运行说明](design/README.md)：模块位置、环境与检查；[演示者说明](design/demo/README.md)：复演顺序。
- [双机协作](docs/GitHub与双机协作.md)：克隆、日常同步、证据及存档迁移边界。

应用运行没有第三方包依赖，无需安装应用依赖或打包；Node.js／npm 用于语法及规则检查，Python 用于静态服务和文档检查。二维码或素材维护工具另见 `requirements-tools.txt`。具体环境以本次验收报告为准，历史版本观察值不是兼容性保证。

```powershell
npm --prefix design run check
npm --prefix design test
python docs/check_docs.py
```

浏览器验收另需 Playwright 和 Chrome，准备及脚本见运行说明。历史 JSON 和录屏只证明当时版本的结果，不代替新环境验证。

## 仓库范围

`design/` 保存运行代码、设计稿与必要素材；`docs/` 保存规范与历史记录；`research/` 保存原画板和研究依据；`reviews/` 区分已确认及未采用设计；`output/` 保存被交付或引用的证据；`specs/alpha/` 保存未接入运行时的候选可执行契约及隔离实验。各组处理依据见[资料整理记录](docs/项目复盘与资料整理记录.md)。

`design/hifi/`、`output/` 均有当前页面实际依赖，不能按旧文件或输出目录批量移除。凭证、浏览器个人存档、缓存和本机环境不提交；正式素材生产及服务方案仍待验证。
