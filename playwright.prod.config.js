// playwright.prod.config.js — 线上拨测: 复用冒烟用例对生产站点跑, 不起本地服务器
// 用法: npx playwright test --config playwright.prod.config.js
import { defineConfig, devices } from '@playwright/test'

const LIVE_URL = 'https://mocas-12.github.io/The-Global-Pulse/'

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: process.env.CI ? 2 : 0, // 拨测走真实网络, 失败重试两次防误报
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: LIVE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'live', use: { ...devices['Desktop Chrome'], baseURL: LIVE_URL } },
  ],
})
