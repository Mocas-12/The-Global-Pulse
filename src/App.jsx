// App.jsx — The Global Pulse · 全球人口脉搏
// 真实国界(Natural Earth) + 真实数据(世界银行 2024) + 实时推演
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { worldEngine, DEATH_CAUSES, REFERENCE_FACTS } from './engine/worldEngine'
import { T, LANGS } from './i18n'
import { makeNews } from './news'
import {
  ensureCtx, startAmbient, stopAmbient, playBirth, playDeath, setMuted, isMuted,
} from './audio/audioEngine'

const BASE = import.meta.env.BASE_URL || '/'
const GLOBE_IMG = `${BASE}img/earth-dark.jpg`
const BUMP_IMG = `${BASE}img/earth-topology.png`

const fmt = (n, lang) => {
  try {
    return Math.round(n).toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US')
  } catch {
    return String(Math.round(n))
  }
}

const clockText = (lang) => {
  const d = new Date()
  const p2 = (x) => String(x).padStart(2, '0')
  const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  const time = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
  return lang === 'en' ? `${date} ${time}` : `${date} ${time}`
}

// ————————————————————————————— 顶部滚动快讯 —————————————————————————————
function NewsTicker({ lang }) {
  const [items, setItems] = useState(() => [makeNews(lang), makeNews(lang), makeNews(lang)])
  useEffect(() => {
    setItems([makeNews(lang), makeNews(lang), makeNews(lang)])
    let alive = true
    const loop = () => {
      const delay = 3800 + Math.random() * 3200
      return setTimeout(() => {
        if (!alive) return
        setItems((prev) => {
          const next = [...prev.slice(-11), makeNews(lang)]
          return next
        })
        timerRef.current = loop()
      }, delay)
    }
    const timerRef = { current: loop() }
    return () => { alive = false; clearTimeout(timerRef.current) }
  }, [lang])
  const seq = items.map((it) => (
    <span key={it.id} className={`ticker-item ${it.kind}`}>
      {it.kind === 'birth' ? '▲' : '▼'} {it.text}
    </span>
  ))
  return (
    <div className="news-ticker" aria-hidden="true">
      <div className="ticker-track">{seq}{seq.map((el, i) => ({ ...el, key: `b${el.key}` }))}</div>
    </div>
  )
}

// ————————————————————————————— 数字翻牌 —————————————————————————————
function RollingNumber({ value, className }) {
  const ref = useRef(null)
  const prevRef = useRef(value)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = prevRef.current
    prevRef.current = value
    const obj = { v: from }
    const diff = value - from
    if (diff <= 0) { el.textContent = value.toLocaleString('en-US'); return }
    const tw = gsap.to(obj, {
      v: value,
      duration: 0.24,
      ease: 'power1.out',
      onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('en-US') },
    })
    return () => tw.kill()
  }, [value])
  return <span ref={ref} className={className}>{value.toLocaleString('en-US')}</span>
}

// ————————————————————————————— 左侧主面板 —————————————————————————————
function StatsPanel({ snap, lang }) {
  const t = T[lang]
  const causes = useMemo(() => {
    const yearSec = snap.yearSec || 1
    return DEATH_CAUSES.map((c) => ({ ...c, n: Math.floor((c.annual / 31557600) * yearSec) }))
      .sort((a, b) => b.n - a.n)
  }, [snap.yearSec])
  const cig = Math.floor((REFERENCE_FACTS.cigarettesPerYear / 31557600) * (snap.daySec || 0))
  const drug = Math.floor((REFERENCE_FACTS.illegalDrugsUSDPerYear / 31557600) * (snap.daySec || 0))
  const topBirths = useMemo(() => worldEngine.topByBirths(5), [snap.birthsToday])
  return (
    <div className="panel stats-panel">
      <div className="panel-head">
        <span className="live-dot" />
        <span className="live-label">{t.live}</span>
        <span className="clock">{clockText(lang)}</span>
      </div>
      <div className="big-stat">
        <div className="big-label">{t.worldPop}</div>
        <RollingNumber className="big-value" value={snap.worldPopulation} />
      </div>
      <div className="stat-grid">
        <div className="stat birth">
          <span className="stat-label">{t.birthsYear}</span>
          <RollingNumber className="stat-value" value={snap.birthsYear} />
        </div>
        <div className="stat death">
          <span className="stat-label">{t.deathsYear}</span>
          <RollingNumber className="stat-value" value={snap.deathsYear} />
        </div>
        <div className="stat birth">
          <span className="stat-label">{t.birthsToday}</span>
          <RollingNumber className="stat-value" value={snap.birthsToday} />
        </div>
        <div className="stat death">
          <span className="stat-label">{t.deathsToday}</span>
          <RollingNumber className="stat-value" value={snap.deathsToday} />
        </div>
        <div className="stat net">
          <span className="stat-label">{t.netGrowth}</span>
          <RollingNumber className="stat-value" value={snap.worldPopulation - worldEngine.worldPopulation} />
        </div>
        <div className="stat rate">
          <span className="stat-label">{t.birthsPerSec}</span>
          <span className="stat-value">{snap.birthsPerSec.toFixed(1)}</span>
        </div>
      </div>
      <div className="divider" />
      <div className="section-title">{t.health}</div>
      <div className="cause-list">
        {causes.map((c) => (
          <div className="cause-row" key={c.key}>
            <span className="cause-name">{lang === 'en' ? c.en : lang === 'ja' ? c.ja : c.zh}</span>
            <span className="cause-bar"><i style={{ width: `${Math.min(100, (c.n / causes[0].n) * 100)}%` }} /></span>
            <span className="cause-num">-{fmt(c.n, lang)}</span>
          </div>
        ))}
      </div>
      <div className="divider" />
      <div className="cause-row">
        <span className="cause-name">{t.cigarettes}</span>
        <span className="cause-num">{fmt(cig, lang)}</span>
      </div>
      <div className="cause-row">
        <span className="cause-name">{t.drugMoney}</span>
        <span className="cause-num">${fmt(drug / 1e6, lang)}M</span>
      </div>
      <div className="divider" />
      <div className="section-title">{t.topBirths}</div>
      <div className="top-list">
        {topBirths.map((c, i) => (
          <div className="top-row" key={c.iso3}>
            <span className="top-rank">{i + 1}</span>
            <span className="top-name">{worldEngine.countryName(c.iso3, lang)}</span>
            <span className="top-num">+{fmt(c.birthsToday, lang)}</span>
          </div>
        ))}
      </div>
      <div className="data-note">{t.dataNote}</div>
    </div>
  )
}

// ————————————————————————————— 国家详情卡 —————————————————————————————
function CountryCard({ detail, lang, onClose }) {
  const t = T[lang]
  const c = detail
  return (
    <div className="panel country-card" onClick={(e) => e.stopPropagation()}>
      <div className="card-head">
        <span className="card-flag">{c.rank <= 3 ? '★' : '●'}</span>
        <span className="card-name">{lang === 'en' ? c.name.en : lang === 'ja' ? (c.name.ja || c.name.en) : (c.name.zh || c.name.en)}</span>
        <button className="card-close" onClick={onClose} aria-label={t.close}>✕</button>
      </div>
      <div className="card-grid">
        <div className="card-item">
          <span className="card-label">{t.popLabel}</span>
          <span className="card-value">{fmt(c.population, lang)}</span>
        </div>
        <div className="card-item">
          <span className="card-label">{t.rank}</span>
          <span className="card-value">#{c.rank}</span>
        </div>
        <div className="card-item birth">
          <span className="card-label">{t.birthsToday}</span>
          <span className="card-value">+{fmt(c.birthsToday, lang)}</span>
        </div>
        <div className="card-item death">
          <span className="card-label">{t.deathsToday}</span>
          <span className="card-value">-{fmt(c.deathsToday, lang)}</span>
        </div>
        <div className="card-item">
          <span className="card-label">{t.birthRateLabel}</span>
          <span className="card-value">{c.birthRate?.toFixed(2)}{t.perThousand}</span>
        </div>
        <div className="card-item">
          <span className="card-label">{t.deathRateLabel}</span>
          <span className="card-value">{c.deathRate?.toFixed(2)}{t.perThousand}</span>
        </div>
        <div className="card-item">
          <span className="card-label">{t.worldShare}</span>
          <span className="card-value">{(c.worldPopShare * 100).toFixed(2)}%</span>
        </div>
        <div className="card-item">
          <span className="card-label">{t.birthShare}</span>
          <span className="card-value">{(c.worldBirthShare * 100).toFixed(2)}%</span>
        </div>
      </div>
      <div className="card-foot">{t.dataYear}: {c.dataYear ?? '—'} · World Bank</div>
    </div>
  )
}

// ————————————————————————————— 主应用 —————————————————————————————
export default function App() {
  const containerRef = useRef(null)
  const globeRef = useRef(null)
  const [lang, setLang] = useState(() => (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en')
  const t = T[lang]
  const [snap, setSnap] = useState(() => worldEngine.snapshot())
  const [selectedIso, setSelectedIso] = useState(null)
  const [geoLoaded, setGeoLoaded] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const pulsesRef = useRef(new Map()) // el -> {lat,lng}
  const hoverRef = useRef(null)
  const MOBILE = useMemo(() => window.innerWidth <= 768, [])

  // 引擎订阅
  useEffect(() => {
    worldEngine.setFeatures(window.__GEO_FEATURES__ || [])
    const un = worldEngine.subscribe(setSnap)
    worldEngine.start()
    return () => { un(); worldEngine.stop() }
  }, [])

  // 加载真实国界
  useEffect(() => {
    fetch(`${BASE}datasets/countries.geojson`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then((data) => {
        window.__GEO_FEATURES__ = data.features || []
        worldEngine.setFeatures(window.__GEO_FEATURES__)
        setGeoLoaded(true)
      })
      .catch(() => {
        // 兜底: 远程 Natural Earth
        fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
          .then((r) => r.json())
          .then((data) => {
            window.__GEO_FEATURES__ = data.features || []
            worldEngine.setFeatures(window.__GEO_FEATURES__)
            setGeoLoaded(true)
          })
      })
  }, [])

  const hexColor = useCallback((f) => {
    const c = worldEngine.countries[f.__iso3]
    const pop = c?.population || 0
    // 人口对数着色: 深海军蓝 -> 中蓝 -> 亮青(仅人口大国)
    const l = Math.log10(Math.max(pop, 1)) // 0 ~ 9.2
    const k = Math.min(1, Math.max(0, (l - 4.5) / 4.7))
    const stops = [
      [8, 25, 60],
      [10, 80, 130],
      [0, 190, 230],
    ]
    const seg = k < 0.5 ? 0 : 1
    const p = k < 0.5 ? k * 2 : (k - 0.5) * 2
    const a = stops[seg]
    const b = stops[seg + 1]
    const r = Math.round(a[0] + (b[0] - a[0]) * p)
    const g = Math.round(a[1] + (b[1] - a[1]) * p)
    const bl = Math.round(a[2] + (b[2] - a[2]) * p)
    const alpha = 0.5 + 0.38 * k
    return `rgba(${r},${g},${bl},${alpha})`
  }, [])

  // 初始化地球
  useEffect(() => {
    if (!geoLoaded || !containerRef.current || globeRef.current) return
    const world = Globe({ animateIn: true })(containerRef.current)
      .backgroundColor('rgba(3,7,18,0)')
      .globeImageUrl(GLOBE_IMG)
      .bumpImageUrl(BUMP_IMG)
      .showAtmosphere(true)
      .atmosphereColor('#3ba7ff')
      .atmosphereAltitude(0.22)
      .polygonsData(worldEngine.features)
      .polygonCapColor(hexColor)
      .polygonSideColor(() => 'rgba(0,229,255,0.06)')
      .polygonStrokeColor(() => 'rgba(120,220,255,0.35)')
      .polygonAltitude(0.008)
      .polygonLabel((f) => '')
    world.controls().enableDamping = true
    world.controls().dampingFactor = 0.1
    world.controls().enablePan = false
    world.controls().minDistance = 150
    world.controls().maxDistance = 800
    world.renderer().setPixelRatio(MOBILE ? 1.2 : Math.min(2, window.devicePixelRatio))
    world.width(window.innerWidth).height(window.innerHeight)
    const onResize = () => {
      world.width(window.innerWidth).height(window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    world.pointOfView({ lat: 24, lng: 105, altitude: MOBILE ? 3.4 : 2.4 }, 0)

    // 交互
    world.onPolygonClick((f) => {
      const iso3 = f.__iso3
      // 注意: 此处不可调用 ensureCtx(), 否则任何点击都会解锁 AudioContext,
      // 导致静音模式下首次点击后音效突然涌出
      setSelectedIso((prev) => (prev === iso3 ? null : iso3))
    })
    world.onGlobeClick(() => setSelectedIso(null))

    globeRef.current = world
    return () => {
      window.removeEventListener('resize', onResize)
      world._destructor?.()
      globeRef.current = null
    }
  }, [geoLoaded, hexColor, MOBILE])

  // 脉冲层: 用 three.js Points 高性能渲染
  useEffect(() => {
    if (!geoLoaded) return
    const world = globeRef.current
    if (!world) return
    const scene = world.scene()
    const MAX = 260
    const positions = new Float32Array(MAX * 3)
    const colors = new Float32Array(MAX * 3)
    const life = new Float32Array(MAX) // 0..1
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const tex = (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 64
      const g = c.getContext('2d')
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      grad.addColorStop(0, 'rgba(255,255,255,1)')
      grad.addColorStop(0.35, 'rgba(255,255,255,0.7)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grad
      g.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()
    const mat = new THREE.PointsMaterial({
      size: 9, map: tex, transparent: true, depthWrite: false,
      blending: THREE.NormalBlending, vertexColors: true, sizeAttenuation: true,
    })
    const points = new THREE.Points(geom, mat)
    points.frustumCulled = false
    points.renderOrder = 999
    scene.add(points)
    // 调试句柄
    window.__PULSE_DEBUG__ = {
      activeCount: () => { let n = 0; for (let i = 0; i < MAX; i++) if (life[i] > 0) n += 1; return n },
      spawned: () => head,
      pointsObj: points,
    }

    const BIRTH = new THREE.Color(0x2affb4)
    const DEATH = new THREE.Color(0xff5470)
    const baseColors = new Float32Array(MAX * 3)
    let head = 0
    const spawn = ({ type, lat, lng }) => {
      const i = head % MAX
      head += 1
      // 与 three-globe polar2Cartesian 完全一致的坐标系
      const R = 101.8 // 高于国家多边形表面(100.8), 避免遮挡
      const phi = (90 - lat) * (Math.PI / 180)
      const theta = (90 - lng) * (Math.PI / 180)
      positions[i * 3] = R * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = R * Math.cos(phi)
      positions[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta)
      const col = type === 'birth' ? BIRTH : DEATH
      baseColors[i * 3] = col.r
      baseColors[i * 3 + 1] = col.g
      baseColors[i * 3 + 2] = col.b
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
      life[i] = 1
    }
    const unPulse = worldEngine.onPulse((p) => {
      spawn(p)
      if (p.type === 'birth') playBirth(0.16)
      else playDeath(0.13)
    })
    let raf = 0
    const tick = () => {
      let dirty = false
      for (let i = 0; i < MAX; i++) {
        if (life[i] > 0) {
          life[i] = Math.max(0, life[i] - 0.016)
          const s = life[i]
          const k = s * s * (3 - 2 * s) // smoothstep 淡出
          colors[i * 3] = baseColors[i * 3] * k
          colors[i * 3 + 1] = baseColors[i * 3 + 1] * k
          colors[i * 3 + 2] = baseColors[i * 3 + 2] * k
          if (life[i] <= 0) positions[i * 3 + 1] = -9999
          dirty = true
        }
      }
      if (dirty) {
        geom.attributes.position.needsUpdate = true
        geom.attributes.color.needsUpdate = true
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      unPulse()
      cancelAnimationFrame(raf)
      scene.remove(points)
      geom.dispose()
      mat.dispose()
      tex.dispose()
    }
  }, [geoLoaded])

  // 声音开关(仅在用户主动开启声音时解锁 AudioContext)
  const toggleSound = useCallback(() => {
    if (isMuted()) {
      // 开启声音: 此时才创建/恢复 AudioContext 并启动环境音景
      ensureCtx()
      setMuted(false)
      startAmbient()
      setSoundOn(true)
    } else {
      // 关闭声音: 仅置静音, 环境音景淡出
      setMuted(true)
      stopAmbient()
      setSoundOn(false)
    }
  }, [])

  // 键盘 Esc 关闭
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedIso(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const detail = useMemo(
    () => (selectedIso ? worldEngine.countryDetail(selectedIso) : null),
    [selectedIso, snap]
  )

  return (
    <div className="app-root">
      <div className="bg-grid" aria-hidden="true" />
      <div ref={containerRef} className="globe-container" />
      {!geoLoaded && <div className="loading-mask">{t.loading}</div>}

      <NewsTicker lang={lang} />
      <div className="slogan">{t.subtitle}</div>

      <StatsPanel snap={snap} lang={lang} />

      {detail && <CountryCard detail={detail} lang={lang} onClose={() => setSelectedIso(null)} />}

      <div className="top-right">
        <div className="lang-switch">
          {LANGS.map((l) => (
            <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
              {l === 'zh' ? '中' : l === 'en' ? 'EN' : '日'}
            </button>
          ))}
        </div>
        <button className={`sound-btn ${soundOn ? 'on' : ''}`} onClick={toggleSound}>
          {soundOn ? '♪' : '✕♪'}
        </button>
      </div>

      <div className="hint">{t.clickHint}</div>
    </div>
  )
}
