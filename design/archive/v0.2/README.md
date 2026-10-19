# 黄晓西旅行衣橱交互体验

当前为 v0.2，可从新演示账号连续体验领装、测试打卡、抽取、试穿保存、制作及下载实际 PNG。页面与异常处理见 [完整体验与验收标准](../docs/完整体验与验收标准.md)。v0.1 原结构稿保留在 [archive/v0.1](archive/v0.1/index.html)。

从工作区根目录启动 `python -m http.server 8765 --bind 127.0.0.1`，或执行 `npm --prefix design start`，然后打开 `http://127.0.0.1:8765/design/index.html`。已有服务时直接访问；ES modules 需要 HTTP，不支持双击 file URL。应用没有第三方运行时依赖，也没有需要打包的构建步骤，可静态部署整个工作区或单独部署 design 目录（后者不包含外链文档）。

`data.mjs` 集中配置；`store.mjs` 处理本地业务状态；`visual.mjs` 处理代码部件示意与 PNG 合成；`app.mjs` 处理页面和交互；`style.css` 处理手机／桌面布局。两个账号的进度保存在 localStorage，编辑草稿在 sessionStorage。尚无云端、真实认证、支付、地理核验或店员端，不能作为生产权威业务服务。

`npm --prefix design test` 运行 13 组业务测试；`npm --prefix design run check` 检查模块语法。已运行的浏览器操作及布局检查见 [verification.json](verification.json)。使用 Playwright CLI 时可执行 `npx --yes --package @playwright/cli playwright-cli run-code --filename design/tests/browser-flow.js`；结果保存在当前浏览器页的 `window.hxxQA`，脚本使用独立上下文不修改当前游客进度。

测试二维码见 [test-points.html](test-points.html)。部署后用 `python design/tests/build_test_codes.py --base-url https://你的可访问地址/design/index.html` 重建，需安装 Python qrcode。二维码当前指向本机，外部手机无法访问电脑的 127.0.0.1。测试码校验内容，不证明实际到场。

人物、服饰和背景为代码绘制的替换示意，素材方案继续后置。长期保存大量 PNG 可能达到浏览器存储上限；失败时不会覆盖旧数据。
