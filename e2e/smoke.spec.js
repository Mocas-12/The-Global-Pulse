// smoke.spec.js — E2E 冒烟测试: 页面能加载、地球能渲染、没有未捕获异常
// prod 与 dev 两个项目都会跑; dev 额外验证 StrictMode 双挂载安全
import { test, expect } from '@playwright/test'

const PATH = '/The-Global-Pulse/'

test('冒烟: 地球就绪 + 面板入场 + 无未捕获异常', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(PATH)
  // ready: 地理数据 + 白天贴图 + 场景初始化全部完成
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await expect(page.locator('.globe-container canvas')).toBeVisible()
  // 静置 3 秒, 捕捉延迟暴露的渲染循环异常
  await page.waitForTimeout(3000)
  expect(errors, '未捕获的页面异常').toEqual([])
})

test('传感器风格: 数字键 1-4 切换, 徽章随模式显隐', async ({ page }) => {
  await page.goto(PATH)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await expect(page.locator('.sensor-badge')).toHaveCount(0)
  await page.keyboard.press('2')
  await expect(page.locator('.sensor-badge')).toHaveText('NVG')
  await page.keyboard.press('3')
  await expect(page.locator('.sensor-badge')).toHaveText('FLIR')
  await page.keyboard.press('4')
  await expect(page.locator('.sensor-badge')).toHaveText('NOIR')
  await page.keyboard.press('1')
  await expect(page.locator('.sensor-badge')).toHaveCount(0)
})

test('自转语义: 点地球停, 点星空恢复', async ({ page }) => {
  await page.goto(`${PATH}?debug`)
  await expect(page.locator('.app-root.ready')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(7000) // 等开场结束
  expect(await page.evaluate(() => window.__globeDebug().autoRotate)).toBe(true)
  await page.mouse.click(720, 430) // 点地球
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.__globeDebug().autoRotate)).toBe(false)
  await page.mouse.click(150, 120) // 点星空
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.__globeDebug().autoRotate)).toBe(true)
})

test('图层开关: 航线/威胁默认关闭, 点击开启', async ({ page }) => {
  await page.goto(PATH)
  await expect(page.locator('.app-root.ready')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.layer-chip')).toHaveCount(2)
  await expect(page.locator('.layer-chip.on')).toHaveCount(0)
  await page.locator('.layer-chip').first().click()
  await expect(page.locator('.layer-chip.on')).toHaveCount(1)
  await page.locator('.layer-chip').nth(1).click()
  await expect(page.locator('.layer-chip.on')).toHaveCount(2)
})

test('StrictMode: 仅挂载一个地球实例(仅 dev 项目)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'dev', '双挂载只发生在开发模式')
  await page.goto(PATH)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await expect(page.locator('.globe-container canvas')).toHaveCount(1)
})
