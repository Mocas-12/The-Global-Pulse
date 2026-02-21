const pad2 = (n) => String(n).padStart(2, '0')
const formatTimestamp = (d = new Date()) => {
  const yyyy = d.getFullYear()
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  const HH = pad2(d.getHours())
  const MM = pad2(d.getMinutes())
  const SS = pad2(d.getSeconds())
  return `[${yyyy}年${mm}月${dd}日] [${HH}:${MM}:${SS}]`
}
const CAUSE_WEIGHTS = {
  infectious: 0.185,
  childrenUnder5: 0.108,
  cancer: 0.116,
  malaria: 0.006,
  smoking: 0.071,
  alcohol: 0.035,
  suicide: 0.015,
  roadAccidents: 0.019,
  hivAids: 0.024,
  flu: 0.007,
  mothers: 0.004,
}
const REGIONS = [
  '东南亚地区',
  '欧洲西部',
  '北美中部',
  '撒哈拉以南非洲',
  '南美洲北部',
  '中东地区',
  '东亚地区',
  '南亚地区',
  '大洋洲',
  '中亚地区',
]
const CAUSE_TEXT = {
  infectious: '新增一例传染病死亡病例',
  childrenUnder5: '新增一例5岁以下儿童死亡病例',
  cancer: '癌症夺走了一个生命',
  malaria: '新增一例疟疾死亡病例',
  smoking: '新增一例吸烟诱发死亡',
  alcohol: '新增一例饮酒诱发死亡',
  suicide: '发生一起自杀事件',
  roadAccidents: '发生一起交通事故',
  hivAids: '新增一例艾滋病死亡病例',
  flu: '新增一例季节性流感死亡病例',
  mothers: '分娩期间新增一例母亲死亡',
}
const pickWeighted = (map) => {
  const entries = Object.entries(map)
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [key, w] of entries) {
    if (r <= w) return key
    r -= w
  }
  return entries[0][0]
}
const pickRegion = () => REGIONS[Math.floor(Math.random() * REGIONS.length)]
export const generateDeathNews = () => {
  const cause = pickWeighted(CAUSE_WEIGHTS)
  const region = pickRegion()
  const ts = new Date()
  const text = `[!] 实时快讯：${region}${CAUSE_TEXT[cause]}。`
  return {
    id: `${ts.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    ts,
    tsText: formatTimestamp(ts),
    cause,
    region,
    symbol: '[!]',
    color: '#ff4d4f',
    text,
  }
}
export const startNewsTicker = (onNews, opts = {}) => {
  const minMs = Math.max(500, Number(opts.minMs ?? 2500))
  const maxMs = Math.max(minMs + 500, Number(opts.maxMs ?? 5000))
  let stopped = false
  let timer = null
  const schedule = () => {
    const ms = Math.floor(minMs + Math.random() * (maxMs - minMs))
    timer = setTimeout(() => {
      if (stopped) return
      const item = generateDeathNews()
      if (typeof onNews === 'function') onNews(item)
      schedule()
    }, ms)
  }
  schedule()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
export const NEWS_PRESET = {
  CAUSE_WEIGHTS,
  REGIONS,
  CAUSE_TEXT,
}
