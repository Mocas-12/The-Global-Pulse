<div align="center">

<img src="./logo.svg" width="96" alt="The Global Pulse Logo" />

# The Global Pulse

**全球脉搏 —— 真实国界 · 实时自然灾害 · Apple 玻璃质感的 3D 监视地球**

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live-222?logo=githubpages&logoColor=white)](https://mocas-12.github.io/The-Global-Pulse/)
[![Deploy](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml)
[![Production monitor](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Three.js](https://img.shields.io/badge/Three.js-183-000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Data](https://img.shields.io/badge/灾害-USGS·NASA_EONET-00b0ff)](https://earthquake.usgs.gov/)
[![Borders](https://img.shields.io/badge/边界-Natural_Earth-2affb4)](https://www.naturalearthdata.com/)

**[🌐 在线访问（GitHub Pages）](https://mocas-12.github.io/The-Global-Pulse/)**

[English](./README.md) | **简体中文** | [日本語](./README.ja-JP.md)

*打开页面 → 看见此刻的地震、火山与风暴 → 按数字键切换情报视角*

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
- ☀️ **实时昼夜晨昏线** — 由真实 UTC 时间推算太阳直射点，自定义着色器逐帧渲染昼夜过渡与海面耀斑，此刻哪里是白天一目了然
- 🗺️ **真实国界** — Natural Earth 110m 行政边界，中性石墨蓝淡着色
- 🛰️ **实时地震层** — USGS 过去 24 小时全球地震，琥珀光点按震级映射大小；新 M4.5+ 事件触发涟漪
- 🌋 **实时自然灾害层** — NASA EONET 开放事件：火山（紫）、台风风暴（青）、野火（黄）、洪水（蓝），左下角图例一眼可读
- 🛰️ **ISS 实时轨道** — CelesTrak TLE 逐秒 SGP4 解算，拖尾弧线跟随空间站，右下角显示真实高度与速度
- 🎞️ **传感器风格** — 数字键 1-4 切换 标准 / 夜视 NVG / 热成像 FLIR / 黑白 Noir（GLSL 后处理）
- 🎬 **开机动画** — 真实加载阶段驱动的轨道环开机序列 → 深空相机飞向界面语言对应的区域
- 🎵 **生成式背景音乐** — Web Audio 实时合成的轻快音乐盒，零音频文件；首次交互立即响起
- 🎐 **轮换的诗** — 每 88 秒轮换的三语手写短句
- ⚡ **秒开优化** — 3D 场景按需异步加载（首屏 JS gzip 约 67KB）+ WebP 贴图 + 白天贴图先行渲染
- 🛡️ **质量门禁** — CI 四道关卡（ESLint → 单测 → Playwright 冒烟×双环境 → 构建）全绿才发布；每 6 小时线上拨测

## 🎨 界面设计

| 元素 | 设计 |
| --- | --- |
| 主题 | Apple 玻璃：纯黑基底 + 磨砂玻璃面板 + 发丝线描边，程序化闪烁星空 |
| 面板 | 磨砂玻璃：blur(28px) saturate(1.7) + 22px 大圆角 + 深阴影（visionOS 质感） |
| 强调色 | iOS 系统色：地震橙 `#ff9f0a` · 火山紫 `#bf5af2` · 风暴青 `#64d2ff` · 野火黄 `#ffd60a` · 洪水蓝 `#0a84ff` |
| 主视觉 | 3D 写实地球：NASA 昼/夜贴图 + 实时晨昏线 + 大气散射，实时事件光点覆盖 |

## 🧠 工作原理

1. **数据管道**：`scripts/fetch_data.py` 下载 Natural Earth 最新国界 GeoJSON 并本地化
2. **实时图层**：USGS 地震（5 分钟刷新）与 NASA EONET 灾害（10 分钟刷新）均为免密钥公开数据，失败静默降级
3. **ISS 轨道**：CelesTrak TLE + satellite.js 逐秒 SGP4 解算，拖尾弧线跟随空间站
4. **渲染**：globe.gl + three.js 按需异步加载；白天贴图先到先渲染，夜灯/云层就绪后渐入；数字键 1-4 切换传感器后处理风格

## 📁 项目结构

```text
The-Global-Pulse/
├── index.html               # 单页入口（og/twitter 分享 meta）
├── logo.svg                 # 项目 Logo
├── scripts/
│   └── fetch_data.py        # 数据管道：Natural Earth 国界
├── src/
│   ├── main.jsx             # 挂载入口（StrictMode + ErrorBoundary）
│   ├── ErrorBoundary.jsx    # 全局兜底：渲染异常时显示错误与重载
│   ├── App.jsx              # 主应用（开机序列 / 图例 / 传感器 / 音频解锁）
│   ├── engine/globeScene.js # 地球场景：图层 / ISS / 传感器 / 渲染循环（按需异步加载）
│   ├── engine/globeFX.js    # 视觉引擎：昼夜光照 / 大气 / 星空 / 传感器着色器
│   ├── audio/audioEngine.js # Web Audio 生成式背景音乐
│   ├── voice.js             # 轮换的诗（三语）
│   ├── i18n.js              # 三语文案
│   └── index.css            # Apple 玻璃主题（磨砂面板 / 开机序列）
├── e2e/smoke.spec.js        # Playwright 冒烟测试
├── tests/                   # 单元测试（vitest）
└── public/
    ├── datasets/countries.geojson # Natural Earth 国界（由脚本生成）
    ├── og-card.png          # 分享卡片图
    └── img/                 # NASA 地球贴图（WebP）
```

## 🚀 快速开始

```bash
git clone https://github.com/Mocas-12/The-Global-Pulse.git
cd The-Global-Pulse
npm install
npm run dev        # 开发：http://localhost:5173
```

> 需要 Node ≥ 22（`.nvmrc` 固定 24，与 CI 一致）；本地跑 E2E 前先 `npx playwright install chromium`。

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建到 `dist/` |
| `npm run lint` | ESLint 检查 |
| `npm test` | 运行单元测试（vitest） |
| `npm run e2e` | 运行 Playwright 冒烟测试（构建产物 + 开发服务器双环境） |
| `python scripts/fetch_data.py` | 重新拉取 Natural Earth 国界（需 Python 3） |

> 推送到 `main` 后，GitHub Actions 依次执行 lint → 单测 → E2E → 构建，全部通过才发布到 GitHub Pages。另有每 6 小时对线上站点自动拨测的工作流。

## 🔢 数据与口径

- 地震数据来自 USGS 过去 24 小时实时摘要；火山 / 风暴 / 野火 / 洪水来自 NASA EONET 过去 30 天开放事件
- ISS 位置由 CelesTrak TLE 经 SGP4 模型逐秒解算，高度与速度为模型计算值
- 所有事件在地图上的落点为真实坐标；光点大小仅作视觉示意

## ❓ 常见问题

<details>
<summary><b>如何切换情报视角</b></summary>

- 数字键 1-4：标准 / 夜视 NVG / 热成像 FLIR / 黑白 Noir；右上角徽章点击或按 1 恢复标准
</details>

<details>
<summary><b>如何静音</b></summary>

- 背景音乐默认开启，浏览器自动播放策略下会在首次交互时立即响起；点击右上角喇叭图标可静音
</details>

## 📚 数据来源

- [USGS Earthquake Feed](https://earthquake.usgs.gov/earthquakes/feed/) — 实时地震
- [NASA EONET](https://eonet.gsfc.nasa.gov/) — 自然灾害开放事件
- [CelesTrak](https://celestrak.org/) — ISS 轨道根数
- [Natural Earth](https://www.naturalearthdata.com/) — 行政边界
- [NASA Blue Marble / Black Marble](https://visibleearth.nasa.gov/) — 昼/夜地表贴图（公版）

## 📄 许可证

本项目基于 [MIT License](./LICENSE) 开源 — 可自由使用、修改、分发与商用，保留版权声明即可。

---

<div align="center">

**Made with 💙**

🌐 [在线访问](https://mocas-12.github.io/The-Global-Pulse/) · 🐛 [问题反馈](https://github.com/Mocas-12/The-Global-Pulse/issues)

</div>
