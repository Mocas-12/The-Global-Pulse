// ErrorBoundary.jsx — 全局兜底: 3D 场景等初始化异常时不至于整页白屏
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[The Global Pulse]', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: '#01030a',
        color: '#e2e8f0',
        fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        textAlign: 'center',
        padding: 24,
      }}>
        <div style={{ fontSize: 15, letterSpacing: '0.3em', color: '#7dd3fc' }}>
          THE GLOBAL PULSE
        </div>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.85)' }}>
          页面出错了 / Something went wrong
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(226,232,240,0.45)',
          maxWidth: 480,
          wordBreak: 'break-word',
          lineHeight: 1.6,
        }}>
          {String(error?.message || error)}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'rgba(34, 211, 238, 0.12)',
            border: '1px solid rgba(34, 211, 238, 0.35)',
            borderRadius: 8,
            color: '#7dd3fc',
            fontFamily: 'inherit',
            fontSize: 12,
            letterSpacing: '0.15em',
            padding: '8px 22px',
            cursor: 'pointer',
          }}
        >
          重新加载 / Reload
        </button>
      </div>
    )
  }
}
