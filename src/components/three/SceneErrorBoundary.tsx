"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Keeps a failing WebGL scene from taking the page down with it.
 *
 * Every 3D canvas is wrapped in this: if the context cannot be created or a
 * scene throws, the section keeps its text content and shows a short note
 * instead of unmounting the whole sticky stage.
 */
export default class SceneErrorBoundary extends Component<
  { children: ReactNode; label?: string; className?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // surfaced by DevDiagnostics in development
    window.dispatchEvent(
      new CustomEvent("rudra:scene-error", {
        detail: { message: error.message, stack: info.componentStack ?? "" },
      }),
    );
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center bg-ink ${this.props.className ?? ""}`}
      >
        <div className="max-w-sm px-6 text-center">
          <div className="tech mb-3 text-[9px] text-accent">
            {this.props.label ?? "3D scene"} unavailable
          </div>
          <p className="text-[12px] leading-relaxed text-steel">
            This browser could not start the 3D view. Everything on this page is
            still available as text below.
          </p>
          <p className="tech mt-4 text-[8px] text-steel/70">{this.state.error.message}</p>
        </div>
      </div>
    );
  }
}
