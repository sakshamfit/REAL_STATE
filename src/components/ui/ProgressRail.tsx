"use client";

import { useEffect, useState } from "react";
import { nav } from "@/lib/data/content";

/** Right-hand section rail: current section + overall page progress. */
export default function ProgressRail() {
  const [active, setActive] = useState("hero");
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25] },
    );
    nav.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-1/2 z-[60] hidden -translate-y-1/2 flex-col items-end gap-3 xl:flex">
      <div className="tech mb-2 text-[9px] text-steel">{String(Math.round(p * 100)).padStart(2, "0")}</div>
      <div className="relative h-40 w-px bg-white/10">
        <span
          className="absolute left-0 top-0 w-px bg-accent"
          style={{ height: `${p * 100}%`, transition: "height .2s linear" }}
        />
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {nav.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="group flex items-center gap-2"
            aria-current={active === n.id ? "true" : undefined}
          >
            <span
              className="tech text-[8px] opacity-0 transition-opacity group-hover:opacity-100"
              style={{ opacity: active === n.id ? 1 : undefined, color: active === n.id ? "var(--accent)" : undefined }}
            >
              {n.label}
            </span>
            <span
              className="block h-1.5 w-1.5 rotate-45 border transition-all"
              style={{
                borderColor: active === n.id ? "var(--accent)" : "rgba(255,255,255,0.3)",
                background: active === n.id ? "var(--accent)" : "transparent",
              }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
