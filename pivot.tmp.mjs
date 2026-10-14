import { chromium } from '@playwright/test'
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto('http://localhost:5200/The-Global-Pulse/')
await page.waitForSelector('.app-root.ready', { timeout: 60000 })
await page.waitForTimeout(9000)
const state = await page.evaluate(() => ({
  legend: !!document.querySelector('.disaster-legend'),
  iss: !!document.querySelector('.iss-chip'),
  oldPanel: !!document.querySelector('.stats-panel'),
  oldTicker: !!document.querySelector('.news-ticker'),
  oldTimeAxis: !!document.querySelector('.time-axis'),
}))
console.log(JSON.stringify({ errs, state }))
await page.screenshot({ path: 'pivot.tmp.png' })
await b.close()
