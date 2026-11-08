# GitHub 与双机协作

更新日期：2026-11-08。私有仓库为 [ryanzhouyu/huangxiaoxi-travel](https://github.com/ryanzhouyu/huangxiaoxi-travel)。当前分支与冻结版本以 [HANDOFF](../HANDOFF.md) 为唯一入口，不能把默认 main 当成最新交付。

## 新电脑接手

安装 Git、Python 3；执行检查还需要 Node.js／npm。克隆需要当前 GitHub 账号有仓库权限。

```powershell
git clone -b codex/internal-alpha-r00-20261108 https://github.com/ryanzhouyu/huangxiaoxi-travel.git
cd huangxiaoxi-travel
git status -sb
git log -1 --oneline
.\Start-Local.ps1
```

在新对话中打开克隆后的仓库根目录，读 AGENTS、HANDOFF 和文档索引。其他系统从根目录运行 `python -m http.server 8765 --bind 127.0.0.1`。当前查看页面不需要 CUDA、本地模型、应用依赖安装或打包。素材维护工具另见根目录 `requirements-tools.txt`。

新环境按[运行说明](../design/README.md)验证游客页、三栏台及必要素材，再运行对应检查。另一台电脑的服务进程、缓存和浏览器进度不会由 clone 自动恢复。

## 日常同步与分支

单人双机尽量一次只在一台电脑编辑同一任务，不叠加网盘双向同步改动 `.git`。

开始前检查工作区，不自动清空或覆盖：

```powershell
git status -sb
git branch --show-current
git fetch origin
```

确认工作区干净且在任务分支后，执行 `git pull --ff-only`。本地没有目标分支时先 `git switch --track origin/分支名`；已有时 `git switch 分支名`。遇到分叉或冲突先比较两边工作，不强推或用远端文件覆盖本地。

结束前更新发生变化的规范和 HANDOFF，按文件暂存、检查、提交：

```powershell
git diff --stat
git diff --check
git add -- 本次文件路径
git diff --cached --stat
git diff --cached --check
git commit -m "说明这次具体改动"
git push -u origin HEAD
git status -sb
git rev-parse HEAD
git ls-remote origin refs/heads/当前分支名
```

命令中的“本次文件路径”“当前分支名”为需替换的示意。只有远端提交与本地一致才记录同步完成；commit 本身只保存本地。按可独立回退的目标提交，不把用户其他改动混入。

新任务用 `codex/` 前缀分支。正式开发应从 HANDOFF 指定的已验收计划提交派生，冻结演示标签只用于复演／回溯。主线合并单独决定；不移动标签、强推或重写历史。换电脑继续同一任务时沿用该分支，不靠复制目录搬修改。

## 文件保存与资料策略

| 内容 | 处理 |
| --- | --- |
| AGENTS、HANDOFF、README、docs | 提交；保持稳定规则、当前状态、入口和详细规范各司其职 |
| design 运行代码、测试和实际依赖 | 提交；包括仍被演示使用的 hifi 图片与模块 |
| research 原画板和 reviews 确认／未采用稿 | 保留原件和来源；未采用稿明确标识，不成为现行设计 |
| output 中交付图、录像及引用的验收报告 | 保留日期与版本；页面总览及演示录像有真实依赖，不整体忽略 |
| 临时复测、日志、工具会话、依赖环境 | 写入忽略目录，不上传 |
| 凭证、.env、个人手账备份、浏览器配置 | 不提交；按各电脑环境配置 |

本轮盘点和逐组处理见[资料整理记录](项目复盘与资料整理记录.md)。此前“没有单文件超过 20 MiB”的说明已过时；当前存在大于 20 MiB 的评审包和录像。暂保留完整 Git 基线，不在本轮引入 LFS 或迁移存储。未来动画源文件增长时另行评估有校验清单、下载与恢复流程的方案，不把删工作区文件当作缩小完整 Git 历史。

原画板重复图可能对应不同节点，历史前后对比可能故意相同。删除前查引用、用途、恢复来源和生成脚本，仅凭文件名／相同哈希不能自动删除。具体保留清单及哈希见本轮盘点。

## 浏览器进度及工具状态

- 演示键 `hxx.demo.v1` 可由三栏台下载备份、显式确认载入；包含当前本机 A/B 演示手账，载入范围以界面说明为准。原型键 `hxx.interactive.v2` 独立，不应混用。
- 换协议、域名、端口、浏览器会进入另一份存储。测试用独立上下文，不为验收重置用户进度。个人备份不上传 GitHub。
- 云端进度尚未实施。演示备份工具不代表正式账户迁移政策已确定。
- 聊天、GitHub／工具登录、插件、全局技能、环境和正在运行的服务不由 Git 同步。不要复制整个用户目录、凭证或旧电脑的代理端口；连接问题按新电脑实际网络诊断。

## 同步验收

核对本地／远端提交、正确分支、必要原图和重建源文件。首次交接用干净目录从远端克隆，独立端口启动，检查游客、三栏台、素材和相关文档；条件允许时走到实际 PNG。记录实际版本、命令和限制，本机新克隆不等于另一台物理设备已通过验收。

首次建库与旧高保真交接已完成，旧发布命令可在 Git 历史回看；现有项目不再重复建库、改 main 名称或添加 origin。
