"use client";

import { useEffect, useState } from "react";
import { chapters } from "@/lib/data/content";

/**
 * Chapter rail: a hairline reading-progress bar plus the current chapter in
 * roman numerals, crossfading as the page descends through the sections.
 */
export default function ChapterRail() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = chapters.findIndex((c) => c.id === visible.target.id);
        if (idx !== -1) setActive(idx);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6] },
    );
    chapters.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <>
      {/* reading progress */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[2px] bg-white/5">
        <div
          className="h-[2px] bg-accent"
          style={{ width: `${progress * 100}%`, transition: "width .12s linear" }}
        />
      </div>

      {/* chapter marker */}
      <div className="pointer-events-none fixed left-5 top-[86px] z-[65] hidden md:left-10 md:block">
        <div className="relative h-[42px] w-[190px]">
          {chapters.map((c, i) => (
            <div
              key={c.id}
              className="absolute inset-0 transition-all duration-700"
              style={{
                opacity: i === active ? 1 : 0,
                transform: `translateY(${(i - active) * 12}px)`,
              }}
            >
              <div className="tech text-[10px] text-accent">{c.numeral}</div>
              <div className="tech mt-1.5 text-[9px] text-steel">
                {String(i + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")} · {c.short}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-[1px] w-[120px] bg-white/10">
          <div
            className="h-[1px] bg-accent/70"
            style={{ width: `${((active + 1) / chapters.length) * 100}%`, transition: "width .5s ease" }}
          />
        </div>
      </div>
    </>
  );
}
