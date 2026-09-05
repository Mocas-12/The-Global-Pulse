// audioEngine.js — Web Audio 纯背景音: 开场接近音 + 持续流动的和声垫
// 没有任何离散的音符事件(无钢琴音/无嘟嘟声/无琶音), 要么连续要么固定缓变。
// 默认开启; 浏览器自动播放策略下, 在首次用户手势时解锁并入场。
let ctx = null
let master = null
let ambient = null
let ambientRunning = false
let muted = false

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

// 开场: 由远到近的接近音——柔化的风声扫频 + 轻微隆隆, 尾部交给环境垫, 返回时长(秒)
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
  bp.frequency.setValueAtTime(200, t0)
  bp.frequency.exponentialRampToValueAtTime(1200, t0 + dur * 0.85)
  bp.Q.value = 0.9
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.0001, t0)
  ng.gain.exponentialRampToValueAtTime(0.2, t0 + dur * 0.78)
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  const rumble = c.createOscillator()
  rumble.type = 'sine'
  rumble.frequency.setValueAtTime(50, t0)
  rumble.frequency.exponentialRampToValueAtTime(110, t0 + dur * 0.85)
  const rg = c.createGain()
  rg.gain.setValueAtTime(0.0001, t0)
  rg.gain.exponentialRampToValueAtTime(0.1, t0 + dur * 0.8)
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

// 环境音景: 脉搏心跳为主角(约50bpm lub-dub) + 极轻的和声垫作底。
// 心跳音色: 低频滑落 + 噪声声体, 软攻击, 有肉感而非电子哔声。
export function startAmbient(fade = 1.5) {
  if (ambientRunning) return
  const c = ensureCtx()
  if (!c) return
  ambientRunning = true

  const amb = { nodes: [], timers: [] }
  ambient = amb

  const masterAmb = c.createGain()
  masterAmb.gain.value = 0
  masterAmb.connect(master)

  // 短混响(1.4s)
  const convolver = c.createConvolver()
  const len = Math.floor(c.sampleRate * 1.4)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.45))
  }
  convolver.buffer = ir
  const reverbGain = c.createGain()
  reverbGain.gain.value = 0.3
  convolver.connect(reverbGain)
  reverbGain.connect(masterAmb)

  // 和声垫: 压得极低, 只是心跳下面的一层薄纱
  const lowpass = c.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 900
  lowpass.Q.value = 0.3
  lowpass.connect(masterAmb)
  lowpass.connect(convolver)

  const lfo = c.createOscillator()
  lfo.frequency.value = 0.05
  const lfoGain = c.createGain()
  lfoGain.gain.value = 240
  lfo.connect(lfoGain)
  lfoGain.connect(lowpass.frequency)

  const makeVoice = (freq, gain0) => {
    const vg = c.createGain()
    vg.gain.value = gain0
    vg.connect(lowpass)
    for (const det of [-3, 3]) {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      o.detune.value = det
      o.connect(vg)
      o.start()
      amb.nodes.push(o)
    }
    amb.nodes.push(vg)
    return vg
  }

  makeVoice(220, 0.06)     // A3
  makeVoice(277.18, 0.045) // C#4
  makeVoice(440, 0.018)    // A4
  const eGain = makeVoice(329.63, 0.04) // E4 (与 F#3 交替)
  const fGain = makeVoice(185, 0)       // F#3

  // 和声缓变: E4 <-> F#3 交替(A 大调 <-> F#m 色彩), 16 秒一次、6 秒滑变
  let fadeState = 0
  amb.timers.push(setInterval(() => {
    if (!ambientRunning || !ctx) return
    const tt = ctx.currentTime
    if (fadeState === 0) {
      eGain.gain.linearRampToValueAtTime(0, tt + 6)
      fGain.gain.linearRampToValueAtTime(0.042, tt + 6)
      fadeState = 1
    } else {
      eGain.gain.linearRampToValueAtTime(0.04, tt + 6)
      fGain.gain.linearRampToValueAtTime(0, tt + 6)
      fadeState = 0
    }
  }, 16000))

  // 慢呼吸: 滤波与总音量 20 秒周期轻微起伏
  const breath = c.createOscillator()
  breath.frequency.value = 0.05
  const breathGain = c.createGain()
  breathGain.gain.value = 0.02
  breath.connect(breathGain)
  breathGain.connect(masterAmb.gain)
  amb.nodes.push(breath, breathGain)

  // 心跳: 约 50bpm 的 lub-dub 双搏
  const heartOut = c.createGain()
  heartOut.gain.value = 1
  const heartLp = c.createBiquadFilter()
  heartLp.type = 'lowpass'
  heartLp.frequency.value = 200
  heartOut.connect(heartLp)
  heartLp.connect(masterAmb)
  const heartSend = c.createGain()
  heartSend.gain.value = 0.22
  heartLp.connect(heartSend)
  heartSend.connect(convolver)

  const thump = (at, vol, base) => {
    // 低频滑落体: 80->42Hz, 软攻击
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(base * 1.9, at)
    o.frequency.exponentialRampToValueAtTime(base, at + 0.22)
    const g = c.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.028)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.38)
    o.connect(g)
    g.connect(heartOut)
    // 噪声声体: 让音箱小也能听出"肉感"而非电子哔声
    const n = c.createBufferSource()
    n.buffer = makeNoiseBuffer(c, 0.3)
    const nLp = c.createBiquadFilter()
    nLp.type = 'lowpass'
    nLp.frequency.value = 150
    const ng = c.createGain()
    ng.gain.setValueAtTime(vol * 0.5, at)
    ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.1)
    n.connect(nLp)
    nLp.connect(ng)
    ng.connect(heartOut)
    o.start(at)
    o.stop(at + 0.4)
    n.start(at)
    n.stop(at + 0.12)
    o.onended = () => {
      try { o.disconnect(); g.disconnect(); n.disconnect(); nLp.disconnect(); ng.disconnect() } catch { /* noop */ }
    }
  }
  amb.timers.push(setInterval(() => {
    if (!ambientRunning || muted || document.hidden) return
    const cc = ensureCtx()
    if (!cc) return
    const now = cc.currentTime
    thump(now, 0.15, 45)        // lub
    thump(now + 0.28, 0.09, 40) // dub
  }, 1200))

  const t = c.currentTime
  masterAmb.gain.setValueAtTime(0, t)
  masterAmb.gain.linearRampToValueAtTime(0.5, t + Math.max(0.5, fade))

  amb.nodes.push(masterAmb, convolver, reverbGain, lowpass, lfo, lfoGain)
}

export function stopAmbient() {
  if (!ambient || !ambientRunning) return
  ambientRunning = false
  const amb = ambient
  ambient = null // 立即复位, 保证随后可重新 startAmbient()
  if (amb.timers) amb.timers.forEach(clearInterval)
  try {
    const t = ctx.currentTime
    amb.nodes[0].gain.cancelScheduledValues(t)
    amb.nodes[0].gain.linearRampToValueAtTime(0, t + 1)
    setTimeout(() => {
      amb.nodes.forEach((n) => { try { n.stop?.(); n.disconnect() } catch { /* noop */ } })
    }, 1200)
  } catch { /* noop */ }
}
