"use client";

import { Component, type ReactNode } from "react";

type Props = {
  fallback: ReactNode;
  children: ReactNode;
  label?: string;
};

type State = { error: Error | null };

/**
 * Safely wraps a WebGL/R3F scene. If context creation or the scene throws
 * (blocked WebGL, iframe restrictions, GPU driver issues), we render the
 * premium static fallback instead of crashing the whole application.
 */
export class SceneBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(`[scene:${this.props.label ?? "unknown"}]`, error);
    try {
      fetch("/api/client-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "scene-boundary",
          label: this.props.label ?? "unknown",
          message: String(error?.message ?? error),
          stack: String(error?.stack ?? "").slice(0, 2000),
          ua: navigator.userAgent,
          webgl: (() => {
            try {
              const c = document.createElement("canvas");
              return !!(c.getContext("webgl2") || c.getContext("webgl"));
            } catch {
              return false;
            }
          })(),
        }),
      }).catch(() => {});
    } catch {
      /* telemetry must never break the UI */
    }
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}
