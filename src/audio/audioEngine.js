// audioEngine.js — Web Audio 合成音效: 开场接近音 / 出生音 / 死亡音 / 环境音景
// 设计原则: 音景是"配乐"不是"音效墙"——稀疏、柔和、与主题同源
// 默认开启; 浏览器自动播放策略下, 在首次用户手势时解锁并入场
let ctx = null
let master = null
let ambient = null
let ambientRunning = false
let muted = false
const lastPlay = { birth: 0, death: 0 }

export function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function setMuted(m) {
  muted = m
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.linearRampToValueAtTime(m ? 0 : 1, ctx.currentTime + 0.3)
  }
}

export function isMuted() { return muted }

export function audioDebug() {
  return { hasCtx: !!ctx, state: ctx?.state ?? null, ambient: ambientRunning, muted }
}

function makeNoiseBuffer(c, seconds) {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function tone({ freqA, freqB, duration, volume, wave, echoSec = 0, echoGain = 0, attack = 0.015 }) {
  if (muted || document.hidden) return
  const c = ensureCtx()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = wave
  const end = t + duration / 1000
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(volume, t + attack)
  g.gain.linearRampToValueAtTime(volume * 0.5, end - 0.04)
  g.gain.linearRampToValueAtTime(0, end)
  osc.frequency.setValueAtTime(freqA, t)
  osc.frequency.linearRampToValueAtTime(freqB, end)
  osc.connect(g)
  if (echoSec > 0 && echoGain > 0) {
    const d = c.createDelay(1)
    d.delayTime.value = echoSec
    const fb = c.createGain()
    fb.gain.value = echoGain
    const wet = c.createGain()
    wet.gain.value = 0.4
    g.connect(d)
    d.connect(fb)
    fb.connect(d)
    d.connect(wet)
    wet.connect(master)
  }
  g.connect(master)
  osc.start(t)
  osc.stop(end + 0.05)
  osc.onended = () => {
    try { osc.disconnect(); g.disconnect() } catch { /* noop */ }
  }
}

// 出生: 五声音阶风铃(随机音高保证相互和谐), 高密度时稀疏化丢放
const PENTA = [523.25, 587.33, 659.25, 783.99, 880]
export function playBirth() {
  if (muted || document.hidden) return
  if (Math.random() < 0.55) return
  const now = performance.now()
  if (now - lastPlay.birth < 420) return
  lastPlay.birth = now
  const f = PENTA[(Math.random() * PENTA.length) | 0] * (Math.random() < 0.25 ? 2 : 1)
  tone({ freqA: f, freqB: f * 1.005, duration: 1.1, volume: 0.07, wave: 'sine', echoSec: 0.28, echoGain: 0.45, attack: 0.04 })
}

// 死亡: 低频软鼓, 同样稀疏
export function playDeath() {
  if (muted || document.hidden) return
  if (Math.random() < 0.5) return
  const now = performance.now()
  if (now - lastPlay.death < 500) return
  lastPlay.death = now
  tone({ freqA: 170, freqB: 72, duration: 0.55, volume: 0.075, wave: 'triangle', echoSec: 0.22, echoGain: 0.4, attack: 0.02 })
}

// 开场: 由远到近的接近音——风声扫频 + 低频隆隆, 返回时长(秒)
export function playIntro() {
  if (muted) return 0
  const c = ensureCtx()
  if (!c) return 0
  const dur = 3.2
  const t0 = c.currentTime

  const noise = c.createBufferSource()
  noise.buffer = makeNoiseBuffer(c, dur + 0.2)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(220, t0)
  bp.frequency.exponentialRampToValueAtTime(1500, t0 + dur * 0.85)
  bp.Q.value = 1.1
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.0001, t0)
  ng.gain.exponentialRampToValueAtTime(0.4, t0 + dur * 0.78)
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  const rumble = c.createOscillator()
  rumble.type = 'sine'
  rumble.frequency.setValueAtTime(46, t0)
  rumble.frequency.exponentialRampToValueAtTime(120, t0 + dur * 0.85)
  const rg = c.createGain()
  rg.gain.setValueAtTime(0.0001, t0)
  rg.gain.exponentialRampToValueAtTime(0.2, t0 + dur * 0.8)
  rg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  noise.connect(bp)
  bp.connect(ng)
  ng.connect(master)
  rumble.connect(rg)
  rg.connect(master)
  noise.start(t0)
  noise.stop(t0 + dur + 0.1)
  rumble.start(t0)
  rumble.stop(t0 + dur + 0.1)
  noise.onended = () => {
    try { noise.disconnect(); bp.disconnect(); ng.disconnect(); rumble.disconnect(); rg.disconnect() } catch { /* noop */ }
  }
  return dur
}

// 环境音景: A 大调暖垫(A2/E3/A3/C#4 双振荡微失谐) + 慢呼吸低通 + 太空风噪 + 偶发卫星Ping
export function startAmbient() {
  if (ambientRunning) return
  const c = ensureCtx()
  if (!c) return
  ambientRunning = true

  const amb = { nodes: [], timer: null }
  ambient = amb

  const masterAmb = c.createGain()
  masterAmb.gain.value = 0
  masterAmb.connect(master)

  // 卷积混响(衰减 2.2s)
  const convolver = c.createConvolver()
  const len = Math.floor(c.sampleRate * 2.2)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.9))
  }
  convolver.buffer = ir
  const wet = c.createGain()
  wet.gain.value = 0.45
  convolver.connect(wet)
  wet.connect(masterAmb)

  // 暖垫: 和弦音拨打到低通, 慢 LFO 呼吸
  const lowpass = c.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 520
  lowpass.Q.value = 0.4
  lowpass.connect(masterAmb)
  lowpass.connect(convolver)

  const lfo = c.createOscillator()
  lfo.frequency.value = 0.06
  const lfoGain = c.createGain()
  lfoGain.gain.value = 190
  lfo.connect(lfoGain)
  lfoGain.connect(lowpass.frequency)

  const VOICES = [
    { freq: 110, gain: 0.2 },    // A2
    { freq: 164.81, gain: 0.15 }, // E3
    { freq: 220, gain: 0.11 },   // A3
    { freq: 277.18, gain: 0.075 }, // C#4
  ]
  const padNodes = []
  for (const v of VOICES) {
    const vg = c.createGain()
    vg.gain.value = v.gain
    vg.connect(lowpass)
    for (const det of [-0.6, 0.6]) {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = v.freq
      o.detune.value = det * 10
      o.connect(vg)
      o.start()
      padNodes.push(o)
    }
    padNodes.push(vg)
  }

  // 太空风: 低通噪声, 极安静
  const wind = c.createBufferSource()
  wind.buffer = makeNoiseBuffer(c, 4)
  wind.loop = true
  const windLp = c.createBiquadFilter()
  windLp.type = 'lowpass'
  windLp.frequency.value = 320
  const windGain = c.createGain()
  windGain.gain.value = 0.014
  wind.connect(windLp)
  windLp.connect(windGain)
  windGain.connect(masterAmb)
  wind.start()

  const t = c.currentTime
  masterAmb.gain.setValueAtTime(0, t)
  masterAmb.gain.linearRampToValueAtTime(0.5, t + 5)

  // 偶发"卫星Ping": 低频段、长衰减, 与暖垫同混响
  amb.timer = setInterval(() => {
    if (!ambientRunning || muted || document.hidden) return
    const cc = ensureCtx()
    if (!cc) return
    const o = cc.createOscillator()
    const g = cc.createGain()
    o.type = 'sine'
    o.frequency.value = 900 + Math.random() * 900
    const tt = cc.currentTime
    g.gain.setValueAtTime(0, tt)
    g.gain.linearRampToValueAtTime(0.018, tt + 0.06)
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 3)
    o.connect(g)
    g.connect(convolver)
    o.start(tt)
    o.stop(tt + 3.1)
  }, 9000)

  amb.nodes = [masterAmb, convolver, wet, lowpass, lfo, lfoGain, wind, windLp, windGain, ...padNodes]
}

export function stopAmbient() {
  if (!ambient || !ambientRunning) return
  ambientRunning = false
  const amb = ambient
  ambient = null // 立即复位, 保证随后可重新 startAmbient()
  if (amb.timer) clearInterval(amb.timer)
  try {
    const t = ctx.currentTime
    amb.nodes[0].gain.cancelScheduledValues(t)
    amb.nodes[0].gain.linearRampToValueAtTime(0, t + 1)
    setTimeout(() => {
      amb.nodes.forEach((n) => { try { n.stop?.(); n.disconnect() } catch { /* noop */ } })
    }, 1200)
  } catch { /* noop */ }
}
