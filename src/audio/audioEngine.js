// audioEngine.js — Web Audio 合成音效: 开场接近音 / 出生音 / 死亡音 / 环境音景
// 设计原则: 一件"乐器"(音盒) + 一个"和声"(A 大调) + 可预测的缓慢律动。
// 可预测 = 放松; 随机孤立的高频事件 = 不安。全场音量刻意压低, 是"配乐"不是"音效墙"。
// 默认开启; 浏览器自动播放策略下, 在首次用户手势时解锁并入场。
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

// 音盒音色: 纯正弦主音 + 一缕高八度三角波泛音, 短攻击、长指数衰减
// 可选借用环境混响(ambient 在跑时), 让音符落进同一空间
function musicBox(freq, vol, dur, slideTo) {
  if (muted || document.hidden) return
  const c = ensureCtx()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur * 0.8)
  const o2 = c.createOscillator()
  o2.type = 'triangle'
  o2.frequency.value = freq * 2
  const o2g = c.createGain()
  o2g.gain.value = 0.15
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  o2.connect(o2g)
  o2g.connect(g)
  g.connect(master)
  if (ambient?.reverb) g.connect(ambient.reverb)
  o.start(t)
  o2.start(t)
  o.stop(t + dur + 0.05)
  o2.stop(t + dur + 0.05)
  o.onended = () => {
    try { o.disconnect(); o2.disconnect(); o2g.disconnect(); g.disconnect() } catch { /* noop */ }
  }
}

// 出生: 音盒轻拨, 同一调内随机音高(A4/C#5/E5/A5), 与环境琶音同族
export function playBirth() {
  if (muted || document.hidden) return
  if (Math.random() < 0.65) return
  const now = performance.now()
  if (now - lastPlay.birth < 600) return
  lastPlay.birth = now
  const KEY = [440, 554.37, 659.25, 880]
  musicBox(KEY[(Math.random() * KEY.length) | 0], 0.038, 1.4)
}

// 死亡: 同一音色低八度下行轻叹(E4 -> A3), 安静而不阴森
export function playDeath() {
  if (muted || document.hidden) return
  if (Math.random() < 0.7) return
  const now = performance.now()
  if (now - lastPlay.death < 700) return
  lastPlay.death = now
  musicBox(329.63, 0.034, 0.8, 220)
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

// 环境音景: 中音区暖垫(A3/C#4/E4/A4) + 慢呼吸滤波 + 每两秒一记的音盒琶音。
// 固定的循环律动 = 可预测 = 放松; 没有低频轰鸣, 没有随机尖鸣。
export function startAmbient() {
  if (ambientRunning) return
  const c = ensureCtx()
  if (!c) return
  ambientRunning = true

  const amb = { nodes: [], timer: null, reverb: null }
  ambient = amb

  const masterAmb = c.createGain()
  masterAmb.gain.value = 0
  masterAmb.connect(master)

  // 短混响(1.4s), 音盒与琶音共用同一空间
  const convolver = c.createConvolver()
  const len = Math.floor(c.sampleRate * 1.4)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.45))
  }
  convolver.buffer = ir
  const reverbGain = c.createGain()
  reverbGain.gain.value = 0.35
  convolver.connect(reverbGain)
  reverbGain.connect(masterAmb)
  amb.reverb = convolver

  // 暖垫: 中音区三和弦 + 高八度点缀, 微失谐(±3 音分)几乎无拍频
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

  const VOICES = [
    { freq: 220, gain: 0.14 },    // A3
    { freq: 277.18, gain: 0.1 },  // C#4
    { freq: 329.63, gain: 0.085 }, // E4
    { freq: 440, gain: 0.05 },    // A4
  ]
  const padNodes = []
  for (const v of VOICES) {
    const vg = c.createGain()
    vg.gain.value = v.gain
    vg.connect(lowpass)
    for (const det of [-3, 3]) {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = v.freq
      o.detune.value = det
      o.connect(vg)
      o.start()
      padNodes.push(o)
    }
    padNodes.push(vg)
  }

  // 慢呼吸: 音量 20 秒一个周期轻微起伏
  const breath = c.createOscillator()
  breath.frequency.value = 0.05
  const breathGain = c.createGain()
  breathGain.gain.value = 0.05
  breath.connect(breathGain)
  breathGain.connect(masterAmb.gain)

  const t = c.currentTime
  masterAmb.gain.setValueAtTime(0, t)
  masterAmb.gain.linearRampToValueAtTime(0.4, t + 5)

  // 音盒琶音: 固定循环 A4 -> C#5 -> E5 -> C#5, 每两秒一记, 极安静
  const ARP = [440, 554.37, 659.25, 554.37]
  let arpIdx = 0
  amb.timer = setInterval(() => {
    if (!ambientRunning || muted || document.hidden) return
    const cc = ensureCtx()
    if (!cc) return
    const f = ARP[arpIdx % ARP.length]
    arpIdx++
    // 走独立音盒路径(音量更低), 借同一混响
    const o = cc.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const o2 = cc.createOscillator()
    o2.type = 'triangle'
    o2.frequency.value = f * 2
    const o2g = cc.createGain()
    o2g.gain.value = 0.12
    const g = cc.createGain()
    const tt = cc.currentTime
    g.gain.setValueAtTime(0, tt)
    g.gain.linearRampToValueAtTime(0.026, tt + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.6)
    o.connect(g)
    o2.connect(o2g)
    o2g.connect(g)
    g.connect(masterAmb)
    g.connect(convolver)
    o.start(tt)
    o2.start(tt)
    o.stop(tt + 1.65)
    o2.stop(tt + 1.65)
    o.onended = () => {
      try { o.disconnect(); o2.disconnect(); o2g.disconnect(); g.disconnect() } catch { /* noop */ }
    }
  }, 2000)

  amb.nodes = [masterAmb, convolver, reverbGain, lowpass, lfo, lfoGain, breath, breathGain, ...padNodes]
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
