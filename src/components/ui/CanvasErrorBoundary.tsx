'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; onError: () => void }
type State = { hasError: boolean }

/**
 * Catches a WebGL / Three.js crash inside the Canvas and silently swaps to
 * the typographic fallback instead of tearing down the whole page.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('[experience] 3D canvas failed, falling back to flat mode.', error)
    this.props.onError()
  }

  render() {
    return this.state.hasError ? null : this.props.children
  }
}
