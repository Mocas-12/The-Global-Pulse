// voice.test.js — "声音"内容完整性: 诗句/静默语/里程碑三语齐备, 模板填充正确
import { describe, it, expect } from 'vitest'
import { LINES, PAUSE, MILESTONES, fill } from '../src/voice'
import { LANGS } from '../src/i18n'

describe('voice 内容', () => {
  it('三种语言各 8 句诗, 均非空且不重复', () => {
    for (const lang of LANGS) {
      expect(LINES[lang]).toHaveLength(8)
      for (const line of LINES[lang]) {
        expect(line.trim().length).toBeGreaterThan(4)
      }
      expect(new Set(LINES[lang]).size).toBe(8)
    }
  })

  it('三语首句与开场副标题一致(回声设计)', () => {
    expect(LINES.zh[0]).toBe('万物皆逝，万物皆始。')
    expect(LINES.en[0]).toBe('All things fade; all things begin.')
    expect(LINES.ja[0]).toBe('万物は逝き、万物は始まる。')
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
