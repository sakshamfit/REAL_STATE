"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** extra scroll length (vh) the sticky child should stay pinned for */
  stickyVh?: number;
  /** fire an rAF loop even when the section is off-screen (for pre-warming) */
  always?: boolean;
};

/**
 * Normalised 0→1 scroll progress for a tall section with a sticky child.
 * 0 = the section's leading edge reaches the viewport top,
 * 1 = the sticky child has finished its pinned travel.
 *
 * Deliberately framework-light: a single rAF + getBoundingClientRect, which
 * stays in sync with Lenis without depending on ScrollTrigger refresh order.
 */
export function useSectionProgress<T extends HTMLElement>(
  { stickyVh = 400, always = false }: Options = {},
) {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    let last = -1;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
      if (Math.abs(p - last) > 0.0008) {
        last = p;
        setProgress(p);
      }
      frame = requestAnimationFrame(measure);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        const vis = entry.isIntersecting;
        setInView(vis);
        if (vis || always) {
          if (!frame) frame = requestAnimationFrame(measure);
        } else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "20% 0px 20% 0px", threshold: 0 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [always]);

  return { ref, progress, inView, style: { height: `${stickyVh + 100}vh` } as const };
}
