import { chromium } from '@playwright/test'
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto('http://localhost:5200/The-Global-Pulse/')
await page.waitForSelector('.app-root.ready', { timeout: 60000 })
await page.waitForTimeout(5000)

// 1. 点击地球(画面中心) -> 自转应停止; 再点击右侧星空 -> 恢复
await page.mouse.click(720, 420)
await page.waitForTimeout(800)
const auto1 = await page.evaluate(() => document.querySelector('.globe-container') && true)
// 通过缩放行为间接验证: 这里直接检查图层开关
const chips = await page.locator('.layer-chip').count()

// 2. 开启航线
await page.locator('.layer-chip').first().click()
await page.waitForTimeout(2500)
const flightsOn = await page.locator('.layer-chip.on').count()

// 3. 开启网络威胁
await page.locator('.layer-chip').nth(1).click()
await page.waitForTimeout(2000)

const state = await page.evaluate(() => ({
  chips: document.querySelectorAll('.layer-chip').length,
  chipsOn: document.querySelectorAll('.layer-chip.on').length,
  legend: !!document.querySelector('.disaster-legend'),
}))
console.log(JSON.stringify({ errs, chips, flightsOn, state }))
await page.screenshot({ path: 'layers.tmp.png' })
await b.close()
