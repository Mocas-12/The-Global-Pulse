// App.jsx — The Global Pulse · 全球人口脉搏
// 真实国界(Natural Earth) + 真实数据(世界银行 2024) + 实时推演
// 视觉: NASA 昼/夜贴图 + 实时太阳晨昏线 + 大气散射 + 云层 + 星空 + 涟漪脉冲
// three/globe.gl 等重型依赖经 globeScene 动态加载, 首屏只渲染轻量外壳
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { worldEngine, DEATH_CAUSES, REFERENCE_FACTS } from './engine/worldEngine'
import { scaleAnalogy } from './humanize'
import { T, LANGS } from './i18n'
import { makeNews } from './news'
import {
  ensureCtx, startAmbient, stopAmbient, playIntro,
  setMuted, isMuted,
} from './audio/audioEngine'

const BASE = import.meta.env.BASE_URL || '/'

const useMedia = (query) => {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = (e) => setMatch(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])
  return match
}

const fmt = (n, lang) => {
  try {
    return Math.round(n).toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US')
  } catch {
    return String(Math.round(n))
  }
}

// 紧凑数字: 只保留模型可信的精度(万/亿位), 避免伪精度也更可读
const fmtCompact = (n, lang) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (lang === 'en') {
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B'
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + 'M'
    if (abs >= 1e3) return sign + Math.round(abs / 1e3) + 'K'
    return sign + Math.round(abs)
  }
  if (abs >= 1e8) return sign + (abs / 1e8).toFixed(1) + (lang === 'ja' ? '億' : '亿')
  if (abs >= 1e6) return sign + Math.round(abs / 1e4) + '万'
  if (abs >= 1e4) return sign + (abs / 1e4).toFixed(1) + '万'
  return sign + Math.round(abs)
}

const clockText = () => {
  const d = new Date()
  const p2 = (x) => String(x).padStart(2, '0')
  const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  const time = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
  return `${date} ${time}`
}

// ————————————————————————————— 顶部滚动快讯 —————————————————————————————
// 语言切换经由 <NewsTicker key={lang}/> 重挂载完成, 初始 items 直接以当前语言生成
export function NewsTicker({ lang }) {
  const [items, setItems] = useState(() => [makeNews(lang), makeNews(lang), makeNews(lang)])
  useEffect(() => {
    let alive = true
    let timer
    const loop = () => {
      const delay = 3800 + Math.random() * 3200
      timer = setTimeout(() => {
        if (!alive) return
        setItems((prev) => [...prev.slice(-11), makeNews(lang)])
        loop()
      }, delay)
    }
    loop()
    return () => { alive = false; clearTimeout(timer) }
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
// 手写 rAF 补间(240ms ease-out), 替代整只 gsap 依赖
function tweenNumber(el, from, to, fmtFn) {
  const dur = 240
  let raf = 0
  const t0 = performance.now()
  const diff = to - from
  if (diff <= 0) { el.textContent = fmtFn(to); return () => {} }
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur)
    const e = 1 - Math.pow(1 - p, 3)
    el.textContent = fmtFn(Math.round(from + diff * e))
    if (p < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export function RollingNumber({ value, className, format, instant }) {
  const ref = useRef(null)
  const prevRef = useRef(value)
  const fmtFn = useMemo(() => format || ((v) => v.toLocaleString('en-US')), [format])
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const from = prevRef.current
    prevRef.current = value
    if (instant) { el.textContent = fmtFn(value); return undefined }
    return tweenNumber(el, from, value, fmtFn)
  }, [value, fmtFn, instant])
  return <span ref={ref} className={className}>{fmtFn(value)}</span>
}

// ————————————————————————————— 左侧主面板 —————————————————————————————
export function StatsPanel({ snap, lang, instant, viewYear, onHoverCountry, onSelectCountry }) {
  const t = T[lang]
  const [sessionStart] = useState(() => Date.now())
  const [showAllCauses, setShowAllCauses] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const [expanded, setExpanded] = useState(false) // 手机端默认折叠, 避免遮挡地球
  const yearSec = snap.yearSec || 1
  const causes = DEATH_CAUSES.map((c) => ({ ...c, n: Math.floor((c.annual / 31557600) * yearSec) }))
    .sort((a, b) => b.n - a.n)
  const maxCause = causes[0]?.n || 1
  const visibleCauses = showAllCauses ? causes : causes.slice(0, 6)
  const cig = (REFERENCE_FACTS.cigarettesPerYear / 31557600) * (snap.daySec || 0)
  const drug = (REFERENCE_FACTS.illegalDrugsUSDPerYear / 31557600) * (snap.daySec || 0)
  const topBirths = worldEngine.topByBirths(5)
  // 「自你打开本页」: 纯前端会话计数, 精确值(由真实速率积分而来)
  // 回放模式下仍使用实时速率(引擎在快照中单独携带), 与回放年份无关
  const sessionSec = Math.max(0, (snap.at - sessionStart) / 1000)
  const sessB = Math.floor(sessionSec * snap.liveBirthsPerSec)
  const sessD = Math.floor(sessionSec * snap.liveDeathsPerSec)
  const compact = useCallback((v) => fmtCompact(v, lang), [lang])
  return (
    <div className={`panel stats-panel ${expanded ? 'expanded' : ''}`}>
      <div className="panel-head">
        <span className="live-dot" />
        <span className={`live-label ${viewYear != null ? 'replay' : ''}`}>
          {viewYear != null ? `${t.timeBadge} ${viewYear}` : t.projection}
        </span>
        <span className="clock">{clockText()}</span>
        <button
          className="panel-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'collapse' : 'expand'}
        >
          {expanded ? '▾' : '▴'}
        </button>
      </div>
      <div className="big-stat">
        <div className="big-label">{t.worldPop}</div>
        <RollingNumber className="big-value" value={snap.worldPopulation} instant={instant} />
        <div className="rate-line m-hide">
          {t.ratePrefix} <b className="nb">{snap.birthsPerSec.toFixed(1)}</b>{t.birthWord}
          {' · '}<b className="nd">{snap.deathsPerSec.toFixed(1)}</b>{t.deathWord}
          {' · '}<b className="nn">+{snap.netPerSec.toFixed(1)}</b>{t.netWord}
        </div>
      </div>

      <div className="session-box m-hide">
        <div className="session-label">{t.sinceOpen}</div>
        <div className="session-grid">
          <div className="session-item">
            <span className="session-num birth"><RollingNumber value={sessB} instant={instant} /></span>
            <span className="session-cap">{t.birthsLabel}</span>
          </div>
          <div className="session-item">
            <span className="session-num death"><RollingNumber value={sessD} instant={instant} /></span>
            <span className="session-cap">{t.deathsLabel}</span>
          </div>
        </div>
        {(() => {
          const word = scaleAnalogy(sessB - sessD, t)
          return word ? <div className="scale-line">{t.scaleLabel} {word}</div> : null
        })()}
      </div>

      <div className="stat-grid m-hide">
        <div className="stat birth">
          <span className="stat-label">{t.birthsToday}</span>
          <RollingNumber className="stat-value" value={snap.birthsToday} format={compact} instant={instant} />
        </div>
        <div className="stat death">
          <span className="stat-label">{t.deathsToday}</span>
          <RollingNumber className="stat-value" value={snap.deathsToday} format={compact} instant={instant} />
        </div>
        <div className="stat birth">
          <span className="stat-label">{t.birthsYear}</span>
          <RollingNumber className="stat-value" value={snap.birthsYear} format={compact} instant={instant} />
        </div>
        <div className="stat death">
          <span className="stat-label">{t.deathsYear}</span>
          <RollingNumber className="stat-value" value={snap.deathsYear} format={compact} instant={instant} />
        </div>
      </div>

      {/* 死因结构与香烟/毒品为现代估计, 历史上不可得 — 回放时诚实隐藏 */}
      {viewYear == null && (
        <>
          <div className="divider m-hide" />

          <div className="section-title m-hide">{t.health}</div>
          <div className="cause-list m-hide">
            {visibleCauses.map((c) => (
              <div className="cause-row" key={c.key}>
                <span className="cause-name">{lang === 'en' ? c.en : lang === 'ja' ? c.ja : c.zh}</span>
                <span className="cause-num">-{compact(c.n)}</span>
                <span className="cause-bar"><i style={{ width: `${(c.n / maxCause) * 100}%` }} /></span>
              </div>
            ))}
          </div>
          <button className="expand-toggle m-hide" onClick={() => setShowAllCauses((v) => !v)}>
            {showAllCauses ? t.showLess : t.showAll}
          </button>
        </>
      )}

      <div className="section-title m-hide">{t.topBirths}</div>
      <div className="top-list m-hide">
        {topBirths.map((c, i) => (
          <div className="top-row" key={c.iso3}
            onMouseEnter={() => onHoverCountry(c.iso3)}
            onMouseLeave={() => onHoverCountry(null)}
            onClick={() => onSelectCountry(c.iso3)}>
            <span className="top-rank">{i + 1}</span>
            <span className="top-name">{worldEngine.countryName(c.iso3, lang)}</span>
            <span className="top-num">+{compact(c.birthsToday)}</span>
          </div>
        ))}
      </div>

      {viewYear == null && (
        <div className="fun-rows m-hide">
          <div className="fun-row">
            <span className="fun-name">{t.cigarettes}</span>
            <span className="fun-num">{compact(cig)}</span>
          </div>
          <div className="fun-row">
            <span className="fun-name">{t.drugMoney}</span>
            <span className="fun-num">${compact(drug)}</span>
          </div>
        </div>
      )}

      <button className="method-toggle m-hide" onClick={() => setShowMethod((v) => !v)}>
        {t.methodTitle} {showMethod ? '▴' : '▾'}
      </button>
      {showMethod && (
        <div className="method-box m-hide">
          <p>{t.methodBody}</p>
          <div className="trust-title">{t.trustRealTitle}</div>
          <ul>{t.trustReal.map((s) => <li key={s}>{s}</li>)}</ul>
          <div className="trust-title">{t.trustSimTitle}</div>
          <ul>{t.trustSim.map((s) => <li key={s}>{s}</li>)}</ul>
          <div className="trust-title">{t.sourcesLabel}</div>
          <div className="src-links">
            <a href="https://data.worldbank.org/" target="_blank" rel="noreferrer">World Bank</a>
            <a href="https://www.who.int/data/global-health-estimates" target="_blank" rel="noreferrer">WHO</a>
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>
            <a href="https://visibleearth.nasa.gov/" target="_blank" rel="noreferrer">NASA</a>
          </div>
        </div>
      )}
    </div>
  )
}

// ————————————————————————————— 国家详情卡 —————————————————————————————
export function CountryCard({ detail, lang, onClose }) {
  const t = T[lang]
  const c = detail
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(null)
  const share = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?country=${c.iso3}&lang=${lang}`
    const done = () => {
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1600)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done, done)
    } else {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* noop */ }
      ta.remove()
      done()
    }
  }, [c.iso3, lang])
  useEffect(() => () => clearTimeout(copyTimer.current), [])
  return (
    <div className="panel country-card" onClick={(e) => e.stopPropagation()}>
      <div className="card-head">
        <span className="card-flag">{c.rank <= 3 ? '★' : '●'}</span>
        <span className="card-name">{lang === 'en' ? c.name.en : lang === 'ja' ? (c.name.ja || c.name.en) : (c.name.zh || c.name.en)}</span>
        <button className="card-share" onClick={share} title={copied ? t.copied : t.share} aria-label={copied ? t.copied : t.share}>
          {copied ? '✓' : '⧉'}
        </button>
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

// ————————————————————————————— 时间轴(回放 1950 → 今天) —————————————————————————————
function TimeAxis({ lang, viewYear, onChange, seriesRange }) {
  const t = T[lang]
  const [playing, setPlaying] = useState(false)
  const [lo, hi] = seriesRange
  useEffect(() => {
    if (!playing) return undefined
    const iv = setInterval(() => {
      const next = Math.min(hi, (viewYear ?? lo) + 1)
      onChange(next)
      if (next >= hi) setPlaying(false)
    }, 260)
    return () => clearInterval(iv)
  }, [playing, viewYear, lo, hi, onChange])
  return (
    <div className="time-axis">
      <button
        className="ta-play"
        onClick={() => {
          if (viewYear == null) onChange(lo) // 从实况进入回放, 先落到起点
          setPlaying((p) => !p)
        }}
        title={playing ? t.timePause : t.timePlay}
        aria-label={playing ? t.timePause : t.timePlay}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <input
        type="range"
        min={lo}
        max={hi}
        value={viewYear ?? hi}
        onChange={(e) => { setPlaying(false); onChange(Number(e.target.value)) }}
        aria-label={t.timePlay}
      />
      <span className="ta-year">{viewYear ?? 'LIVE'}</span>
      <button
        className="ta-now"
        onClick={() => { setPlaying(false); onChange(null) }}
        title={t.timeNow}
      >
        {t.timeNow}
      </button>
    </div>
  )
}

// ————————————————————————————— 主应用 —————————————————————————————
export default function App() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const introAudioRef = useRef(false) // 开场飞入期间为 true, 首次解锁音频时据此播放接近音
  const [lang, setLang] = useState(() => {
    // 分享链接的 ?lang= 优先; 其次本地记忆; 默认中文
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('lang')
      if (fromUrl === 'zh' || fromUrl === 'en' || fromUrl === 'ja') return fromUrl
      const saved = localStorage.getItem('tgp-lang')
      if (saved === 'zh' || saved === 'en' || saved === 'ja') return saved
    } catch { /* noop */ }
    return 'zh'
  })
  const changeLang = useCallback((l) => {
    setLang(l)
    try { localStorage.setItem('tgp-lang', l) } catch { /* noop */ }
  }, [])
  const t = T[lang]
  const isMobile = useMedia('(max-width: 768px)')
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const isMobileRef = useRef(isMobile)
  const reducedRef = useRef(reducedMotion)
  useEffect(() => {
    isMobileRef.current = isMobile
    sceneRef.current?.setMobile(isMobile)
  }, [isMobile])
  useEffect(() => { reducedRef.current = reducedMotion }, [reducedMotion])

  const [snap, setSnap] = useState(() => worldEngine.snapshot())
  const [selectedIso, setSelectedIso] = useState(() => {
    // 分享链接: ?country=ISO3 启动即选中并飞往
    try {
      const c = new URLSearchParams(window.location.search).get('country')
      if (c && /^[A-Za-z]{3}$/.test(c)) return c.toUpperCase()
    } catch { /* noop */ }
    return null
  })
  const selectedIsoRef = useRef(selectedIso)
  const [seriesRange, setSeriesRange] = useState(null)
  const [viewYear, setViewYearState] = useState(null)
  const changeViewYear = useCallback((y) => {
    setViewYearState(y)
    worldEngine.setViewYear(y)
  }, [])
  useEffect(() => { selectedIsoRef.current = selectedIso }, [selectedIso])
  const [geoLoaded, setGeoLoaded] = useState(false)
  const [geoError, setGeoError] = useState(false)
  const [geoAttempt, setGeoAttempt] = useState(0)
  const [ready, setReady] = useState(false)       // 地球就绪, 开场开始
  const [booted, setBooted] = useState(false)     // 面板入场
  const [introGone, setIntroGone] = useState(false) // 标题谢幕
  const [soundOn, setSoundOn] = useState(true)    // 默认开启(首次手势解锁后真正发声)
  const [audioReady, setAudioReady] = useState(false)
  const audioReadyRef = useRef(false)
  const unlockAtRef = useRef(0) // 解锁时刻: 防止同一次手势(pointerdown+click)把声音又关掉

  // 引擎订阅; ?pause 为测试确定性钩子: 冻结推演(数字/脉冲不再变化), 供 E2E 断言与截图
  const frozen = useMemo(() => new URLSearchParams(window.location.search).has('pause'), [])
  useEffect(() => {
    const un = worldEngine.subscribe(setSnap)
    if (!frozen) worldEngine.start()
    return () => { un(); worldEngine.stop(); stopAmbient() }
  }, [frozen])

  // 音频: 默认开启, 但受浏览器自动播放策略限制——首次用户手势时解锁。
  // 若解锁发生在开场飞入期间, 先播放"由远到近"接近音, 再衔接心跳背景音。
  const enableAudio = useCallback(() => {
    ensureCtx()
    setMuted(false)
    audioReadyRef.current = true
    setAudioReady(true)
    if (introAudioRef.current) {
      const d = playIntro() || 3
      setTimeout(() => { if (!isMuted()) startAmbient(1.2, isMobileRef.current) }, d * 720)
    } else {
      startAmbient(1.2, isMobileRef.current)
    }
  }, [])

  useEffect(() => {
    const onGesture = () => {
      unlockAtRef.current = Date.now()
      enableAudio()
    }
    window.addEventListener('pointerdown', onGesture, { once: true })
    window.addEventListener('keydown', onGesture, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [enableAudio])

  // 加载真实国界(本地优先, 失败回退远程 Natural Earth; 都失败给出重试入口)
  useEffect(() => {
    let cancelled = false
    setGeoError(false)
    const apply = (data) => {
      if (cancelled) return
      worldEngine.setFeatures(data.features || [])
      setGeoLoaded(true)
    }
    fetch(`${BASE}datasets/countries.geojson`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(apply)
      .catch(() => {
        fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
          .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
          .then(apply)
          .catch(() => { if (!cancelled) setGeoError(true) })
      })
    return () => { cancelled = true }
  }, [geoAttempt])

  // 城市点位 + UN 历史序列: 与国界并行异步加载, 失败各自静默降级
  useEffect(() => {
    fetch(`${BASE}datasets/populatedPlaces.json`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then((list) => { if (list) worldEngine.setPlaces(list) })
      .catch(() => {})
    fetch(`${BASE}datasets/unSeries.json`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then((data) => {
        if (!data) return
        worldEngine.setSeries(data)
        setSeriesRange(worldEngine.seriesRange())
      })
      .catch(() => {})
  }, [])

  // 状态写入分享链接(不产生浏览历史)
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedIso) params.set('country', selectedIso)
    params.set('lang', lang)
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [selectedIso, lang])

  // 地球场景: 动态加载(three/globe.gl 进入异步 chunk), 与数据下载并行
  useEffect(() => {
    if (!geoLoaded || !containerRef.current) return undefined
    let disposed = false
    let handle = null
    import('./engine/globeScene').then(async (m) => {
      if (disposed) return
      handle = await m.createGlobeScene(containerRef.current, {
        isMobile: isMobileRef.current,
        reducedMotion: reducedRef.current,
        isAborted: () => disposed,
        onSelect: (iso) => setSelectedIso(iso),
        onIntroStart: () => { introAudioRef.current = true },
        onReady: () => setReady(true),
        onBooted: () => setBooted(true),
        onIntroDone: () => {
          introAudioRef.current = false
          setIntroGone(true)
        },
      })
      if (disposed) {
        handle?.dispose()
        handle = null
        return
      }
      sceneRef.current = handle
      handle.setMobile(isMobileRef.current)
      // 分享链接带 ?country= 启动: 场景就绪后补飞选中
      if (selectedIsoRef.current) handle.setSelected(selectedIsoRef.current)
    })
    return () => {
      disposed = true
      handle?.dispose()
      handle = null
      sceneRef.current = null
    }
  }, [geoLoaded])

  useEffect(() => {
    sceneRef.current?.setSelected(selectedIso)
  }, [selectedIso, geoLoaded])

  // 声音开关: 未解锁前, 第一次点击只负责"开启"(不当作关闭)
  const toggleSound = useCallback(() => {
    if (!audioReadyRef.current || Date.now() - unlockAtRef.current < 600) {
      enableAudio()
      setSoundOn(true)
      return
    }
    if (isMuted()) {
      enableAudio()
      setSoundOn(true)
    } else {
      setMuted(true)
      stopAmbient()
      setSoundOn(false)
    }
  }, [enableAudio])

  // 键盘 Esc 关闭
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedIso(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // <html lang> 跟随界面语言
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang
  }, [lang])

  const detail = selectedIso ? worldEngine.countryDetail(selectedIso) : null
  const instant = reducedMotion

  return (
    <div className={`app-root ${ready ? 'ready' : ''} ${booted ? 'booted' : ''}`}>
      <div className="bg-nebula" aria-hidden="true" />
      <div ref={containerRef} className="globe-container" />
      <div className="bg-vignette" aria-hidden="true" />
      <div className="bg-grain" aria-hidden="true" />

      {!ready && !geoError && (
        <div className="loading-mask"><span className="loading-dot" />{t.loading}</div>
      )}
      {geoError && (
        <div className="loading-mask error-mask" role="alert">
          <span className="error-text">{t.loadError}</span>
          <button className="error-retry" onClick={() => setGeoAttempt((n) => n + 1)}>{t.retry}</button>
        </div>
      )}

      <div className={`intro-title ${introGone ? 'gone' : ''}`} aria-hidden="true">
        <div className="intro-rule" />
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>

      <NewsTicker key={lang} lang={lang} />
      <div className="slogan">{t.subtitle}</div>

      <StatsPanel
        snap={snap}
        lang={lang}
        instant={instant}
        viewYear={viewYear}
        onHoverCountry={(iso) => sceneRef.current?.setHover(iso)}
        onSelectCountry={(iso) => setSelectedIso(iso)}
      />

      {detail && <CountryCard detail={detail} lang={lang} onClose={() => setSelectedIso(null)} />}

      {seriesRange && (
        <TimeAxis lang={lang} viewYear={viewYear} onChange={changeViewYear} seriesRange={seriesRange} />
      )}

      <div className="top-right">
        <div className="lang-switch">
          {LANGS.map((l) => (
            <button key={l} className={lang === l ? 'on' : ''} onClick={() => changeLang(l)}>
              {l === 'zh' ? '中' : l === 'en' ? 'EN' : '日'}
            </button>
          ))}
        </div>
        <button
          className={`sound-btn ${soundOn ? 'on' : ''} ${soundOn && !audioReady ? 'pending' : ''}`}
          onClick={toggleSound}
          title={soundOn ? t.mute : t.unmute}
          aria-label={soundOn ? t.mute : t.unmute}
        >
          {soundOn ? '♪' : '✕♪'}
        </button>
      </div>

      <div className="hint">
        {viewYear != null ? t.timeHint : soundOn && !audioReady ? t.soundPendingHint : t.clickHint}
      </div>
    </div>
  )
}
