// errorBoundary.test.jsx — 全局兜底组件测试
import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import ErrorBoundary from '../src/ErrorBoundary'

afterEach(cleanup)

describe('ErrorBoundary 错误边界', () => {
  function Bomb() {
    throw new Error('boom')
  }

  it('子组件渲染异常时显示错误卡与重载按钮, 而非白屏', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(document.body.textContent).toContain('页面出错了')
    expect(document.body.textContent).toContain('boom')
    expect(document.querySelector('button')).toBeTruthy()
    errSpy.mockRestore()
  })

  it('正常子组件原样渲染', () => {
    render(<ErrorBoundary><div>fine</div></ErrorBoundary>)
    expect(document.body.textContent).toContain('fine')
  })
})
