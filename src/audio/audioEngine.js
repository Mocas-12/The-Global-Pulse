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

// 环境音景: 纯连续背景。
// 暖垫(A3/C#4/A4 + E4<->F#3 和声缓变) + 慢呼吸滤波与音量起伏, 没有任何音符事件。
export function startAmbient() {
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

  // 暖垫: 中音区, 微失谐(±3 音分)几乎无拍频
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

  makeVoice(220, 0.14)     // A3
  makeVoice(277.18, 0.1)   // C#4
  makeVoice(440, 0.04)     // A4
  const eGain = makeVoice(329.63, 0.085) // E4 (与 F#3 交替)
  const fGain = makeVoice(185, 0)        // F#3

  // 和声缓变: E4 <-> F#3 交替(A 大调 <-> F#m 色彩), 16 秒一次、6 秒滑变
  let fadeState = 0
  amb.timers.push(setInterval(() => {
    if (!ambientRunning || !ctx) return
    const tt = ctx.currentTime
    if (fadeState === 0) {
      eGain.gain.linearRampToValueAtTime(0, tt + 6)
      fGain.gain.linearRampToValueAtTime(0.09, tt + 6)
      fadeState = 1
    } else {
      eGain.gain.linearRampToValueAtTime(0.085, tt + 6)
      fGain.gain.linearRampToValueAtTime(0, tt + 6)
      fadeState = 0
    }
  }, 16000))

  // 慢呼吸: 滤波与总音量 20 秒周期轻微起伏
  const breath = c.createOscillator()
  breath.frequency.value = 0.05
  const breathGain = c.createGain()
  breathGain.gain.value = 0.04
  breath.connect(breathGain)
  breathGain.connect(masterAmb.gain)
  amb.nodes.push(breath, breathGain)

  const t = c.currentTime
  masterAmb.gain.setValueAtTime(0, t)
  masterAmb.gain.linearRampToValueAtTime(0.4, t + 5)

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
