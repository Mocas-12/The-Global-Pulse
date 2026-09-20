// playwright.config.js — E2E 冒烟测试
// 两个项目: prod(构建产物 vite preview) 与 dev(开发服务器, 验证 StrictMode 双挂载)
import { defineConfig, devices } from '@playwright/test'

const BASE_PATH = '/The-Global-Pulse/'

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: `http://localhost:4173${BASE_PATH}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: `http://localhost:5173${BASE_PATH}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'prod',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173' },
    },
    {
      name: 'dev',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
    },
  ],
})
