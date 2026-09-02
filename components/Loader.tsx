"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/utils";

export function Loader() {
  const [state, setState] = useState<"loading" | "done">("loading");
  const [pct, setPct] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const duration = reduced ? 120 : 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setState("done");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-ink transition-all duration-700 ease-outexpo ${
        state === "done" ? "pointer-events-none -translate-y-full opacity-0" : ""
      }`}
    >
      <div className="relative flex flex-col items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center border border-accent/60 font-display text-3xl font-700 text-accent">
          R
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest3 text-fog">
          Rudra Constructions
        </div>
        <div className="relative h-px w-44 overflow-hidden bg-line">
          <div
            className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="font-mono text-[10px] tabular-nums tracking-widest text-ash">{pct}%</div>
      </div>
    </div>
  );
}
