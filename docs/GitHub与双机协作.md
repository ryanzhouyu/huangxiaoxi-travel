# 黄晓西 GitHub 管理与双机协作

更新日期：2026-10-19。建议用一个私有 GitHub 仓库管理当前项目，以 Git 提交同步文件，以 HANDOFF 恢复工作上下文。保留现有目录，避免第一次同步同时搬迁文件、修改路径或改技术栈。

本轮只准备忽略规则、换行约定、项目入口和接续说明；没有创建 GitHub 仓库、添加远端、提交或推送。之后的实际状态使用 Git 命令查询。

## 应同步哪些内容

| 内容 | 当前处理 | 原因 |
| --- | --- | --- |
| `AGENTS.md`、`HANDOFF.md`、README | 提交 | 工作约定、当前阶段和启动入口可随代码带到另一台电脑 |
| `docs/` 与其历史修订 | 提交 | 保留业务结论、实施依据及修改来由 |
| `design/`，包括 hifi 与 assets | 提交 | 两套可查看原型及其实际依赖；生成资产副本已在项目内 |
| `research/` 原始画板及图片 | 当前保留提交 | 另一台电脑可直接回看视觉依据；当前约 146 MiB，通常只归档一次 |
| `output/` 中交付 PNG、引用图及验收记录 | 提交 | 高保真 overview 直接引用其 21 张默认页，不能整目录忽略 |
| `output/playwright/hifi/check-*.png` | 忽略，可重建 | 各尺寸复测截图，不是总览所需页面 |
| `.playwright-cli/`、依赖环境、缓存、日志 | 忽略 | 属于本机状态，可重建 |
| `.env`、本机凭证、浏览器存档 | 不提交 | 在每台电脑分别配置或按专门迁移流程处理 |

这是当前阶段的目录策略。后续新增大批动画、视频、PSD 或频繁修改的大型原件时，再引入 Git LFS 或有版本号及校验清单的资产存储；不能仅把素材移走而不提供下载和恢复方式。

本次盘点没有单文件超过 20 MiB。GitHub 普通 Git 对超过 50 MiB 的文件给出警告，阻止超过 100 MiB 的文件；超限需要 LFS 等方式。当前可先做完整基线，无须因为目录总大小超过 100 MiB 就误判整个仓库不能上传。[GitHub 大文件说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)

## 本机首次发布

当前目录已有 `.git`，初始分支为 master，创建本文时没有提交或远端。先选择归属账号／组织、仓库名称和私有可见性。建议新建空仓库，不额外初始化 README、License 或 gitignore，避免首次历史冲突。[GitHub 导入本地项目说明](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

下列是首次发布时执行的步骤，本轮尚未执行。先检查 Git 提交身份和 GitHub 登录已设置；缺失时使用本人的信息配置，不复制凭证到仓库，也不把访问令牌贴进聊天。

```powershell
git status --short
git add .
git diff --cached --stat
git diff --cached --check
```

确认暂存内容包含源码、文档、研究与必需图片，且没有本机环境／凭证，再建立基线：

```powershell
git commit -m "保存业务原型、高保真设计与项目交接基线"
git branch -M main
```

将实际仓库 HTTPS 地址替换下面的示例后再执行：

```powershell
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git remote -v
git push -u origin main
```

如果 origin 已存在，先核对实际地址，不重复添加；如果远端已有文件或本机已有其他历史，先比较历史，再决定如何合并，不套用强制推送。以上发布由 Git 或 GitHub Desktop 均可完成。

## 另一台电脑首次接手

安装并登录所需开发工具，克隆同一个仓库。文件夹位置和名称可以不同，不需要照搬旧电脑的用户名和绝对路径：

```powershell
git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git huangxiaoxi-travel
cd huangxiaoxi-travel
git status
python -m http.server 8765 --bind 127.0.0.1
```

在 Codex 中把克隆后的仓库根目录作为项目工作目录，而不是只打开 design/hifi。项目 AGENTS 是可随 Git 携带的指导文件；Codex 会按全局及项目目录读取指导。[官方 AGENTS 说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

然后使用[HANDOFF](../HANDOFF.md)中的接续提示，打开 README 给出的 localhost 地址。另一台电脑需要自行启动服务；旧电脑正在运行的进程不会随 Git 一起出现。

当前应用无第三方运行依赖，查看页面不需要 CUDA 或本地模型。需要执行 Node 测试时安装 Node.js／npm；需要维护图片及二维码才安装 Python 工具包，见根目录 requirements-tools.txt。不要把旧电脑的 node_modules、Python 环境或整个用户目录复制过去。

## 日常在两台电脑之间切换

单人双机最稳妥的方式是同一时间只在一台电脑编辑同一任务。两台电脑的本地目录都由 Git 管理，Git 操作完成后再换机，不叠加另一套网盘双向同步来同时改 `.git` 和工作区。

开始工作前，在干净的工作区、正确分支上：

```powershell
git status
git pull --ff-only
```

结束时更新有变化的 HANDOFF／相关规范，选择本次涉及的文件暂存，检查后提交并推送。以下 `git add .` 仅在确认工作区全部变化都属于本次任务时使用；有其他改动时在工具中按文件选择：

```powershell
git status --short
git add .
git diff --cached --stat
git diff --cached --check
git commit -m "描述本次具体改动"
git push
git status
```

`commit` 只保存本地版本，`push` 才把提交送到 GitHub。发现未提交改动、无法快进或远端领先时，先确认两边工作，不覆盖文件或直接强推。

较大的改动在 `codex/` 前缀任务分支完成。例如先在第一台电脑创建并推送 `codex/hifi-review`：

```powershell
git switch -c codex/hifi-review
git push -u origin HEAD
```

另一台电脑初次接续该分支时先 fetch，再建立跟踪分支：

```powershell
git fetch origin
git switch --track origin/codex/hifi-review
```

已经存在本地同名分支时使用 `git switch codex/hifi-review`，再 `git pull --ff-only`。接续同一任务沿用同一分支，完成验收后再合并到 main；多分支间不靠复制目录传改动。

## Git 不会携带的状态

- **聊天上下文**：Git 传文件和提交，不会自动给另一台电脑上的新对话注入本次完整聊天；项目接续依赖 HANDOFF 和已有规范。它不限制应用自身是否另有历史同步能力。
- **浏览器演示进度**：localStorage／sessionStorage 不在项目文件中；新电脑新浏览器看到新进度是预期行为。目前没有内置导入导出工具，不承诺一键迁移。确有需要时再设计专用迁移，存档不放进仓库。
- **登录与全局工具配置**：GitHub／Codex 登录、插件、全局 skills 和环境分别配置；无需为了看稿拷贝整个 `.codex`。
- **运行进程及权限**：静态服务、浏览器相机和系统分享权限需要在新电脑或实际设备重新建立。

## 同步完成的验收

另一台电脑应能看到同一已推送分支及提交，打开高保真阅览和 21 页总览、显示全部依赖图片、浏览研究原图、找到规则与交接入口。执行相应检查后再记录“新环境验证通过”，不沿用旧电脑的测试结果代替。

本轮本地准备的文件不会自动出现在 GitHub；必须完成首次 commit 和 push，再通过另一台电脑 clone／pull 验证。
