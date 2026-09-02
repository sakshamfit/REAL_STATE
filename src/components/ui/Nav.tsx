"use client";

import { useEffect, useState } from "react";
import { company, nav } from "@/lib/data/content";
import { useMotionPrefs } from "@/lib/motion";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("hero");
  const { lite, setLite, reducedMotion } = useMotionPrefs();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6] },
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
    <header
      className="fixed inset-x-0 top-0 z-[70] transition-[background,border-color,backdrop-filter] duration-500"
      style={{
        background: scrolled ? "rgba(7,8,10,0.72)" : "transparent",
        backdropFilter: scrolled ? "blur(14px) saturate(120%)" : "none",
        borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,0.08)" : "transparent"}`,
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-[1560px] items-center justify-between px-5 md:px-10">
        <a href="#hero" className="group flex items-center gap-3" aria-label={`${company.name} — home`}>
          <svg width="30" height="30" viewBox="0 0 72 72" fill="none" aria-hidden>
            <path
              d="M8 64V8h26c11 0 18 6.5 18 16s-7 16-18 16H22l22 24"
              stroke="#d8a76a"
              strokeWidth="5"
              className="transition-transform duration-500 group-hover:translate-x-[2px]"
            />
            <rect x="3" y="3" width="66" height="66" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
          </svg>
          <span className="leading-none">
            <span className="tech block text-[11px] text-chalk">Rudra</span>
            <span className="tech block text-[8px] text-steel">Constructions &amp; Suppliers</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.slice(1, -1).map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              data-active={active === n.id}
              className="tech link-underline text-[10px] text-concrete transition-colors hover:text-chalk data-[active=true]:text-chalk"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLite(!lite)}
            title={reducedMotion ? "Reduced motion is active" : "Toggle lighter 3D (better performance)"}
            className="tech hidden h-8 items-center gap-2 border border-line px-3 text-[9px] text-concrete transition-colors hover:border-accent hover:text-accent md:flex"
            aria-pressed={lite}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full transition-colors"
              style={{ background: lite ? "var(--accent)" : "rgba(255,255,255,0.25)" }}
            />
            {lite ? "Lite" : "Full"}
          </button>

          <a href="#contact" className="btn tech hidden text-[10px] md:inline-flex">
            <span>{ctaShort}</span>
          </a>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] border border-line lg:hidden"
          >
            <span className="h-px w-4 bg-chalk transition-transform" style={{ transform: open ? "translateY(3px) rotate(45deg)" : "none" }} />
            <span className="h-px w-4 bg-chalk transition-transform" style={{ transform: open ? "translateY(-3px) rotate(-45deg)" : "none" }} />
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden border-t border-line bg-ink/95 backdrop-blur lg:hidden"
        style={{ maxHeight: open ? 420 : 0, transition: "max-height .5s cubic-bezier(.22,1,.36,1)" }}
      >
        <div className="flex flex-col px-5 py-4">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={() => setOpen(false)}
              className="tech border-b border-line py-3 text-[11px] text-concrete last:border-0 hover:text-chalk"
            >
              {n.label}
            </a>
          ))}
          <a href={company.phoneHref} className="tech py-3 text-[11px] text-accent">
            {company.phone}
          </a>
        </div>
      </div>
    </header>
  );
}

const ctaShort = "Start a project";
