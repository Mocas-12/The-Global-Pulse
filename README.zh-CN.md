<div align="center">

<img src="./logo.svg" width="96" alt="The Global Pulse Logo" />

# The Global Pulse

**全球人口脉搏 —— 真实国界 · 真实数据 · 实时推演的 3D 生命地球**

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live-222?logo=githubpages&logoColor=white)](https://mocas-12.github.io/The-Global-Pulse/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Three.js](https://img.shields.io/badge/Three.js-183-000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Data](https://img.shields.io/badge/数据-世界银行_2024-00b0ff)](https://data.worldbank.org/)
[![Borders](https://img.shields.io/badge/边界-Natural_Earth-2affb4)](https://www.naturalearthdata.com/)

**[🌐 在线访问（GitHub Pages）](https://mocas-12.github.io/The-Global-Pulse/)**

[English](./README.md) | **简体中文**

*打开页面 → 观看地球脉搏起伏 → 点击任意国家查看实时详情*

</div>

---

> 万物皆逝，万物皆始。

## 📖 目录

- [功能特性](#-功能特性)
- [界面设计](#-界面设计)
- [工作原理](#-工作原理)
- [项目结构](#-项目结构)
- [快速开始](#-快速开始)
- [数据与口径](#-数据与口径)
- [常见问题](#-常见问题)
- [数据来源](#-数据来源)
- [许可证](#-许可证)

## ✨ 功能特性

- 🌍 **真实地球** — NASA Blue Marble 4K 昼面贴图 + Black Marble 夜面城市灯光 + 云层与大气散射辉光，公版影像本地化、无外网依赖
- ☀️ **实时昼夜晨昏线** — 由真实 UTC 时间推算太阳直射点，自定义着色器逐帧渲染昼夜过渡、晨昏暖橙余晖与海面太阳耀斑，此刻哪里是白天一目了然
- 🗺️ **真实国界** — Natural Earth 110m 行政边界，177 个国家/地区精确轮廓渲染，人口对数淡着色、悬停高亮浮起
- 📊 **真实数据** — 世界银行 2024 年人口 / 粗出生率 / 粗死亡率（SP.POP.TOTL / SP.DYN.CBRT.IN / SP.DYN.CDRT.IN），覆盖 217 个经济体
- 💓 **实时推演** — 按各国真实比率逐秒推演全球出生 / 死亡 / 净增长，脉冲以闪光 + 涟漪冲击波的形式落点在**真实国境内**
- 🎬 **电影化开场** — 深空相机飞入 + 主题标题渐显谢幕 + 面板失焦错峰入场；程序化闪烁星空与胶片颗粒氛围
- 🗺️ **国家详情** — 点击任意国家相机飞往、高亮浮起，查看人口、排名、今日出生/死亡、出生/死亡率、全球占比（数据年份标注）
- 🩺 **全球健康面板** — 心血管疾病、癌症、烟草、5 岁以下儿童死亡等 12 类年度死亡推演计数
- 📰 **滚动快讯** — 基于推演数据的实时国别新生 / 全球死因播报
- 🈶 **三语界面** — 中文 / English / 日本語
- 🔊 **合成音效** — Web Audio 实时合成的出生 / 死亡音与环境音景（默认关闭，点击右上角开启）

## 🎨 界面设计

| 元素 | 设计 |
| --- | --- |
| 主题 | 深空影调：近黑底 + 极淡星云 + 电影暗角与胶片颗粒，程序化闪烁星空 |
| 面板 | 玻璃拟态：半透明深色底 + 背景模糊增饱和 + 细描边 + 顶部高光线 |
| 强调色 | 天青 `#38bdf8` 主色；出生绿 `#2affb4` · 死亡红 `#ff5470` 双色语义 |
| 主视觉 | 3D 写实地球：NASA 昼/夜贴图 + 实时晨昏线 + 大气散射 + 云层，国家以细描边 + 淡着色呈现 |
| 动效 | 出生/死亡闪光 + 涟漪冲击波；开场相机飞入与标题谢幕；GSAP 数字滚动 |
| 布局 | 顶部滚动快讯 + 左侧统计面板 + 点击弹出国家卡片（相机飞往） |

## 🧠 工作原理

```mermaid
flowchart LR
    A[📦 数据管道<br/>世界银行 · Natural Earth] --> B[⚙️ 推演引擎<br/>真实比率逐秒积分]
    B --> C[🌍 3D 地球渲染<br/>国境内加权随机落点]
    C --> D[📊 面板与快讯<br/>出生 · 死亡 · 死因 · 国家详情]
```

1. **数据管道**：`scripts/fetch_data.py` 下载 Natural Earth 最新国界 GeoJSON，并拉取世界银行三项指标 2015 年以来全部数据、取各国最新值
2. **实时推演**：以世界银行年度粗出生率 / 死亡率为速率，从当日零点 / 年初起积分得到"今日 / 今年"数字；世界人口基数取各国 2024 年估计值之和（约 82.1 亿）
3. **落点采样**：脉冲光点按各国出生 / 死亡率加权，随机采样落在真实国境多边形内部
4. **渲染交互**：globe.gl + three.js 渲染地球与脉冲；`src/engine/globeFX.js` 提供自定义着色器 —— 依低精度天文算法（±0.01°）由 UTC 实时推算太阳直射点，逐帧混合昼/夜贴图、海面高光与大气散射；GSAP 驱动动效，点击国家相机飞往并弹出详情卡片
5. **合成音效**：Web Audio 实时合成出生 / 死亡提示音与环境音景，无任何音频文件

## 📁 项目结构

```text
The-Global-Pulse/
├── index.html               # 单页入口
├── logo.svg                 # 项目 Logo
├── scripts/
│   └── fetch_data.py        # 数据管道：国界 + 世界银行指标
├── src/
│   ├── App.jsx              # 主应用（地球渲染 / 面板 / 交互 / 开场）
│   ├── engine/worldEngine.js # 数据引擎：真实比率 → 实时推演 + 国境内随机采样
│   ├── engine/globeFX.js    # 视觉引擎：昼夜光照 / 大气 / 云层 / 星空 / 涟漪着色器
│   ├── audio/audioEngine.js # Web Audio 合成音效
│   ├── data/worldBankData.json # 世界银行 2024 指标（由脚本生成）
│   ├── i18n.js              # 三语文案
│   ├── news.js              # 滚动快讯生成
│   └── index.css            # 深空影调主题（玻璃拟态面板 / 开场序列）
└── public/
    ├── datasets/countries.geojson # Natural Earth 国界（由脚本生成）
    └── img/                  # NASA 地球贴图：昼 4K / 夜景灯光 / 水面遮罩 / 云层
```

## 🚀 快速开始

```bash
git clone https://github.com/Mocas-12/The-Global-Pulse.git
cd The-Global-Pulse
npm install
npm run dev        # 开发：http://localhost:5173
```

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `python scripts/fetch_data.py` | 重新拉取国界与世界银行数据（需 Python 3） |

> 推送（push）到 `main` 分支后，GitHub Actions 自动构建并发布到 GitHub Pages，无需手动部署。

## 🔢 数据与口径

- 页面上的"今日 / 今年"数字是**模型推演值**：以世界银行年度率为速率、从当日零点 / 年初起积分
- 世界人口基数取各国 2024 年估计值之和（约 82.1 亿），与联合国世界人口时钟量级一致
- 死亡原因年度基数来自 WHO Global Health Estimates、UN IGME、UNAIDS、WHO、UNODC 等公开估计，数值为近似值，仅用于可视化展示
- 所有实时数字均为基于权威年度统计的推演，不代表逐秒真实统计

## ❓ 常见问题

<details>
<summary><b>页面上的数字是真实的逐秒统计吗</b></summary>

- 不是。数字以世界银行年度率为速率从当日零点 / 年初积分推演，量级与权威时钟一致，但不是逐秒真实计数
</details>

<details>
<summary><b>为什么有些国家点击没有数据</b></summary>

- 世界银行指标覆盖 217 个经济体，个别地区无数据时面板会标注数据缺失
</details>

<details>
<summary><b>如何更新到最新数据</b></summary>

- 本地安装 Python 3 后运行 `python scripts/fetch_data.py`，重新生成国界 GeoJSON 与世界银行指标 JSON
</details>

<details>
<summary><b>音效如何开启</b></summary>

- 音效默认关闭，点击页面右上角喇叭图标开启；出生 / 死亡音与环境音景均由 Web Audio 实时合成
</details>

## 📚 数据来源

- [World Bank Open Data](https://data.worldbank.org/) — 人口与粗出生/死亡率
- [Natural Earth](https://www.naturalearthdata.com/) — 行政边界
- [NASA Blue Marble Next Generation](https://visibleearth.nasa.gov/collection/1484/blue-marble-next-generation) — 昼面地表贴图（公版）
- [NASA Black Marble — Earth at Night](https://earthobservatory.nasa.gov/features/NightLights) — 夜面城市灯光贴图（公版）
- [WHO / UN IGME / UNAIDS / UNODC](https://www.who.int/data/global-health-estimates) — 死亡原因估计

## 📄 许可证

本项目用于学习与演示，未设置开源许可证；如需复用请自行 fork。

---

<div align="center">

**Made with 💙**

🌐 [在线访问](https://mocas-12.github.io/The-Global-Pulse/) · 🐛 [问题反馈](https://github.com/Mocas-12/The-Global-Pulse/issues)

</div>
