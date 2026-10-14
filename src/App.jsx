// App.jsx — The Global Pulse · 全球脉搏
// 实时自然灾害与全球事件的监视地球: USGS 地震 / NASA EONET 灾害 / ISS 实时轨道
// three/globe.gl 等重型依赖经 globeScene 动态加载, 首屏只渲染轻量外壳
import { useCallback, useEffect, useRef, useState } from 'react'
import { T, LANGS } from './i18n'
import { LINES } from './voice'
import {
  ensureCtx, startAmbient, stopAmbient,
  setMuted, isMuted,
} from './audio/audioEngine'

const BASE = import.meta.env.BASE_URL || '/'

// 开场相机落点: 飞向界面语言对应的区域, 让地球第一眼"认得你"
const HOME = {
  zh: { lat: 24, lng: 105 },
  ja: { lat: 36.2, lng: 138.25 },
  en: { lat: 21, lng: -30 },
}

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

// ————————————————————————————— 轮换的诗(副标题) —————————————————————————————
// key={lang} 重挂载重置; 每 88s 交叉渐隐换下一句
function SloganLine({ lang }) {
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(true)
  useEffect(() => {
    let alive = true
    let swapTimer
    const iv = setInterval(() => {
      setShown(false)
      swapTimer = setTimeout(() => {
        if (!alive) return
        setIdx((i) => (i + 1) % LINES[lang].length)
        setShown(true)
      }, 1700)
    }, 88000)
    return () => { alive = false; clearInterval(iv); clearTimeout(swapTimer) }
  }, [lang])
  return (
    <div className="slogan">
      <span className={`slogan-text ${shown ? '' : 'faded'}`}>{LINES[lang][idx]}</span>
    </div>
  )
}

// ————————————————————————————— 主应用 —————————————————————————————
export default function App() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const langRef = useRef(null)
  const featuresRef = useRef([])
  const isMobileRef = useRef(false)
  const reducedRef = useRef(false)

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

  useEffect(() => {
    isMobileRef.current = isMobile
    sceneRef.current?.setMobile(isMobile)
  }, [isMobile])
  useEffect(() => { reducedRef.current = reducedMotion }, [reducedMotion])
  useEffect(() => { langRef.current = lang }, [lang])

  const [geoLoaded, setGeoLoaded] = useState(false)
  const [geoError, setGeoError] = useState(false)
  const [geoAttempt, setGeoAttempt] = useState(0)
  const [ready, setReady] = useState(false)       // 地球就绪, 开场开始
  const [bootStage, setBootStage] = useState(0)   // 开机阶段: 0 连接数据源 1 唤醒地球 2 校准晨昏线
  const [disastersLoaded, setDisastersLoaded] = useState(false)
  const [soundOn, setSoundOn] = useState(true)    // 默认开启(首次手势解锁后真正发声)
  const [audioReady, setAudioReady] = useState(false)
  const audioReadyRef = useRef(false)
  const unlockAtRef = useRef(0) // 解锁时刻: 防止同一次手势(pointerdown+click)把声音又关掉

  // 传感器风格(致敬 OSINT 视图): 数字键 1-4 切换 标准/夜视/热成像/黑白
  const SENSOR_NAMES = ['NVG', 'FLIR', 'NOIR']
  const [sensor, setSensor] = useState(0)
  const changeSensor = useCallback((n) => {
    setSensor(n)
    sceneRef.current?.setStyle(n)
  }, [])

  // ISS 实时遥测(场景加载成功后每秒回调)
  const [iss, setIss] = useState(null)

  // 音频: 默认开启。浏览器自动播放策略不允许无手势出声, 但一旦解锁立即进入音乐;
  // 某些浏览器对回访放行, 挂载时也会尝试直接开播。
  const enableAudio = useCallback(() => {
    ensureCtx()
    setMuted(false)
    audioReadyRef.current = true
    setAudioReady(true)
    startAmbient(1.6)
  }, [])

  useEffect(() => {
    const audioCtx = ensureCtx()
    if (audioCtx && audioCtx.state === 'running') enableAudio()
  }, [enableAudio])

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

  // 数字键 1-4 切换传感器风格; 焦点在控件上时不劫持
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return
      const styleByDigit = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }
      if (e.code in styleByDigit) changeSensor(styleByDigit[e.code])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [changeSensor])

  // 加载真实国界(本地优先, 失败回退远程 Natural Earth; 都失败给出重试入口)
  useEffect(() => {
    let cancelled = false
    setGeoError(false)
    const apply = (data) => {
      if (cancelled) return
      featuresRef.current = data.features || []
      setBootStage(1)
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
        home: HOME[langRef.current], // 开场只发生一次, 用初始语言
        features: featuresRef.current,
        isAborted: () => disposed,
        onIss: (info) => setIss(info),
        onDisasters: () => setDisastersLoaded(true),
        onReady: () => {
          setBootStage(2)
          setReady(true)
        },
        onBooted: () => setBooted(true),
        onIntroDone: () => setIntroGone(true),
      }).catch(() => {
        // chunk 加载失败或 WebGL 上下文创建失败: 复用错误 UI 提供重试入口
        if (!disposed) setGeoError(true)
        return null
      })
      if (disposed || !handle) return
      sceneRef.current = handle
      handle.setMobile(isMobileRef.current)
    })
    return () => {
      disposed = true
      handle?.dispose()
      handle = null
      sceneRef.current = null
    }
  }, [geoLoaded, geoAttempt])

  // 语言写入分享链接(不产生浏览历史)
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}?lang=${lang}`)
  }, [lang])

  // <html lang> 跟随界面语言
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang
  }, [lang])

  const [booted, setBooted] = useState(false)     // 面板入场
  const [introGone, setIntroGone] = useState(false) // 标题谢幕

  return (
    <div className={`app-root ${ready ? 'ready' : ''} ${booted ? 'booted' : ''}`}>
      <div ref={containerRef} className="globe-container" />

      {!geoError && (
        <div className={`loading-mask ${ready ? 'done' : ''}`} aria-hidden="true">
          <div className="boot-orbit">
            <span className="ring r1" />
            <span className="ring r2" />
            <span className="ring r3" />
            <span className="core" />
            <span className="sat s1" />
            <span className="sat s2" />
            <span className="sat s3" />
          </div>
          <div className="boot-word">THE GLOBAL PULSE</div>
          <div className="boot-bar"><i style={{ width: `${[26, 68, 100][bootStage]}%` }} /></div>
          <div className="boot-stage">{[t.boot0, t.boot1, t.boot2][bootStage]}</div>
        </div>
      )}
      {geoError && (
        <div className="loading-mask error-mask" role="alert">
          <span className="error-text">{t.loadError}</span>
          <button className="error-retry" onClick={() => setGeoAttempt((n) => n + 1)}>{t.retry}</button>
        </div>
      )}

      <div className={`intro-title ${introGone ? 'gone' : ''}`} aria-hidden="true">
        <h1>{t.title}</h1>
      </div>

      <SloganLine key={lang} lang={lang} />

      {disastersLoaded && (
        <div className="disaster-legend" aria-hidden="true">
          <span><i style={{ background: '#ff9f0a' }} />{t.legendQuake}</span>
          <span><i style={{ background: '#bf5af2' }} />{t.legendVolcano}</span>
          <span><i style={{ background: '#64d2ff' }} />{t.legendStorm}</span>
          <span><i style={{ background: '#ffd60a' }} />{t.legendWildfire}</span>
          <span><i style={{ background: '#0a84ff' }} />{t.legendFlood}</span>
        </div>
      )}

      {iss && (
        <div className="iss-chip" title="ISS · CelesTrak TLE 实时解算">
          <span className="iss-dot" />ISS · {iss.alt} KM · {iss.vel} KM/S
        </div>
      )}

      <div className="top-right">
        {sensor > 0 && (
          <button className="sensor-badge" onClick={() => changeSensor(0)} title="1 · 标准">
            {SENSOR_NAMES[sensor - 1]}
          </button>
        )}
        <div className="lang-switch">
          {LANGS.map((l) => (
            <button key={l} className={lang === l ? 'on' : ''} onClick={() => changeLang(l)}>
              {l === 'zh' ? '中' : l === 'en' ? 'EN' : '日'}
            </button>
          ))}
        </div>
        <button
          className={`sound-btn ${soundOn ? 'on' : ''} ${soundOn && !audioReady ? 'pending' : ''}`}
          onClick={() => {
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
          }}
          title={soundOn ? t.mute : t.unmute}
          aria-label={soundOn ? t.mute : t.unmute}
        >
          {soundOn ? '♪' : '✕♪'}
        </button>
      </div>

      <div className="hint">
        {soundOn && !audioReady ? t.soundPendingHint : t.hintText}
      </div>
    </div>
  )
}
