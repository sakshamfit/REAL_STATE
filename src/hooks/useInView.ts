"use client";

import { useEffect, useRef, useState } from "react";

/** True once the element has entered the viewport (optionally once only). */
export function useInView<T extends HTMLElement>(
  { rootMargin = "0px 0px -12% 0px", once = false, threshold = 0.15 }: {
    rootMargin?: string;
    once?: boolean;
    threshold?: number;
  } = {},
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once, threshold]);

  return { ref, inView };
}
