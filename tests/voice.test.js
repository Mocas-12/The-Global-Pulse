// voice.test.js — 轮换诗内容完整性: 三语齐备且不重复
import { describe, it, expect } from 'vitest'
import { LINES } from '../src/voice'
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
})
