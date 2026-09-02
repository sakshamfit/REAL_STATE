"use client";

import { useEffect, useState } from "react";

/**
 * Boot overlay: holds a black plate over the page while the first WebGL scene
 * spins up, then lifts. Pure CSS/SVG mark — no font or image request.
 */
export default function BootOverlay() {
  const [state, setState] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = window.setTimeout(() => setState("out"), 900);
    const t2 = window.setTimeout(() => setState("gone"), 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-ink transition-opacity duration-700"
      style={{ opacity: state === "out" ? 0 : 1, pointerEvents: state === "out" ? "none" : "auto" }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-6">
        <path d="M8 64V8h26c11 0 18 6.5 18 16s-7 16-18 16H22l22 24" stroke="#d8a76a" strokeWidth="3" />
        <rect x="4" y="4" width="64" height="64" stroke="rgba(255,255,255,0.12)" />
      </svg>
      <div className="tech text-[10px] text-steel">Rudra Constructions &amp; Suppliers</div>
      <div className="relative mt-6 h-px w-40 overflow-hidden bg-white/10">
        <span className="absolute inset-y-0 left-0 w-1/3 bg-accent" style={{ animation: "sweep 1.6s linear infinite" }} />
      </div>
    </div>
  );
}
