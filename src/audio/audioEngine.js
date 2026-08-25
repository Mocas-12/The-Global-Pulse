// audioEngine.js — Web Audio 合成音效: 出生音 / 死亡音 / 环境音景
let ctx = null
let master = null
let ambient = null
let ambientRunning = false
let muted = false
const lastPlay = { birth: 0, death: 0 }
const MIN_INTERVAL = 150

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
  if (master) {
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.linearRampToValueAtTime(m ? 0 : 1, ctx.currentTime + 0.3)
  }
}

export function isMuted() { return muted }

function tone({ freqA, freqB, duration, volume, wave, echoMs = 0, echoGain = 0 }) {
  if (muted) return
  const c = ensureCtx()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = wave
  const end = t + duration / 1000
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(volume, t + 0.015)
  g.gain.linearRampToValueAtTime(volume * 0.5, end - 0.04)
  g.gain.linearRampToValueAtTime(0, end)
  osc.frequency.setValueAtTime(freqA, t)
  osc.frequency.linearRampToValueAtTime(freqB, end)
  osc.connect(g)
  if (echoMs > 0 && echoGain > 0) {
    const d = c.createDelay()
    d.delayTime.value = echoMs / 1000
    const fb = c.createGain()
    fb.gain.value = echoGain
    g.connect(d)
    d.connect(fb)
    fb.connect(d)
    d.connect(master)
  }
  g.connect(master)
  osc.start(t)
  osc.stop(end + 0.05)
  osc.onended = () => {
    try { osc.disconnect(); g.disconnect() } catch { /* noop */ }
  }
}

export function playBirth(vol = 0.35) {
  const now = performance.now()
  if (now - lastPlay.birth < MIN_INTERVAL) return
  lastPlay.birth = now
  tone({ freqA: 1320, freqB: 1760, duration: 0.22, volume: vol, wave: 'sine', echoMs: 0.12, echoGain: 0.25 })
}

export function playDeath(vol = 0.3) {
  const now = performance.now()
  if (now - lastPlay.death < MIN_INTERVAL) return
  lastPlay.death = now
  tone({ freqA: 196, freqB: 110, duration: 0.28, volume: vol, wave: 'triangle', echoMs: 0.16, echoGain: 0.3 })
}

// 环境音景: 40/41Hz 双振荡拍频 + 低通 + 卷积混响 + 随机卫星Ping
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

  const convolver = c.createConvolver()
  const len = Math.floor(c.sampleRate * 2.8)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 1.2))
  }
  convolver.buffer = ir

  const lowpass = c.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 220

  const droneGain = c.createGain()
  droneGain.gain.value = 0.5

  const osc1 = c.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.value = 40
  const osc2 = c.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = 41
  osc1.connect(lowpass)
  osc2.connect(lowpass)
  lowpass.connect(droneGain)
  droneGain.connect(convolver)
  convolver.connect(masterAmb)

  const lfo = c.createOscillator()
  lfo.frequency.value = 0.08
  const lfoGain = c.createGain()
  lfoGain.gain.value = 0.12
  lfo.connect(lfoGain)
  lfoGain.connect(masterAmb.gain)

  const t = c.currentTime
  masterAmb.gain.setValueAtTime(0, t)
  masterAmb.gain.linearRampToValueAtTime(0.28, t + 4)
  osc1.start(); osc2.start(); lfo.start()

  // 偶发的高频"卫星Ping"
  amb.timer = setInterval(() => {
    if (!ambientRunning || muted || document.hidden) return
    const cc = ensureCtx()
    if (!cc) return
    const o = cc.createOscillator()
    const g = cc.createGain()
    o.type = 'sine'
    o.frequency.value = 1800 + Math.random() * 2600
    const tt = cc.currentTime
    g.gain.setValueAtTime(0, tt)
    g.gain.linearRampToValueAtTime(0.05, tt + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 2.2)
    o.connect(g)
    g.connect(convolver)
    o.start(tt)
    o.stop(tt + 2.3)
  }, 7000)

  amb.nodes = [masterAmb, convolver, lowpass, droneGain, osc1, osc2, lfo, lfoGain]
}

export function stopAmbient() {
  if (!ambient || !ambientRunning) return
  ambientRunning = false
  if (ambient.timer) clearInterval(ambient.timer)
  try {
    const t = ctx.currentTime
    ambient.nodes[0].gain.cancelScheduledValues(t)
    ambient.nodes[0].gain.linearRampToValueAtTime(0, t + 1)
    setTimeout(() => {
      ambient.nodes.forEach((n) => { try { n.stop?.(); n.disconnect() } catch { /* noop */ } })
      ambient = null
    }, 1200)
  } catch { /* noop */ }
}
