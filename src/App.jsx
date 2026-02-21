import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import { COUNTRY_METADATA, seededRand } from './countryMetadata'
import { usePopulationLogic } from './hooks/usePopulationLogic'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { startNewsTicker, generateDeathNews } from './newsData'

let PERSISTENT_SELECTED_ID = null

const A3_TO_A2 = {
  ATA: 'AQ',
  GRL: 'GL',
  FLK: 'FK',
  PRI: 'PR',
  GNB: 'GW',
  FRA: 'FR',
  LUX: 'LU',
  NOR: 'NO',
  TWN: 'TW',
  ATF: 'TF',
  TLS: 'TL',
  NCL: 'NC',
  CHN: 'CN',
  USA: 'US',
  RUS: 'RU',
  IND: 'IN',
  ARG: 'AR',
  AUS: 'AU',
  BRA: 'BR',
  DEU: 'DE',
  ESP: 'ES',
  GBR: 'GB',
  ITA: 'IT',
  JPN: 'JP',
  KOR: 'KR',
  TUR: 'TR',
  SAU: 'SA',
  MEX: 'MX',
  CAN: 'CA',
}

const GlobalStatsPanel = ({ stats }) => {
  const pad2 = (n) => String(n).padStart(2, '0')
  const [nowDate, setNowDate] = useState(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = pad2(d.getMonth() + 1)
    const dd = pad2(d.getDate())
    const HH = pad2(d.getHours())
    const MM = pad2(d.getMinutes())
    const SS = pad2(d.getSeconds())
    return `[${yyyy}年${mm}月${dd}日]`
  })
  const [nowTime, setNowTime] = useState(() => {
    const d = new Date()
    const HH = pad2(d.getHours())
    const MM = pad2(d.getMinutes())
    const SS = pad2(d.getSeconds())
    return `[${HH}:${MM}:${SS}]`
  })
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      const yyyy = d.getFullYear()
      const mm = pad2(d.getMonth() + 1)
      const dd = pad2(d.getDate())
      const HH = pad2(d.getHours())
      const MM = pad2(d.getMinutes())
      const SS = pad2(d.getSeconds())
      setNowDate(`[${yyyy}年${mm}月${dd}日]`)
      setNowTime(`[${HH}:${MM}:${SS}]`)
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const wrap = {
    position: 'fixed',
    left: '20px',
    top: '20px',
    zIndex: 10001,
    marginTop: '40px',
    padding: '10px 14px',
    color: '#ffffff',
    background: 'rgba(0,20,40,0.65)',
    border: '1px solid #00ffff',
    borderRadius: '8px',
    backdropFilter: 'blur(8px)',
    boxShadow:
      '0 0 20px rgba(0,242,255,0.35), inset 0 0 12px rgba(24,120,255,0.3)',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '12px',
    lineHeight: '1.35',
    pointerEvents: 'none',
    width: '232px',
  }
  const clockWrap = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '6px',
    color: '#00ffff',
    textShadow: '0 0 5px rgba(0,255,255,0.5)',
    fontFamily:
      'JetBrains Mono, Roboto Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '12px',
    lineHeight: '1.35',
    textAlign: 'left',
  }
  const clockLabel = {
    color: '#00ffff',
    opacity: 0.7,
    whiteSpace: 'nowrap',
  }
  const clockValueLine = {
    color: '#00ffff',
    textShadow: '0 0 5px rgba(0,255,255,0.5)',
    fontFamily:
      'JetBrains Mono, Roboto Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    flex: 1,
  }
  const divider = {
    height: '1px',
    background: 'rgba(0,255,255,0.2)',
    margin: '12px 0',
  }
  const row = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '4px 0',
  }
  const label = {
    textAlign: 'left',
    fontSize: '12px',
    color: 'rgba(0,255,255,0.7)',
    WebkitTextFillColor: 'rgba(0,255,255,0.7)',
    marginRight: '3px',
  }
  const val = {
    textAlign: 'right',
    fontSize: '14px',
    color: '#ffffff',
    textShadow: '0 0 5px rgba(0,255,255,0.5)',
    fontFamily:
      'JetBrains Mono, Roboto Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    flex: 1,
  }
  const netYear = (stats.birthsYear - stats.deathsYear) || 0
  return (
    <div style={wrap} className="crt-glow">
      <div style={clockWrap}>
        <div style={clockLabel}>当前时间:</div>
        <div style={clockValueLine}>{nowDate} {nowTime}</div>
      </div>
      <div style={divider} />
      <div style={row}>
        <div style={{ ...label, color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
          当前世界人口
        </div>
        <div style={val}>{Number(stats.total || 0).toLocaleString()}</div>
      </div>
      <div style={row}>
        <div style={{ ...label, color: '#00ff88', WebkitTextFillColor: '#00ff88' }}>
          今年出生人数
        </div>
        <div style={{ ...val, color: '#00ff88' }}>
          +{Number(stats.birthsYear || 0).toLocaleString()}
        </div>
      </div>
      <div style={row}>
        <div style={{ ...label, color: '#00ff88', WebkitTextFillColor: '#00ff88' }}>
          今日出生人数
        </div>
        <div style={{ ...val, color: '#00ff88' }}>
          +{Number(stats.birthsToday || 0).toLocaleString()}
        </div>
      </div>
      <div style={row}>
        <div style={{ ...label, color: '#ff4444', WebkitTextFillColor: '#ff4444' }}>
          今年死亡人数
        </div>
        <div style={{ ...val, color: '#ff4444' }}>
          -{Number(stats.deathsYear || 0).toLocaleString()}
        </div>
      </div>
      <div style={row}>
        <div style={{ ...label, color: '#ff4444', WebkitTextFillColor: '#ff4444' }}>
          今日死亡人数
        </div>
        <div style={{ ...val, color: '#ff4444' }}>
          -{Number(stats.deathsToday || 0).toLocaleString()}
        </div>
      </div>
      <div style={row}>
        <div style={{ ...label, color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
          人口净增长
        </div>
        <div style={val}>{Number(netYear).toLocaleString()}</div>
      </div>
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {(() => {
          const hRow = {
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            alignItems: 'center',
            margin: '0',
          }
          const hLabel = {
            textAlign: 'left',
            fontSize: '11px',
            color: 'rgba(255,77,79,0.8)',
            WebkitTextFillColor: 'rgba(255,77,79,0.8)',
            textShadow: '0 0 8px rgba(255,77,79,0.6)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.2',
          }
          const hVal = {
            textAlign: 'right',
            fontSize: '10px',
            color: '#ff4d4f',
            textShadow: '0 0 8px rgba(255,77,79,0.6)',
            fontFamily:
              'JetBrains Mono, Roboto Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            lineHeight: '1.2',
            overflow: 'hidden',
            textOverflow: 'clip',
          }
          const hs = (stats.healthStats && stats.healthStats.today) || {}
          const moneyFmt = (n) =>
            new Intl.NumberFormat('en', {
              notation: 'compact',
              maximumFractionDigits: 2,
            }).format(Number(n || 0))
          return (
            <>
              <div style={hRow}>
                <div style={hLabel}>今日吸食香烟</div>
                <div style={hVal}>+{Number(stats.cigarettesToday || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>用于非法药物的支出</div>
                <div style={hVal}>${moneyFmt(stats.illegalDrugsMoneyToday || 0)}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年传染病死亡人数</div>
                <div style={hVal}>-{Number(hs.infectious || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年5岁以下儿童死亡人数</div>
                <div style={hVal}>-{Number(hs.childrenUnder5 || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年癌症死亡人数</div>
                <div style={hVal}>-{Number(hs.cancer || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年疟疾死亡人数</div>
                <div style={hVal}>-{Number(hs.malaria || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年吸烟诱发死亡人数</div>
                <div style={hVal}>-{Number(hs.smoking || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年饮酒诱发死亡人数</div>
                <div style={hVal}>-{Number(hs.alcohol || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年自杀人数</div>
                <div style={hVal}>-{Number(hs.suicide || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年交通事故死亡人数</div>
                <div style={hVal}>-{Number(hs.roadAccidents || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年艾滋病死亡人数</div>
                <div style={hVal}>-{Number(hs.hivAids || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年季节性流感死亡人数</div>
                <div style={hVal}>-{Number(hs.flu || 0).toLocaleString()}</div>
              </div>
              <div style={hRow}>
                <div style={hLabel}>今年分娩期间死亡母亲数</div>
                <div style={hVal}>-{Number(hs.mothers || 0).toLocaleString()}</div>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

const WarningTicker = () => {
  const [items, setItems] = useState(() => [
    generateDeathNews(),
    generateDeathNews(),
    generateDeathNews(),
  ])
  useEffect(() => {
    const stop = startNewsTicker((it) => {
      setItems((prev) => {
        const next = [...prev, it]
        if (next.length > 40) next.shift()
        return next
      })
    }, { minMs: 2500, maxMs: 5000 })
    return () => stop && stop()
  }, [])
  const renderSeq = items.map((it) => (
    <span key={it.id} className="ticker-item">[!] {it.text} {it.tsText}</span>
  ))
  return (
    <div className="warning-ticker">
      <div className="track">
        {renderSeq}
        {renderSeq}
      </div>
    </div>
  )
}

function App() {
  const containerRef = useRef(null)
  const birthPulseRef = useRef(null)
  const deathPulseRef = useRef(null)
  const audioCtxRef = useRef(null)
  const audioMutedRef = useRef(false)
  const lastPlayRef = useRef({ click: 0, birth: 0, death: 0 })
  const MIN_INTERVAL_MS = 200
  const ambientOnRef = useRef(false)
  const isInternalPlayingRef = useRef(false)
  const ambientRef = useRef({
    master: null,
    drone: null,
    ping: null,
    lowpass: null,
    osc1: null,
    osc2: null,
    lfo: null,
    lfoGain: null,
    delay: null,
    fbGain: null,
    pingTimer: null,
  })
  const ensureAudioCtx = () => {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!audioCtxRef.current && AC) {
      audioCtxRef.current = new AC()
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return audioCtxRef.current
  }
  const ensureAudioCtxAsync = async () => {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!audioCtxRef.current && AC) {
      audioCtxRef.current = new AC()
    }
    if (!audioCtxRef.current) return null
    if (audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume()
      } catch (e) {
        const _resumeErr = e
      }
    }
    return audioCtxRef.current
  }
  const getAudioContext = async () => {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!audioCtxRef.current && AC) {
      audioCtxRef.current = new AC()
    }
    if (!audioCtxRef.current) return null
    if (audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume()
      } catch (e) {
        const _resumeErr3 = e
      }
    }
    return audioCtxRef.current
  }
  const playTone = (type, { freqA, freqB, duration, volume, wave = 'sine', delayMs = 0, echoMs = 0, echoGain = 0 }) => {
    if (audioMutedRef.current) return
    const now = Date.now()
    if (now - (lastPlayRef.current[type] || 0) < MIN_INTERVAL_MS) return
    const ctx = ensureAudioCtx()
    if (!ctx) return
    lastPlayRef.current[type] = now
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const out = ctx.createGain()
    osc.type = wave
    const startT = ctx.currentTime + (delayMs / 1000)
    const endT = startT + (duration / 1000)
    const v = Math.max(0, Math.min(1, volume || 0.5))
    gain.gain.setValueAtTime(0, startT)
    gain.gain.linearRampToValueAtTime(v, startT + 0.02)
    gain.gain.linearRampToValueAtTime(v * 0.6, endT - 0.04)
    gain.gain.linearRampToValueAtTime(0, endT)
    osc.frequency.setValueAtTime(freqA, startT)
    osc.frequency.linearRampToValueAtTime(freqB, endT)
    let nodeChain = gain
    if (echoMs > 0 && echoGain > 0) {
      const delay = ctx.createDelay()
      delay.delayTime.value = echoMs / 1000
      const fb = ctx.createGain()
      fb.gain.value = Math.max(0, Math.min(0.8, echoGain))
      // feedback loop
      nodeChain.connect(delay)
      delay.connect(fb)
      fb.connect(delay)
      delay.connect(out)
    }
    nodeChain.connect(out)
    out.connect(ctx.destination)
    osc.connect(gain)
    osc.start(startT)
    osc.stop(endT + 0.02)
  }
  const playBirthSound = (vol = 0.6) => playTone('birth', { freqA: 1400, freqB: 1800, duration: 240, volume: vol, wave: 'triangle', echoMs: 60, echoGain: 0.12 })
  const playDeathSound = (vol = 0.55) => playTone('death', { freqA: 180, freqB: 110, duration: 220, volume: vol, wave: 'sawtooth', echoMs: 120, echoGain: 0.15 })
  const playSynthClick = useCallback(async () => {
    const nowMs = Date.now()
    if (nowMs - (lastPlayRef.current.synthClick || 0) < MIN_INTERVAL_MS) return
    const ctx = await getAudioContext()
    if (!ctx) return
    lastPlayRef.current.synthClick = nowMs
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.1, t + 0.01)
    g.gain.linearRampToValueAtTime(0, t + 0.22)
    osc.frequency.setValueAtTime(800, t)
    osc.frequency.linearRampToValueAtTime(200, t + 0.05)
    const d = ctx.createDelay()
    d.delayTime.value = 0.1
    const fb = ctx.createGain()
    fb.gain.value = 0.2
    g.connect(d)
    d.connect(fb)
    fb.connect(d)
    d.connect(ctx.destination)
    osc.connect(g)
    osc.start(t)
    osc.stop(t + 0.24)
    osc.onended = () => {
      try {
        osc.disconnect()
        g.disconnect()
        d.disconnect()
        fb.disconnect()
      } catch (e) {
        const _ignored4 = e
      }
    }
  }, [])
  const startAmbient = async () => {
    if (isInternalPlayingRef.current) return
    const ctx = await (async () => {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!audioCtxRef.current && AC) {
        audioCtxRef.current = new AC()
      }
      if (!audioCtxRef.current) return null
      if (audioCtxRef.current.state === 'suspended') {
        try { await audioCtxRef.current.resume() } catch (e) { const _resumeErr2 = e }
      }
      return audioCtxRef.current
    })()
    if (!ctx) return
    const master = ctx.createGain()
    master.gain.value = 0
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 240
    const convolver = ctx.createConvolver()
    const len = Math.floor(ctx.sampleRate * 3)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        const decay = Math.exp(-i / (ctx.sampleRate * 1.6))
        data[i] = (Math.random() * 2 - 1) * decay
      }
    }
    convolver.buffer = ir
    const drone = ctx.createGain()
    drone.gain.value = 0.28
    const ping = ctx.createGain()
    ping.gain.value = 0.09
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    osc1.type = 'sine'
    osc2.type = 'sine'
    osc1.frequency.value = 40
    osc2.frequency.value = 41
    const harmGain = ctx.createGain()
    harmGain.gain.value = 0.12
    const harmOsc = ctx.createOscillator()
    harmOsc.type = 'triangle'
    harmOsc.frequency.value = 160
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.03
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    {
      const ch0 = noiseBuf.getChannelData(0)
      for (let i = 0; i < ch0.length; i++) {
        ch0[i] = (Math.random() * 2 - 1)
      }
    }
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noiseBuf
    noiseSrc.loop = true
    const delay = ctx.createDelay()
    delay.delayTime.value = 0.9
    const fbGain = ctx.createGain()
    fbGain.gain.value = 0.35
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.25
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.08
    lfo.connect(lfoGain)
    lfoGain.connect(master.gain)
    osc1.connect(lowpass)
    osc2.connect(lowpass)
    harmOsc.connect(harmGain)
    harmGain.connect(lowpass)
    lowpass.connect(drone)
    drone.connect(convolver)
    convolver.connect(master)
    noiseSrc.connect(noiseGain)
    noiseGain.connect(convolver)
    ping.connect(delay)
    delay.connect(fbGain)
    fbGain.connect(delay)
    delay.connect(convolver)
    master.connect(ctx.destination)
    ambientRef.current = { master, drone, ping, lowpass, osc1, osc2, harmOsc, harmGain, noiseSrc, noiseGain, lfo, lfoGain, delay, fbGain, convolver, pingTimer: null }
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(0.35, now + 5)
    osc1.start()
    osc2.start()
    harmOsc.start()
    noiseSrc.start()
    lfo.start()
    isInternalPlayingRef.current = true
    ambientRef.current.pingTimer = setInterval(() => {
      if (!ambientOnRef.current) return
      const c = audioCtxRef.current
      if (!c) return
      const o = c.createOscillator()
      const g = c.createGain()
      const t = c.currentTime
      const f = 2500 + Math.random() * 3500
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.08, t + 0.05)
      g.gain.linearRampToValueAtTime(0.03, t + 1.2)
      g.gain.linearRampToValueAtTime(0, t + 3.5)
      o.connect(g)
      g.connect(ambientRef.current.delay)
      o.start(t)
      o.stop(t + 3.6)
    }, 5000 + Math.floor(Math.random() * 8000))
  }
  const stopAmbient = () => {
    const ctx = audioCtxRef.current
    if (!ctx || !ambientRef.current.master) return
    const now = ctx.currentTime
    ambientRef.current.master.gain.cancelScheduledValues(now)
    ambientRef.current.master.gain.linearRampToValueAtTime(0, now + 2)
    setTimeout(() => {
      try {
        ambientRef.current.osc1 && ambientRef.current.osc1.stop()
        ambientRef.current.osc2 && ambientRef.current.osc2.stop()
        ambientRef.current.harmOsc && ambientRef.current.harmOsc.stop()
        ambientRef.current.noiseSrc && ambientRef.current.noiseSrc.stop()
        ambientRef.current.lfo && ambientRef.current.lfo.stop()
      } catch (e) {
        const _ignored3 = e
      }
      ambientRef.current.osc1 = null
      ambientRef.current.osc2 = null
      ambientRef.current.harmOsc = null
      ambientRef.current.noiseSrc = null
      ambientRef.current.lfo = null
      if (ambientRef.current.pingTimer) {
        clearInterval(ambientRef.current.pingTimer)
        ambientRef.current.pingTimer = null
      }
      isInternalPlayingRef.current = false
    }, 2200)
  }
  const stats = usePopulationLogic({
    onBirthPulse: (lat, lng) => {
      if (birthPulseRef.current) birthPulseRef.current(lat, lng)
      addLifeArc('birth')
    },
    onDeathPulse: (lat, lng) => {
      if (deathPulseRef.current) deathPulseRef.current(lat, lng)
      addLifeArc('death')
    },
    onBirthPulseISO: (iso) => {
      pulseCountryOpacity(iso)
      nudgeAmbient('birth')
    },
    onDeathPulseISO: (_iso) => {
      void _iso
      pulseSloganGlow()
      nudgeAmbient('death')
    },
  })
  useEffect(() => {
    let mounted = true
    const boot = async () => {
      await ensureAudioCtxAsync()
      if (!mounted) return
      ambientOnRef.current = true
      await startAmbient()
    }
    boot()
    const onInteract = async () => {
      if (!isInternalPlayingRef.current) {
        await ensureAudioCtxAsync()
        ambientOnRef.current = true
        await startAmbient()
      }
      window.removeEventListener('pointerdown', onInteract, true)
    }
    window.addEventListener('pointerdown', onInteract, true)
    return () => {
      mounted = false
      stopAmbient()
      window.removeEventListener('pointerdown', onInteract, true)
    }
  }, [])
  const [lang, setLang] = useState('CN')
  const [selected, _realSetState] = useState(null)
  const globeRef = useRef(null)
  const colorTweenVal = useRef(stats.viabilityIndex)
  const [geoFeatures, setGeoFeatures] = useState([])
  const hoveredRef = useRef(null)
  const isoCentroidRef = useRef({})
  const manualArcsGroupRef = useRef(null)
  const globeOffsetYRef = useRef(-20)
  const fxGroupRef = useRef(null)
  const fxRefsRef = useRef({ torus: null, ringN: null, ringS: null })
  const nudgeAmbient = useCallback(() => {}, [])
  const pulseCountryOpacity = useCallback(() => {}, [])
  const pulseSloganGlow = useCallback(() => {}, [])
  const countryWeights = useMemo(
    () => ({
      CN: 0.18,
      IN: 0.17,
      US: 0.07,
      ID: 0.06,
      PK: 0.04,
      BR: 0.03,
      NG: 0.03,
      BD: 0.03,
      RU: 0.02,
      JP: 0.02,
    }),
    []
  )
  const ISO_LATLNG = useMemo(
    () => ({
      CN: { lat: 35, lng: 105 },
      IN: { lat: 21, lng: 78 },
      US: { lat: 39, lng: -98 },
      ID: { lat: -2, lng: 118 },
      PK: { lat: 30, lng: 69 },
      BR: { lat: -10, lng: -55 },
      NG: { lat: 9, lng: 8 },
      BD: { lat: 24, lng: 90 },
      RU: { lat: 60, lng: 90 },
      JP: { lat: 36, lng: 138 },
      DE: { lat: 51, lng: 9 },
      FR: { lat: 46, lng: 2 },
      GB: { lat: 54, lng: -2 },
      IT: { lat: 42, lng: 12 },
      ES: { lat: 40, lng: -4 },
      AU: { lat: -25, lng: 133 },
      CA: { lat: 56, lng: -106 },
      MX: { lat: 23, lng: -102 },
      ZA: { lat: -30, lng: 25 },
      AR: { lat: -34, lng: -64 },
    }),
    []
  )
  const arcRateRef = useRef({ sec: 0, count: 0 })
  const ARC_MAX_CONCURRENT = 30
  const ARC_PER_SEC_LIMIT = 8
  const ARC_ANIM_MS = 1500
  const latLngToVec3 = (latDeg, lngDeg, scale = 1) => {
    const lat = THREE.MathUtils.degToRad(latDeg)
    const lng = THREE.MathUtils.degToRad(lngDeg)
    const x = Math.cos(lat) * Math.cos(lng)
    const y = Math.sin(lat)
    const z = Math.cos(lat) * Math.sin(lng)
    return new THREE.Vector3(x * scale, y * scale, z * scale)
  }
  const spawnManualArc = (from, to, type, alt) => {
    if (!manualArcsGroupRef.current) return
    const N = 128
    const p0 = latLngToVec3(from.lat, from.lng, 1)
    const p3 = latLngToVec3(to.lat, to.lng, 1)
    const c1 = p0.clone().normalize().multiplyScalar(1 + alt * 1.5)
    const c2 = p3.clone().normalize().multiplyScalar(1 + alt * 1.5)
    const curve = new THREE.CubicBezierCurve3(p0, c1, c2, p3)
    const points = curve.getPoints(N - 1)
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const v = points[i]
      pos[i * 3] = v.x
      pos[i * 3 + 1] = v.y
      pos[i * 3 + 2] = v.z + 2
    }
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geom.computeBoundingSphere()
    geom.setDrawRange(0, 2)
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      linewidth: 5,
    })
    const line = new THREE.Line(geom, mat)
    line.renderOrder = 9999
    line.layers.set(0)
    const grp = manualArcsGroupRef.current
    if (grp.children.length >= ARC_MAX_CONCURRENT) {
      const old = grp.children[0]
      grp.remove(old)
      if (old.geometry) old.geometry.dispose()
      if (old.material) old.material.dispose()
    }
    grp.add(line)
    let head = 0
    const tail = Math.floor(N * 0.15)
    const step = N / (ARC_ANIM_MS / 1000 * 60)
    const update = () => {
      head += step
      const start = Math.max(0, Math.floor(head - tail))
      const count = Math.max(2, Math.min(N - 1, Math.floor(head)) - start)
      geom.setDrawRange(start, count)
      if (geom.attributes && geom.attributes.position) {
        geom.attributes.position.needsUpdate = true
      }
      console.log('[ManualArc] drawRange.count=', count)
      if (head >= N) {
        cleanup()
        return
      }
      line._raf = requestAnimationFrame(update)
    }
    const cleanup = () => {
      if (line._raf) cancelAnimationFrame(line._raf)
      grp.remove(line)
      geom.dispose()
      mat.dispose()
    }
    line._raf = requestAnimationFrame(update)
  }
  const pickISOWeighted = () => {
    const entries = Object.entries(countryWeights)
    const r = Math.random()
    let acc = 0
    for (const [iso, w] of entries) {
      acc += w
      if (r <= acc) return iso
    }
    return entries[Math.floor(Math.random() * entries.length)][0]
  }
  const addLifeArc = (type) => {
    const nowSec = Math.floor(Date.now() / 1000)
    if (arcRateRef.current.sec !== nowSec) {
      arcRateRef.current.sec = nowSec
      arcRateRef.current.count = 0
    }
    if (arcRateRef.current.count >= ARC_PER_SEC_LIMIT) return
    arcRateRef.current.count += 1
    const fromIso = pickISOWeighted()
    let toIso = pickISOWeighted()
    if (toIso === fromIso) {
      const keys = Object.keys(countryWeights)
      toIso = keys[(keys.indexOf(fromIso) + 3) % keys.length]
    }
    const from = ISO_LATLNG[fromIso] || { lat: -20 + Math.random() * 40, lng: -160 + Math.random() * 320 }
    const to = ISO_LATLNG[toIso] || { lat: -20 + Math.random() * 40, lng: -160 + Math.random() * 320 }
    const alt = 0.1 + Math.random() * 0.3
    spawnManualArc(from, to, type, alt)
    if (manualArcsGroupRef.current) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      )
      box.renderOrder = 1200
      box.layers.set(0)
      manualArcsGroupRef.current.add(box)
      setTimeout(() => {
        if (manualArcsGroupRef.current) {
          manualArcsGroupRef.current.remove(box)
        }
        if (box.geometry) box.geometry.dispose()
        if (box.material) box.material.dispose()
      }, 1000)
    }
    const scene = globeRef.current && typeof globeRef.current.scene === 'function' ? globeRef.current.scene() : null
    const cam = globeRef.current && typeof globeRef.current.camera === 'function' ? globeRef.current.camera() : null
    if (scene && cam) {
      const dir = new THREE.Vector3()
      cam.getWorldDirection(dir)
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      )
      plane.renderOrder = 1200
      plane.layers.set(0)
      plane.position.copy(cam.position).add(dir.multiplyScalar(10))
      plane.lookAt(cam.position)
      scene.add(plane)
      if (manualArcsGroupRef.current && !scene.children.includes(manualArcsGroupRef.current)) {
        scene.add(manualArcsGroupRef.current)
        manualArcsGroupRef.current.position.y = globeOffsetYRef.current
      }
      console.log('Real Scene Children:', scene.children)
      if (globeRef.current && typeof globeRef.current.pointOfView === 'function') {
        const pov = globeRef.current.pointOfView()
        globeRef.current.pointOfView(pov)
      }
      if (
        globeRef.current &&
        typeof globeRef.current.renderer === 'function' &&
        typeof globeRef.current.scene === 'function' &&
        typeof globeRef.current.camera === 'function'
      ) {
        globeRef.current.renderer().render(globeRef.current.scene(), globeRef.current.camera())
      }
      if (globeRef.current && typeof globeRef.current.onViewPowered === 'function') {
        globeRef.current.onViewPowered(() => {
          const g = manualArcsGroupRef.current
          if (g) {
            g.children.forEach((obj) => {
              const geo = obj.geometry
              if (geo && geo.attributes && geo.attributes.position) {
                geo.attributes.position.needsUpdate = true
              }
            })
          }
        })
      }
      const groupWorld = manualArcsGroupRef.current
        ? manualArcsGroupRef.current.getWorldPosition(new THREE.Vector3())
        : null
      console.log('Camera Position:', cam.position)
      console.log('Group Position:', groupWorld)
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(5000, 5000),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      )
      wall.renderOrder = 9999
      wall.layers.set(0)
      wall.position.set(0, 0, -100)
      scene.add(wall)
      const renderer = globeRef.current && typeof globeRef.current.renderer === 'function' ? globeRef.current.renderer() : null
      if (renderer) {
        renderer.setClearColor(0xff0000, 1)
        const size = renderer.getSize(new THREE.Vector2())
        console.log('Renderer Size:', size)
      }
      const canvases = document.querySelectorAll('canvas')
      canvases.forEach((c) => {
        c.style.border = '5px solid yellow'
      })
      const domCanvas = renderer ? renderer.domElement : null
      if (domCanvas) {
        const ancestry = []
        let el = domCanvas
        while (el) {
          const cs = getComputedStyle(el)
          ancestry.push({ tag: el.tagName, pe: cs.pointerEvents, op: cs.opacity, disp: cs.display })
          el = el.parentElement
        }
        console.log('Canvas ancestry:', ancestry)
      }
      console.log('Camera Frustum:', { near: cam.near, far: cam.far })
      setTimeout(() => {
        scene.remove(wall)
        if (wall.geometry) wall.geometry.dispose()
        if (wall.material) wall.material.dispose()
        scene.remove(plane)
        if (plane.geometry) plane.geometry.dispose()
        if (plane.material) plane.material.dispose()
      }, 1500)
    }
  }
  const labelTextMap = useMemo(
    () => ({
      EN: {
        CN: 'China',
        IN: 'India',
        US: 'United States',
        ID: 'Indonesia',
        PK: 'Pakistan',
        BR: 'Brazil',
        NG: 'Nigeria',
        BD: 'Bangladesh',
        RU: 'Russia',
        JP: 'Japan',
      },
      CN: {
        CN: '中国',
        IN: '印度',
        US: '美国',
        ID: '印尼',
        PK: '巴基斯坦',
        BR: '巴西',
        NG: '尼日利亚',
        BD: '孟加拉',
        RU: '俄罗斯',
        JP: '日本',
      },
      JP: {
        CN: '中国',
        IN: 'インド',
        US: 'アメリカ合衆国',
        ID: 'インドネシア',
        PK: 'パキスタン',
        BR: 'ブラジル',
        NG: 'ナイジェリア',
        BD: 'バングラデシュ',
        RU: 'ロシア',
        JP: '日本',
      },
    }),
    []
  )
  const uiLabels = useMemo(
    () => ({
      CN: {
        total: '全球总人口',
        births: '今日出生',
        deaths: '今日死亡',
        birthsToday: '今日出生',
        deathsToday: '今日死亡',
      },
      EN: {
        total: 'Total Population',
        births: 'Births Today',
        deaths: 'Deaths Today',
        birthsToday: 'Births Today',
        deathsToday: 'Deaths Today',
      },
      JP: {
        total: '世界人口合計',
        births: '今日の出生数',
        deaths: '今日の死亡数',
        birthsToday: '今日の出生数',
        deathsToday: '今日の死亡数',
      },
    }),
    []
  )
  const COUNTRY_NAMES_ZH = useMemo(
    () => ({
      CN: '中国', US: '美国', RU: '俄罗斯', IN: '印度', BR: '巴西', AU: '澳大利亚', CA: '加拿大', MX: '墨西哥',
      JP: '日本', DE: '德国', FR: '法国', GB: '英国', IT: '意大利', ES: '西班牙', ID: '印尼', PK: '巴基斯坦',
      NG: '尼日利亚', BD: '孟加拉', ZA: '南非', AR: '阿根廷', SA: '沙特阿拉伯', TR: '土耳其', EG: '埃及',
      KR: '韩国', KP: '朝鲜', HK: '香港', MO: '澳门', SG: '新加坡', MY: '马来西亚', TH: '泰国',
      VN: '越南', PH: '菲律宾', LA: '老挝', KH: '柬埔寨', MM: '缅甸', NP: '尼泊尔', LK: '斯里兰卡', IR: '伊朗',
      IQ: '伊拉克', SY: '叙利亚', JO: '约旦', LB: '黎巴嫩', IL: '以色列', PS: '巴勒斯坦', AE: '阿联酋',
      QA: '卡塔尔', KW: '科威特', BH: '巴林', OM: '阿曼', YE: '也门', SD: '苏丹', SS: '南苏丹', ET: '埃塞俄比亚',
      ER: '厄立特里亚', DJ: '吉布提', SO: '索马里', KE: '肯尼亚', TZ: '坦桑尼亚', UG: '乌干达', RW: '卢旺达',
      BI: '布隆迪', CD: '刚果（金）', CG: '刚果（布）', GA: '加蓬', GQ: '赤道几内亚', CM: '喀麦隆', CF: '中非',
      TD: '乍得', NE: '尼日尔', ML: '马里', MR: '毛里塔尼亚', SN: '塞内加尔', GM: '冈比亚', GN: '几内亚',
      SL: '塞拉利昂', LR: '利比里亚', CI: '科特迪瓦', GH: '加纳', TG: '多哥', BJ: '贝宁', BF: '布基纳法索',
      ZM: '赞比亚', ZW: '津巴布韦', MZ: '莫桑比克', AO: '安哥拉', NA: '纳米比亚', BW: '博茨瓦纳', LS: '莱索托',
      SZ: '埃斯瓦蒂尼', MG: '马达加斯加', MU: '毛里求斯', SC: '塞舌尔', CV: '佛得角', ST: '圣多美和普林西比',
      LY: '利比亚', TN: '突尼斯', DZ: '阿尔及利亚', MA: '摩洛哥', EH: '西撒哈拉', UA: '乌克兰', BY: '白俄罗斯',
      PL: '波兰', CZ: '捷克', SK: '斯洛伐克', HU: '匈牙利', RO: '罗马尼亚', BG: '保加利亚', GR: '希腊',
      SE: '瑞典', FI: '芬兰', DK: '丹麦', NL: '荷兰', BE: '比利时', CH: '瑞士', AT: '奥地利',
      PT: '葡萄牙', IE: '爱尔兰', IS: '冰岛', EE: '爱沙尼亚', LV: '拉脱维亚', LT: '立陶宛', GE: '格鲁吉亚',
      AM: '亚美尼亚', AZ: '阿塞拜疆', KZ: '哈萨克斯坦', UZ: '乌兹别克斯坦', TM: '土库曼斯坦', KG: '吉尔吉斯斯坦',
      TJ: '塔吉克斯坦', AF: '阿富汗', MN: '蒙古', NZ: '新西兰', PG: '巴布亚新几内亚', FJ: '斐济', SB: '所罗门群岛',
      VU: '瓦努阿图', WS: '萨摩亚', TO: '汤加', TV: '图瓦卢', KI: '基里巴斯', NR: '瑙鲁', GT: '危地马拉', SV: '萨尔瓦多',
      HN: '洪都拉斯', NI: '尼加拉瓜', CR: '哥斯达黎加', PA: '巴拿马', CU: '古巴', DO: '多米尼加', HT: '海地',
      JM: '牙买加', BS: '巴哈马', TT: '特立尼达和多巴哥', BB: '巴巴多斯', GD: '格林纳达', LC: '圣卢西亚',
      VC: '圣文森特和格林纳丁斯', AG: '安提瓜和巴布达', DM: '多米尼克', KN: '圣基茨和尼维斯', BZ: '伯利兹',
      CL: '智利', PE: '秘鲁', CO: '哥伦比亚', VE: '委内瑞拉', EC: '厄瓜多尔', BO: '玻利维亚', PY: '巴拉圭',
      UY: '乌拉圭', GY: '圭亚那', SR: '苏里南', HR: '克罗地亚', SI: '斯洛文尼亚', RS: '塞尔维亚', MK: '北马其顿',
      AL: '阿尔巴尼亚', BA: '波斯尼亚和黑塞哥维那', ME: '黑山', XK: '科索沃', MD: '摩尔多瓦', CY: '塞浦路斯',
      MT: '马耳他', LI: '列支敦士登', MC: '摩纳哥', SM: '圣马力诺', VA: '梵蒂冈', AD: '安道尔', BT: '不丹',
      MV: '马尔代夫', BN: '文莱',
      GL: '格陵兰岛', AQ: '南极洲', FK: '福克兰群岛', PR: '波多黎各', GW: '几内亚比绍', LU: '卢森堡',
      NO: '挪威',
      TW: '中国（台湾）'
      , TF: '法国南方和南极领地'
      , TL: '东帝汶民主共和国'
      , NC: '新喀里多尼亚'
    }),
    []
  )

  const centroidOfFeature = (f) => {
    const ringArea = (ring) => {
      const n = ring.length
      if (n < 3) return 0
      let sum = 0
      for (let i = 0; i < n; i++) {
        const [x1, y1] = ring[i]
        const [x2, y2] = ring[(i + 1) % n]
        sum += x1 * y2 - x2 * y1
      }
      return Math.abs(sum) / 2
    }
    const ringCentroid = (ring) => {
      const n = ring.length
      if (n < 3) {
        const [x, y] = ring[0] || [0, 0]
        return { lng: x, lat: y }
      }
      let cx = 0
      let cy = 0
      let a = 0
      for (let i = 0; i < n; i++) {
        const [x1, y1] = ring[i]
        const [x2, y2] = ring[(i + 1) % n]
        const cross = x1 * y2 - x2 * y1
        a += cross
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
      }
      a = a / 2
      if (a === 0) {
        let sx = 0
        let sy = 0
        for (const [x, y] of ring) {
          sx += x
          sy += y
        }
        const m = ring.length || 1
        return { lng: sx / m, lat: sy / m }
      }
      cx = cx / (6 * a)
      cy = cy / (6 * a)
      return { lng: cx, lat: cy }
    }
    const g = f.geometry
    if (g.type === 'Polygon') {
      const outer = g.coordinates[0] || []
      return ringCentroid(outer)
    }
    if (g.type === 'MultiPolygon') {
      let best = null
      let maxA = -1
      for (const poly of g.coordinates) {
        const outer = poly[0] || []
        const a = ringArea(outer)
        if (a > maxA) {
          maxA = a
          best = outer
        }
      }
      return ringCentroid(best || [])
    }
    return { lat: 0, lng: 0 }
  }
  const iso2OfFeature = useCallback((f) => {
    const a2 =
      f.properties?.ISO_A2_EH ||
      f.properties?.ISO_A2 ||
      f.properties?.iso_a2
    if (a2 && typeof a2 === 'string' && a2.length >= 2) {
      const up = a2.toUpperCase()
      if (up === '-99') return ''
      return up
    }
    const a3 = f.properties?.ADM0_A3 || f.properties?.adm0_a3
    if (a3 && typeof a3 === 'string') {
      const up = a3.toUpperCase()
      return (A3_TO_A2[up] || up.slice(0, 2)).toUpperCase()
    }
    return ''
  }, [])
  const NAME_ZH_BY_EN = useMemo(
    () => ({
      China: '中国',
      'United States': '美国',
      Russia: '俄罗斯',
      India: '印度',
      Brazil: '巴西',
      Argentina: '阿根廷',
      Mexico: '墨西哥',
      Canada: '加拿大',
      Japan: '日本',
      Germany: '德国',
      France: '法国',
      'United Kingdom': '英国',
      Italy: '意大利',
      Spain: '西班牙',
      Australia: '澳大利亚',
      Indonesia: '印尼',
      Pakistan: '巴基斯坦',
      Nigeria: '尼日利亚',
      Bangladesh: '孟加拉',
      Turkey: '土耳其',
      'Saudi Arabia': '沙特阿拉伯',
      Iran: '伊朗',
      'South Korea': '韩国',
      'North Korea': '朝鲜',
    }),
    []
  )
  const nameOfFeature = useCallback((f) => {
    const code = iso2OfFeature(f)
    const rawName =
      f.properties?.NAME ||
      f.properties?.name ||
      f.properties?.ADMIN ||
      ''
    if (lang === 'CN') {
      if (/^N\.?\s*Cyprus/i.test(rawName)) return '北塞浦路斯'
    }
    const zh =
      (code ? COUNTRY_NAMES_ZH[code] : undefined) ||
      f.properties?.name_zh ||
      f.properties?.NAME_ZH ||
      NAME_ZH_BY_EN[rawName]
    if (lang === 'CN' && zh) return zh
    const en =
      f.properties?.NAME ||
      f.properties?.name ||
      labelTextMap.EN?.[code] ||
      f.properties?.ADMIN ||
      code ||
      'Unknown'
    return lang === 'CN' ? zh || en : en
  }, [lang, COUNTRY_NAMES_ZH, NAME_ZH_BY_EN, labelTextMap, iso2OfFeature])
  const MAJOR_ISO = useMemo(
    () =>
      new Set([
        'CN',
        'IN',
        'US',
        'RU',
        'BR',
        'AU',
        'CA',
        'MX',
        'JP',
        'DE',
        'FR',
        'GB',
        'IT',
        'ES',
        'ID',
        'PK',
        'NG',
        'BD',
        'ZA',
        'AR',
      ]),
    []
  )
  const langRef = useRef(lang)
  const selectedRef = useRef(selected)
  useEffect(() => {
    langRef.current = lang
  }, [lang])
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])
  const viabRef = useRef(stats.viabilityIndex)
  useEffect(() => {
    viabRef.current = stats.viabilityIndex
  }, [stats.viabilityIndex])
  const pinsRef = useRef([])
  const pulsesRef = useRef([])
  const overlaysRef = useRef([])
  const bubbleElRef = useRef(null)
  const cRef = useRef(null)
  const coordRef = useRef(null)
  const rafIdRef = useRef(null)
  const hiddenPinRef = useRef(null)
  const isClickingCountry = useRef(false)
  const freezeUntilRef = useRef(0)
  const bgDisabledUntilRef = useRef(0)
  const pendingFramesRef = useRef(0)
  const overlayRef = useRef(null)
  const overlaySvgRef = useRef(null)
  const lineRef = useRef(null)
  const jointRef = useRef(null)
  const originRef = useRef(null)
  const anchorRef = useRef({ bx: 0, by: 0 })
  const pointerDownRef = useRef({ x: 0, y: 0, t: 0 })
  useEffect(() => {}, [])
  const _internalUnsafeSetSelected = (val) => {
    if (
      val === null &&
      (isClickingCountry.current || (freezeUntilRef.current && Date.now() < freezeUntilRef.current))
    ) {
      console.error('拦截到来自 App.tsx 的非法强制关闭指令！')
      return
    }
    _realSetState(val)
  }
  const safeSetSelected = (id) => {
    if (id === null) {
      console.warn('发现关闭指令，来源堆栈为：', new Error().stack)
    }
    if (
      id === null &&
      (isClickingCountry.current || (freezeUntilRef.current && Date.now() < freezeUntilRef.current))
    ) {
      console.warn('拒绝了一次非法的关闭请求，来源见上方的 trace')
      return
    }
    PERSISTENT_SELECTED_ID = id
    selectedRef.current = id ? { code: id.code } : null
    _internalUnsafeSetSelected(id)
  }
  const clearAll = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (overlaySvgRef.current) {
      overlaySvgRef.current.innerHTML = ''
    }
    if (lineRef.current) {
      lineRef.current.setAttribute('d', '')
      lineRef.current.style.display = 'none'
      if (lineRef.current.parentElement) {
        lineRef.current.parentElement.removeChild(lineRef.current)
      }
      lineRef.current = null
    }
    if (jointRef.current && jointRef.current.parentElement) {
      jointRef.current.parentElement.removeChild(jointRef.current)
      jointRef.current = null
    }
    if (originRef.current && originRef.current.parentElement) {
      originRef.current.parentElement.removeChild(originRef.current)
      originRef.current = null
    }
    if (overlayRef.current) {
      const nodes = overlayRef.current.querySelectorAll('.debug-bubble')
      nodes.forEach((n) => n.parentElement && n.parentElement.removeChild(n))
    }
    if (bubbleElRef.current && bubbleElRef.current.parentElement) {
      bubbleElRef.current.parentElement.removeChild(bubbleElRef.current)
    }
    bubbleElRef.current = null
    overlaysRef.current = []
    if (hiddenPinRef.current) {
      hiddenPinRef.current.el.style.visibility = 'visible'
      hiddenPinRef.current = null
    }
  }, [])
  const refreshHtml = useCallback(() => {
    if (!globeRef.current) return
    const globe = globeRef.current
    if (selectedRef.current) {
      const codeSel = selectedRef.current.code
      pinsRef.current.forEach((p) => {
        p.el.style.visibility = p.code === codeSel ? 'hidden' : 'visible'
      })
    } else {
      pinsRef.current.forEach((p) => {
        p.el.style.visibility = 'visible'
      })
    }
    const combined = [...pinsRef.current, ...pulsesRef.current, ...overlaysRef.current]
    globe
      .htmlElementsData(combined)
      .htmlElement((d) => {
        return d.el
      })
  }, [])
  const spawnPulse = useCallback(
    (lat, lng, type) => {
      const el = document.createElement('div')
      el.style.pointerEvents = 'none'
      el.style.position = 'absolute'
      el.style.zIndex = '9999'
      el.style.borderRadius = '9999px'
      el.style.transform = 'translate(-50%, -50%) scale(1)'
      el.style.width = '8px'
      el.style.height = '8px'
      el.style.opacity = '0.6'
      const color = type === 'birth' ? 'rgba(0,255,136,0.8)' : 'rgba(255,68,68,0.8)'
      el.style.border = `2px solid ${color}`
      pulsesRef.current.push({ lat, lng, el })
      refreshHtml()
      if (type === 'birth') {
        gsap.to(el, {
          scale: 6,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => {
            pulsesRef.current = pulsesRef.current.filter((p) => p.el !== el)
            refreshHtml()
          },
        })
      } else {
        gsap.set(el, { scale: 6 })
        gsap.to(el, {
          scale: 1,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            pulsesRef.current = pulsesRef.current.filter((p) => p.el !== el)
            refreshHtml()
          },
        })
      }
    },
    [refreshHtml]
  )
  const buildPins = useCallback(
    (features) =>
      features.map((f) => {
        const c = centroidOfFeature(f)
        const el = document.createElement('div')
        el.className = 'globe-label text-white font-mono'
        el.style.pointerEvents = 'none'
        el.style.color = 'white'
        el.style.position = 'absolute'
        el.style.transform = 'translate(-50%, -50%)'
        el.style.zIndex = '9999'
        const name = nameOfFeature(f)
        el.textContent = name
        const code = iso2OfFeature(f)
        const isMajor = MAJOR_ISO.has(code)
        const isSelected = selectedRef.current && selectedRef.current.code === code
        el.style.fontSize = isSelected ? '14px' : isMajor ? '12px' : '10px'
        el.style.opacity = isSelected ? '1' : isMajor ? '1' : '0'
        if (isSelected) {
          el.style.textShadow = '0 0 6px rgba(0,255,136,0.16), 0 0 12px rgba(0,255,136,0.08)'
        }
        return { lat: c.lat, lng: c.lng, name, code, isMajor, el }
      }),
    [nameOfFeature, MAJOR_ISO, iso2OfFeature]
  )

  useEffect(() => {
    const globe = Globe({ animateIn: true })(containerRef.current)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('#0a0a0a')
      .showAtmosphere(true)
      .atmosphereColor('#5aa3ff')
      .atmosphereAltitude(0.25)

    const controls = globe.controls()
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    globe.renderer().setPixelRatio(Math.min(2, window.devicePixelRatio || 1))

    const resize = () => {
      globe.width(window.innerWidth).height(window.innerHeight)
    }
    resize()
    window.addEventListener('resize', resize)
    globe.onPointClick(() => {})

    // 移除所有 hover/out 相关逻辑，关闭仅由背景点击触发
    globe.onPolygonClick((f, e) => {
      isClickingCountry.current = true
      if (globeRef.current && typeof globeRef.current.enablePointerInteraction === 'function') {
        try {
          globeRef.current.enablePointerInteraction(false)
        } catch (e) {
          const _ignored = e
        }
      }
      bgDisabledUntilRef.current = Date.now() + 200
      clearAll()
      if (!globeRef.current || !THREE || !THREE.Vector3) return
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation()
      }
      if (e && e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
        e.nativeEvent.stopImmediatePropagation()
      }
      if (e && e.nativeEvent) {
        if (typeof e.nativeEvent.stopPropagation === 'function') e.nativeEvent.stopPropagation()
        if (typeof e.nativeEvent.preventDefault === 'function') e.nativeEvent.preventDefault()
      }
      const code = iso2OfFeature(f)
      safeSetSelected({ code })
      playSynthClick()
      freezeUntilRef.current = Date.now() + 500
      selectedRef.current = { code }
      const c = centroidOfFeature(f)
      cRef.current = c
      pendingFramesRef.current = 10
      const bubble = document.createElement('div')
      bubble.className = 'debug-bubble font-mono text-xs'
      bubble.style.pointerEvents = 'none'
      bubble.style.position = 'absolute'
      bubble.style.zIndex = '10005'
      bubble.style.transform = 'none'
      bubble.style.transition = 'none'
      bubble.style.color = 'white'
      bubble.style.padding = '6px 12px'
      bubble.style.margin = '0'
      bubble.style.boxSizing = 'border-box'
      bubble.style.whiteSpace = 'normal'
      bubble.style.border = '1px solid #00ffff'
      bubble.style.borderRadius = '10px'
      bubble.style.background = 'rgba(0,20,40,0.9)'
      bubble.style.backdropFilter = 'blur(4px)'
      bubble.style.boxShadow = '0 0 20px rgba(0,242,255,0.35), inset 0 0 12px rgba(24,120,255,0.3)'
      bubble.style.height = 'auto'
      bubble.style.lineHeight = '1.4'
      bubble.style.overflow = 'hidden'
      bubble.style.display = 'block'
      bubble.style.alignItems = 'initial'
      bubble.style.justifyContent = 'initial'
      bubble.style.opacity = '0'
      bubble.style.setProperty('margin-top', '0', 'important')
      const nm = nameOfFeature(f)
      const cs = stats.countryStats?.[code]
      const w = countryWeights[code] ?? 0.02
      const birthsToday = cs ? cs.birthsToday : Math.floor(stats.birthsToday * w)
      const deathsToday = cs ? cs.deathsToday : Math.floor(stats.deathsToday * w)
      bubble.innerHTML = `
        <div style="opacity:.85;margin-bottom:4px;">${nm}</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="color:#00ff88;text-align:left;">今日出生 +${birthsToday.toLocaleString()}</div>
          <div style="color:#ff4444;text-align:left;">今日死亡 -${deathsToday.toLocaleString()}</div>
        </div>
      `
      containerRef.current && containerRef.current.appendChild(bubble)
      bubbleElRef.current = bubble
      const svg = overlaySvgRef.current
      if (svg) {
        svg.innerHTML = ''
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('stroke', '#00f2ff')
        path.setAttribute('stroke-width', '1.5')
        path.setAttribute('stroke-linecap', 'round')
        path.setAttribute('fill', 'none')
        path.setAttribute('opacity', '1')
        path.style.filter = 'drop-shadow(0 0 4px #00f2ff)'
        path.style.transition = 'opacity 0.2s ease-out'
        path.setAttribute('stroke-dasharray', '6 8')
        path.setAttribute('stroke-dashoffset', '0')
        lineRef.current = path
        svg.appendChild(path)
        gsap.to(path, { attr: { 'stroke-dashoffset': -50 }, duration: 1.2, ease: 'linear', repeat: -1 })
        const joint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        joint.setAttribute('r', '2.5')
        joint.setAttribute('fill', '#00f2ff')
        joint.setAttribute('opacity', '0')
        joint.style.filter = 'drop-shadow(0 0 4px #00f2ff)'
        joint.style.transform = 'scale(1)'
        jointRef.current = joint
        svg.appendChild(joint)
        const origin = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        origin.setAttribute('r', '2.5')
        origin.setAttribute('fill', '#00f2ff')
        origin.setAttribute('opacity', '0')
        origin.style.filter = 'drop-shadow(0 0 4px #00f2ff)'
        origin.style.transform = 'scale(1)'
        originRef.current = origin
        svg.appendChild(origin)
      }
      const pin = pinsRef.current.find((p) => p.code === code)
      if (pin) {
        pin.el.style.visibility = 'hidden'
        hiddenPinRef.current = pin
      }
      const projectLatLngToScreen = (lat, lng) => {
        const camera = globe.camera()
        const renderer = globe.renderer()
        const rect = renderer.domElement.getBoundingClientRect()
        const { x, y, z } = globe.getCoords(lat, lng)
        const vector = new THREE.Vector3(x, y, z)
        vector.project(camera)
        const realX = rect.left + (vector.x * 0.5 + 0.5) * rect.width
        const realY = rect.top + (-vector.y * 0.5 + 0.5) * rect.height
        const inFront = vector.z <= 1
        return { x: realX, y: realY, inFront }
      }
      const placeBubbleAndLine = (force) => {
        if (!selectedRef.current) return
        if (!overlayRef.current || !lineRef.current || !bubbleElRef.current) return
        const base = cRef.current
        const proj = projectLatLngToScreen(base.lat, base.lng)
        let { x, y, inFront } = proj
        if (force) {
          coordRef.current = { x, y, inFront: true }
        }
        if (!coordRef.current) {
          coordRef.current = { x, y, inFront }
        }
        if (pendingFramesRef.current > 0 && coordRef.current) {
          x = coordRef.current.x
          y = coordRef.current.y
          inFront = true
        } else {
          coordRef.current = { x, y, inFront }
        }
        if (!inFront) {
          bubbleElRef.current.style.opacity = '0'
          lineRef.current.style.opacity = '0'
          jointRef.current && jointRef.current.setAttribute('opacity', '0')
          originRef.current && originRef.current.setAttribute('opacity', '0')
          return
        }
        bubbleElRef.current.style.opacity = '1'
        lineRef.current.style.opacity = '1'
        jointRef.current && jointRef.current.setAttribute('opacity', '1')
        originRef.current && originRef.current.setAttribute('opacity', '1')
        const renderer = globe.renderer()
        const rect = renderer.domElement.getBoundingClientRect()
        const onLeft = x < rect.left + rect.width / 2
        const SAFE_LEFT = 420
        let bxCalc = Math.round(rect.left + (onLeft ? 0.15 : 0.85) * rect.width)
        if (onLeft) {
          bxCalc = Math.max(rect.left + SAFE_LEFT, bxCalc)
        }
        const byCalc = Math.round(y - 100)
        anchorRef.current = { bx: bxCalc, by: byCalc }
        const finalX = anchorRef.current.bx
        const finalY = anchorRef.current.by
        const approachFromLeft = x < finalX
        const padding = 30
        const cx = approachFromLeft ? finalX - padding : finalX + padding
        const endX = finalX
        const endY = finalY
        const breath = 8
        const leftPos = approachFromLeft ? Math.round(endX + breath) : Math.round(endX - breath)
        const containerRect = containerRef.current.getBoundingClientRect()
        bubbleElRef.current.style.left = `${leftPos - containerRect.left}px`
        bubbleElRef.current.style.top = `${endY - containerRect.top}px`
      {
        bubbleElRef.current.style.transform = approachFromLeft ? 'translate(0, -50%)' : 'translate(-100%, -50%)'
        bubbleElRef.current.style.transformOrigin = approachFromLeft ? 'left center' : 'right center'
        bubbleElRef.current.style.setProperty('margin-left', '0', 'important')
      }
        bubbleElRef.current.style.opacity = '1'
      {
        const d = `M ${x} ${y} L ${cx} ${endY} L ${endX} ${endY}`
        lineRef.current.setAttribute('d', d)
      }
        lineRef.current.setAttribute('opacity', '1')
        lineRef.current.style.filter = 'drop-shadow(0 0 5px #00f2ff)'
      jointRef.current.setAttribute('cx', `${endX}`)
      jointRef.current.setAttribute('cy', `${endY}`)
        jointRef.current.setAttribute('opacity', '1')
        originRef.current.setAttribute('cx', `${x}`)
        originRef.current.setAttribute('cy', `${y}`)
        originRef.current.setAttribute('opacity', '1')
        if (bubbleElRef.current) {
          bubbleElRef.current.style.opacity = '1'
        }
        if (pendingFramesRef.current > 0) {
          pendingFramesRef.current -= 1
        }
      }
      // 立即进行一次预热绘制
      {
        const renderer = globe.renderer()
        const rect = renderer.domElement.getBoundingClientRect()
        const camera = globe.camera()
        const { x, y, z } = globe.getCoords(cRef.current.lat, cRef.current.lng)
        const v = new THREE.Vector3(x, y, z)
        v.project(camera)
        const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width
        const sy = rect.top + (-v.y * 0.5 + 0.5) * rect.height
        coordRef.current = { x: sx, y: sy, inFront: v.z <= 1 }
      }
      placeBubbleAndLine()
      const loop = () => {
        const forceRestore = !!(PERSISTENT_SELECTED_ID && !selectedRef.current)
        if (forceRestore) {
          _internalUnsafeSetSelected(PERSISTENT_SELECTED_ID)
          selectedRef.current = PERSISTENT_SELECTED_ID ? { code: PERSISTENT_SELECTED_ID.code } : null
        }
        if (!selectedRef.current) {
          rafIdRef.current && cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
          return
        }
        if (!bubbleElRef.current || !lineRef.current) {
          rafIdRef.current && cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
          return
        }
        placeBubbleAndLine(forceRestore)
        rafIdRef.current = requestAnimationFrame(loop)
      }
      rafIdRef.current = requestAnimationFrame(loop)
      requestAnimationFrame(() => {
        placeBubbleAndLine(false)
      })
      setTimeout(() => {
        isClickingCountry.current = false
        if (globeRef.current && typeof globeRef.current.enablePointerInteraction === 'function') {
          try {
            globeRef.current.enablePointerInteraction(true)
          } catch (e) {
            const _ignored2 = e
          }
        }
      }, 200)
      const onResize = () => {
        placeBubbleAndLine(false)
      }
      window.addEventListener('resize', onResize)
      overlaysRef.current.push({
        el: document.createElement('div'),
        dispose: () => window.removeEventListener('resize', onResize),
      })
      return false
    })
    globe.onGlobeClick(() => {
      if (isClickingCountry.current) return
      if (bgDisabledUntilRef.current && Date.now() < bgDisabledUntilRef.current) return
      if (globeRef.current && typeof globeRef.current.getPointerObj === 'function') {
        const clickedObj = globeRef.current.getPointerObj()
        if (clickedObj && clickedObj.geometry) return
      }
      if (freezeUntilRef.current && Date.now() < freezeUntilRef.current) return
      console.trace('气泡被关闭了，来源是：')
      selectedRef.current = null
      safeSetSelected(null)
      clearAll()
      if (bubbleElRef.current) {
        const node = bubbleElRef.current
        if (node.parentElement) node.parentElement.removeChild(node)
        bubbleElRef.current = null
      }
      if (lineRef.current) {
        const d = lineRef.current.getAttribute('d') || 'M 0 0 L 0 0'
        const nums = (d.match(/[-\d.]+/g) || []).map(parseFloat)
        const x1 = nums[0] || 0
        const y1 = nums[1] || 0
        const x2 = nums[2] || 0
        const y2 = nums[3] || 0
        const len = Math.hypot(x2 - x1, y2 - y1)
        lineRef.current.setAttribute('stroke-dasharray', `${len}`)
        lineRef.current.setAttribute('stroke-dashoffset', `0`)
        gsap.to(lineRef.current, {
          attr: { 'stroke-dashoffset': len },
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            if (lineRef.current && lineRef.current.parentElement) {
              lineRef.current.parentElement.removeChild(lineRef.current)
            }
            lineRef.current = null
          },
        })
      }
      overlaysRef.current = []
      refreshHtml()
      if (hiddenPinRef.current) {
        hiddenPinRef.current.el.style.visibility = 'visible'
        hiddenPinRef.current = null
      }
      rafIdRef.current && cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    })
    const onGlobalDown = (e) => {
      pointerDownRef.current = {
        x: e.clientX || 0,
        y: e.clientY || 0,
        t: Date.now(),
      }
    }
    const globalClose = (e) => {
      if (isClickingCountry.current) return
      if (bgDisabledUntilRef.current && Date.now() < bgDisabledUntilRef.current) return
      if (!selectedRef.current) return
      const down = pointerDownRef.current || { x: 0, y: 0, t: 0 }
      const dt = down.t ? Date.now() - down.t : 0
      const dx = Math.abs((e.clientX || 0) - down.x)
      const dy = Math.abs((e.clientY || 0) - down.y)
      const moved = Math.hypot(dx, dy)
      if (down.t && (dt > 350 || moved > 6)) {
        return
      }
      const canvas =
        globeRef.current &&
        globeRef.current.renderer &&
        typeof globeRef.current.renderer === 'function' &&
        globeRef.current.renderer().domElement
      const path = typeof e.composedPath === 'function' ? e.composedPath() : []
      if (canvas && (e.target === canvas || (Array.isArray(path) && path.includes(canvas)))) {
        if (globeRef.current && typeof globeRef.current.getPointerObj === 'function') {
          const obj = globeRef.current.getPointerObj()
          if (obj && obj.geometry) return
        }
        // 点击到画布但不是国家多边形，允许关闭
      }
      if (freezeUntilRef.current && Date.now() < freezeUntilRef.current) return
      selectedRef.current = null
      safeSetSelected(null)
      clearAll()
    }
    window.addEventListener('pointerdown', onGlobalDown, true)
    window.addEventListener('pointerup', globalClose, true)
    const debounce = (fn, delay) => {
      let t
      return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn(...args), delay)
      }
    }
    const lastDistRef = { current: 0 }
    const updateOpacity = () => {
      if (!pinsRef.current.length) return
      const cam = globe.camera()
      const dist = cam.position.distanceTo(globe.controls().target)
      if (Math.abs(dist - lastDistRef.current) < 0.5) return
      lastDistRef.current = dist
      pinsRef.current.forEach((p) => {
        if (p.isMajor || (selectedRef.current && selectedRef.current.code === p.code)) {
          const target = 1
          const current = parseFloat(p.el.style.opacity) || 0
          if (Math.abs(target - current) > 0.05) {
            gsap.to(p.el, { opacity: target, duration: 0.2, ease: 'power2.out', overwrite: 'auto' })
          }
        } else {
          if (dist >= 300) {
            const target = 0
            const current = parseFloat(p.el.style.opacity) || 0
            if (Math.abs(target - current) > 0.05) {
              gsap.to(p.el, {
                opacity: target,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: 'auto',
              })
            }
          } else if (dist <= 200) {
            const target = 1
            const current = parseFloat(p.el.style.opacity) || 0
            if (Math.abs(target - current) > 0.05) {
              gsap.to(p.el, { opacity: target, duration: 0.2, ease: 'power2.out', overwrite: 'auto' })
            }
          } else {
            const target = (300 - dist) / 100
            const current = parseFloat(p.el.style.opacity) || 0
            if (Math.abs(target - current) > 0.05) {
              gsap.to(p.el, { opacity: target, duration: 0.2, ease: 'power2.out', overwrite: 'auto' })
            }
          }
        }
      })
    }
    const debouncedUpdate = debounce(updateOpacity, 50)
    globe.controls().addEventListener('change', () => {
      updateOpacity()
      debouncedUpdate()
    })

    const scene = typeof globe.scene === 'function' ? globe.scene() : null
    if (scene) {
      const grp = new THREE.Group()
      grp.renderOrder = 1200
      grp.position.y = globeOffsetYRef.current
      grp.layers.set(0)
      scene.add(grp)
      manualArcsGroupRef.current = grp
      const fxGroup = new THREE.Group()
      fxGroup.position.y = globeOffsetYRef.current
      fxGroup.renderOrder = 1100
      scene.add(fxGroup)
      fxGroupRef.current = fxGroup
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.006, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false })
      )
      torus.layers.set(0)
      fxGroup.add(torus)
      fxRefsRef.current.torus = torus
      const ringN = new THREE.Mesh(
        new THREE.RingGeometry(0.98, 1.02, 64),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.2, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
      )
      ringN.position.y = 1.02
      ringN.rotation.x = Math.PI / 2
      ringN.layers.set(0)
      fxGroup.add(ringN)
      fxRefsRef.current.ringN = ringN
      const ringS = ringN.clone()
      ringS.position.y = -1.02
      fxGroup.add(ringS)
      fxRefsRef.current.ringS = ringS
      const cam = globe.camera()
      cam.near = 0.1
      cam.far = 20000
      cam.layers.set(0)
      cam.updateProjectionMatrix()
      manualArcsGroupRef.current.onBeforeRender = () => {
        const g = manualArcsGroupRef.current
        if (!g) return
        g.children.forEach((obj) => {
          const geo = obj.geometry
          if (geo && geo.attributes && geo.attributes.position) {
            geo.attributes.position.needsUpdate = true
          }
        })
      }
      const cssClear = () => {
        const overlays = document.querySelectorAll('.globe-rim-overlay, .overlay, .hud')
        overlays.forEach((el) => {
          el.style.display = 'none'
        })
        const canvas =
          globeRef.current &&
          globeRef.current.renderer &&
          typeof globeRef.current.renderer === 'function' &&
          globeRef.current.renderer().domElement
        if (canvas) {
          canvas.style.pointerEvents = 'auto'
        }
      }
      cssClear()
    }
    let rafId = 0
    const tick = () => {
      const grp = manualArcsGroupRef.current
      if (grp) {
        grp.children.forEach((obj) => {
          const g = obj.geometry
          if (g && g.attributes && g.attributes.position) {
            g.attributes.position.needsUpdate = true
          }
        })
      }
      const fx = fxRefsRef.current
      if (fx && fx.torus && fx.torus.material) {
        fx.torus.rotation.y += 0.002
        const t = performance.now() / 1000
        const beat = (Math.sin((2 * Math.PI * t) / 5) + 1) / 2
        fx.torus.material.opacity = 0.2 + 0.3 * beat
      }
      if (fx && fx.ringN && fx.ringN.material) {
        const t = performance.now() / 1000
        const beat = (Math.sin((2 * Math.PI * t) / 5) + 1) / 2
        fx.ringN.material.opacity = 0.15 + 0.25 * beat
      }
      if (fx && fx.ringS && fx.ringS.material) {
        const t = performance.now() / 1000
        const beat = (Math.sin((2 * Math.PI * t) / 5) + 1) / 2
        fx.ringS.material.opacity = 0.15 + 0.25 * beat
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    globe.pointOfView({ lat: 35, lng: 105, altitude: 1.8 }, 0)
    updateOpacity()
    debouncedUpdate()

    globeRef.current = globe
    birthPulseRef.current = (lat, lng) => {
      spawnPulse(lat, lng, 'birth')
      const vol = 0.55
      playBirthSound(vol)
    }
    deathPulseRef.current = (lat, lng) => {
      spawnPulse(lat, lng, 'death')
      const vol = 0.6
      playDeathSound(vol)
    }
    return () => {
      window.removeEventListener('resize', resize)
      globe.controls().removeEventListener('change', debouncedUpdate)
      window.removeEventListener('pointerdown', onGlobalDown, true)
      window.removeEventListener('pointerup', globalClose, true)
      if (rafId) cancelAnimationFrame(rafId)
      if (fxGroupRef.current && scene) {
        scene.remove(fxGroupRef.current)
        fxGroupRef.current = null
        fxRefsRef.current = { torus: null, ringN: null, ringS: null }
      }
    }
  }, [])
  useEffect(() => {
    if (!selected) {
      clearAll()
      if (overlaySvgRef.current) {
        overlaySvgRef.current.innerHTML = ''
      }
    }
  }, [selected, clearAll])
  useEffect(() => {
    if (!globeRef.current || !selectedRef.current || !bubbleElRef.current) return
    const code = selectedRef.current.code
    const cs = stats.countryStats?.[code]
    const inst = typeof stats.getCountryInstant === 'function' ? stats.getCountryInstant(code) : null
    const meta = COUNTRY_METADATA[code]
    const world = Number(stats.total || 8261000000)
    const seededShare = 0.004 + 0.003 * seededRand(code, Math.floor(Date.now() / 3600000), 7)
    const share = meta && meta.population ? meta.population / world : seededShare
    const bFactor = meta?.birthRateFactor || 1
    const dFactor = meta?.deathRateFactor || 1
    const birthsToday = inst
      ? inst.birthsToday
      : cs
      ? cs.birthsToday
      : Math.floor(stats.birthsToday * share * bFactor)
    const deathsToday = inst
      ? inst.deathsToday
      : cs
      ? cs.deathsToday
      : Math.floor(stats.deathsToday * share * dFactor)
    const nm = labelTextMap[lang]?.[code] || code
    bubbleElRef.current.innerHTML = `
      <div style="opacity:.85;margin-bottom:4px;">${nm}</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="color:#00ff88;text-align:left;">今日出生 +${birthsToday.toLocaleString()}</div>
        <div style="color:#ff4444;text-align:left;">今日死亡 -${deathsToday.toLocaleString()}</div>
      </div>
    `
    
  }, [stats.birthsToday, stats.deathsToday, lang, countryWeights, labelTextMap])
  useEffect(() => {
    if (!geoFeatures.length) return
    const map = {}
    for (const f of geoFeatures) {
      const iso = iso2OfFeature(f)
      if (!iso) continue
      const c = centroidOfFeature(f)
      map[iso] = { lat: c.lat, lng: c.lng }
    }
    isoCentroidRef.current = map
  }, [geoFeatures])

  

  useEffect(() => {
    if (!globeRef.current || !geoFeatures.length) return
    const pins = buildPins(geoFeatures)
    pinsRef.current = pins
    refreshHtml()
    try {
      const controls = globeRef.current.controls()
      controls.dispatchEvent({ type: 'change' })
    } catch (e) {
      const _ignored = e
    }
    setTimeout(() => {
      refreshHtml()
      try {
        const controls = globeRef.current.controls()
        controls.dispatchEvent({ type: 'change' })
      } catch (e) {
        const _ignored2 = e
      }
    }, 0)
    const handleResize = () => {
      if (!globeRef.current) return
      if (bubbleElRef.current && lineRef.current) {
        const c = cRef.current
        if (c) {
          const proj = {
            x: Math.floor(window.innerWidth / 2),
            y: Math.floor(window.innerHeight / 2),
            inFront: true,
          }
          const x = proj.x
          const y = proj.y
          const bx = Math.floor(window.innerWidth / 2)
          const by = Math.floor(window.innerHeight / 2)
          bubbleElRef.current.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, -60%) scale(1)`
          lineRef.current.setAttribute('d', `M ${x} ${y} L ${bx} ${by}`)
        }
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [geoFeatures, lang, selected, buildPins, refreshHtml])

  useEffect(() => {
    if (!globeRef.current) return
    gsap.to(colorTweenVal.current, {
      value: stats.viabilityIndex,
      duration: 0.3,
      onUpdate: () => {
        const t =
          typeof colorTweenVal.current === 'object'
            ? colorTweenVal.current.value
            : stats.viabilityIndex
        const from = [0x00, 0xff, 0x88]
        const to = [0xff, 0x44, 0x44]
        const mix = (a, b, p) => Math.round(a + (b - a) * (1 - p))
        const r = mix(from[0], to[0], t)
        const g = mix(from[1], to[1], t)
        const b = mix(from[2], to[2], t)
        const hex = `#${r.toString(16).padStart(2, '0')}${g
          .toString(16)
          .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        globeRef.current.atmosphereColor(hex)
      },
    })
  }, [stats.viabilityIndex])

  const countryStats = useMemo(() => {
    if (!selected) return null
    const w = countryWeights[selected.code] ?? 0.02
    return {
      births: Math.floor(stats.birthsToday * w),
      deaths: Math.floor(stats.deathsToday * w),
    }
  }, [selected, stats.birthsToday, stats.deathsToday, countryWeights])

  useEffect(() => {
    const tryFetch = async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch error')
      return res.json()
    }
    const load = async () => {
      try {
        const data = await tryFetch('/countries.geojson')
        setGeoFeatures(data.features || [])
      } catch {
        try {
          const data = await tryFetch(
            'https://vasturiano.github.io/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson'
          )
          setGeoFeatures(data.features || [])
        } catch {
          const data = await tryFetch(
            'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson'
          )
          setGeoFeatures(data.features || [])
        }
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!globeRef.current || !geoFeatures.length) return
    globeRef.current
      .polygonsData(geoFeatures)
      .polygonCapColor(() => 'rgba(0,0,0,0)')
      .polygonSideColor(() => 'rgba(0,0,0,0)')
      .polygonStrokeColor((f) => {
        const base = 'rgba(0,255,136,0.85)'
        if (hoveredRef.current && hoveredRef.current === f) {
          return 'rgba(0,255,136,1)'
        }
        return base
      })
  }, [geoFeatures])


  return (
      <div className="w-screen h-screen cyber-bg relative" style={{ transform: 'none', perspective: 'none', margin: 0, padding: 0 }}>
      <WarningTicker />
      <div className="holo-slogan">
        "每一秒，都是某个人的终点，亦是某个人重获希望的起点。"
      </div>
      <div className="globe-rim-overlay"></div>
      <div
        ref={containerRef}
        className="globe-container w-full h-full"
        style={{ position: 'relative', outline: 'none', userSelect: 'none', WebkitTapHighlightColor: 'transparent', margin: 0, padding: 0, transform: 'translateY(12vh)' }}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <div
        ref={overlayRef}
        className="fixed inset-0 overflow-hidden"
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, pointerEvents: 'none', margin: 0, padding: 0, transform: 'none', perspective: 'none' }}
      >
        <svg
          ref={overlaySvgRef}
          className="absolute inset-0"
          style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 10000, pointerEvents: 'none' }}
        />
      </div>
      <GlobalStatsPanel stats={stats} />
      <div className={`fixed top-4 right-4 p-3 text-sm font-mono text-white crt-glow ${lang === 'CN' ? 'tracking-wide' : ''}`}>
        <div>{uiLabels[lang].total}: {stats.total.toLocaleString()}</div>
        <div className="text-green-400">{uiLabels[lang].births}: +{stats.birthsToday.toLocaleString()}</div>
        <div className="text-red-400">{uiLabels[lang].deaths}: -{stats.deathsToday.toLocaleString()}</div>
      </div>
      <div className="fixed top-4 left-4 flex gap-2 text-white">
        {['CN', 'EN', 'JP'].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2 py-1 rounded text-xs ${lang === l ? 'underline' : ''}`}
          >
            {l}
          </button>
        ))}
      </div>
      {selected && countryStats && (
        <div className={`fixed left-4 bottom-4 p-3 text-xs text-white font-mono text-shadow ${lang === 'CN' ? 'tracking-wide' : ''}`}>
          <div className="opacity-80">{labelTextMap[lang]?.[selected.code] ?? selected.code}</div>
          <div className="text-green-400">{uiLabels[lang].birthsToday}: +{countryStats.births.toLocaleString()}</div>
          <div className="text-red-400">{uiLabels[lang].deathsToday}: -{countryStats.deaths.toLocaleString()}</div>
        </div>
      )}
    </div>
  )
}

export default App
