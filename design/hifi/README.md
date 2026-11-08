# 黄晓西高保真视觉设计

> 历史页面设计；当前游客演示及视觉基线见 [HANDOFF](../../HANDOFF.md)。本目录的图标、地图及夜景仍被演示引用，不能按历史目录整体删除。以下保留当时的设计与验收说明。

版本：视觉设计 v0.2。更新日期：2026-10-20。应用交互基线仍为 v0.3.1，本目录独立，不读取或写入原型账号、库存、余额和作品。

已将伙伴首页的道具图标、轻纸面板、字号、按钮比例和内距扩展到全部 21 页与公共弹层；按登录、地图、衣橱、回忆、账号各自职责调整布局。功能与业务规则保持，衣橱页签补齐视觉选中反馈。逐页方案、实施与本轮验收见[全页面 UI 调整方案与验收](../../docs/全页面UI调整方案与验收.md)，[完整状态截图索引](../../output/playwright/all-ui-review/gallery.html)可逐项查看。此前的[首页专项记录](../../docs/伙伴首页UI修订与验收.md)保留作阶段依据。

## 查看与交付

- [逐页阅览](index.html#partner)：手机画布、桌面页面目录、状态切换及设计说明。
- [全部页面总览](overview.html)：21 页默认稿，点击进入相应页面。
- [逐页 PNG](../../output/playwright/hifi/)：390×844 默认页面，以及 states 中的关键状态稿。
- [资产来源与生成提示](assets/prompts.md)：四张图为基于用户参考生成的设计素材，非最终角色母版或生产换装资产。

本机入口为 `http://127.0.0.1:8765/design/hifi/index.html#partner`。复用根目录静态服务，启动方式见[运行说明](../README.md)。仅发布本目录时还需把总览引用的 PNG 一并部署，或调整图片目录；它与原型的部署交付分开。

## 页面与状态范围

原型 16 类职责在本稿中保留，并补充验证码、手机号绑定、账号安全、套装详情、模拟订单详情，共 21 个页面。页面与状态清单由 `catalog.mjs` 维护，避免另抄一份数量和路由。

正式登录与绑定已按用户要求纳入设计；手机号验证码为拟定主入口，微信为拟定替代入口，首次／回访分别进入初始化／伙伴。更换手机号先验原身份，绑定冲突返回原账号登录，不自动合并。具体渠道、手机号是否必须、凭证恢复和合并政策还需账号设计确定，不因稿件而视为技术接入决定。

页面采用夜景伙伴、青绿示意地图、奶油纸张、暖金描边和花枝角饰；保持三个主场景、独立衣橱和足迹手账。参考编号为 009、008、072、012、045、070，完整原件留在 research 中。

关键状态覆盖协议提示、验证码错误／受限、回访、绑定冲突、领装、到访成败、奖励已领、池未解锁／收齐／次数不足、获得结果、离开草稿、部件来源、无足迹、生成失败、分享替代、退出、更换绑定及订单终态。

## 可点击与能力边界

页面按钮可串联设计路径；协议勾选、六位输入、分类与选择、标题反馈、制作／衣橱返回、模拟核验和订单状态用于检查界面。所有数据为示例，不发送短信、调用微信授权、读取真实位置、开启摄像头、扣款或保存真实进度。

角色使用同一个透明概念形象，部件展示以生成图集和 SVG 示意组织，界面图标与花饰可编辑。衣橱切换的是选中状态，不宣称角色已完成逐件穿戴、姿势适配或动画。三套初始搭配和不同套装复用示意母版，不等于三套生产素材已完成。各状态是独立设计场景，不构成连续账号结算模拟。

图中的纪念作品是构图示意，保存／分享按钮说明能力边界。可下载的真实纪念 PNG 仍使用[现有业务原型](../index.html?v=3.1#partner)；高保真页面本身的 PNG 已单独导出。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `catalog.mjs` | 页面、分组、状态与设计说明 |
| `pages.mjs` | 各页面及弹层的设计构图 |
| `partner-page.mjs` | 伙伴首页独立构图 |
| `partner-art.mjs` | 从首页扩展的全稿共用道具插画；`art.mjs` 按语义调用 |
| `partner.css` | 只作用于伙伴首页的材质、文字、尺寸与桌面阅览样式 |
| `ui-system.css` | 全稿共用材质、可读字号、按钮、导航、弹层和原尺寸阅览 |
| `ui-auth.css`、`ui-journey.css` | 登录／初始化与游玩／核验／卡池布局 |
| `ui-wardrobe.css`、`ui-memory.css`、`ui-account.css` | 衣橱收藏、手账制作作品、身份安全账本订单的局部布局 |
| `art.mjs` | 可编辑图标、花饰、部件图示及图片引用 |
| `style.css` | 独立画布、组件、页面和尺寸适配 |
| `app.mjs` | 阅览导航及临时交互，不接真实业务存储 |
| `overview.html` | 默认页面 PNG 总览 |
| `verify.js` | Playwright CLI 检查与页面导出 |
| `verify-partner.js` | 首页双状态、六尺寸、入口、对比度与布局验收；输出在 `output/playwright/partner-review/` |
| `verify-all-ui.js` | 全页四尺寸及按钮弹层验收；结果 `window.hxxAllUIQA` |
| `verify-ui-interactions.js` | 两种手机尺寸的路径串联、输入返回和实际样式对比度；结果 `window.hxxUIFlowQA` |

检查命令：`node --check design/hifi/app.mjs` 等语法检查；服务与 CLI 浏览器就绪后，执行 `npx --yes --package @playwright/cli playwright-cli run-code --filename design/hifi/verify.js`。结果变量为 `window.hxxHifiQA`，需另行提取归档。

首页专项执行 `npx --yes --package @playwright/cli playwright-cli run-code --filename design/hifi/verify-partner.js`，结果变量为 `window.hxxPartnerQA`；同样需另外提取 JSON，不能只以 CLI 退出状态判断通过。

全页脚本采用相同 CLI 命令，替换为 `design/hifi/verify-all-ui.js` 或 `design/hifi/verify-ui-interactions.js`。全页临时图写入 `.codex/local-deploy/all-ui-audit/`，本轮已把正式默认稿和状态稿导出到 `output/playwright/hifi/`；验收 JSON 与逐页清单在 `output/playwright/all-ui-review/`。结果变量需另外提取。`verification.json` 保留 v0.1 的历史记录，当前结果以本轮报告为准。

设计验收记录见[高保真设计说明](../../docs/高保真设计说明.md)。自动化检查页面存在和串联，人物位置、裁切、文字与层级需要逐张看图；不把断言通过当作用户认可最终视觉。
