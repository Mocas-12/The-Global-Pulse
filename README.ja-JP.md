<div align="center">

<img src="./logo.svg" width="96" alt="The Global Pulse Logo" />

# The Global Pulse

**地球の人口の鼓動——リアルな国境 · リアルなデータ · リアルタイムで息づく 3D 地球**

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live-222?logo=githubpages&logoColor=white)](https://mocas-12.github.io/The-Global-Pulse/)
[![Deploy](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/deploy.yml)
[![Production monitor](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml/badge.svg)](https://github.com/Mocas-12/The-Global-Pulse/actions/workflows/prod-monitor.yml)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Three.js](https://img.shields.io/badge/Three.js-183-000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Data](https://img.shields.io/badge/Data-World_Bank_2024-00b0ff)](https://data.worldbank.org/)
[![Borders](https://img.shields.io/badge/Borders-Natural_Earth-2affb4)](https://www.naturalearthdata.com/)

**[🌐 ライブプレビュー (GitHub Pages)](https://mocas-12.github.io/The-Global-Pulse/)**

[English](./README.md) | [简体中文](./README.zh-CN.md) | **日本語**

*ページを開く → 地球の鼓動が膨らみ縮むのを見る → どの国でもクリックしてリアルタイム詳細を表示*

</div>

---

> すべてのものは過ぎ去り、すべてのものは始まる。

## 📖 目次

- [特徴](#-特徴)
- [UI デザイン](#-ui-デザイン)
- [仕組み](#-仕組み)
- [プロジェクト構成](#-プロジェクト構成)
- [クイックスタート](#-クイックスタート)
- [データと算出方法](#-データと算出方法)
- [FAQ](#-faq)
- [データソース](#-データソース)
- [ライセンス](#-ライセンス)

## ✨ 特徴

- 🌍 **リアルな地球** — NASA Blue Marble 4K 昼面テクスチャ + Black Marble 夜間都市ライト + 雲レイヤーと大気散乱のグロー。パブリックドメイン画像をローカル同梱し、外部ネットワークに依存しない
- ☀️ **ライブの昼夜明暗線** — 太陽直下点を実際の UTC 时刻から計算。カスタムシェーダが毎フレーム昼/夜をブレンドし、暖かな夕焼けバンドと海面の太陽反射も描画——今どこが昼なのかひと目で分かる
- 🗺️ **リアルな国境** — Natural Earth 110m 行政境界。177 の国・地域を対数スケールの人口着色とホバーハイライトで正確に描画
- 📊 **リアルなデータ** — World Bank 2024 年の人口 / 粗出生率 / 粗死亡率（SP.POP.TOTL / SP.DYN.CBRT.IN / SP.DYN.CDRT.IN）、217 の経済圏をカバー
- 💓 **リアルタイムシミュレーション** — 各国の実際の率で世界の出生 / 死亡 / 純増を秒単位でシミュレート。パルスは**実際の国境の内側**にフラッシュ + 拡散する衝撃波リングとして着地し、人口密集地の実在都市へ寄って集まる
- ⏳ **時間軸リプレイ** — 国連 WPP の実史系列（1950 → 2024、Our World in Data 経由）で駆動。スクラブや自動再生で、世界人口・出生/死亡率・パルスのテンポ・国別出生ランキングが実史に沿って動く——ベビーブームと光の帯の移動を見られる
- 🔗 **人間味のある演出** — 「このページを開いてから」の純増カウンターを人間スケールに翻訳（教室 / 学校 / クルーズ船 / 都市）。選択した国のシェアリンクをコピーでき、開いた瞬間にその国へカメラが飛ぶ
- 🎬 **シネマティックなイントロ** — 深宇宙からのカメラ飛行 + タイトルのフェード + パネルのフォーカスイン。手続き生成の瞬く星空とフィルムグレインの雰囲気
- 🗺️ **国の詳細** — 国をクリックするとカメラが飛んでいき、人口・順位・本日の出生/死亡・出生/死亡率・世界シェアを表示（データ年を注記）
- 🩺 **世界の健康パネル** — 心血管疾患・がん・タバコ・5 歳未満児死亡など 12 カテゴリの年間死亡数をシミュレート表示
- 📰 **スクロール速報** — シミュレーションから導出した国別出生と世界の死亡原因のリアルタイム速報
- 🈶 **三言語 UI** — 中文 / English / 日本語
- 🔊 **合成サウンド** — イントロのアプローチ音と心拍のアンビエントを Web Audio でリアルタイム合成（デフォルト ON。初回操作で自動アンロック、右上からミュート）
- ⚡ **高速ファーストペイント** — 3D シーンは遅延ロード（初回ペイントの JS ≈ 78 KB gzip）+ 全テクスチャを WebP 化 + 昼テクスチャを先に描画し、夜間ライトと雲はフェードイン
- 🛡️ **品質ゲート** — CI は 4 つのゲートを実行（ESLint → エンジン & コンポーネント単体テスト → Playwright スモーク × ビルド/開発サーバ → ビルド）。全通過時のみ公開。本番サイトは 6 時間ごとにスモークテストし、失敗時はメール通知。グローバル ErrorBoundary と `prefers-reduced-motion` 対応も完備

## 🎨 UI デザイン

| 要素 | デザイン |
| --- | --- |
| テーマ | 深宇宙シネマティック：漆黒ベース + かすかな星雲 + ビネットとフィルムグレイン、手続き生成の瞬く星空 |
| パネル | ガラスモーフィズム：半透明の暗い塗り + 背景ブラー & 彩度 + 細いストローク + 上部の極細ライン |
| アクセントカラー | 空色シアン `#38bdf8` をプライマリに。出生グリーン `#2affb4` · 死亡レッド `#ff5470` の 2 つの意味色 |
| ヒーロー visuals | 3D リアル地球：NASA 昼/夜テクスチャ + ライブ明暗線 + 大気散乱 + 雲。国々は細いストロークと淡い着色で |
| モーション | 出生/死亡のフラッシュ + 衝撃波リング。イントロのカメラ飛行とタイトルフェード。手書き rAF の数値トゥイーン。`prefers-reduced-motion` フォールバック |
| レイアウト | 上部スクロール速報 + 左統計パネル + クリックで開く国カード（カメラが飛ぶ） |

## 🧠 仕組み

```mermaid
flowchart LR
    A[📦 データパイプライン<br/>World Bank · Natural Earth] --> B[⚙️ シミュレーションエンジン<br/>実際の率で秒単位積分]
    B --> C[🌍 3D 地球描画<br/>国境内での重み付きランディング]
    C --> D[📊 パネル & 速報<br/>出生 · 死亡 · 死因 · 国詳細]
```

1. **データパイプライン**：`scripts/fetch_data.py` が最新の Natural Earth 境界 GeoJSON と人口密集地をダウンロードし、3 指標の 2015 年以降の World Bank データをすべて取得（各国の最新値を使用）。さらに Our World in Data 経由で国連 WPP の 1950〜2023 歴史系列も取得
2. **リアルタイムシミュレーション**：World Bank の年次粗出生/死亡率を率として、「今日 / 今年」の数値をローカルの深夜 0 時 / 年始から積分。世界人口のベースは各国の 2024 年推計の合計（約 82.1 億人）
3. **着地点サンプリング**：パルスの light は各国の出生/死亡率で重み付けして国を選び、その国内では都市人口で重み付けした都市を選びガウス拡散（国境外に出た場合は縮小してリトライ）。サンプルの 5 分の 1 は一様分布のままで農村人口を代表
4. **描画 & インタラクション**：globe.gl + three.js を遅延ロード（`src/engine/globeScene.js`、データのダウンロードと並行）。`src/engine/globeFX.js` がカスタムシェーダを提供——太陽直下点を低精度天文アルゴリズム（±0.01°）で UTC からリアルタイム計算し、昼/夜テクスチャ・海面の反射・大気散乱を毎フレームブレンド。昼テクスチャを先に描画し、夜間ライトと雲がフェードイン。国をクリックするとカメラが飛んで詳細カードを開く
5. **合成オーディオ**：Web Audio がイントロのアプローチ音と心拍アンビエントをリアルタイム合成——音声ファイルは一切なし

## 📁 プロジェクト構成

```text
The-Global-Pulse/
├── index.html               # シングルページエントリ（og/twitter シェア meta）
├── logo.svg                 # プロジェクトロゴ
├── scripts/
│   └── fetch_data.py        # データパイプライン：境界 + World Bank 指標
├── src/
│   ├── main.jsx             # マウントエントリ（StrictMode + ErrorBoundary）
│   ├── ErrorBoundary.jsx    # グローバルフォールバック：白画面の代わりにエラー画面を表示
│   ├── App.jsx              # メインアプリ（パネル / インタラクション / 音声アンロック / シーン組み立て）
│   ├── engine/worldEngine.js # データエンジン：実際の率 → リアルタイムシミュレーション + 国境内ランダムサンプリング
│   ├── engine/globeFX.js    # ビジュアルエンジン：昼夜ライティング / 大気 / 雲 / 星空 / 波紋シェーダ
│   ├── engine/globeScene.js # 地球シーン：初期化 / イントロ演出 / 描画ループ（遅延ロード）
│   ├── audio/audioEngine.js # Web Audio 合成効果音
│   ├── data/worldBankData.json # World Bank 2024 指標（スクリプト生成）
│   ├── i18n.js              # 三言語コピー
│   ├── news.js              # スクロール速報の生成
│   └── index.css            # 深宇宙シネマティックテーマ（ガラス風パネル / イントロ演出）
├── e2e/smoke.spec.js        # Playwright スモークテスト（モバイルビューポート / ?pause 固定 / StrictMode 単一インスタンス）
├── playwright.config.js     # E2E 設定：ビルド成果物 + 開発サーバ
├── playwright.prod.config.js # 本番サイト監視設定（本番に対して実行）
├── tests/worldEngine.test.js # エンジン単体テスト（幾何サンプリング / 時間積分 / データフォールバック）
├── tests/components.test.jsx # コンポーネント単体テスト（数値ロールアップ / 速報 / パネル / エラー境界）
└── public/
    ├── datasets/countries.geojson # Natural Earth 境界（スクリプト生成）
    ├── datasets/populatedPlaces.json # パルス集中用の都市点（スクリプト生成）
    ├── datasets/unSeries.json # 国連 WPP 1950〜2023 歴史系列（スクリプト生成）
    ├── og-card.png          # ソーシャルシェアカード画像
    └── img/                 # NASA 地球テクスチャ（WebP）：4K 昼 / 夜間ライト / 水マスク / 雲
```

## 🚀 クイックスタート

```bash
git clone https://github.com/Mocas-12/The-Global-Pulse.git
cd The-Global-Pulse
npm install
npm run dev        # 開発： http://localhost:5173
```

> Node ≥ 22 が必要（`.nvmrc` は CI と一致する 24 をピン留め）。ローカルで E2E を実行する前に `npx playwright install chromium` を実行してください。

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバを起動 |
| `npm run build` | `dist/` へビルド |
| `npm run lint` | ESLint を実行 |
| `npm test` | 単体テストを実行（エンジン + コンポーネント、vitest） |
| `npm run e2e` | Playwright スモークテストを実行（ビルド成果物 + 開発サーバ） |
| `npm run preview` | ビルドをローカルでプレビュー |
| `python scripts/fetch_data.py` | 境界と World Bank データを再取得（Python 3 が必要） |

> `main` への push 後、GitHub Actions が lint → 単体テスト → E2E → ビルドを実行し、全通過時のみ GitHub Pages へ公開します。別ワークフローが 6 時間ごとに本番サイトをスモークテストし（失敗時はメール通知）、さらに別のワークフローが毎月 3 日にデータパイプラインを再実行し、データが変わったら自動で PR を開きます。

## 🔢 データと算出方法

- ページの「今日 / 今年」の数値は**モデルによるシミュレーション値**です：World Bank の年次率をローカルの深夜 0 時 / 年始から積分したもの
- 時間軸リプレイ（1950 → 2024）は**国連 WPP の実史推計**（Our World in Data 経由）を使用：リプレイ中の世界人口と出生/死亡率はその年の実推計で、「今日」はその年の率を現在の時計時刻に按分。国の詳細カードは引き続き World Bank 2024 年データ
- 世界人口のベースは各国の 2024 年推計の合計（約 82.1 億人）で、国連の世界人口時計と桁が一致
- 死因の年間ベースラインは WHO Global Health Estimates、UN IGME、UNAIDS、UNODC などの公開推計による。値は可視化用の近似です
- すべてのリアルタイム数値は権威ある年次統計に基づくシミュレーションであり、実際の秒単位計測ではありません

## ❓ FAQ

<details>
<summary><b>ページの数値は実時間の秒単位計測なの？</b></summary>

- いいえ。World Bank の年次率をローカルの深夜 0 時 / 年始から積分してシミュレートしたものです。桁は権威ある時計と一致しますが、実際の秒単位計測ではありません
</details>

<details>
<summary><b>クリックしてもデータがない国があるのは？</b></summary>

- World Bank の指標は 217 の経済圏をカバーします。データのない地域では、パネルに欠損を注記します
</details>

<details>
<summary><b>最新データへ更新するには？</b></summary>

- リポジトリには毎月 3 日に `scripts/fetch_data.py` を実行し、データが変わったら PR を開くワークフローが同梱されています——マージするだけです
- ローカルで Python 3 により `python scripts/fetch_data.py` を実行し、両ファイルを手動再生成することもできます
</details>

<details>
<summary><b>サウンドをミュートするには？</b></summary>

- サウンドはデフォルト ON で、初回操作時に自動アンロックされます（ブラウザのオートプレイポリシー）。右上のスピーカーアイコンでミュートできます。アンビエントは Web Audio でリアルタイム合成されており、個別の音符イベントはありません
</details>

## 📚 データソース

- [World Bank Open Data](https://data.worldbank.org/) — 人口と粗出生/死亡率
- [UN World Population Prospects 2024 (via Our World in Data)](https://ourworldindata.org/population) — 1950〜2023 の歴史人口と出生/死亡率系列
- [Natural Earth](https://www.naturalearthdata.com/) — 行政境界と人口密集地
- [NASA Blue Marble Next Generation](https://visibleearth.nasa.gov/collection/1484/blue-marble-next-generation) — 昼面の地表テクスチャ（パブリックドメイン）
- [NASA Black Marble — Earth at Night](https://earthobservatory.nasa.gov/features/NightLights) — 夜面の都市ライトテクスチャ（パブリックドメイン）
- [WHO / UN IGME / UNAIDS / UNODC](https://www.who.int/data/global-health-estimates) — 死因推計

## 📄 ライセンス

このプロジェクトは [MIT License](./LICENSE) で公開しています——著作権表示を保持すれば、利用・改変・配布・商用利用は自由です。

---

<div align="center">

**Made with 💙**

🌐 [ライブプレビュー](https://mocas-12.github.io/The-Global-Pulse/) · 🐛 [Issue を報告](https://github.com/Mocas-12/The-Global-Pulse/issues)

</div>
