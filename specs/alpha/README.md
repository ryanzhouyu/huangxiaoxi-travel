# 内测可执行契约

2026-11-08，R01/R02 前期设计验证。这里使用现有 JavaScript ES modules 与 Node 内置测试，不引入应用框架或安装包，不被 `design/` 运行页面导入。

| 文件 | 验证什么 | 不能证明什么 |
| --- | --- | --- |
| [navigation.mjs](navigation.mjs) | 白名单返回目标、认证／初始化前置、原账号未知请求恢复 | 不执行真实认证，不自动核验／扣次；不替代服务端授权 |
| [commands.mjs](commands.mjs) | 11 个候选命令结构、拒绝客户端结算字段、同请求输入摘要与归属 | 不判断凭证真假或资产拥有；没有数据库事务／持久化去重 |
| [animation-state.mjs](animation-state.mjs) | 加载竞态、连续点击、眨眼／表情优先级、后台与销毁的状态和待执行效果 | 不加载或播放角色；不证明绑定、图层兼容、画面自然或手机性能 |
| [migration-preview.mjs](migration-preview.mjs)、[迁移测试](migration-preview.test.mjs) | 演示备份的明确来源选择、账链／引用预检及内容摘要，8 个场景 | 只读、始终不准直接导入；不证明归属、不解码图片，不实现迁移服务 |
| [contracts.test.mjs](contracts.test.mjs) | 15 个正常／异常场景，含快速切换、重复通知和账号隔离 | 不计为 AU/BZ/AN 全部产品验收通过 |

```powershell
node --test specs/alpha/contracts.test.mjs specs/alpha/migration-preview.test.mjs
```

23 个场景分为账号／请求／动画契约 15 项及迁移预检 8 项。迁移专项见[设计与限制](../../docs/演示进度迁移方案.md)，使用合成夹具，不读取用户浏览器存档。

规格依据：[账号流程](../../docs/账号流程与接入决策.md)、[数据与 HTTP 契约](../../docs/数据模型与业务接口契约.md)、[动画样板要求](../../docs/动画样板制作与技术评估.md)。候选方案通过 G1/G2 后，能复用的模块再按架构迁入正式位置；测试可保留作回归，但不得把本目录直接当正式认证服务或引擎。

约定：`requestId` 暂用 UUID v4，ID 用稳定英文／数字／短横线／下划线；上限是输入防护默认值，需与服务端共同冻结。`prepareMemory` 的 200 条经历上限仅为候选请求大小约束，客户端应分页／分批选取或给明确上限提示，不改变跨日积累的业务规则。保存搭配使用 `expectedLookRevision`；上传文件、核验码及账号标识不可直接作为客户端可信结果。

动画事件 `loaded` 表示候选句柄已经完成资源、兼容和预激活检查，适配器须保证原子切换。当前 reducer 只输出意图；若真正引擎激活仍可能失败，须增加提交确认／回滚事件，不能照抄本模型后先销毁旧角色。隐藏时恢复待机而不补播后台积压动作，是实施默认；静态故障占位不是连续动画验收。

## 隔离的数据库实验

[transaction-spike.sql](transaction-spike.sql) 和 [run-transaction-spike.mjs](run-transaction-spike.mjs) 是 PostgreSQL 候选抽取事务实验，使用虚构配置和专属临时容器；不是正式迁移或服务。需要可用的 Docker Engine，镜像默认 `postgres:18`，首次执行可能下载镜像。容器不联网、不映射端口，不挂载用户目录；仅停止本脚本创建的容器，遇到已有同名容器拒绝覆盖。

```powershell
node specs/alpha/run-transaction-spike.mjs
```

报告默认写入忽略目录 `.codex/local-deploy/r01-transaction-spike.json`，可通过 `HXX_SPIKE_REPORT` 指定新证据路径；`HXX_POSTGRES_IMAGE` 可指定已批准的镜像版本。脚本记录实际镜像 ID，不把浮动标签当锁定的生产版本。

2026-11-08 本机执行在容器预检查时受 Docker Engine 错误阻断；**没有创建容器，SQL 未解析执行，并发／回滚未通过验收**。相关记录和后续任务见[接续执行记录](../../docs/账号动画接续执行记录.md)。即使以后实验通过，也只证明实验的抽取场景，不能替代认证、到访、完整事务及负载验收。
