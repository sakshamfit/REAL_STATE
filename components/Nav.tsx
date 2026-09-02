"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NAV_LINKS, COMPANY } from "@/data/content";
import { useLenisScrollTo } from "@/lib/smooth-scroll";
import { useReducedMotion } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function Nav() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollTo = useLenisScrollTo();
  const reduced = useReducedMotion();
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, delay: 1.15, ease: "power3.out", paused: reduced }
    );
    if (reduced) tween.progress(1).play();
    return () => {
      tween.kill();
    };
  }, [reduced]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      scrollTo(href, { offset: -64 });
    },
    [scrollTo]
  );

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-50 opacity-0"
      style={{ opacity: 0 }}
    >
      <div className="absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-accent via-accent/60 to-transparent" style={{ scale: `${progress}` }} />
      <div className="container-site flex h-16 items-center justify-between gap-4 sm:h-[72px]">
        <button
          onClick={() => go("#top")}
          className="group flex items-center gap-3"
          aria-label="Back to top"
        >
          <span className="flex h-9 w-9 items-center justify-center border border-line bg-panel/60 font-display text-sm font-700 text-accent transition-colors group-hover:border-accent">
            R
          </span>
          <span className="hidden text-left leading-none sm:block">
            <span className="block font-display text-[13px] font-600 tracking-[0.22em]">
              {COMPANY.short}
            </span>
            <span className="mt-1 block font-mono text-[8.5px] uppercase tracking-widest2 text-fog">
              Constructions &amp; Suppliers
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="group relative font-mono text-[11px] uppercase tracking-widest2 text-ash transition-colors hover:text-bone"
            >
              {l.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
          <button onClick={() => go("#contact")} className="btn-primary !px-5 !py-2.5 !text-[11px]">
            Start a Project
          </button>
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] border border-line bg-panel/60 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span className={`h-px w-5 bg-bone transition-transform ${open ? "translate-y-[6px] rotate-45" : ""}`} />
          <span className={`h-px w-5 bg-bone transition-transform ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 top-0 z-[-1] flex flex-col justify-center bg-ink/95 backdrop-blur-xl transition-all duration-500 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="container-site flex flex-col gap-6">
          {NAV_LINKS.map((l, i) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="flex items-baseline gap-4 border-b border-line/60 py-4 text-left"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <span className="font-mono text-[10px] text-accent">0{i + 1}</span>
              <span className="font-display text-3xl font-500 uppercase tracking-wide">{l.label}</span>
            </button>
          ))}
          <button onClick={() => go("#contact")} className="btn-primary mt-6">
            Start a Project
          </button>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-widest2 text-fog">
            {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
      </div>
    </header>
  );
}


