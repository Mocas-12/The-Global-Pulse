// news.js — 滚动快讯生成器(基于引擎的真实推演计数)
import { worldEngine, DEATH_CAUSES } from './engine/worldEngine'

let idCounter = 0

function weightedPick(items, weightFn) {
  const total = items.reduce((s, x) => s + weightFn(x), 0)
  let r = Math.random() * total
  for (const x of items) {
    r -= weightFn(x)
    if (r <= 0) return x
  }
  return items[items.length - 1]
}

export function makeNews(lang) {
  const e = worldEngine
  const s = e.snapshot()
  idCounter += 1
  // 出生快讯: 加权随机国家, 里程碑数字(仅在引擎已加载国家名称后)
  if (Math.random() < 0.45) {
    const iso3 = e.pickBirthCountry()
    const c = e.countries[iso3]
    if (c && (c.nameZh || c.nameEn)) {
      const name = e.countryName(iso3, lang)
      const milestone = Math.max(1000, Math.floor((s.daySec * c.birthsPerSec) / 1000) * 1000)
      const text =
        lang === 'en'
          ? `${name} welcomes its ~${milestone.toLocaleString('en-US')}th newborn today`
          : lang === 'ja'
            ? `${name}、今日${milestone.toLocaleString('ja-JP')}人目の新生児`
            : `${name} 迎来今日第 ${milestone.toLocaleString('zh-CN')}名新生儿`
      return { id: idCounter, kind: 'birth', text }
    }
  }
  // 死亡原因快讯: 全球年度推演计数
  const cause = weightedPick(DEATH_CAUSES, (c) => c.annual)
  const n = Math.floor((cause.annual / 31557600) * s.yearSec)
  const text =
    lang === 'en'
      ? `${cause.en}: ~${n.toLocaleString('en-US')} lives lost worldwide this year`
      : lang === 'ja'
        ? `世界今年、${cause.ja}により約${n.toLocaleString('ja-JP')}人`
        : `全球今年 ${cause.zh} 已带走约 ${n.toLocaleString('zh-CN')} 人`
  return { id: idCounter, kind: 'death', text }
}
