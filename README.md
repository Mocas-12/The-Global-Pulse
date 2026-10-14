<div align="center">

<img src="./logo.svg" width="96" alt="The Global Pulse Logo" />

# The Global Pulse

**The global pulse — real borders · real-time natural disasters · an Apple-glass 3D monitoring globe**

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live-222?logo=githubpages&logoColor=white)](https://mocas-12.github.io/The-Global-Pulse/)
[![Deploy](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml)
[![Production monitor](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Three.js](https://img.shields.io/badge/Three.js-183-000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Data](https://img.shields.io/badge/Disasters-USGS·NASA_EONET-00b0ff)](https://earthquake.usgs.gov/)
[![Borders](https://img.shields.io/badge/Borders-Natural_Earth-2affb4)](https://www.naturalearthdata.com/)

**[🌐 Live Preview (GitHub Pages)](https://mocas-12.github.io/The-Global-Pulse/)**

**English** | [简体中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md)

*Open the page → see the earthquakes, volcanoes and storms happening right now → press the number keys for sensor views*

</div>

---

> All things fade; all things begin.

## 📖 Table of Contents

- [Features](#-features)
- [UI Design](#-ui-design)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Data & Methodology](#-data--methodology)
- [FAQ](#-faq)
- [Data Sources](#-data-sources)
- [License](#-license)

## ✨ Features

- 🌍 **Realistic Earth** — NASA Blue Marble 4K day texture + Black Marble night lights + cloud layer and atmospheric-scattering glow; public-domain imagery localized, no external dependency
- ☀️ **Live day/night terminator** — the subsolar point is computed from real UTC time; custom shaders blend day/night per frame with an ocean sun glint
- 🗺️ **Real borders** — Natural Earth 110m administrative boundaries with a neutral graphite tint
- 🛰️ **Live earthquake layer** — USGS past-24h global earthquakes as amber dots sized by magnitude; fresh M4.5+ events ripple
- 🌋 **Live natural-disaster layer** — NASA EONET open events: volcanoes (purple), cyclones (cyan), wildfires (yellow), floods (blue), with an at-a-glance legend
- 🛰️ **ISS live orbit** — CelesTrak TLE solved every second with SGP4; a trailing arc follows the station with real altitude and speed
- 🎞️ **Sensor styles** — number keys 1-4 switch Standard / NVG night vision / FLIR thermal / Noir monochrome (GLSL post-processing)
- 🎬 **Boot sequence** — an orbital boot animation driven by real load stages → deep-space camera fly-in toward the region matching your language
- 🎵 **Generative background music** — a cheerful music-box bed synthesized in real time with Web Audio, zero audio files
- 🎐 **Turning verse** — hand-written trilingual aphorisms rotating every 88 seconds
- ⚡ **Fast first paint** — the 3D scene is lazy-loaded (first-paint JS ≈ 67 KB gzip) + WebP textures + the day texture renders first
- 🛡️ **Quality gates** — CI runs four gates (ESLint → unit tests → Playwright smoke ×2 environments → build); the live site is smoke-tested every 6 hours

## 🎨 UI Design

| Element | Design |
| --- | --- |
| Theme | Apple glass: pure-black base + frosted-glass panels + hairline strokes, procedural twinkling starfield |
| Panels | Frosted glass: blur(28px) saturate(1.7) + 22px radii + deep shadows (visionOS feel) |
| Accent colors | iOS system colors: earthquake orange `#ff9f0a` · volcano purple `#bf5af2` · cyclone cyan `#64d2ff` · wildfire yellow `#ffd60a` · flood blue `#0a84ff` |
| Hero visual | 3D realistic globe: NASA day/night textures + live terminator + atmospheric scattering, covered with live event dots |

## 🧠 How It Works

1. **Data pipeline**: `scripts/fetch_data.py` downloads the latest Natural Earth border GeoJSON and localizes it
2. **Live layers**: USGS earthquakes (refreshed every 5 min) and NASA EONET disasters (every 10 min) are key-free public data with silent degradation
3. **ISS orbit**: CelesTrak TLE + satellite.js, solved every second with SGP4; a trailing arc follows the station
4. **Rendering**: globe.gl + three.js lazy-loaded; the day texture renders first, then night lights and clouds fade in; number keys 1-4 switch sensor post-processing styles

## 📁 Project Structure

```text
The-Global-Pulse/
├── index.html               # Single-page entry (og/twitter share meta)
├── logo.svg                 # Project logo
├── scripts/
│   └── fetch_data.py        # Data pipeline: Natural Earth borders
├── src/
│   ├── main.jsx             # Mount entry (StrictMode + ErrorBoundary)
│   ├── ErrorBoundary.jsx    # Global fallback: error screen instead of a blank page
│   ├── App.jsx              # Main app (boot sequence / legend / sensors / audio unlock)
│   ├── engine/globeScene.js # Globe scene: layers / ISS / sensors / render loop (lazy-loaded)
│   ├── engine/globeFX.js    # Visual engine: day/night lighting / atmosphere / starfield / sensor shaders
│   ├── audio/audioEngine.js # Web Audio generative background music
│   ├── voice.js             # Turning verse (trilingual)
│   ├── i18n.js              # Trilingual copy
│   └── index.css            # Apple glass theme (frosted panels / boot sequence)
├── e2e/smoke.spec.js        # Playwright smoke tests
├── tests/                   # Unit tests (vitest)
└── public/
    ├── datasets/countries.geojson # Natural Earth borders (generated by script)
    ├── og-card.png          # Social share card image
    └── img/                 # NASA globe textures (WebP)
```

## 🚀 Quick Start

```bash
git clone https://github.com/Mocas-12/The-Global-Pulse.git
cd The-Global-Pulse
npm install
npm run dev        # Dev: http://localhost:5173
```

> Requires Node ≥ 22 (`.nvmrc` pins 24, matching CI); run `npx playwright install chromium` before running E2E locally.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build into `dist/` |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (vitest) |
| `npm run e2e` | Run Playwright smoke tests (built bundle + dev server) |
| `python scripts/fetch_data.py` | Re-fetch Natural Earth borders (requires Python 3) |

> After a push to `main`, GitHub Actions runs lint → unit tests → E2E → build and only publishes to GitHub Pages when all pass. A separate workflow smoke-tests the live site every 6 hours.

## 🔢 Data & Methodology

- Earthquake data comes from the USGS past-24h real-time feed; volcanoes / storms / wildfires / floods come from NASA EONET past-30-day open events
- The ISS position is solved every second from CelesTrak TLE with the SGP4 model; altitude and speed are model-computed values
- All events land at real coordinates; dot sizes are visual hints only

## ❓ FAQ

<details>
<summary><b>How do I switch sensor views</b></summary>

- Number keys 1-4: Standard / NVG night vision / FLIR thermal / Noir monochrome; click the badge or press 1 to return to standard
</details>

<details>
<summary><b>How do I mute the music</b></summary>

- The background music is on by default and starts on your first interaction (browser autoplay policy); click the speaker icon in the top-right corner to mute
</details>

## 📚 Data Sources

- [USGS Earthquake Feed](https://earthquake.usgs.gov/earthquakes/feed/) — real-time earthquakes
- [NASA EONET](https://eonet.gsfc.nasa.gov/) — open natural-event data
- [CelesTrak](https://celestrak.org/) — ISS orbital elements
- [Natural Earth](https://www.naturalearthdata.com/) — administrative boundaries
- [NASA Blue Marble / Black Marble](https://visibleearth.nasa.gov/) — day/night surface textures (public domain)

## 📄 License

This project is open-sourced under the [MIT License](./LICENSE) — free to use, modify, distribute, and commercialize, as long as the copyright notice is retained.

---

<div align="center">

**Made with 💙**

🌐 [Live Preview](https://mocas-12.github.io/The-Global-Pulse/) · 🐛 [Report an Issue](https://github.com/Mocas-12/The-Global-Pulse/issues)

</div>
