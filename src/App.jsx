// App.jsx — The Global Pulse · 全球人口脉搏
// 真实国界(Natural Earth) + 真实数据(世界银行 2024) + 实时推演
// 视觉: NASA 昼/夜贴图 + 实时太阳晨昏线 + 大气散射 + 云层 + 星空 + 涟漪脉冲
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { worldEngine, DEATH_CAUSES, REFERENCE_FACTS } from './engine/worldEngine'
import {
  sunLatLon, latLngToVec3, createGlobeMaterial, createAtmosphere,
  createClouds, createStarfield, createRings,
} from './engine/globeFX'
import { T, LANGS } from './i18n'
import { makeNews } from './news'
import {
  ensureCtx, startAmbient, stopAmbient, playBirth, playDeath, setMuted, isMuted,
} from './audio/audioEngine'

const BASE = import.meta.env.BASE_URL || '/'
const TEX = {
  day: `${BASE}img/earth-day-4k.jpg`,
  dayFallback: `${BASE}img/earth-dark.jpg`,
  night: `${BASE}img/earth-night.jpg`,
  water: `${BASE}img/earth-water-4k.png`,
  clouds: `${BASE}img/clouds.jpg`,
}

const GLOBE_R = 100
const PULSE_R = 101.8 // 高于国家多边形表面(101)与云层(100.6), 避免遮挡

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
      <div className="ticker-track">{seq}{seq.map((el) => ({ ...el, key: `b${el.key}` }))}</div>
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
  const fxRef = useRef(null) // 地球特效句柄: 材质/网格/脉冲缓冲
  const hoverIsoRef = useRef(null)
  const selectedIsoRef = useRef(null)
  const introDoneRef = useRef(false)
  const [lang, setLang] = useState(() => (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en')
  const t = T[lang]
  const [snap, setSnap] = useState(() => worldEngine.snapshot())
  const [selectedIso, setSelectedIso] = useState(null)
  const [geoLoaded, setGeoLoaded] = useState(false)
  const [ready, setReady] = useState(false)       // 地球+贴图就绪, 开场开始
  const [booted, setBooted] = useState(false)     // 面板入场
  const [introGone, setIntroGone] = useState(false) // 标题谢幕
  const [soundOn, setSoundOn] = useState(false)
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

  useEffect(() => { selectedIsoRef.current = selectedIso }, [selectedIso])

  // 国家多边形着色: 人口对数 -> 淡填充, 让真实地表透出
  const polygonCapColor = useCallback((f) => {
    const iso = f.__iso3
    if (iso === hoverIsoRef.current) return 'rgba(140, 225, 255, 0.42)'
    if (iso === selectedIsoRef.current) return 'rgba(190, 240, 255, 0.36)'
    const c = worldEngine.countries[iso]
    const pop = c?.population || 0
    const l = Math.log10(Math.max(pop, 1)) // 0 ~ 9.2
    const k = Math.min(1, Math.max(0, (l - 4.5) / 4.7))
    const stops = [
      [12, 34, 72],
      [16, 92, 140],
      [24, 200, 235],
    ]
    const seg = k < 0.5 ? 0 : 1
    const p = k < 0.5 ? k * 2 : (k - 0.5) * 2
    const a = stops[seg]
    const b = stops[seg + 1]
    const r = Math.round(a[0] + (b[0] - a[0]) * p)
    const g = Math.round(a[1] + (b[1] - a[1]) * p)
    const bl = Math.round(a[2] + (b[2] - a[2]) * p)
    const alpha = 0.10 + 0.26 * k
    return `rgba(${r},${g},${bl},${alpha})`
  }, [])

  const polygonStrokeColor = useCallback((f) => {
    const iso = f.__iso3
    if (iso === hoverIsoRef.current) return 'rgba(215, 245, 255, 0.95)'
    if (iso === selectedIsoRef.current) return 'rgba(255, 255, 255, 0.85)'
    const c = worldEngine.countries[iso]
    const k = Math.min(1, Math.max(0, (Math.log10(Math.max(c?.population || 0, 1)) - 4.5) / 4.7))
    return `rgba(150, 225, 255, ${0.22 + 0.3 * k})`
  }, [])

  const polygonAltitude = useCallback((f) => {
    const iso = f.__iso3
    return (iso === hoverIsoRef.current || iso === selectedIsoRef.current) ? 0.035 : 0.01
  }, [])

  // 强制重估多边形外观(悬停/选中变化时)
  const refreshPolygons = useCallback(() => {
    const w = globeRef.current
    if (!w) return
    w.polygonCapColor(polygonCapColor)
    w.polygonStrokeColor(polygonStrokeColor)
    w.polygonAltitude(polygonAltitude)
  }, [polygonCapColor, polygonStrokeColor, polygonAltitude])

  // ———————— 初始化地球 + 全部视觉特效 + 开场动画 ————————
  useEffect(() => {
    if (!geoLoaded || !containerRef.current || globeRef.current) return
    let dead = false
    const timers = []

    const loadTex = (url, fallbackUrl) => new Promise((res) => {
      const loader = new THREE.TextureLoader()
      loader.load(url, (tex) => res(tex), undefined, () => {
        if (fallbackUrl) loader.load(fallbackUrl, (t2) => res(t2), undefined, () => res(null))
        else res(null)
      })
    })

    Promise.all([
      loadTex(TEX.day, TEX.dayFallback),
      loadTex(TEX.night),
      loadTex(TEX.water),
      loadTex(TEX.clouds),
    ]).then(([dayTex, nightTex, waterTex, cloudTex]) => {
      if (dead) return

      const world = Globe({ animateIn: false })(containerRef.current)
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(false)
        .polygonsData(worldEngine.features)
        .polygonCapColor(polygonCapColor)
        .polygonSideColor(() => 'rgba(120, 220, 255, 0.05)')
        .polygonStrokeColor(polygonStrokeColor)
        .polygonAltitude(polygonAltitude)
        .polygonsTransitionDuration(280)
        .polygonLabel(() => '')

      world.controls().enableDamping = true
      world.controls().dampingFactor = 0.08
      world.controls().enablePan = false
      world.controls().minDistance = 150
      world.controls().maxDistance = 800
      world.controls().autoRotate = false
      world.controls().autoRotateSpeed = 0.35
      const PR = MOBILE ? 1.2 : Math.min(2, window.devicePixelRatio)
      world.renderer().setPixelRatio(PR)
      world.width(window.innerWidth).height(window.innerHeight)
      const onResize = () => {
        world.width(window.innerWidth).height(window.innerHeight)
      }
      window.addEventListener('resize', onResize)

      // 星空相机远平面需覆盖星空壳
      const cam = world.camera()
      cam.far = 8000
      cam.near = 10
      cam.updateProjectionMatrix()

      const maxAniso = world.renderer().capabilities.getMaxAnisotropy()
      for (const tex of [dayTex, waterTex, cloudTex]) {
        if (tex) {
          tex.anisotropy = maxAniso
          tex.needsUpdate = true
        }
      }

      // 地球: 实时昼夜光照
      const globeMat = createGlobeMaterial({ day: dayTex, night: nightTex, water: waterTex })
      world.globeMaterial(globeMat)

      const scene = world.scene()

      // 外层大气辉光
      const atmo = createAtmosphere(GLOBE_R * 1.18)
      scene.add(atmo.mesh)

      // 云层
      const fx = { globeMat, atmo }
      if (cloudTex) {
        const clouds = createClouds(cloudTex, GLOBE_R * 1.006)
        scene.add(clouds.mesh)
        fx.clouds = clouds
      }

      // 程序化星空
      const stars = createStarfield({ count: MOBILE ? 3200 : 6500, radius: 2600, pixelRatio: PR })
      scene.add(stars.points)
      fx.stars = stars

      // ——— 脉冲: 闪光(加法混合) + 涟漪冲击波 ———
      const MAX = 260
      const positions = new Float32Array(MAX * 3)
      const colors = new Float32Array(MAX * 3)
      const life = new Float32Array(MAX)
      const baseColors = new Float32Array(MAX * 3)
      const flashGeom = new THREE.BufferGeometry()
      flashGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      flashGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      const dotTex = (() => {
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
      const flashMat = new THREE.PointsMaterial({
        size: 8.5, map: dotTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true,
      })
      const flashPoints = new THREE.Points(flashGeom, flashMat)
      flashPoints.frustumCulled = false
      flashPoints.renderOrder = 999
      scene.add(flashPoints)

      const rings = createRings({ max: MAX, pixelRatio: PR })
      scene.add(rings.points)
      fx.rings = rings
      fx.flash = { geom: flashGeom, mat: flashMat, positions, colors, baseColors, life, tex: dotTex }
      fx.head = 0
      fx.ringHead = 0

      const setPulsePosition = (arr, i, lat, lng) => {
        const phi = (90 - lat) * (Math.PI / 180)
        const theta = (90 - lng) * (Math.PI / 180)
        arr[i * 3] = PULSE_R * Math.sin(phi) * Math.cos(theta)
        arr[i * 3 + 1] = PULSE_R * Math.cos(phi)
        arr[i * 3 + 2] = PULSE_R * Math.sin(phi) * Math.sin(theta)
      }
      const BIRTH = new THREE.Color(0x2affb4)
      const DEATH = new THREE.Color(0xff5470)

      const spawn = ({ type, lat, lng }) => {
        const i = fx.head % MAX
        fx.head += 1
        setPulsePosition(positions, i, lat, lng)
        const col = type === 'birth' ? BIRTH : DEATH
        baseColors[i * 3] = col.r
        baseColors[i * 3 + 1] = col.g
        baseColors[i * 3 + 2] = col.b
        colors[i * 3] = col.r
        colors[i * 3 + 1] = col.g
        colors[i * 3 + 2] = col.b
        life[i] = 1
        // 涟漪
        const j = fx.ringHead % MAX
        fx.ringHead += 1
        setPulsePosition(rings.positions, j, lat, lng)
        rings.colors[j * 3] = col.r
        rings.colors[j * 3 + 1] = col.g
        rings.colors[j * 3 + 2] = col.b
        rings.t0[j] = performance.now() / 1000
        rings.geom.attributes.aT0.needsUpdate = true
        rings.geom.attributes.aColor.needsUpdate = true
        rings.geom.attributes.position.needsUpdate = true
      }

      const unPulse = worldEngine.onPulse((p) => {
        spawn(p)
        if (p.type === 'birth') playBirth(0.16)
        else playDeath(0.13)
      })

      // 调试句柄
      window.__PULSE_DEBUG__ = {
        activeCount: () => { let n = 0; for (let i = 0; i < MAX; i++) if (life[i] > 0) n += 1; return n },
        spawned: () => fx.head,
        pointsObj: flashPoints,
      }

      // ——— 主渲染循环: 实时太阳 / 云漂移 / 星闪烁 / 脉冲衰减 ———
      let raf = 0
      let last = performance.now()
      const loop = () => {
        const now = performance.now()
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const time = now / 1000

        // 太阳方向: 由真实 UTC 时间推算, 晨昏线与真实世界同步
        const { lat: slat, lng: slng } = sunLatLon()
        const sun = latLngToVec3(slat, slng, 1)
        globeMat.uniforms.uSunDir.value.copy(sun)
        atmo.mat.uniforms.uSunDir.value.copy(sun)
        if (fx.clouds) {
          fx.clouds.mat.uniforms.uSunDir.value.copy(sun)
          fx.clouds.mesh.rotation.y += dt * 0.0045
        }
        stars.mat.uniforms.uTime.value = time
        rings.mat.uniforms.uTime.value = time

        // 闪光衰减
        let dirty = false
        for (let i = 0; i < MAX; i++) {
          if (life[i] > 0) {
            life[i] = Math.max(0, life[i] - dt * 0.95)
            const k = life[i] * life[i] * (3 - 2 * life[i]) // smoothstep 淡出
            colors[i * 3] = baseColors[i * 3] * k
            colors[i * 3 + 1] = baseColors[i * 3 + 1] * k
            colors[i * 3 + 2] = baseColors[i * 3 + 2] * k
            if (life[i] <= 0) positions[i * 3 + 1] = -9999
            dirty = true
          }
        }
        if (dirty) {
          flashGeom.attributes.position.needsUpdate = true
          flashGeom.attributes.color.needsUpdate = true
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)

      // ——— 交互 ———
      world.onPolygonClick((f) => {
        // 注意: 此处不可调用 ensureCtx(), 否则任何点击都会解锁 AudioContext,
        // 导致静音模式下首次点击后音效突然涌出
        setSelectedIso((prev) => (prev === f.__iso3 ? null : f.__iso3))
      })
      world.onGlobeClick(() => setSelectedIso(null))
      world.onPolygonHover((f) => {
        const iso = f?.__iso3 ?? null
        if (iso === hoverIsoRef.current) return
        hoverIsoRef.current = iso
        refreshPolygons()
      })

      // ——— 开场: 相机从深空飞入, 标题渐显 ———
      world.pointOfView({ lat: 8, lng: 40, altitude: 5.9 }, 0)
      timers.push(setTimeout(() => {
        world.pointOfView({ lat: 24, lng: 105, altitude: MOBILE ? 3.4 : 2.35 }, 3400)
      }, 80))
      timers.push(setTimeout(() => setBooted(true), 1500))
      timers.push(setTimeout(() => {
        introDoneRef.current = true
        setIntroGone(true)
        world.controls().autoRotate = !selectedIsoRef.current
      }, 5000))

      globeRef.current = world
      fxRef.current = fx
      window.__GLOBE__ = world // 调试句柄
      setReady(true)

      return () => {
        dead = true
        timers.forEach(clearTimeout)
        window.removeEventListener('resize', onResize)
        unPulse()
        cancelAnimationFrame(raf)
        scene.remove(atmo.mesh)
        atmo.mesh.geometry.dispose()
        atmo.mat.dispose()
        if (fx.clouds) {
          scene.remove(fx.clouds.mesh)
          fx.clouds.mesh.geometry.dispose()
          fx.clouds.mat.dispose()
        }
        scene.remove(stars.points)
        stars.points.geometry.dispose()
        stars.mat.dispose()
        scene.remove(flashPoints)
        flashGeom.dispose()
        flashMat.dispose()
        dotTex.dispose()
        scene.remove(rings.points)
        rings.geom.dispose()
        rings.mat.dispose()
        rings.mat.uniforms.uMap.value.dispose()
        world._destructor?.()
        globeRef.current = null
        fxRef.current = null
      }
    })

    return () => { dead = true }
  }, [geoLoaded, MOBILE, polygonCapColor, polygonStrokeColor, polygonAltitude, refreshPolygons])

  // 选中国家: 高亮 + 相机飞往
  useEffect(() => {
    const w = globeRef.current
    if (!w) return
    refreshPolygons()
    const c = w.controls()
    if (c) c.autoRotate = introDoneRef.current && !selectedIso
    if (!selectedIso) return
    const f = worldEngine.featureByIso.get(selectedIso)
    if (!f) return
    const cur = w.pointOfView()
    w.pointOfView({
      lat: f.__labelLat,
      lng: f.__labelLng,
      altitude: Math.min(cur.altitude || 2.4, 1.75),
    }, 950)
  }, [selectedIso, refreshPolygons])

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
    <div className={`app-root ${ready ? 'ready' : ''} ${booted ? 'booted' : ''}`}>
      <div className="bg-nebula" aria-hidden="true" />
      <div ref={containerRef} className="globe-container" />
      <div className="bg-vignette" aria-hidden="true" />
      <div className="bg-grain" aria-hidden="true" />

      {!ready && <div className="loading-mask"><span className="loading-dot" />{t.loading}</div>}

      <div className={`intro-title ${introGone ? 'gone' : ''}`} aria-hidden="true">
        <div className="intro-rule" />
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>

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
