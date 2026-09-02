"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";

/**
 * Counts up once, when scrolled into view. Suffix stays put so "11 states"
 * reads correctly mid-animation.
 */
export default function Counter({
  to,
  suffix = "",
  duration = 1600,
  className = "",
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ once: true, threshold: 0.4 });
  // decided on first render so reduced-motion visitors simply see the final
  // number — no state has to be corrected inside an effect
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [value, setValue] = useState(0);
  const shown = reduced ? to : value;
  const done = useRef(false);

  useEffect(() => {
    if (reduced || !inView || done.current) return;
    done.current = true;

    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {shown}
      {suffix}
    </span>
  );
}
