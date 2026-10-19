# 黄小西换装体验研究资料

归档日期：2026年10月19日。来源为用户提供的 [RunningHub 画板](https://rhtv.runninghub.cn/camp/view/2069614228987592706)。

从 [素材索引](index.html) 开始浏览，或阅读 [研究报告](研究报告.html) 与 [Markdown 原文](研究报告.md)。索引可双击离线打开，无需联网；原始来源链接需要联网。

| 位置 | 用途 |
| --- | --- |
| assets/original | 73 张原始图片，约 142.5 MB，文件内容未改动 |
| previews | 原画板总览、7 张联系表和浏览用缩略图 |
| source/canvas.json | 完整节点、原始名称、坐标与源文件地址 |
| source/text-notes.json | 画板中 3 条原始文字规则 |
| source/asset-manifest.csv | Excel 可打开的素材列表，含尺寸、文件、来源和 SHA256 |
| source/review-index.json | 逐图分类与功能注解 |
| source/verification.json | 全部原图及索引的校验结果 |

原稿中的页面变体和完全重复图片按节点保留。73 张图片包含 11 张分区标题，不代表 73 个独立产品页面。原稿的分层素材、角色引擎和实际动画不包含在这些图片中。

研究报告已区分画板已有内容和后续建议。正式名称、身份模型、首期场景、奖励规则、价格和实施方案尚未确认。下一步适合从一个具体景区的单日体验流程开始讨论。

需要更新本地派生文件时，可在项目根目录执行：

```powershell
python research/2026-10-19-runninghub/source/build_index.py
python research/2026-10-19-runninghub/source/verify_archive.py
```

以上脚本需要 Python 和 Pillow。原始归档和生成好的 HTML、Markdown、图片不依赖脚本即可使用。
