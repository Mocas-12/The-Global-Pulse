// globeScene.js — 地球场景: 初始化 / 视觉特效 / 开场动画 / 渲染循环 / 交互
// 独立模块便于代码分割: three 与 globe.gl 只进入按需加载的异步 chunk,
// 首屏只需加载 React 外壳 + 引擎, 地球代码后台并行下载。
import Globe from 'globe.gl'
import * as THREE from 'three'
import {
  sunLatLon, latLngToVec3, createGlobeMaterial, createAtmosphere,
  createClouds, createStarfield, createRings,
} from './globeFX'

const BASE = import.meta.env.BASE_URL || '/'
const TEX = {
  day: `${BASE}img/earth-day-4k.webp`,
  night: `${BASE}img/earth-night.webp`,
  water: `${BASE}img/earth-water-4k.webp`,
  clouds: `${BASE}img/clouds.webp`,
}

const GLOBE_R = 100
const PULSE_R = 101.8 // 高于国家多边形表面(101)与云层(100.6), 避免遮挡

// 实时事件点配色(iOS 系统色): 地震/火山/风暴/野火/洪水
const EVENT_COLORS = {
  quake: '#ff453a',
  volcano: '#bf5af2',
  storm: '#64d2ff',
  wildfire: '#ff9f0a',
  flood: '#0a84ff',
}

const loadTex = (url) => new THREE.TextureLoader().loadAsync(url).catch(() => null)

// 1x1 黑色占位: night/water 尚未就绪时给着色器一个安全的采样源
function blackPlaceholder() {
  const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
  tex.needsUpdate = true
  return tex
}

/**
 * 创建地球场景。白天贴图先到先渲染, 夜灯/水膜/云层就绪后渐入。
 * 返回 handle: { dispose, setStyle, setMobile }
 */
export async function createGlobeScene(container, opts = {}) {
  const {
    isMobile = false,
    reducedMotion = false,
    home = { lat: 24, lng: 105 },
    isAborted = () => false,
    features = [],       // Natural Earth 国界要素(App 负责加载)
    debug = false,       // ?debug: 暴露 window.__globeDebug 供 E2E 断言
    onDisasters,         // () 自然灾害数据就绪(EONET)
    onIss,               // ({alt, vel}|null) ISS 实时遥测(加载成功后每秒)
    onIntroStart,        // 开场飞入开始(用于音频"接近音"时间窗)
    onReady,             // 场景就绪(隐藏 loading)
    onBooted,            // 面板入场
    onIntroDone,         // 开场结束(标题谢幕)
  } = opts

  let dead = false
  let introDone = false
  const timers = []
  const intervals = []
  const textures = []

  // 白天贴图先到先渲染
  const dayTex = await loadTex(TEX.day)
  if (dead || isAborted()) return null
  if (dayTex) textures.push(dayTex)

  const world = Globe({ animateIn: false })(container)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(false)
    .polygonsData(features)
    .polygonSideColor(() => 'rgba(160, 175, 210, 0.06)')
    .polygonsTransitionDuration(280)
    .polygonLabel(() => '')
    // 实时事件点(免密钥): 地震(USGS) + 火山/风暴/野火/洪水(NASA EONET)
    .pointsData([])
    .pointColor((d) => EVENT_COLORS[d.kind] || '#ff9f0a')
    .pointAltitude(0.012)
    .pointRadius((d) => (d.kind === 'quake'
      ? 0.22 + Math.max(0, d.mag - 2.5) * 0.08
      : d.kind === 'volcano' ? 0.26 : d.kind === 'wildfire' ? 0.12 : 0.2))

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
  const QUAKE = new THREE.Color(0xff453a)
  const VOLCANO = new THREE.Color(0xbf5af2)
  const STORM = new THREE.Color(0x64d2ff)

  const spawn = ({ type, lat, lng }) => {
    const i = spawn.head % MAX
    spawn.head += 1
    setPulsePosition(positions, i, lat, lng)
    const col = ({ quake: QUAKE, volcano: VOLCANO, storm: STORM })[type] || STORM
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

  // ——— 实时事件层: USGS 地震 + NASA EONET 自然灾害(均为免密钥) ———
  let quakePts = []
  let disasterPts = []
  let quakeIds = null
  let disasterIds = null
  const renderEvents = () => {
    if (!dead) world.pointsData([...disasterPts, ...quakePts])
  }
  const refreshQuakes = async () => {
    try {
      const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson')
      if (!r.ok) return
      const data = await r.json()
      const quakes = (data.features || [])
        .filter((f) => f.properties.mag != null && f.geometry?.coordinates)
        .map((f) => ({
          id: f.id,
          kind: 'quake',
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          mag: f.properties.mag,
        }))
      if (quakeIds && !dead) {
        for (const q of quakes) {
          if (!quakeIds.has(q.id) && q.mag >= 4.5) spawn({ type: 'quake', lat: q.lat, lng: q.lng })
        }
      }
      quakeIds = new Set(quakes.map((q) => q.id))
      quakePts = quakes
      renderEvents()
    } catch { /* 网络不可用静默降级 */ }
  }
  const refreshDisasters = async () => {
    try {
      const r = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?days=30&status=open')
      if (!r.ok) return
      const data = await r.json()
      const byKind = { Volcanoes: 'volcano', 'Severe Storms': 'storm', Wildfires: 'wildfire', Floods: 'flood' }
      const pts = []
      for (const e of data.events || []) {
        const kind = byKind[e.categories?.[0]?.title]
        const g = e.geometry?.[e.geometry.length - 1]
        if (!kind || !g?.coordinates) continue
        let lng, lat
        if (g.type === 'Point') [lng, lat] = g.coordinates
        else [lng, lat] = g.coordinates[0]?.[0] || []
        if (typeof lat !== 'number') continue
        pts.push({ id: e.id, kind, lat, lng, mag: 0 })
      }
      if (disasterIds && !dead) {
        for (const d0 of pts) {
          if (!disasterIds.has(d0.id) && (d0.kind === 'volcano' || d0.kind === 'storm')) {
            spawn({ type: d0.kind, lat: d0.lat, lng: d0.lng })
          }
        }
      }
      // 野火在 EONET 中占绝对多数, 限流最近 12 处避免淹没其他灾害
      const wildfires = pts.filter((d0) => d0.kind === 'wildfire').slice(0, 12)
      disasterIds = new Set(pts.map((d0) => d0.id))
      disasterPts = [...pts.filter((d0) => d0.kind !== 'wildfire'), ...wildfires]
      renderEvents()
      onDisasters?.()
    } catch { /* 网络不可用静默降级 */ }
  }
  refreshQuakes()
  refreshDisasters()
  intervals.push(setInterval(refreshQuakes, 2 * 60 * 1000))
  intervals.push(setInterval(refreshDisasters, 10 * 60 * 1000))

  // ——— ISS 实时轨道(CelesTrak TLE + satellite.js, 免密钥): 位置每秒解算 ———
  ;(async () => {
    try {
      const sat = await import('satellite.js')
      const r = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE')
      if (!r.ok || dead) return
      const lines = (await r.text()).split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length < 3 || dead) return
      const satrec = sat.twoline2satrec(lines[1], lines[2])

      // 拖尾弧线: 只画 ISS 身后 18 分钟的轨迹(彗尾), 不画全轨道圈
      const issObj = { lat: 0, lng: 0, alt: 0 }
      world
        .objectsData([issObj])
        .objectLat((d) => d.lat)
        .objectLng((d) => d.lng)
        .objectAltitude((d) => d.alt)
        .objectThreeObject(new THREE.Mesh(
          new THREE.SphereGeometry(1.1, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff }),
        ))
      const tick = () => {
        if (dead) return
        const nowMs = Date.now()
        const trail = []
        for (let m = -18 * 60; m <= 0; m += 4) {
          const d = new Date(nowMs + m * 1000)
          const pv = sat.propagate(satrec, d)
          if (!pv?.position) continue
          const gd = sat.eciToGeodetic(pv.position, sat.gstime(d))
          trail.push([gd.latitude * 180 / Math.PI, gd.longitude * 180 / Math.PI, gd.height * 0.066])
        }
        if (trail.length > 1) {
          world.pathsData([{ points: trail }])
            .pathPoints((d) => d.points)
            .pathPointLat((p) => p[0])
            .pathPointLng((p) => p[1])
            .pathPointAlt((p) => p[2])
            .pathColor(() => 'rgba(255,255,255,0.35)')
            .pathStroke(1)
        }
        const d = new Date(nowMs)
        const pv = sat.propagate(satrec, d)
        if (!pv?.position) return
        const gd = sat.eciToGeodetic(pv.position, sat.gstime(d))
        issObj.lat = gd.latitude * 180 / Math.PI
        issObj.lng = gd.longitude * 180 / Math.PI
        issObj.alt = gd.height * 0.066
        world.objectsData([issObj])
        const v = pv.velocity
        onIss?.({ alt: Math.round(gd.height), vel: Math.hypot(v.x, v.y, v.z).toFixed(2) })
      }
      tick()
      intervals.push(setInterval(tick, 1000))
    } catch { /* TLE 拉取失败静默降级 */ }
  })()

  // ——— 国家多边形: 纯地理参照, 中性石墨蓝淡填充 ———
  world.polygonCapColor(() => 'rgba(96, 108, 138, 0.16)')
  world.polygonStrokeColor(() => 'rgba(170, 190, 220, 0.26)')
  world.polygonAltitude(0.01)

  function setStyle(n) {
    globeMat.uniforms.uStyle.value = n
  }

  function setMobile(mobile) {
    if (!introDone || reducedMotion) return
    const pov = world.pointOfView()
    world.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: mobile ? 3.4 : 2.35 }, 900)
  }

  // ——— 点击语义: 点地球停自转, 点地球以外(星空)恢复自转 ———
  // (globe.gl 此构建的 onGlobeClick 射线不触发, 改用 toGlobeCoords 自行命中检测)
  let downX = 0
  let downY = 0
  const onDown = (e) => {
    downX = e.clientX
    downY = e.clientY
  }
  const onClick = (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return // 拖拽不算点击
    const hit = world.toGlobeCoords(e.clientX, e.clientY)
    world.controls().autoRotate = hit ? false : introDone && !reducedMotion
  }
  container.addEventListener('pointerdown', onDown)
  container.addEventListener('click', onClick)

  // ——— 开场: 相机从深空飞入, 标题渐显 ———
  world.pointOfView({ lat: 8, lng: 40, altitude: 5.9 }, 0)
  onIntroStart?.()
  const arrive = { lat: home.lat, lng: home.lng, altitude: isMobile ? 3.4 : 2.35 }
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
      world.controls().autoRotate = true
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

    // 航班航位推算: 快照位置按航向/地速逐帧外推(快照每小时刷新)
    if (flightDots.on && flightDots.geo && flightDots.items.length) {
      const tSec = (Date.now() - flightDots.fetchedAt) / 1000
      const arr = flightDots.geo.attributes.position.array
      const n = Math.min(flightDots.items.length, arr.length / 3)
      for (let i = 0; i < n; i++) {
        const f = flightDots.items[i]
        const kmN = Math.cos((f.track * Math.PI) / 180) * (f.gs * 3.6) * (tSec / 3600)
        const kmE = Math.sin((f.track * Math.PI) / 180) * (f.gs * 3.6) * (tSec / 3600)
        const lat = f.lat + kmN / 111.32
        const lng = f.lng + kmE / (111.32 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)))
        placeAt(arr, i, lat, lng, f.alt)
      }
      flightDots.geo.attributes.position.needsUpdate = true
    }

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

  // ——— 缩放地名标签: 中距离国名, 近距离城市名 ———
  let labelsTimer = 0
  let cityLabels = []
  fetch(`${BASE}datasets/places.json`)
    .then((r) => (r.ok ? r.json() : []))
    .then((rows) => { if (!dead && Array.isArray(rows)) { cityLabels = rows; queueLabels() } })
    .catch(() => {})
  const refreshLabels = () => {
    if (dead) return
    const alt = world.pointOfView().altitude || 3
    let items = []
    if (alt < 1.9) {
      // 国名: 取要素自带 NAME 与标注点
      items = features
        .filter((f) => f.properties?.NAME && f.properties?.LABEL_X != null)
        .map((f) => ({
          lat: f.properties.LABEL_Y ?? (f.__bbox ? (f.__bbox[1] + f.__bbox[3]) / 2 : 0),
          lng: f.properties.LABEL_X,
          name: f.properties.NAME,
          size: 0.32,
        }))
    }
    if (alt < 0.85 && !dead) {
      // 城市名: 人口前 400 城
      items = items.concat(cityLabels.slice(0, 400).map((c) => ({
        lat: c.lat, lng: c.lng, name: c.name, size: 0.24,
      })))
    }
    world.labelsData(items)
  }
  const queueLabels = () => {
    clearTimeout(labelsTimer)
    labelsTimer = setTimeout(refreshLabels, 250)
  }
  world.labelsData([])
    .labelText((d) => d.name)
    .labelLat((d) => d.lat)
    .labelLng((d) => d.lng)
    .labelSize((d) => d.size)
    .labelDotOrientation(() => 'bottom')
    .labelColor(() => 'rgba(235, 235, 245, 0.55)')
    .labelResolution(2)
  world.onZoom(queueLabels)

  // ——— 航线(OpenSky 快照 + 航位推算)与网络威胁(FeodoTracker/OpenPhish) ———
  // 均默认关闭, 由 handle.toggleFlights/toggleThreats 开启
  const R_GLOBE = 100
  const flightDots = { points: null, geo: null, items: [], fetchedAt: 0, on: false }
  const threatDots = { points: null, geo: null, on: false }

  const buildPoints = (color, size) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3))
    const mat = new THREE.PointsMaterial({ color, size: size * PR, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false })
    const points = new THREE.Points(geo, mat)
    points.visible = false
    points.frustumCulled = false
    return { points, geo }
  }

  const placeAt = (arr, i, lat, lng, alt) => {
    const v = latLngToVec3(lat, lng, R_GLOBE * (1 + (alt || 0) * 0.001 + 0.004))
    arr[i * 3] = v.x
    arr[i * 3 + 1] = v.y
    arr[i * 3 + 2] = v.z
  }

  const toggleFlights = (on) => {
    flightDots.on = on
    if (on && !flightDots.geo) {
      fetch(`${BASE}datasets/flights.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (dead || !data || !flightDots.on) return
          flightDots.items = data.flights || []
          flightDots.fetchedAt = data.fetchedAt || Date.now()
          const n = flightDots.items.length
          if (!flightDots.geo && n) {
            const built = buildPoints(0x5e5ce6, 2.0)
            flightDots.points = built.points
            flightDots.geo = built.geo
            const arr = new Float32Array(n * 3)
            flightDots.items.forEach((f, i) => {
              // alt_baro 英尺 -> 地球半径单位(35000ft ≈ +0.167R)
              const altUnits = Math.max(0, f.alt || 0) * 0.3048 / 6371
              placeAt(arr, i, f.lat, f.lng, altUnits * 1000)
            })
            built.geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
            built.geo.setDrawRange(0, n)
            scene.add(flightDots.points)
            flightDots.points.visible = flightDots.on
          }
        })
        .catch(() => {})
    }
    if (flightDots.points) flightDots.points.visible = on
  }

  const toggleThreats = (on) => {
    threatDots.on = on
    if (on && !threatDots.geo) {
      fetch(`${BASE}datasets/threats.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (dead || !data || !threatDots.on) return
          const items = data.points || []
          const built = buildPoints(0xff375f, 3.2)
          threatDots.points = built.points
          threatDots.geo = built.geo
          const arr = built.geo.attributes.position.array
          items.forEach((d, i) => placeAt(arr, i, d.lat, d.lng, 0))
          built.geo.setDrawRange(0, items.length)
          built.geo.attributes.position.needsUpdate = true
          scene.add(threatDots.points)
          threatDots.points.visible = true
        })
        .catch(() => {})
    }
    if (threatDots.points) threatDots.points.visible = on
  }

  onReady?.()

  // 测试钩子: ?debug 暴露只读状态(E2E 断言自转语义)
  if (debug) {
    window.__globeDebug = () => ({ autoRotate: world.controls().autoRotate, introDone })
  }

  return {
    setMobile,
    setStyle,
    toggleFlights,
    toggleThreats,
    dispose() {
      dead = true
      timers.forEach(clearTimeout)
      intervals.forEach(clearInterval)
      window.removeEventListener('resize', onResize)
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
      clearTimeout(labelsTimer)
      container.removeEventListener('pointerdown', onDown)
      container.removeEventListener('click', onClick)
      if (flightDots.points) scene.remove(flightDots.points)
      if (threatDots.points) scene.remove(threatDots.points)
      flightDots.geo?.dispose()
      threatDots.geo?.dispose()
      for (const tex of textures) tex.dispose()
      world._destructor?.()
    },
  }
}
