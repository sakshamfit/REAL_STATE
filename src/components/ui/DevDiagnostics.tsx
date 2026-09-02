"use client";

import { useEffect, useState } from "react";

/**
 * Crash overlay.
 *
 * Silent while everything works. If an uncaught error, an unhandled rejection
 * or a 3D scene failure occurs it pins the message to the bottom of the
 * viewport, so a broken preview is readable instead of looking like a blank
 * page. In development it also reports the WebGL renderer once, which makes
 * "is 3D even available here?" answerable at a glance.
 */
export default function DevDiagnostics() {
  const [entries, setEntries] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {

    const push = (line: string) =>
      setEntries((prev) => [...prev.slice(-7), `${new Date().toLocaleTimeString()}  ${line}`]);

    const onError = (e: ErrorEvent) => push(`error: ${e.message}`);
    const onRejection = (e: PromiseRejectionEvent) =>
      push(`promise: ${String(e.reason?.message ?? e.reason)}`);
    const onScene = (e: Event) =>
      push(`scene: ${(e as CustomEvent<{ message: string }>).detail.message}`);
    const onContextLost = () => push("webgl: context lost");

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("rudra:scene-error", onScene as EventListener);
    window.addEventListener("webglcontextlost", onContextLost, true);

    // report WebGL capability once — but only in development, so a healthy
    // production page never shows this panel at all
    if (isDev) {
      try {
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl2") ?? c.getContext("webgl");
        if (!gl) push("webgl: no context available in this browser");
        else {
          const debug = gl.getExtension("WEBGL_debug_renderer_info");
          const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "unknown";
          push(`webgl: ok (${renderer.slice(0, 60)})`);
        }
      } catch (err) {
        push(`webgl: probe threw ${String(err)}`);
      }
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("rudra:scene-error", onScene as EventListener);
      window.removeEventListener("webglcontextlost", onContextLost, true);
    };
  }, [isDev]);

  if (entries.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 z-[120] max-h-[38vh] w-full overflow-auto border-t border-accent/50 bg-black/92 px-4 py-2 font-mono text-[11px] leading-relaxed text-chalk backdrop-blur">
      <div className="mb-1 flex items-center justify-between">
        <span className="tech text-[9px] text-accent">
          {isDev ? "Dev diagnostics" : "Page error"}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tech text-[9px] text-steel hover:text-chalk"
        >
          {open ? "hide" : "show"}
        </button>
      </div>
      {open &&
        entries.map((e, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            {e}
          </div>
        ))}
    </div>
  );
}
