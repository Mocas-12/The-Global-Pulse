import { chromium } from '@playwright/test'
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
const reqs = new Map()
page.on('request', (r) => {
  const u = r.url()
  if (u.startsWith('data:') || /\.(png|jpg|svg|glb|css|woff2?)(\?|$)/.test(u)) return
  reqs.set(u, (reqs.get(u) || 0) + 1)
})
await page.goto('https://osirisai.live/?layers=earthquakes,global_incidents,day_night', { timeout: 60000 })
await page.waitForTimeout(20000)
const list = [...reqs.keys()].filter((u) => !u.includes('osirisai.live/assets') && !u.includes('google') && !u.includes('sentry'))
console.log(list.join('\n'))
await b.close()
