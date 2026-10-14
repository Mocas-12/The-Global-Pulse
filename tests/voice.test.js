// voice.test.js — "声音"内容完整性: 诗句/静默语/里程碑三语齐备, 模板填充正确
import { describe, it, expect } from 'vitest'
import { LINES, PAUSE, MILESTONES, fill } from '../src/voice'
import { LANGS } from '../src/i18n'

describe('voice 内容', () => {
  it('三种语言各 7 句诗, 均非空且不重复', () => {
    for (const lang of LANGS) {
      expect(LINES[lang]).toHaveLength(7)
      for (const line of LINES[lang]) {
        expect(line.trim().length).toBeGreaterThan(4)
      }
      expect(new Set(LINES[lang]).size).toBe(7)
    }
  })

  it('三语首句为时间意象句(万物皆逝已按要求移除)', () => {
    expect(LINES.zh[0]).toBe('没有人见过时间，人们只见过出生与告别。')
    expect(LINES.en[0]).toBe('No one has ever seen time — only arrivals and farewells.')
    expect(LINES.ja[0]).toBe('時間を見た人はいない。見えるのは誕生と別れだけ。')
    expect(JSON.stringify(LINES.zh).includes('万物皆逝')).toBe(false)
  })

  it('静默时刻三语齐备', () => {
    for (const lang of LANGS) {
      expect(PAUSE[lang].line.length).toBeGreaterThan(8)
      expect(PAUSE[lang].sub.length).toBeGreaterThan(4)
    }
  })

  it('里程碑: 阈值 60/300/900 秒, 三语模板含 {b} 与 {d}', () => {
    expect(MILESTONES.map((m) => m.at)).toEqual([60, 300, 900])
    for (const m of MILESTONES) {
      for (const lang of LANGS) {
        expect(m.text[lang]).toContain('{b}')
        expect(m.text[lang]).toContain('{d}')
      }
    }
  })

  it('fill 模板填充', () => {
    expect(fill('出生 {b} 告别 {d}', 252, 114)).toBe('出生 252 告别 114')
    expect(fill('{b}/{d}/{b}', 1, 2)).toBe('1/2/1')
  })
})
