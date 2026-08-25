// worldEngine.js — 基于真实数据(世界银行 2024)的全球人口实时推演引擎
// 数据来源: World Bank SP.POP.TOTL / SP.DYN.CBRT.IN / SP.DYN.CDRT.IN (2024)
import WB from '../data/worldBankData.json'

const SEC_PER_YEAR = 31557600 // 365.25 天
const MS_PER_DAY = 86400000

// Natural Earth 代码 -> 世界银行代码
const ISO3_ALIAS = { KOS: 'XKX' }

// 中文显示名覆盖(Natural Earth 的 NAME_ZH 为官方全称,过长)
const NAME_OVERRIDES = {
  CHN: { zh: '中国' },
  KOR: { zh: '韩国' },
  PRK: { zh: '朝鲜' },
}

// 已发布的权威年度估计(用于死亡原因与参考事实, 见 README 数据来源)
// WHO Global Health Estimates / UN IGME / UNAIDS / UNODC 等
export const DEATH_CAUSES = [
  { key: 'cardio', annual: 17900000, zh: '心血管疾病', en: 'Cardiovascular diseases', ja: '心血管疾患' },
  { key: 'cancer', annual: 9700000, zh: '癌症', en: 'Cancer', ja: 'がん' },
  { key: 'smoking', annual: 8700000, zh: '烟草相关疾病', en: 'Tobacco-related', ja: 'タバコ関連疾患' },
  { key: 'resp', annual: 4100000, zh: '慢性呼吸系统疾病', en: 'Chronic respiratory', ja: '慢性呼吸器疾患' },
  { key: 'under5', annual: 4900000, zh: '5岁以下儿童死亡', en: 'Children under 5', ja: '5歳未満児の死亡' },
  { key: 'alcohol', annual: 2600000, zh: '酒精相关疾病', en: 'Alcohol-related', ja: 'アルコール関連' },
  { key: 'road', annual: 1190000, zh: '道路交通事故', en: 'Road traffic accidents', ja: '道路交通事故' },
  { key: 'suicide', annual: 720000, zh: '自杀', en: 'Suicide', ja: '自殺' },
  { key: 'hiv', annual: 630000, zh: '艾滋病', en: 'HIV/AIDS', ja: 'エイズ' },
  { key: 'malaria', annual: 620000, zh: '疟疾', en: 'Malaria', ja: 'マラリア' },
  { key: 'maternal', annual: 260000, zh: '分娩期母亲死亡', en: 'Maternal deaths', ja: '妊産婦死亡' },
  { key: 'flu', annual: 400000, zh: '季节性流感', en: 'Seasonal influenza', ja: '季節性インフルエンザ' },
]

export const REFERENCE_FACTS = {
  cigarettesPerYear: 5700000000000, // ≈5.7万亿支/年(行业估计)
  illegalDrugsUSDPerYear: 500000000000, // ≈$5000亿/年(UNODC 估算)
}

function buildCountries() {
  const map = {}
  for (const [iso3, d] of Object.entries(WB)) {
    map[iso3] = {
      iso3,
      nameZh: null,
      nameEn: null,
      nameJa: null,
      population: d.population,
      birthRate: d.birthRate, // ‰/年
      deathRate: d.deathRate, // ‰/年
      dataYear: d.rateYear || d.populationYear,
      birthsPerSec: (d.population * (d.birthRate || 0) / 1000) / SEC_PER_YEAR,
      deathsPerSec: (d.population * (d.deathRate || 0) / 1000) / SEC_PER_YEAR,
    }
  }
  return map
}

function bboxOf(geometry) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90
  const walk = (arr) => {
    if (typeof arr[0] === 'number') {
      if (arr[0] < minX) minX = arr[0]
      if (arr[0] > maxX) maxX = arr[0]
      if (arr[1] < minY) minY = arr[1]
      if (arr[1] > maxY) maxY = arr[1]
      return
    }
    for (const a of arr) walk(a)
  }
  walk(geometry.coordinates)
  return [minX, minY, maxX, maxY]
}

function pointInRing(ring, x, y) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInGeometry(geometry, x, y) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const poly of polys) {
    if (!pointInRing(poly[0], x, y)) continue
    let inHole = false
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(poly[h], x, y)) { inHole = true; break }
    }
    if (!inHole) return true
  }
  return false
}

class WorldEngine {
  constructor() {
    this.countries = buildCountries()
    this.features = []
    this.featureByIso = new Map()
    this._timer = null
    this._listeners = new Set()
    this._pulseHandlers = new Set()
    this._lastNotify = 0
    this._accB = 0
    this._accD = 0
    this._lastBInt = 0
    this._lastDInt = 0
    this._lastT = 0
    this._cur = null
    const n = new Date()
    this.yearStart = new Date(n.getFullYear(), 0, 1).getTime()
    this.dayStart = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()
    this._recomputeWorld()
  }

  _recomputeWorld() {
    let pop = 0, bps = 0, dps = 0
    const list = []
    for (const c of Object.values(this.countries)) {
      pop += c.population
      bps += c.birthsPerSec
      dps += c.deathsPerSec
      list.push(c)
    }
    this.worldPopulation = pop
    this.birthsPerSec = bps
    this.deathsPerSec = dps
    this.netPerSec = bps - dps
    this.avgBirthRate = (bps * SEC_PER_YEAR / pop) * 1000
    this.avgDeathRate = (dps * SEC_PER_YEAR / pop) * 1000
    list.sort((a, b) => b.population - a.population)
    list.forEach((c, i) => { c.rank = i + 1 })
    this._isoList = list.map((c) => c.iso3)
    this._cumB = []
    this._cumD = []
    let ab = 0, ad = 0
    for (const c of list) {
      ab += c.birthsPerSec
      this._cumB.push(ab)
      ad += c.deathsPerSec
      this._cumD.push(ad)
    }
    this._totalB = ab
    this._totalD = ad
  }

  // 注入 GeoJSON 要素: 建 ISO3 映射 / 包围盒 / 标注点 / 中文名
  setFeatures(features) {
    this.features = features
    for (const f of features) {
      const p = f.properties || {}
      let iso3 = p.ISO_A3_EH && p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : p.ADM0_A3
      iso3 = ISO3_ALIAS[iso3] || iso3
      f.__iso3 = iso3
      f.__bbox = bboxOf(f.geometry)
      f.__labelLat = typeof p.LABEL_Y === 'number' ? p.LABEL_Y : (f.__bbox[1] + f.__bbox[3]) / 2
      f.__labelLng = typeof p.LABEL_X === 'number' ? p.LABEL_X : (f.__bbox[0] + f.__bbox[2]) / 2
      const ov = NAME_OVERRIDES[iso3]
      const zh = ov?.zh || p.NAME_ZH || p.NAME
      const en = p.NAME || p.ADMIN
      const ja = p.NAME_JA || p.NAME
      const c = this.countries[iso3]
      if (!c) {
        // 世界银行未覆盖的地区(如台湾地区/索马里兰等): 用 NE 人口估计 + 世界平均率
        const pop = p.POP_EST || 500000
        this.countries[iso3] = {
          iso3, nameZh: zh, nameEn: en, nameJa: ja,
          population: pop,
          birthRate: this.avgBirthRate, deathRate: this.avgDeathRate,
          dataYear: null,
          birthsPerSec: (pop / 1000) * this.avgBirthRate / SEC_PER_YEAR,
          deathsPerSec: (pop / 1000) * this.avgDeathRate / SEC_PER_YEAR,
        }
      } else {
        c.nameZh = zh
        c.nameEn = en
        c.nameJa = ja
      }
    }
    this._recomputeWorld()
    this.featureByIso = new Map(features.map((f) => [f.__iso3, f]))
  }

  countryName(iso3, lang = 'zh') {
    const c = this.countries[iso3]
    if (!c) return iso3
    if (lang === 'zh') return c.nameZh || c.nameEn || iso3
    if (lang === 'ja') return c.nameJa || c.nameEn || iso3
    return c.nameEn || c.nameZh || iso3
  }

  _pick(list, cum, total) {
    const r = Math.random() * total
    let lo = 0, hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < r) lo = mid + 1
      else hi = mid
    }
    return list[lo]
  }

  pickBirthCountry() { return this._pick(this._isoList, this._cumB, this._totalB) }
  pickDeathCountry() { return this._pick(this._isoList, this._cumD, this._totalD) }

  // 在某国真实国境内随机取点(包围盒拒绝采样)
  samplePoint(iso3) {
    const f = this.featureByIso.get(iso3)
    if (!f) return { lat: 0, lng: 0 }
    const [minX, minY, maxX, maxY] = f.__bbox
    for (let i = 0; i < 24; i++) {
      const x = minX + Math.random() * (maxX - minX)
      const y = minY + Math.random() * (maxY - minY)
      if (pointInGeometry(f.geometry, x, y)) return { lat: y, lng: x }
    }
    return { lat: f.__labelLat, lng: f.__labelLng }
  }

  snapshot() {
    if (!this._cur) this._tick()
    return this._cur
  }

  _tick() {
    const now = Date.now()
    if (now >= this.dayStart + MS_PER_DAY) {
      const n = new Date(now)
      this.dayStart = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()
    }
    const yearSec = Math.max(0, (now - this.yearStart) / 1000)
    const daySec = Math.max(0, (now - this.dayStart) / 1000)
    this._cur = {
      at: now,
      worldPopulation: Math.floor(this.worldPopulation + yearSec * this.netPerSec),
      birthsYear: Math.floor(yearSec * this.birthsPerSec),
      deathsYear: Math.floor(yearSec * this.deathsPerSec),
      birthsToday: Math.floor(daySec * this.birthsPerSec),
      deathsToday: Math.floor(daySec * this.deathsPerSec),
      birthsPerSec: this.birthsPerSec,
      deathsPerSec: this.deathsPerSec,
      netPerSec: this.netPerSec,
      yearSec,
      daySec,
    }
    return this._cur
  }

  countryDetail(iso3) {
    const c = this.countries[iso3]
    if (!c) return null
    const s = this._cur || this._tick()
    return {
      iso3,
      name: { zh: c.nameZh, en: c.nameEn, ja: c.nameJa },
      population: c.population,
      dataYear: c.dataYear,
      birthRate: c.birthRate,
      deathRate: c.deathRate,
      rank: c.rank,
      birthsToday: Math.floor(s.daySec * c.birthsPerSec),
      deathsToday: Math.floor(s.daySec * c.deathsPerSec),
      birthsYear: Math.floor(s.yearSec * c.birthsPerSec),
      deathsYear: Math.floor(s.yearSec * c.deathsPerSec),
      birthsPerSec: c.birthsPerSec,
      deathsPerSec: c.deathsPerSec,
      worldBirthShare: this._totalB ? c.birthsPerSec / this._totalB : 0,
      worldPopShare: this.worldPopulation ? c.population / this.worldPopulation : 0,
    }
  }

  topByBirths(n = 5) {
    const s = this._cur || this._tick()
    return Object.values(this.countries)
      .sort((a, b) => b.birthsPerSec - a.birthsPerSec)
      .slice(0, n)
      .map((c) => ({
        iso3: c.iso3,
        birthsToday: Math.floor(s.daySec * c.birthsPerSec),
        birthsPerSec: c.birthsPerSec,
      }))
  }

  topByPopulation(n = 24) {
    return Object.values(this.countries)
      .sort((a, b) => b.population - a.population)
      .slice(0, n)
      .map((c) => c.iso3)
  }

  subscribe(fn) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  onPulse(fn) {
    this._pulseHandlers.add(fn)
    return () => this._pulseHandlers.delete(fn)
  }

  start() {
    if (this._timer) return
    this._lastT = Date.now()
    this._accB = 0
    this._accD = 0
    this._lastBInt = 0
    this._lastDInt = 0
    this._tick()
    this._timer = setInterval(() => this._loop(), 100)
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
  }

  _loop() {
    const now = Date.now()
    const dt = Math.min(2, (now - this._lastT) / 1000)
    this._lastT = now
    this._accB += dt * this.birthsPerSec
    this._accD += dt * this.deathsPerSec
    const bInt = Math.floor(this._accB)
    const dInt = Math.floor(this._accD)
    const nB = Math.min(12, bInt - this._lastBInt)
    const nD = Math.min(12, dInt - this._lastDInt)
    if (nB > 0) this._lastBInt = bInt
    if (nD > 0) this._lastDInt = dInt
    for (let i = 0; i < nB; i++) {
      const iso3 = this.pickBirthCountry()
      const pt = this.samplePoint(iso3)
      this._emit({ type: 'birth', iso3, lat: pt.lat, lng: pt.lng })
    }
    for (let i = 0; i < nD; i++) {
      const iso3 = this.pickDeathCountry()
      const pt = this.samplePoint(iso3)
      this._emit({ type: 'death', iso3, lat: pt.lat, lng: pt.lng })
    }
    this._tick()
    if (now - this._lastNotify >= 250) {
      this._lastNotify = now
      for (const fn of this._listeners) {
        try { fn(this._cur) } catch { /* listener error ignored */ }
      }
    }
  }

  _emit(pulse) {
    for (const fn of this._pulseHandlers) {
      try { fn(pulse) } catch { /* listener error ignored */ }
    }
  }
}

export const worldEngine = new WorldEngine()
