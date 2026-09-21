// components.test.jsx — UI 组件层单测: 翻牌数字 / 快讯重挂载 / 面板折叠 / 错误边界 / 数据兜底
import { render, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { NewsTicker, RollingNumber, StatsPanel, CountryCard } from '../src/App'
import { scaleAnalogy } from '../src/humanize'
import ErrorBoundary from '../src/ErrorBoundary'
import { WorldEngine } from '../src/engine/worldEngine'

afterEach(cleanup)

describe('scaleAnalogy 会话规模换算', () => {
  const t = {
    classroom: '一间教室', school: '一所学校', cruise: '一艘大型邮轮',
    stadium: '一座体育场', cityMillion: '一座百万人口城市',
  }
  it('阶梯: 从小到大取第一个够到的档位, <30 返回 null', () => {
    expect(scaleAnalogy(10, t)).toBeNull()
    expect(scaleAnalogy(30, t)).toBe('一间教室')
    expect(scaleAnalogy(799, t)).toBe('一间教室')
    expect(scaleAnalogy(800, t)).toBe('一所学校')
    expect(scaleAnalogy(5000, t)).toBe('一艘大型邮轮')
    expect(scaleAnalogy(50000, t)).toBe('一座体育场')
    expect(scaleAnalogy(1e6, t)).toBe('一座百万人口城市')
  })
})

const SNAPSHOT = {
  at: Date.now(),
  worldPopulation: 8_100_000_000,
  birthsPerSec: 4.2,
  deathsPerSec: 1.9,
  netPerSec: 2.3,
  birthsToday: 10_000,
  deathsToday: 5_000,
  birthsYear: 100_000_000,
  deathsYear: 50_000_000,
  yearSec: 20_000_000,
  daySec: 50_000,
}

describe('RollingNumber 翻牌数字', () => {
  it('初始按 en-US 千分位渲染', () => {
    render(<RollingNumber value={1234567} />)
    expect(document.querySelector('span').textContent).toBe('1,234,567')
  })

  it('数值增长时补间收敛到新值', async () => {
    const { rerender } = render(<RollingNumber value={1000} />)
    rerender(<RollingNumber value={2000} />)
    await vi.waitFor(
      () => expect(document.querySelector('span').textContent).toBe('2,000'),
      { timeout: 1000 },
    )
  })

  it('instant 模式直接落位(reduced-motion 路径)', () => {
    const { rerender } = render(<RollingNumber value={1000} instant />)
    rerender(<RollingNumber value={3000} instant />)
    expect(document.querySelector('span').textContent).toBe('3,000')
  })
})

describe('NewsTicker 滚动快讯', () => {
  it('按传入语言生成快讯, key 重挂载后随语言重新生成', () => {
    const first = render(<NewsTicker key="en" lang="en" />)
    const enText = first.container.textContent
    expect(enText).toMatch(/newborn|lives lost/)
    first.unmount()

    const second = render(<NewsTicker key="ja" lang="ja" />)
    expect(second.container.textContent).not.toBe(enText)
    expect(second.container.textContent).toMatch(/新生児|人/)
    second.unmount()
  })
})

describe('StatsPanel 数据面板', () => {
  const noop = () => {}

  it('默认折叠(mobile), 点击箭头后展开', () => {
    render(<StatsPanel snap={SNAPSHOT} lang="zh" instant onHoverCountry={noop} onSelectCountry={noop} />)
    const panel = document.querySelector('.stats-panel')
    expect(panel).toBeTruthy()
    expect(panel.className).not.toContain('expanded')
    fireEvent.click(panel.querySelector('.panel-toggle'))
    expect(panel.className).toContain('expanded')
  })

  it('点击排行榜行触发选中国家回调', () => {
    const onSelectCountry = vi.fn()
    render(<StatsPanel snap={SNAPSHOT} lang="zh" instant onHoverCountry={noop} onSelectCountry={onSelectCountry} />)
    const rows = document.querySelectorAll('.top-row')
    expect(rows.length).toBe(5)
    fireEvent.click(rows[0])
    expect(onSelectCountry).toHaveBeenCalledTimes(1)
    expect(typeof onSelectCountry.mock.calls[0][0]).toBe('string')
  })

  it('悬停排行榜行触发高亮回调, 移出清空', () => {
    const onHoverCountry = vi.fn()
    render(<StatsPanel snap={SNAPSHOT} lang="zh" instant onHoverCountry={onHoverCountry} onSelectCountry={noop} />)
    const row = document.querySelector('.top-row')
    fireEvent.mouseEnter(row)
    expect(onHoverCountry).toHaveBeenLastCalledWith(expect.any(String))
    fireEvent.mouseLeave(row)
    expect(onHoverCountry).toHaveBeenLastCalledWith(null)
  })

  it('实况模式: 死因推演与趣闻行正常显示', () => {
    render(<StatsPanel snap={SNAPSHOT} lang="zh" instant onHoverCountry={noop} onSelectCountry={noop} />)
    expect(document.querySelector('.cause-list')).toBeTruthy()
    expect(document.querySelector('.fun-rows')).toBeTruthy()
    expect(document.querySelector('.live-label').textContent).toBe('推演 LIVE')
  })

  it('回放模式: 隐藏死因推演与趣闻行(现代估计不可回放), 保留出生排名', () => {
    render(<StatsPanel snap={SNAPSHOT} lang="zh" instant viewYear={1950} onHoverCountry={noop} onSelectCountry={noop} />)
    expect(document.querySelector('.cause-list')).toBeNull()
    expect(document.querySelector('.fun-rows')).toBeNull()
    expect(document.querySelector('.top-list')).toBeTruthy()
    expect(document.querySelector('.live-label').textContent).toBe('回放 1950')
  })
})

describe('CountryCard 国家详情卡', () => {
  const detail = {
    iso3: 'CHN',
    name: { zh: '中国', en: 'China', ja: null },
    population: 1_410_000_000,
    dataYear: 2024,
    birthRate: 6.4,
    deathRate: 7.6,
    rank: 2,
    birthsToday: 2470,
    deathsToday: 2930,
    birthsYear: 78_000_000,
    deathsYear: 92_000_000,
    birthsPerSec: 2.47,
    deathsPerSec: 2.93,
    worldBirthShare: 0.1,
    worldPopShare: 0.174,
  }

  it('渲染名称与指标, 关闭按钮触发回调', () => {
    const onClose = vi.fn()
    render(<CountryCard detail={detail} lang="zh" onClose={onClose} />)
    expect(document.querySelector('.card-name').textContent).toBe('中国')
    expect(document.querySelector('.card-foot').textContent).toContain('2024')
    fireEvent.click(document.querySelector('.card-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorBoundary 错误边界', () => {
  function Bomb() {
    throw new Error('boom')
  }

  it('子组件渲染异常时显示错误卡与重载按钮, 而非白屏', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(document.body.textContent).toContain('页面出错了')
    expect(document.body.textContent).toContain('boom')
    expect(document.querySelector('button')).toBeTruthy()
    errSpy.mockRestore()
  })

  it('正常子组件原样渲染', () => {
    render(<ErrorBoundary><div>fine</div></ErrorBoundary>)
    expect(document.body.textContent).toContain('fine')
  })
})

describe('数据兜底排除名单', () => {
  const square = (iso) => ({
    type: 'Feature',
    properties: { ISO_A3_EH: iso, NAME: iso, POP_EST: 1000 },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  })

  it('南极洲 ATA 不参与出生/死亡推演, 但多边形仍保留', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    const e = new WorldEngine()
    e.setFeatures([square('ATA'), square('TST')])
    expect(e.countries.ATA).toBeUndefined()
    expect(e.countries.TST).toBeTruthy()
    expect(e.featureByIso.get('ATA')).toBeTruthy()
    vi.useRealTimers()
  })
})
