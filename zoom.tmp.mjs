import { chromium } from '@playwright/test'
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5200/The-Global-Pulse/?debug')
await page.waitForSelector('.app-root.ready', { timeout: 60000 })
await page.waitForTimeout(7000)
const far = await page.evaluate(() => document.body.textContent.includes('Chengdu'))
// 滚轮拉近(鼠标悬停地球中心)
await page.mouse.move(720, 430)
for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(120) }
await page.waitForTimeout(1200)
const near = await page.evaluate(() => ({
  chengdu: document.body.textContent.includes('Chengdu'),
  beijing: document.body.textContent.includes('Beijing'),
  shanghai: document.body.textContent.includes('Shanghai'),
  alt: window.__globeDebug ? 'n/a' : 'n/a',
}))
console.log(JSON.stringify({ far, near }))
await page.screenshot({ path: 'zoom.tmp.png' })
await b.close()
