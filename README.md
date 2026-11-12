# 黄晓西 · 后端研判交接版

这是可运行的游客端源码，用于理解业务、评估后端架构并讨论接口。已删除过程设计稿、研究材料、录像、旧版页面、投屏控制台和模拟购买支线。**当前仍用本地账号与模拟核验，没有真实后端；不是上线包。**

## 启动

运行仅需 Python 3 和现代浏览器，无需安装前端依赖。

```powershell
.\Start-Local.ps1
```

其他系统或不使用启动脚本时，在本目录运行：

```sh
python -m http.server 8767 --bind 127.0.0.1
```

打开 [游客端](http://127.0.0.1:8767/design/demo/index.html)。默认端口 8767，与原项目 8765 的服务及浏览器进度隔离。design/demo 是保留的历史路径，不代表已接真实服务。不要双击 HTML，也不要只复制该子目录。

## 阅读顺序

1. 从新本地账号开始：初始搭配 → 游玩地图 → 领取见面礼 → 地点测试打卡 → 抽取 → 试穿并保存 → 制作、保存及导出纪念图。
2. [业务规则](docs/业务规则.md)：正式目标与测试配置。
3. [后端研判说明](docs/后端研判说明.md)：对照代码和数据，提出服务边界及接口建议。
4. [HANDOFF](HANDOFF.md)说明版本；[精简与验收](docs/精简与验收.md)说明删除范围及本轮检查。

## 代码入口

| 路径 | 职责 |
| --- | --- |
| [app.mjs](design/app.mjs) | 路由、守卫、用户动作、草稿与异步恢复 |
| [store.mjs](design/store.mjs) | 本地业务与存档；后端需要接管的主要位置 |
| [data.mjs](design/data.mjs) | 固定测试配置和稳定 ID；正式改由后端目录提供 |
| [game-ui.mjs](design/game-ui.mjs) | 地图、卡池、衣橱、图鉴、制作页和抽取反馈 |
| [visual/pages.mjs](design/demo/visual/pages.mjs) | 当前入口、初始选择、伙伴、探索、地点与手账装配 |
| [views.mjs](design/demo/views.mjs) | 打卡、活动、账号与次数明细 |
| [renderer.mjs](design/demo/renderer.mjs) | 伙伴和场景；静态渲染，不是连续动画 |
| [postcard.mjs](design/demo/postcard.mjs) | PNG 合成；实际绘制在 visual/print.mjs |
| design/demo/assets/、visual/*.css | 正在使用的图片与样式，不能当作过程稿删除 |

## 检查

检查需要 Node.js 22 或更高版本及 npm；运行页面本身不需要 Node。

```sh
npm --prefix design run check
npm --prefix design test
```

第一条检查语法、导入／素材、文档链接及禁止交付项；第二条检查免费规则、排重、失败保护和旧数据兼容。浏览器实测见验收记录。没有生产构建命令；后端框架、真实认证和 API 尚未选定。

## 交付边界

- 保留 A/B 本地身份、测试码及明确标识的定位／店员模拟，便于独立研究业务；正式接入必须替换为真实服务。
- 已移除购买入口、价格套餐、订单页、新增订单与模拟结算；旧 orders 字段仅兼容读取，不清空历史数据。
- ZIP 只含当前文件快照，不含 Git 历史、浏览器存档、凭证或本机环境。Git 分支仍能追溯旧历史，没有重写历史。
- 原始设计与制作来源见[素材清单](docs/素材清单.md)。未改人物图片、奖励数值或既有素材 ID。
