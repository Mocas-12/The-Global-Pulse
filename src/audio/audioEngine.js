// audioEngine.js — Web Audio 生成式背景音乐: 音乐盒质感的轻快四和弦 + 五声音阶拨弦
// 零音频文件, 全部实时合成; 默认开启, 浏览器自动播放策略下在首次手势时立即响起。
// (Math.random 仅用于混响噪声与旋律选择, 与安全无关)
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

// ——— 音乐素材: Cmaj9 -> Am7 -> Fmaj7 -> G6 温暖循环 + C 大调五声音阶 ———
const CHORDS = [
  [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
  [110.0, 130.81, 164.81, 196.0],          // Am7
  [87.31, 110.0, 130.81, 164.81],          // Fmaj7
  [98.0, 123.47, 146.83, 164.81],          // G6
]
const PENTA = [523.25, 587.33, 659.26, 783.99, 880.0, 1046.5]

function padNote(c, freq, at, out, peak, detune) {
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.value = freq
  o.detune.value = detune
  const g = c.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(peak, at + 1.4)
  g.gain.setValueAtTime(peak, at + 3.1)
  g.gain.linearRampToValueAtTime(0.0001, at + 4.5)
  o.connect(g)
  g.connect(out)
  o.start(at)
  o.stop(at + 4.7)
  o.onended = () => { try { o.disconnect(); g.disconnect() } catch { /* noop */ } }
}

function pluck(c, freq, at, out) {
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(0.06, at + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.2)
  o.connect(g)
  g.connect(out)
  o.start(at)
  o.stop(at + 1.3)
  o.onended = () => { try { o.disconnect(); g.disconnect() } catch { /* noop */ } }
}

// 环境音乐: 和弦垫每 4 秒推进, 拨弦旋律随机点缀; 音量刻意收敛
export function startAmbient(fade = 1.8) {
  if (ambientRunning) return
  const c = ensureCtx()
  if (!c) return
  ambientRunning = true
  const amb = { nodes: [], timers: [] }
  ambient = amb

  const masterAmb = c.createGain()
  masterAmb.gain.value = 0
  const warm = c.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 2400 // 去亮刺, 音乐盒质感
  masterAmb.connect(warm)
  warm.connect(master)

  // 轻混响收尾
  const convolver = c.createConvolver()
  const len = Math.floor(c.sampleRate * 1.6)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.5))
  }
  convolver.buffer = ir
  const reverbGain = c.createGain()
  reverbGain.gain.value = 0.35
  masterAmb.connect(convolver)
  convolver.connect(reverbGain)
  reverbGain.connect(master)

  const target = 0.3
  const t0 = c.currentTime
  masterAmb.gain.setValueAtTime(0, t0)
  masterAmb.gain.linearRampToValueAtTime(target, t0 + Math.max(1, fade))

  let step = 0
  const playChord = () => {
    if (!ambientRunning || muted || document.hidden) return
    const cc = ensureCtx()
    if (!cc) return
    const at = cc.currentTime + 0.05
    const chord = CHORDS[step % CHORDS.length]
    chord.forEach((f, i) => padNote(cc, f, at, masterAmb, 0.045 / (i * 0.55 + 1), i % 2 ? 5 : -5))
    pluck(cc, chord[0] / 2, at + 0.1, masterAmb) // 低音根音轻点
    step += 1
  }
  playChord()
  amb.timers.push(setInterval(playChord, 4000))

  const melodyTick = () => {
    if (!ambientRunning || muted || document.hidden) return
    if (Math.random() < 0.42) return // 留白
    const cc = ensureCtx()
    if (!cc) return
    const f = PENTA[Math.floor(Math.random() * PENTA.length)] * (Math.random() < 0.18 ? 0.5 : 1)
    pluck(cc, f, cc.currentTime + 0.03, masterAmb)
  }
  amb.timers.push(setInterval(melodyTick, 700))

  amb.nodes.push(masterAmb, warm, convolver, reverbGain)
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
    amb.nodes[0].gain.linearRampToValueAtTime(0, t + 0.9)
    setTimeout(() => {
      amb.nodes.forEach((n) => { try { n.disconnect() } catch { /* noop */ } })
    }, 1100)
  } catch { /* noop */ }
}
