# The Global Pulse · 全球人口脉搏

一个基于**真实数据**的全球人口实时 3D 可视化地球。

> 万物皆逝，万物皆始。

**🔗 在线访问: <https://mocas-12.github.io/The-Global-Pulse/>**

![tech](https://img.shields.io/badge/React_19-Vite_7-61dafb) ![data](https://img.shields.io/badge/数据-世界银行_2024-00b0ff) ![map](https://img.shields.io/badge/边界-Natural_Earth-2affb4)

## ✨ 特性

- **真实国界** — Natural Earth 110m 行政边界,177 个国家/地区精确轮廓渲染
- **真实数据** — 世界银行 2024 年人口 / 粗出生率 / 粗死亡率(SP.POP.TOTL / SP.DYN.CBRT.IN / SP.DYN.CDRT.IN),覆盖 217 个经济体
- **实时推演** — 按各国真实比率逐秒推演全球出生 / 死亡 / 净增长,脉冲光点按各国出生/死亡率加权落点在**真实国境内**
- **人口着色** — 国家多边形按人口规模对数着色(深海军蓝 → 亮青)
- **国家详情** — 点击任意国家查看人口、排名、今日出生/死亡、出生/死亡率、全球占比(数据年份标注)
- **全球健康面板** — 心血管疾病、癌症、烟草、5 岁以下儿童死亡等 12 类年度死亡推演计数(来源见下)
- **滚动快讯** — 基于推演数据的实时国别新生 / 全球死因播报
- **三语界面** — 中文 / English / 日本語
- **合成音效** — Web Audio 实时合成的出生 / 死亡音与环境音景(默认关闭,点击右上角开启)

## 🚀 本地运行

```bash
npm install
npm run dev        # 开发
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物
```

## 📊 数据更新

数据管道脚本(需要 Python 3):

```bash
python scripts/fetch_data.py
```

该脚本会:
1. 下载 Natural Earth 最新国界 GeoJSON → `public/datasets/countries.geojson`
2. 拉取世界银行三项指标 2015 年以来全部数据,取各国最新值 → `src/data/worldBankData.json`

## 🔢 实时值口径

页面上的"今日 / 今年"数字是**模型推演值**:以世界银行年度率为速率、从当日零点 / 年初起积分。世界人口基数取各国 2024 年估计值之和(约 82.1 亿),与联合国世界人口时钟量级一致。

死亡原因年度基数的来源:WHO Global Health Estimates、UN IGME(5 岁以下儿童死亡)、UNAIDS(艾滋病)、WHO(疟疾)、UNODC(毒品交易额)等公开估计,数值为近似值,仅用于可视化展示。

## 📁 结构

```
src/
  engine/worldEngine.js   # 数据引擎: 真实比率 → 实时推演 + 国境内随机采样
  audio/audioEngine.js    # Web Audio 合成音效
  data/worldBankData.json # 世界银行 2024 指标(由脚本生成)
  i18n.js                 # 三语文案
  news.js                 # 滚动快讯生成
  App.jsx                 # 主应用(地球渲染 / 面板 / 交互)
public/
  datasets/countries.geojson  # Natural Earth 国界(由脚本生成)
  img/                        # 地球贴图(本地化, 无外网依赖)
```

## 🌐 部署

GitHub Actions 自动构建并发布到 GitHub Pages(`.github/workflows/deploy.yml`),推送 `main` 即触发。

## 📚 数据来源

- [World Bank Open Data](https://data.worldbank.org/) — 人口与粗出生/死亡率
- [Natural Earth](https://www.naturalearthdata.com/) — 行政边界
- [WHO / UN IGME / UNAIDS / UNODC](https://www.who.int/data/global-health-estimates) — 死亡原因估计

---

*所有实时数字均为基于权威年度统计的推演,不代表逐秒真实统计。*
