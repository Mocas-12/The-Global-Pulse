// globeScene.js — 地球场景: 初始化 / 视觉特效 / 开场动画 / 渲染循环 / 交互
// 独立模块便于代码分割: three 与 globe.gl 只进入按需加载的异步 chunk,
// 首屏只需加载 React 外壳 + 引擎, 地球代码后台并行下载。
import Globe from 'globe.gl'
import * as THREE from 'three'
import {
  sunLatLon, latLngToVec3, createGlobeMaterial, createAtmosphere,
  createClouds, createStarfield, createRings,
} from './globeFX'
import { worldEngine } from './worldEngine'

const BASE = import.meta.env.BASE_URL || '/'
const TEX = {
  day: `${BASE}img/earth-day-4k.webp`,
  night: `${BASE}img/earth-night.webp`,
  water: `${BASE}img/earth-water-4k.webp`,
  clouds: `${BASE}img/clouds.webp`,
}

const GLOBE_R = 100
const PULSE_R = 101.8 // 高于国家多边形表面(101)与云层(100.6), 避免遮挡

const loadTex = (url) => new THREE.TextureLoader().loadAsync(url).catch(() => null)

// 1x1 黑色占位: night/water 尚未就绪时给着色器一个安全的采样源
function blackPlaceholder() {
  const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
  tex.needsUpdate = true
  return tex
}

/**
 * 创建地球场景。白天贴图先到先渲染, 夜灯/水膜/云层就绪后渐入。
 * 返回 handle: { dispose, setSelected, setHover, setMobile }
 */
export async function createGlobeScene(container, opts = {}) {
  const {
    isMobile = false,
    reducedMotion = false,
    isAborted = () => false,
    onSelect,            // (iso|null) 用户点击国家/地球
    onIntroStart,        // 开场飞入开始(用于音频"接近音"时间窗)
    onReady,             // 场景就绪(隐藏 loading)
    onBooted,            // 面板入场
    onIntroDone,         // 开场结束(标题谢幕)
  } = opts

  let dead = false
  const timers = []
  const textures = []

  // 白天贴图先到先渲染
  const dayTex = await loadTex(TEX.day)
  if (dead || isAborted()) return null
  if (dayTex) textures.push(dayTex)

  const world = Globe({ animateIn: false })(container)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(false)
    .polygonsData(worldEngine.features)
    .polygonSideColor(() => 'rgba(120, 220, 255, 0.05)')
    .polygonsTransitionDuration(280)
    .polygonLabel(() => '')

  world.controls().enableDamping = true
  world.controls().dampingFactor = 0.08
  world.controls().enablePan = false
  world.controls().minDistance = 150
  world.controls().maxDistance = 800
  world.controls().autoRotate = false
  world.controls().autoRotateSpeed = 0.35
  const PR = Math.min(2, window.devicePixelRatio) // 手机高分屏同样用高像素比, 避免地球发糊/锯齿
  world.renderer().setPixelRatio(PR)
  world.width(window.innerWidth).height(window.innerHeight)
  const onResize = () => {
    world.width(window.innerWidth).height(window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  // 星空相机远平面需覆盖星空壳
  const cam = world.camera()
  cam.far = 8000
  cam.near = 10
  cam.updateProjectionMatrix()

  const maxAniso = world.renderer().capabilities.getMaxAnisotropy()
  if (dayTex) {
    dayTex.anisotropy = maxAniso
    dayTex.needsUpdate = true
  }

  // 地球: 实时昼夜光照(night/water 先用黑色占位, 就绪后渐入)
  const nightPh = blackPlaceholder()
  const waterPh = blackPlaceholder()
  textures.push(nightPh, waterPh)
  const globeMat = createGlobeMaterial({ day: dayTex, night: nightPh, water: waterPh })
  world.globeMaterial(globeMat)

  let nightReady = false
  let waterReady = false
  loadTex(TEX.night).then((t) => {
    if (dead || !t) return
    t.anisotropy = maxAniso
    t.needsUpdate = true
    globeMat.uniforms.uNight.value = t
    textures.push(t)
    nightReady = true
  })
  loadTex(TEX.water).then((t) => {
    if (dead || !t) return
    t.anisotropy = maxAniso
    t.needsUpdate = true
    globeMat.uniforms.uWater.value = t
    textures.push(t)
    waterReady = true
  })

  const scene = world.scene()

  // 外层大气辉光
  const atmo = createAtmosphere(GLOBE_R * 1.18)
  scene.add(atmo.mesh)

  // 云层(贴图就绪后创建并渐入)
  let clouds = null
  loadTex(TEX.clouds).then((t) => {
    if (dead || !t) return
    t.anisotropy = maxAniso
    t.needsUpdate = true
    clouds = createClouds(t, GLOBE_R * 1.006)
    textures.push(t)
    scene.add(clouds.mesh)
  })

  // 程序化星空
  const stars = createStarfield({ count: isMobile ? 3200 : 6500, radius: 2600, pixelRatio: PR })
  scene.add(stars.points)

  // ——— 脉冲: 闪光(加法混合) + 涟漪冲击波 ———
  const MAX = 260
  const positions = new Float32Array(MAX * 3)
  const colors = new Float32Array(MAX * 3)
  const life = new Float32Array(MAX)
  const baseColors = new Float32Array(MAX * 3)
  const flashGeom = new THREE.BufferGeometry()
  flashGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  flashGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const dotTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.7)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  })()
  textures.push(dotTex)
  const flashMat = new THREE.PointsMaterial({
    size: 8.5, map: dotTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true,
  })
  const flashPoints = new THREE.Points(flashGeom, flashMat)
  flashPoints.frustumCulled = false
  flashPoints.renderOrder = 999
  scene.add(flashPoints)

  const rings = createRings({ max: MAX, pixelRatio: PR })
  textures.push(rings.mat.uniforms.uMap.value)
  scene.add(rings.points)

  const setPulsePosition = (arr, i, lat, lng) => {
    const v = latLngToVec3(lat, lng, PULSE_R)
    arr[i * 3] = v.x
    arr[i * 3 + 1] = v.y
    arr[i * 3 + 2] = v.z
  }
  const BIRTH = new THREE.Color(0x2affb4)
  const DEATH = new THREE.Color(0xff5470)

  const spawn = ({ type, lat, lng }) => {
    const i = spawn.head % MAX
    spawn.head += 1
    setPulsePosition(positions, i, lat, lng)
    const col = type === 'birth' ? BIRTH : DEATH
    baseColors[i * 3] = col.r
    baseColors[i * 3 + 1] = col.g
    baseColors[i * 3 + 2] = col.b
    colors[i * 3] = col.r
    colors[i * 3 + 1] = col.g
    colors[i * 3 + 2] = col.b
    life[i] = 1
    // 涟漪
    const j = spawn.ringHead % MAX
    spawn.ringHead += 1
    setPulsePosition(rings.positions, j, lat, lng)
    rings.colors[j * 3] = col.r
    rings.colors[j * 3 + 1] = col.g
    rings.colors[j * 3 + 2] = col.b
    rings.t0[j] = performance.now() / 1000
    rings.geom.attributes.aT0.needsUpdate = true
    rings.geom.attributes.aColor.needsUpdate = true
    rings.geom.attributes.position.needsUpdate = true
  }
  spawn.head = 0
  spawn.ringHead = 0

  const unPulse = worldEngine.onPulse(spawn)

  // ——— 国家多边形着色: 人口对数 -> 淡填充, 让真实地表透出 ———
  let hoverIso = null
  let selectedIso = null
  let introDone = false

  const polygonCapColor = (f) => {
    const iso = f.__iso3
    if (iso === hoverIso) return 'rgba(140, 225, 255, 0.42)'
    if (iso === selectedIso) return 'rgba(190, 240, 255, 0.36)'
    const c = worldEngine.countries[iso]
    const pop = c?.population || 0
    const l = Math.log10(Math.max(pop, 1)) // 0 ~ 9.2
    const k = Math.min(1, Math.max(0, (l - 4.5) / 4.7))
    const stops = [
      [12, 34, 72],
      [16, 92, 140],
      [24, 200, 235],
    ]
    const seg = k < 0.5 ? 0 : 1
    const p = k < 0.5 ? k * 2 : (k - 0.5) * 2
    const a = stops[seg]
    const b = stops[seg + 1]
    const r = Math.round(a[0] + (b[0] - a[0]) * p)
    const g = Math.round(a[1] + (b[1] - a[1]) * p)
    const bl = Math.round(a[2] + (b[2] - a[2]) * p)
    const alpha = 0.10 + 0.26 * k
    return `rgba(${r},${g},${bl},${alpha})`
  }

  const polygonStrokeColor = (f) => {
    const iso = f.__iso3
    if (iso === hoverIso) return 'rgba(215, 245, 255, 0.95)'
    if (iso === selectedIso) return 'rgba(255, 255, 255, 0.85)'
    const c = worldEngine.countries[iso]
    const k = Math.min(1, Math.max(0, (Math.log10(Math.max(c?.population || 0, 1)) - 4.5) / 4.7))
    return `rgba(150, 225, 255, ${0.22 + 0.3 * k})`
  }

  const polygonAltitude = (f) => (
    (f.__iso3 === hoverIso || f.__iso3 === selectedIso) ? 0.035 : 0.01
  )

  // 强制重估多边形外观(悬停/选中变化时)
  const refreshPolygons = () => {
    world.polygonCapColor(polygonCapColor)
    world.polygonStrokeColor(polygonStrokeColor)
    world.polygonAltitude(polygonAltitude)
  }
  refreshPolygons()

  // ——— 交互 ———
  world.onPolygonClick((f) => {
    const iso = f.__iso3
    setSelected(iso === selectedIso ? null : iso)
    onSelect?.(selectedIso)
  })
  world.onGlobeClick(() => {
    setSelected(null)
    onSelect?.(null)
  })
  world.onPolygonHover((f) => {
    const iso = f?.__iso3 ?? null
    if (iso === hoverIso) return
    hoverIso = iso
    refreshPolygons()
  })

  function setSelected(iso) {
    if (iso === selectedIso) return
    selectedIso = iso
    refreshPolygons()
    world.controls().autoRotate = introDone && !selectedIso && !reducedMotion
    if (!iso) return
    const f = worldEngine.featureByIso.get(iso)
    if (!f) return
    const cur = world.pointOfView()
    world.pointOfView({
      lat: f.__labelLat,
      lng: f.__labelLng,
      altitude: Math.min(cur.altitude || 2.4, 1.75),
    }, reducedMotion ? 0 : 950)
  }

  function setHover(iso) {
    hoverIso = iso || null
    refreshPolygons()
  }

  function setMobile(mobile) {
    if (!introDone || selectedIso || reducedMotion) return
    const pov = world.pointOfView()
    world.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: mobile ? 3.4 : 2.35 }, 900)
  }

  // ——— 开场: 相机从深空飞入, 标题渐显 ———
  world.pointOfView({ lat: 8, lng: 40, altitude: 5.9 }, 0)
  onIntroStart?.()
  const arrive = { lat: 24, lng: 105, altitude: isMobile ? 3.4 : 2.35 }
  if (reducedMotion) {
    world.pointOfView(arrive, 0)
    onBooted?.()
    onIntroDone?.()
  } else {
    timers.push(setTimeout(() => {
      world.pointOfView(arrive, 3400)
    }, 80))
    timers.push(setTimeout(() => onBooted?.(), 1500))
    timers.push(setTimeout(() => {
      introDone = true
      world.controls().autoRotate = !selectedIso
      onIntroDone?.()
    }, 5000))
  }

  // ——— 主渲染循环: 实时太阳 / 云漂移 / 星闪烁 / 脉冲衰减 / 贴图渐入 ———
  let raf = 0
  let last = performance.now()
  const ramp = (u, target, dt) => {
    u.value += (target - u.value) * Math.min(1, dt * 2.0)
  }
  const loop = () => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const time = now / 1000

    // 太阳方向: 由真实 UTC 时间推算, 晨昏线与真实世界同步
    const { lat: slat, lng: slng } = sunLatLon()
    const sun = latLngToVec3(slat, slng, 1)
    globeMat.uniforms.uSunDir.value.copy(sun)
    atmo.mat.uniforms.uSunDir.value.copy(sun)
    // 渐进贴图渐入
    ramp(globeMat.uniforms.uNightBoost, nightReady ? 1.6 : 0, dt)
    ramp(globeMat.uniforms.uWaterK, waterReady ? 1 : 0, dt)
    if (clouds) {
      clouds.mat.uniforms.uSunDir.value.copy(sun)
      ramp(clouds.mat.uniforms.uFade, 1, dt)
      clouds.mesh.rotation.y += dt * 0.0045
    }
    stars.mat.uniforms.uTime.value = time
    rings.mat.uniforms.uTime.value = time

    // 闪光衰减
    let dirty = false
    for (let i = 0; i < MAX; i++) {
      if (life[i] > 0) {
        life[i] = Math.max(0, life[i] - dt * 0.95)
        const k = life[i] * life[i] * (3 - 2 * life[i]) // smoothstep 淡出
        colors[i * 3] = baseColors[i * 3] * k
        colors[i * 3 + 1] = baseColors[i * 3 + 1] * k
        colors[i * 3 + 2] = baseColors[i * 3 + 2] * k
        if (life[i] <= 0) positions[i * 3 + 1] = -9999
        dirty = true
      }
    }
    if (dirty) {
      flashGeom.attributes.position.needsUpdate = true
      flashGeom.attributes.color.needsUpdate = true
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  onReady?.()

  return {
    setSelected,
    setHover,
    setMobile,
    dispose() {
      dead = true
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', onResize)
      unPulse()
      cancelAnimationFrame(raf)
      scene.remove(atmo.mesh)
      atmo.mesh.geometry.dispose()
      atmo.mat.dispose()
      if (clouds) {
        scene.remove(clouds.mesh)
        clouds.mesh.geometry.dispose()
        clouds.mat.dispose()
      }
      scene.remove(stars.points)
      stars.points.geometry.dispose()
      stars.mat.dispose()
      scene.remove(flashPoints)
      flashGeom.dispose()
      flashMat.dispose()
      scene.remove(rings.points)
      rings.geom.dispose()
      rings.mat.dispose()
      for (const tex of textures) tex.dispose()
      world._destructor?.()
    },
  }
}
