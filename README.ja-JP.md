<div align="center">

<img src="./logo.svg" width="96" alt="The Global Pulse Logo" />

# The Global Pulse

**グローバル・パルス——リアルな国境 · リアルタイム自然災害 · Apple ガラス質感の 3D モニタリング地球**

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live-222?logo=githubpages&logoColor=white)](https://mocas-12.github.io/The-Global-Pulse/)
[![Deploy](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml)
[![Production monitor](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Three.js](https://img.shields.io/badge/Three.js-183-000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Data](https://img.shields.io/badge/災害-USGS·NASA_EONET-00b0ff)](https://earthquake.usgs.gov/)
[![Borders](https://img.shields.io/badge/境界-Natural_Earth-2affb4)](https://www.naturalearthdata.com/)

**[🌐 ライブプレビュー (GitHub Pages)](https://mocas-12.github.io/The-Global-Pulse/)**

[English](./README.md) | [简体中文](./README.zh-CN.md) | **日本語**

*ページを開く → 今起きている地震・火山・嵐を目にする → 数字キーでセンサービューに切替*

</div>

---

> 万物は逝き、万物は始まる。

## 📖 目次

- [機能](#-機能)
- [UI デザイン](#-ui-デザイン)
- [仕組み](#-仕組み)
- [プロジェクト構成](#-プロジェクト構成)
- [クイックスタート](#-クイックスタート)
- [データと方針](#-データと方針)
- [FAQ](#-faq)
- [データソース](#-データソース)
- [ライセンス](#-ライセンス)

## ✨ 機能

- 🌍 **リアルな地球** — NASA Blue Marble 4K 昼面テクスチャ + Black Marble 夜間都市灯 + 雲層と大気散乱グロー。パブリックドメイン画像をローカル化、外部依存なし
- ☀️ **リアルタイム昼夜明暗境界線** — 実際の UTC 時刻から太陽の直下点を算出、カスタムシェーダーで昼夜の移行と海面の太陽反射を毎フレーム描画
- 🗺️ **リアルな国境** — Natural Earth 110m 行政境界、ニュートラルなグラファイトブルーの淡着色
- 🛰️ **リアルタイム地震レイヤー** — USGS 過去 24 時間の世界の地震をアンバーの光点で表示、規模でサイズをマッピング。新たな M4.5+ イベントはリップルを発生
- 🌋 **リアルタイム自然災害レイヤー** — NASA EONET オープンイベント：火山（紫）・台風嵐（シアン）・野火（黄）・洪水（青）、左下の凡例で一目瞭然
- 🛰️ **ISS ライブ軌道** — CelesTrak TLE を毎秒 SGP4 で解算、尾を引く弧が宇宙ステーションに追従し、実際の高度と速度を表示
- 🎞️ **センサーモード** — 数字キー 1-4 で標準 / ナイトビジョン NVG / サーマル FLIR / モノクロ Noir を切替（GLSL ポスト処理）
- 🎬 **ブートシーケンス** — 実際のロード段階で進行するオービタルアニメーション → UI 言語に応じた地域へカメラが飛ぶ
- 🎵 **生成背景音楽** — Web Audio でリアルタイム合成される軽快なオルゴール。音声ファイルはゼロ
- 🎐 **巡る詩** — 手書きの三言語アフォリズムを 88 秒ごとにクロスフェード
- ⚡ **高速初回描画** — 3D シーンは遅延ロード（初回 JS ≈ 67 KB gzip）+ WebP テクスチャ + 昼テクスチャ先行レンダリング
- 🛡️ **品質ゲート** — CI は4つのゲート（ESLint → 単体テスト → Playwright スモーク×2 環境 → ビルド）全通でのみ公開。6 時間ごとに本番サイトをスモークテスト

## 🎨 UI デザイン

| 要素 | デザイン |
| --- | --- |
| テーマ | Apple ガラス：漆黒ベース + すりガラスパネル + ヘアライン、手続き生成の瞬く星空 |
| パネル | すりガラス：blur(28px) saturate(1.7) + 22px 角丸 + 深いシャドウ（visionOS の質感） |
| アクセントカラー | iOS システムカラー：地震オレンジ `#ff9f0a` · 火山パープル `#bf5af2` · 嵐シアン `#64d2ff` · 野火イエロー `#ffd60a` · 洪水ブルー `#0a84ff` |
| メインビジュアル | 3D リアル地球：NASA 昼/夜テクスチャ + リアルタイム明暗境界線 + 大気散乱、リアルタイムイベントの光点 |

## 🧠 仕組み

1. **データパイプライン**：`scripts/fetch_data.py` が Natural Earth の最新国境 GeoJSON をダウンロードしてローカライズ
2. **リアルタイムレイヤー**：USGS 地震（5 分ごと更新）と NASA EONET 災害（10 分ごと更新）はキーフリーの公開データ、失敗時は静かに縮退
3. **ISS 軌道**：CelesTrak TLE + satellite.js を毎秒 SGP4 解算、尾を引く弧がステーションに追従
4. **レンダリング**：globe.gl + three.js を遅延ロード。昼テクスチャが先に描画され、夜灯や雲は準備でき次第フェードイン。数字キー 1-4 でセンサー後処理スタイルを切替

## 📁 プロジェクト構成

```text
The-Global-Pulse/
├── index.html               # シングルページ入口（og/twitter シェア meta）
├── logo.svg                 # プロジェクトロゴ
├── scripts/
│   └── fetch_data.py        # データパイプライン：Natural Earth 国境
├── src/
│   ├── main.jsx             # マウント入口（StrictMode + ErrorBoundary）
│   ├── ErrorBoundary.jsx    # グローバルフォールバック：白画面ではなくエラー画面を表示
│   ├── App.jsx              # メインアプリ（ブートシーケンス / 凡例 / センサー / 音声アンロック）
│   ├── engine/globeScene.js # 地球シーン：レイヤー / ISS / センサー / レンダリングループ（遅延ロード）
│   ├── engine/globeFX.js    # ビジュアルエンジン：昼夜ライティング / 大気 / 星空 / センサーシェーダー
│   ├── audio/audioEngine.js # Web Audio 生成背景音楽
│   ├── voice.js             # 巡る詩（三言語）
│   ├── i18n.js              # 三言語コピー
│   └── index.css            # Apple ガラステーマ（すりガラスパネル / ブートシーケンス）
├── e2e/smoke.spec.js        # Playwright スモークテスト
├── tests/                   # 単体テスト（vitest）
└── public/
    ├── datasets/countries.geojson # Natural Earth 国境（スクリプト生成）
    ├── og-card.png          # シェアカード画像
    └── img/                 # NASA 地球テクスチャ（WebP）
```

## 🚀 クイックスタート

```bash
git clone https://github.com/Mocas-12/The-Global-Pulse.git
cd The-Global-Pulse
npm install
npm run dev        # 開発：http://localhost:5173
```

> Node ≥ 22 が必要（`.nvmrc` は CI と一致する 24 に固定）。ローカルで E2E を実行する前に `npx playwright install chromium` を実行してください。

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | `dist/` にビルド |
| `npm run lint` | ESLint チェック |
| `npm test` | 単体テスト実行（vitest） |
| `npm run e2e` | Playwright スモークテスト（ビルド成果物 + 開発サーバー） |
| `python scripts/fetch_data.py` | Natural Earth 国境を再取得（Python 3 必要） |

> `main` へのプッシュ後、GitHub Actions が lint → 単体テスト → E2E → ビルドを順に実行し、全て通過した場合のみ GitHub Pages へ公開します。別のワークフローが 6 時間ごとに本番サイトをスモークテストします。

## 🔢 データと方針

- 地震データは USGS の過去 24 時間リアルタイムフィードから。火山 / 嵐 / 野火 / 洪水は NASA EONET の過去 30 日オープンイベントから
- ISS の位置は CelesTrak TLE を SGP4 モデルで毎秒解算したもの。高度と速度はモデル計算値
- 全てのイベントは実際の座標に配置。光点のサイズは視覚的なヒントに過ぎません

## ❓ FAQ

<details>
<summary><b>センサービューの切替方法</b></summary>

- 数字キー 1-4：標準 / ナイトビジョン NVG / サーマル FLIR / モノクロ Noir。右上のバッジをクリックするか 1 を押せば標準に戻ります
</details>

<details>
<summary><b>ミュート方法</b></summary>

- 背景音楽はデフォルト ON で、初回操作ですぐに鳴ります（ブラウザのオートプレイポリシー）。右上のスピーカーアイコンでミュートできます
</details>

## 📚 データソース

- [USGS Earthquake Feed](https://earthquake.usgs.gov/earthquakes/feed/) — リアルタイム地震
- [NASA EONET](https://eonet.gsfc.nasa.gov/) — 自然災害オープンイベント
- [CelesTrak](https://celestrak.org/) — ISS 軌道要素
- [Natural Earth](https://www.naturalearthdata.com/) — 行政境界
- [NASA Blue Marble / Black Marble](https://visibleearth.nasa.gov/) — 昼/夜地表テクスチャ（パブリックドメイン）

## 📄 ライセンス

本プロジェクトは [MIT License](./LICENSE) の下でオープンソース化されています。著作権表示を保持すれば、自由に利用・改変・配布・商用化できます。

---

<div align="center">

**Made with 💙**

🌐 [ライブプレビュー](https://mocas-12.github.io/The-Global-Pulse/) · 🐛 [問題報告](https://github.com/Mocas-12/The-Global-Pulse/issues)

</div>
