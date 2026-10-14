import { chromium } from '@playwright/test'
const b = await chromium.launch()
const page = await b.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)) })
await page.goto('http://localhost:5200/The-Global-Pulse/?debug', { timeout: 30000 })
await page.waitForTimeout(8000)
await b.close()
