// smoke.spec.js — E2E 冒烟测试: 页面能加载、地球能渲染、没有未捕获异常
// prod 与 dev 两个项目都会跑; dev 额外验证 StrictMode 双挂载安全
import { test, expect } from '@playwright/test'

const PATH = '/The-Global-Pulse/'

async function collectPageErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

test('冒烟: 地球就绪 + 面板入场 + 无未捕获异常', async ({ page }) => {
  const errors = await collectPageErrors(page)
  await page.goto(PATH)
  // ready: 地理数据 + 白天贴图 + 场景初始化全部完成
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await expect(page.locator('.globe-container canvas')).toBeVisible()
  await expect(page.locator('.big-value')).toBeVisible()
  // 静置 3 秒, 捕捉延迟暴露的渲染循环异常
  await page.waitForTimeout(3000)
  expect(errors, '未捕获的页面异常').toEqual([])
})

test('?pause: 推演冻结, 数字稳定可断言', async ({ page }) => {
  await page.goto(`${PATH}?pause`)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  const v1 = await page.locator('.big-value').textContent()
  await page.waitForTimeout(1500)
  const v2 = await page.locator('.big-value').textContent()
  expect(v1).toMatch(/^[\d,]+$/)
  expect(v2).toBe(v1)
})

test('移动端: 面板默认折叠且不遮挡地球', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(PATH)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  const panel = page.locator('.stats-panel')
  await expect(panel).toBeVisible()
  await expect(panel).not.toHaveClass(/expanded/)
  // 点箭头可展开
  await page.locator('.panel-toggle').click()
  await expect(panel).toHaveClass(/expanded/)
})

test('时间轴: 拨入回放世界人口随历史变化, 回到现在恢复', async ({ page }) => {
  await page.goto(PATH)
  const axis = page.locator('.time-axis')
  await expect(axis).toBeVisible({ timeout: 30_000 })
  await axis.locator('input[type=range]').fill('1950')
  await expect(page.locator('.ta-year')).toHaveText('1950')
  const v1950 = Number((await page.locator('.big-value').textContent()).replace(/,/g, ''))
  expect(v1950).toBeGreaterThan(2_000_000_000)
  expect(v1950).toBeLessThan(4_000_000_000)
  await axis.locator('.ta-now').click()
  await expect(page.locator('.ta-year')).toHaveText('LIVE')
  const vLive = Number((await page.locator('.big-value').textContent()).replace(/,/g, ''))
  expect(vLive).toBeGreaterThan(7_500_000_000)
})

test('分享链接: 选中国家写入 URL, 刷新后恢复', async ({ page }) => {
  await page.goto(PATH)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await page.locator('.top-row').first().click()
  await expect(page.locator('.country-card')).toBeVisible()
  await expect.poll(() => page.url()).toContain('country=')
  await page.reload()
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await expect(page.locator('.country-card')).toBeVisible({ timeout: 30_000 })
})

test('StrictMode: 仅挂载一个地球实例(仅 dev 项目)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'dev', '双挂载只发生在开发模式')
  await page.goto(PATH)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await expect(page.locator('.globe-container canvas')).toHaveCount(1)
})
