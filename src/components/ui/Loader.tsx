"use client";

import { useEffect, useState } from "react";

/**
 * Intro loader: "Composing the descent" counts to 100%, holds, then the plate
 * lifts and the page rises into place.
 *
 * The count is not decorative — it tracks real readiness (document complete and
 * webfonts settled) with a minimum duration so it never flashes by, and it can
 * never stall: a hard cap forces the exit.
 */
const MIN_MS = 1500;
const MAX_MS = 5200;
const HOLD_MS = 320;

let alreadyPlayed = false;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Loader() {
  // decided during the first render, so a reduced-motion visitor never sees a
  // loader frame at all (and nothing has to be undone in an effect)
  const [skipped] = useState(() => alreadyPlayed || prefersReducedMotion());
  const [pct, setPct] = useState(skipped ? 100 : 0);
  const [phase, setPhase] = useState<"count" | "hold" | "exit" | "gone">(skipped ? "gone" : "count");
  const [ready, setReady] = useState(false);

  // readiness
  useEffect(() => {
    if (skipped) return;
    let cancelled = false;
    const mark = () => !cancelled && setReady(true);

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (document.readyState === "complete") {
      if (fonts?.ready) fonts.ready.then(mark).catch(mark);
      else mark();
    } else {
      window.addEventListener("load", mark, { once: true });
    }
    const cap = window.setTimeout(mark, MAX_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(cap);
      window.removeEventListener("load", mark);
    };
  }, [skipped]);

  // count, then exit
  useEffect(() => {
    if (skipped) {
      alreadyPlayed = true;
      return;
    }

    const start = performance.now();
    let raf = 0;
    const timers: number[] = [];

    const tick = () => {
      const elapsed = performance.now() - start;
      const timed = Math.min(1, elapsed / MIN_MS);
      // ease toward 100, but only land on it once the page is genuinely ready
      setPct(Math.round(Math.min(ready ? 1 : 0.94, timed) * 100));
      if (ready && timed >= 1) {
        setPct(100);
        setPhase("hold");
        timers.push(window.setTimeout(() => setPhase("exit"), HOLD_MS));
        timers.push(
          window.setTimeout(() => {
            alreadyPlayed = true;
            setPhase("gone");
          }, HOLD_MS + 1000),
        );
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [ready, skipped]);

  if (phase === "gone") return null;

  const exiting = phase === "exit";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[95] overflow-hidden bg-ink"
      style={{
        clipPath: exiting ? "inset(0 0 100% 0)" : "inset(0 0 0 0)",
        transition: "clip-path 1s cubic-bezier(0.76, 0, 0.24, 1)",
      }}
    >
      <div
        className="flex h-full flex-col items-center justify-center"
        style={{
          transform: exiting ? "translateY(-6%)" : "none",
          opacity: exiting ? 0 : 1,
          transition: "transform 1s cubic-bezier(0.76,0,0.24,1), opacity .7s ease .15s",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 72 72" fill="none" className="mb-8">
          <path d="M8 64V8h26c11 0 18 6.5 18 16s-7 16-18 16H22l22 24" stroke="#d8a76a" strokeWidth="3" />
          <rect x="4" y="4" width="64" height="64" stroke="rgba(255,255,255,0.12)" />
        </svg>

        <div className="tech text-[10px] text-concrete">Composing the descent</div>

        <div className="relative mt-7 h-px w-[min(70vw,420px)] overflow-hidden bg-white/10">
          <span
            className="absolute inset-y-0 left-0 bg-accent"
            style={{ width: `${pct}%`, transition: "width .18s linear" }}
          />
        </div>

        <div className="display mt-6 text-[clamp(2.4rem,9vw,5rem)] tabular-nums text-chalk">
          {String(pct).padStart(3, "0")}
          <span className="text-accent">%</span>
        </div>

        <div className="tech mt-6 text-[9px] text-steel">Rudra Constructions &amp; Suppliers</div>
      </div>
    </div>
  );
}
