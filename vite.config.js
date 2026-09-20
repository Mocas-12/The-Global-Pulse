import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/The-Global-Pulse/',
  plugins: [react()],
  test: {
    // 只收集单测(引擎 jsdom 环境均可跑), 避免误抓 e2e/*.spec.js (那归 Playwright)
    include: ['tests/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    globals: true,
  },
})
