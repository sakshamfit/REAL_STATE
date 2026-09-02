"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { company, heroStages } from "@/lib/data/content";
import SplitWords from "@/components/SplitWords";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { useMotionPrefs } from "@/lib/motion";

const HeroScene = dynamic(() => import("@/components/three/scenes/HeroScene"), { ssr: false });

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function Hero() {
  const { ref, progress, style } = useSectionProgress<HTMLDivElement>({ stickyVh: 620 });
  const { reducedMotion, lite, tier } = useMotionPrefs();
  const smooth = useRef(0);
  const [display, setDisplay] = useState(0);
  const [ready, setReady] = useState(false);
  const copyRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Opening beat: before the visitor scrolls, the site surveys itself.
  // Scroll takes over the moment it passes the auto-played progress.
  const INTRO = 0.09;
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const auto = reducedMotion ? INTRO : clamp01((elapsed - 1.1) / 2.6) * INTRO;
      const scrolledTo = clamp01((progress - 0.04) / 0.92);
      const t = Math.max(auto, scrolledTo);
      smooth.current += (t - smooth.current) * (reducedMotion ? 1 : 0.12);
      if (Math.abs(t - smooth.current) < 0.0004) smooth.current = t;
      setDisplay(smooth.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress, reducedMotion]);

  // entrance choreography
  useEffect(() => {
    const el = copyRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-anim]");
    if (reducedMotion) {
      items.forEach((i) => (i.style.opacity = "1"));
      return;
    }
    gsap.set(items, { opacity: 0, y: 26 });
    const tl = gsap.timeline({ delay: 1.15, defaults: { duration: 1.1, ease: "power3.out" } });
    tl.to(items, { opacity: 1, y: 0, stagger: 0.13 });
    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    // failsafe: if the canvas never reports ready, stop covering the page
    const failsafe = window.setTimeout(() => setReady(true), 4000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(failsafe);
    };
  }, []);

  const copyOpacity = useMemo(() => 1 - clamp01((display - 0.03) / 0.13), [display]);

  const activeStage = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < heroStages.length; i++) if (display >= heroStages[i].at) idx = i;
    return idx;
  }, [display]);

  const density = lite ? 0.4 : tier === "low" ? 0.6 : 1;

  return (
    <section id="hero" ref={ref} style={style} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* 3D layer — kept separate so a failed context cannot take the copy with it */}
        <div className="absolute inset-0">
          <HeroScene progress={display} density={density} onReady={() => setReady(true)} />
        </div>

        {/* ---------------------------------------------------- copy layer */}
        <div
          ref={copyRef}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end px-5 pb-24 md:px-10 md:pb-28"
          style={{ opacity: copyOpacity }}
        >
          <div className="mx-auto w-full max-w-[1560px]">
            <div data-anim className="mb-6 flex items-center gap-4">
              <svg width="26" height="26" viewBox="0 0 72 72" fill="none" aria-hidden>
                <path d="M8 64V8h26c11 0 18 6.5 18 16s-7 16-18 16H22l22 24" stroke="#d8a76a" strokeWidth="6" />
              </svg>
              <span className="tech text-[10px] text-accent">{company.tagline}</span>
            </div>

            <h1 className="display text-[clamp(2.1rem,7.4vw,6.6rem)] text-chalk">
              <span data-anim className="block">
                <SplitWords text="Rudra Constructions" step={90} />
              </span>
              <span data-anim className="block text-concrete">
                <SplitWords text="& Suppliers" step={90} start={180} />
              </span>
            </h1>

            <p
              data-anim
              className="mt-7 max-w-xl text-[clamp(0.95rem,1.5vw,1.15rem)] leading-relaxed text-concrete text-balance"
            >
              {company.headline}
            </p>

            <div data-anim className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#services" className="btn tech pointer-events-auto text-[10px]">
                <span>Explore what we build</span>
                <span aria-hidden>→</span>
              </a>
              <a href="#contact" className="btn tech pointer-events-auto text-[10px]">
                <span>Start a project</span>
              </a>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- stage readout */}
        <div className="pointer-events-none absolute bottom-8 left-5 z-10 md:left-10">
          <div className="tech mb-3 text-[9px] text-steel">Construction sequence</div>
          <div className="relative h-[52px] w-[240px] md:w-[320px]">
            {heroStages.map((s, i) => (
              <div
                key={s.label}
                className="absolute inset-0 transition-all duration-700"
                style={{
                  opacity: i === activeStage ? 1 : 0,
                  transform: `translateY(${(i - activeStage) * 10}px)`,
                }}
              >
                <div className="flex items-baseline gap-3">
                  <span className="tech text-[9px] text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span className="tech text-[12px] text-chalk">{s.label}</span>
                </div>
                <div className="mt-1 pl-7 text-[11px] text-steel">{s.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-px w-[240px] bg-white/10 md:w-[320px]">
            <div className="h-px bg-accent transition-[width] duration-200" style={{ width: `${display * 100}%` }} />
          </div>
        </div>

        {/* ----------------------------------------------------- scroll hint */}
        <div
          className="pointer-events-none absolute bottom-10 right-5 z-10 hidden flex-col items-center gap-3 md:right-10 md:flex"
          style={{ opacity: scrolled ? 0 : 0.85, transition: "opacity .6s ease" }}
        >
          <span className="tech text-[9px] text-steel">Scroll to build</span>
          <span className="relative block h-10 w-px overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-3 bg-accent" style={{ animation: "drift 1.8s ease-in-out infinite" }} />
          </span>
        </div>

        {!ready && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/70">
            <span className="tech text-[10px] text-steel">Preparing scene…</span>
          </div>
        )}
        <div className="vignette pointer-events-none absolute inset-0 z-[5]" />
      </div>
    </section>
  );
}
