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
  // 快讯唯一性: 相邻兄弟同 key 曾导致每秒累积一个实例(React 19 keyed 协调错乱)
  await page.waitForTimeout(4000)
  await expect(page.locator('.news-ticker')).toHaveCount(1)
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

test('手机: 时间轴与折叠面板分开，快讯不遮挡控件，键盘焦点可见', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${PATH}?pause`)
  await expect(page.locator('.app-root')).toHaveClass(/booted/, { timeout: 60_000 })
  const panel = page.locator('.stats-panel')
  const axis = page.locator('.time-axis')
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024]]) {
    await page.setViewportSize({ width, height })
    for (const expanded of [false, true]) {
      if (expanded) await page.locator('.panel-toggle').click()
      const panelBox = await panel.boundingBox()
      const axisBox = await axis.boundingBox()
      expect(axisBox.y + axisBox.height).toBeLessThan(panelBox.y)
      if (expanded) await page.locator('.panel-toggle').click()
    }
    const ticker = await page.locator('.news-ticker').boundingBox()
    const controls = await page.locator('.top-right').boundingBox()
    expect(ticker.x + ticker.width).toBeLessThan(controls.x)
  }
  await page.locator('.ta-play').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('.time-axis input')).toBeFocused()
  expect(await page.locator('.time-axis input').evaluate(el => {
    const style = getComputedStyle(el)
    return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
  })).toBe(true)
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

test('静默时刻: 空格冻结世界, 再按恢复流动', async ({ page }) => {
  await page.goto(PATH)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  const big = page.locator('.big-value')
  await expect(big).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.locator('.still-overlay.show')).toBeVisible()
  await page.waitForTimeout(600) // 让按压前最后一次数字补间落定
  const v1 = await big.textContent()
  await page.waitForTimeout(1200)
  expect(await big.textContent()).toBe(v1) // 冻结: 数字静止
  await page.keyboard.press('Space')
  await expect(page.locator('.still-overlay.show')).toHaveCount(0)
  await expect.poll(async () => big.textContent(), { timeout: 6000 }).not.toBe(v1) // 恢复: 世界继续
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

test('StrictMode: 仅挂载一个地球实例(仅 dev 项目)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'dev', '双挂载只发生在开发模式')
  await page.goto(PATH)
  await expect(page.locator('.app-root')).toHaveClass(/ready/, { timeout: 60_000 })
  await expect(page.locator('.globe-container canvas')).toHaveCount(1)
})
