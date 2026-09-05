// globeFX.js — 视觉特效引擎: 实时昼夜光照 / 大气散射 / 云层 / 星空 / 涟漪脉冲
// 天文算法: 低精度太阳位置(±0.01°), 足够视觉用途
import * as THREE from 'three'

// 与 three-globe polar2Cartesian 完全一致的经纬度 -> 世界坐标
export function latLngToVec3(lat, lng, r = 1) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (90 - lng) * (Math.PI / 180)
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  )
}

// 太阳直射点(视太阳时), 由 UTC 实时推算
export function sunLatLon(date = new Date()) {
  const rad = Math.PI / 180
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000
  const L = (280.460 + 0.9856474 * d) % 360
  const g = ((357.528 + 0.9856003 * d) % 360) * rad
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad
  const eps = 23.439 * rad
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda))
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24
  let lng = (ra / rad) - gmst * 15
  lng = ((lng + 540) % 360) - 180
  return { lat: dec / rad, lng }
}

// ————————————————————————— 地球材质: 真实昼夜晨昏线 —————————————————————————
const GLOBE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const GLOBE_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uWater;
  uniform vec3 uSunDir;
  uniform float uNightBoost;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, uSunDir);

    // 柔和晨昏过渡
    float dayMix = smoothstep(-0.12, 0.30, ndl);

    vec3 day = texture2D(uDay, vUv).rgb;
    day = pow(day, vec3(0.90)) * 1.18;                       // 轻微提亮/加对比

    vec3 nightTex = texture2D(uNight, vUv).rgb;
    vec3 lights = pow(nightTex, vec3(1.30)) * vec3(1.0, 0.80, 0.55) * uNightBoost;
    vec3 night = lights + day * vec3(0.045, 0.065, 0.115);   // 夜面月光蓝轮廓

    vec3 col = mix(night, day, dayMix);

    // 海面太阳耀斑
    float waterMask = texture2D(uWater, vUv).r;
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 48.0) * waterMask * dayMix;
    col += vec3(1.0, 0.90, 0.72) * spec * 0.9;

    // 晨昏线暖橙余晖
    float term = pow(1.0 - abs(ndl), 14.0) * dayMix * (1.0 - dayMix) * 4.0;
    col += vec3(1.0, 0.42, 0.16) * term * 0.25;

    // 地表边缘大气散射(菲涅尔)
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float lit = clamp(ndl * 1.6 + 0.55, 0.0, 1.0);
    vec3 atmCol = mix(vec3(0.04, 0.09, 0.22), vec3(0.26, 0.52, 1.0), lit);
    col += atmCol * fres * (0.35 + 0.85 * lit);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function createGlobeMaterial({ day, night, water }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: day },
      uNight: { value: night },
      uWater: { value: water },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uNightBoost: { value: 1.6 },
    },
    vertexShader: GLOBE_VERT,
    fragmentShader: GLOBE_FRAG,
  })
}

// ————————————————————————— 外层大气辉光(随昼夜) —————————————————————————
const ATMO_FRAG = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float d = dot(N, V);                       // 背面: 由 -1(中心) -> 0(外缘)
    float rim = clamp(-d / 0.55, 0.0, 1.0);    // 0 外缘 -> 1 贴近地表轮廓
    float glow = pow(rim, 2.6);
    float sun = clamp(dot(N, uSunDir) * 1.5 + 0.45, 0.0, 1.0);
    vec3 col = mix(vec3(0.015, 0.04, 0.10), vec3(0.18, 0.46, 1.0), sun);
    gl_FragColor = vec4(col * glow * (0.30 + 0.95 * sun), glow);
  }
`

export function createAtmosphere(radius = 118) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: GLOBE_VERT,
    fragmentShader: ATMO_FRAG,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat)
  mesh.renderOrder = 5
  return { mesh, mat }
}

// ————————————————————————— 云层(随太阳光照) —————————————————————————
const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    float cov = texture2D(uMap, vUv).r;
    float ndl = dot(normalize(vNormalW), uSunDir);
    float light = clamp(ndl * 1.15 + 0.06, 0.0, 1.1);
    vec3 col = vec3(0.35, 0.44, 0.58) * 0.22 + vec3(1.0) * light;
    float alpha = cov * 0.62 * (0.22 + 0.78 * light);
    gl_FragColor = vec4(col, alpha);
  }
`

export function createClouds(texture, radius = 100.6) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: GLOBE_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 96), mat)
  mesh.renderOrder = 2
  return { mesh, mat }
}

// ————————————————————————— 程序化星空(闪烁) —————————————————————————
const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPR;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vColor = aColor;
    vTw = 0.70 + 0.30 * sin(uTime * (0.5 + aPhase * 0.35) + aPhase * 17.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(aSize * uPR, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.06, length(p));
    gl_FragColor = vec4(vColor * vTw, a * vTw);
  }
`

export function createStarfield({ count = 6500, radius = 2600, pixelRatio = 1 } = {}) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const phase = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const sinP = Math.sqrt(1 - u * u)
    const r = radius * (0.9 + Math.random() * 0.2)
    pos[i * 3] = r * sinP * Math.cos(theta)
    pos[i * 3 + 1] = r * u
    pos[i * 3 + 2] = r * sinP * Math.sin(theta)
    // 色温分布: 少量蓝巨星 / 大量白黄 / 少量暖橙
    const t = Math.random()
    let cr, cg, cb
    if (t < 0.10) { cr = 0.62; cg = 0.75; cb = 1.0 }
    else if (t < 0.55) { cr = 0.92; cg = 0.95; cb = 1.0 }
    else if (t < 0.88) { cr = 1.0; cg = 0.96; cb = 0.88 }
    else { cr = 1.0; cg = 0.80; cb = 0.60 }
    const mag = Math.pow(Math.random(), 2.4) // 幂律: 大部分暗星
    const b = 0.30 + 0.70 * mag
    col[i * 3] = cr * b
    col[i * 3 + 1] = cg * b
    col[i * 3 + 2] = cb * b
    size[i] = mag < 0.6 ? 0.8 + mag * 1.8 : 1.7 + mag * 2.6
    phase[i] = Math.random() * Math.PI * 2
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geom.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geom.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  geom.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: pixelRatio } },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geom, mat)
  points.frustumCulled = false
  return { points, mat }
}

// ————————————————————————— 涟漪冲击波(出生/死亡) —————————————————————————
export function makeRingTexture(size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const half = size / 2
  const grad = g.createRadialGradient(half, half, half * 0.62, half, half, half * 0.98)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.75, 'rgba(255,255,255,0.28)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

const RING_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aT0;
  uniform float uTime;
  uniform float uPR;
  varying float vA;
  varying vec3 vC;
  void main() {
    float t = clamp((uTime - aT0) / 1.8, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    vA = (1.0 - t) * (1.0 - t) * step(0.0001, t);
    vC = aColor;
    float s = mix(3.0, 30.0, e);
    gl_PointSize = s * uPR;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const RING_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  varying float vA;
  varying vec3 vC;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a;
    gl_FragColor = vec4(vC * a * vA, 1.0);
  }
`

export function createRings({ max = 260, pixelRatio = 1 } = {}) {
  const positions = new Float32Array(max * 3)
  for (let i = 0; i < max; i++) positions[i * 3 + 1] = -9999
  const colors = new Float32Array(max * 3)
  const t0 = new Float32Array(max).fill(-1000)
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geom.setAttribute('aT0', new THREE.BufferAttribute(t0, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPR: { value: pixelRatio },
      uMap: { value: makeRingTexture() },
    },
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geom, mat)
  points.frustumCulled = false
  points.renderOrder = 999
  return { points, geom, mat, t0, colors, positions }
}
