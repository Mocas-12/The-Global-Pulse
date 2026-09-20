// worldEngine.test.js — 引擎纯逻辑单测: 几何采样 / 加权选择 / 时间积分 / 数据兜底
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  WorldEngine, bboxOf, pointInRing, pointInGeometry,
} from '../src/engine/worldEngine'
import WB from '../src/data/worldBankData.json'

const square = (iso, extraProps = {}) => ({
  type: 'Feature',
  properties: { ISO_A3_EH: iso, NAME: `Land-${iso}`, POP_EST: 1000000, ...extraProps },
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
})

afterEach(() => {
  vi.useRealTimers()
})

describe('几何: pointInRing / pointInGeometry / bboxOf', () => {
  const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]

  it('pointInRing: 内部点命中, 外部点不命中, 边界外不命中', () => {
    expect(pointInRing(ring, 5, 5)).toBe(true)
    expect(pointInRing(ring, 15, 5)).toBe(false)
    expect(pointInRing(ring, -1, -1)).toBe(false)
  })

  it('pointInGeometry: 带洞多边形, 洞内不算命中', () => {
    const withHole = {
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
      ],
    }
    expect(pointInGeometry(withHole, 2, 2)).toBe(true)
    expect(pointInGeometry(withHole, 5, 5)).toBe(false)
  })

  it('pointInGeometry: MultiPolygon 任意成员命中即可', () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        [[[20, 20], [22, 20], [22, 22], [20, 22], [20, 20]]],
      ],
    }
    expect(pointInGeometry(multi, 21, 21)).toBe(true)
    expect(pointInGeometry(multi, 5, 5)).toBe(false)
  })

  it('bboxOf: MultiPolygon 取并集包围盒', () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        [[[20, -5], [22, -5], [22, -4], [20, -4], [20, -5]]],
      ],
    }
    expect(bboxOf(multi)).toEqual([0, -5, 22, 1])
  })
})

describe('WorldEngine: 基础数据', () => {
  it('世界人口 = 世界银行各国之和, 且出生速率公式正确', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    let pop = 0
    for (const c of Object.values(WB)) pop += c.population
    expect(e.worldPopulation).toBe(pop)
    const chn = WB.CHN
    const e2 = new WorldEngine()
    const expected = (chn.population * chn.birthRate) / 1000 / 31557600
    expect(e2.countries.CHN.birthsPerSec).toBeCloseTo(expected, 12)
  })

  it('countryName: 中文覆盖生效, 未知 iso 返回代码', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    e.setFeatures([square('CHN')])
    expect(e.countryName('CHN', 'zh')).toBe('中国')
    expect(e.countryName('CHN', 'en')).toBe('Land-CHN')
    expect(e.countryName('ZZZ', 'zh')).toBe('ZZZ')
  })

  it('setFeatures: 世界银行未覆盖地区用 POP_EST + 世界平均率兜底', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    e.setFeatures([square('TST')])
    const c = e.countries.TST
    expect(c).toBeTruthy()
    expect(c.population).toBe(1000000)
    expect(c.birthRate).toBeCloseTo(e.avgBirthRate, 10)
    expect(c.dataYear).toBeNull()
  })

  it('ISO3 别名: KOS 映射到世界银行代码 XKX', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    e.setFeatures([square('KOS')])
    expect(e.featureByIso.get('XKX')).toBeTruthy()
  })
})

describe('加权选择 _pick', () => {
  it('按累计权重比例采样(2:1), 大样本下比例收敛', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    e._isoList = ['A', 'B']
    e._cumB = [2, 3]
    e._totalB = 3
    const count = { A: 0, B: 0 }
    for (let i = 0; i < 30000; i++) count[e.pickBirthCountry()] += 1
    const ratio = count.A / count.B
    expect(ratio).toBeGreaterThan(1.7)
    expect(ratio).toBeLessThan(2.3)
  })
})

describe('时间积分 _tick', () => {
  it('今日/今年读数 = 速率 × 经过秒数', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    const s = e.snapshot()
    expect(s.birthsYear).toBe(Math.floor(s.yearSec * e.birthsPerSec))
    expect(s.birthsToday).toBe(Math.floor(s.daySec * e.birthsPerSec))
    expect(s.worldPopulation).toBe(Math.floor(e.worldPopulation + s.yearSec * e.netPerSec))
  })

  it('跨天: 日期翻转后 birthsToday 重新从小值累计', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 23, 59, 50))
    const e = new WorldEngine()
    expect(e.snapshot().daySec).toBeGreaterThan(86000)
    vi.setSystemTime(new Date(2026, 5, 16, 0, 0, 30))
    // snapshot() 返回缓存快照(应用中由 100ms 循环刷新), 测试中直接驱动 _tick
    const s = e._tick()
    expect(s.daySec).toBeLessThan(60)
    expect(s.birthsToday).toBe(Math.floor(s.daySec * e.birthsPerSec))
  })

  it('跨年: 日期翻转后 yearStart 重置', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 50))
    const e = new WorldEngine()
    expect(e.snapshot().yearSec).toBeGreaterThan(31530000) // 2026 为平年: 365 天
    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 40))
    const s = e._tick()
    expect(s.yearSec).toBeLessThan(120)
  })
})

describe('采样与详情', () => {
  it('samplePoint: 落点在国境内; 未知国家回退 (0,0)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    e.setFeatures([square('TST')])
    for (let i = 0; i < 20; i++) {
      const pt = e.samplePoint('TST')
      const f = e.featureByIso.get('TST')
      expect(pointInGeometry(f.geometry, pt.lng, pt.lat)).toBe(true)
    }
    expect(e.samplePoint('NOPE')).toEqual({ lat: 0, lng: 0 })
  })

  it('countryDetail: 未知国家返回 null, 已知国家含占比字段', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    expect(e.countryDetail('NOPE')).toBeNull()
    e.setFeatures([square('CHN')])
    const d = e.countryDetail('CHN')
    expect(d.iso3).toBe('CHN')
    expect(d.worldPopShare).toBeGreaterThan(0)
    expect(d.worldPopShare).toBeLessThan(1)
  })

  it('topByBirths: 返回按出生速率排序的前 N 名', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    const top = e.topByBirths(5)
    expect(top).toHaveLength(5)
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].birthsPerSec).toBeGreaterThanOrEqual(top[i].birthsPerSec)
    }
  })
})
