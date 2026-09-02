"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COMPANY } from "@/data/content";
import { HERO_STAGES, heroStageIndex } from "@/data/hero-stages";
import { SceneBoundary } from "@/components/SceneBoundary";
import { HeroBlueprint } from "@/components/hero/HeroBlueprint";
import { scrollState, useDeviceInfo, useReducedMotion } from "@/lib/utils";

const ConstructionCanvas = memo(
  dynamic(() => import("./ConstructionCanvas").then((m) => m.ConstructionCanvas), {
    ssr: false,
  })
);

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(0);
  const reduced = useReducedMotion();
  const device = useDeviceInfo();
  const show3d = device.webgl && !reduced;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    tl.to("[data-hero-fade]", { opacity: 0, duration: 0.05 }, 0.04);
    tl.fromTo(
      "[data-hero-brand]",
      { opacity: 0, y: 42, filter: "blur(10px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.07, ease: "power2.out" },
      0.845
    );
    tl.fromTo(
      "[data-hero-tagline]",
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.05, ease: "power2.out" },
      0.9
    );
    tl.fromTo(
      "[data-hero-cta]",
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.05, ease: "power2.out" },
      0.94
    );

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=3800",
      pin: true,
      scrub: reduced ? false : 1,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress;
        scrollState.hero = p;
        tl.progress(p);
        setStage(heroStageIndex(p));
        setPct(p);
      },
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, [reduced]);

  const scrollToProcess = useCallback(() => {
    const el = document.querySelector("#work");
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <section ref={sectionRef} id="top" className="relative h-screen overflow-hidden bg-[#e6ebf2]">
      <div className="absolute inset-0">
        {show3d ? (
          <SceneBoundary label="hero" fallback={<HeroBlueprint pct={pct} />}>
            <ConstructionCanvas />
          </SceneBoundary>
        ) : (
          <HeroBlueprint pct={pct} />
        )}
      </div>

      {/* vignette + top seam */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(244,241,234,0.9)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/85 to-transparent" />

      {/* top-left coordinates */}
      <div className="pointer-events-none absolute left-5 top-24 font-mono text-[10px] leading-relaxed tracking-widest2 text-fog sm:left-8 sm:top-28 lg:left-14">
        <div className="text-accentDim">RUDRA.EXE</div>
        <div>GRID {String(pct).padStart(3, "0")}.PHASE</div>
        <div>LAT 25.5941 · LON 85.1376</div>
      </div>

      {/* stage readout bottom-right */}
      <div className="pointer-events-none absolute bottom-24 right-5 rounded-lg border border-line/70 bg-panel/70 px-4 py-3 text-right backdrop-blur-md sm:bottom-28 sm:right-8 lg:right-14">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-fog">
          STAGE {String(stage + 1).padStart(2, "0")} / 09
        </div>
        <div className="mt-1 font-display text-xl font-600 uppercase tracking-wide text-bone sm:text-2xl">
          {HERO_STAGES[stage].label}
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-fog">
          {HERO_STAGES[stage].sub}
        </div>
      </div>

      {/* progress rail bottom-left */}
      <div className="pointer-events-none absolute bottom-24 left-5 flex items-center gap-4 rounded-lg border border-line/70 bg-panel/70 px-4 py-3 backdrop-blur-md sm:bottom-28 sm:left-8 lg:left-14">
        <div className="relative h-px w-36 overflow-hidden bg-line sm:w-56">
          <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct * 100}%` }} />
        </div>
        <span className="font-mono text-[11px] tabular-nums tracking-widest text-ash">
          {String(Math.round(pct * 100)).padStart(3, "0")}%
        </span>
      </div>

      {/* scroll hint */}
      <div data-hero-fade className="pointer-events-none absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest3 text-ash">
          Scroll to build
        </span>
        <span className="relative h-12 w-px overflow-hidden bg-line">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-scanline bg-accent" />
        </span>
      </div>

      {/* final brand reveal */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <div data-hero-brand className="opacity-0">
          {/* Rudra mark */}
          <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
            <span className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-accent/60" />
            <span className="absolute inset-2 rounded-full border border-accent/30" />
            <span className="font-display text-4xl font-700 text-accent sm:text-5xl">R</span>
          </div>
          <div className="mb-6 flex items-center justify-center gap-4">
            <span className="hidden h-px w-16 bg-accent/70 sm:block" />
            <span className="font-mono text-[10px] uppercase tracking-widest3 text-accentDim">
              Est. {COMPANY.founded} · Bihar, India
            </span>
            <span className="hidden h-px w-16 bg-accent/70 sm:block" />
          </div>
          <h1 className="h-display text-[clamp(2.6rem,8vw,7.2rem)]">
            RUDRA
            <span className="block bg-gradient-to-r from-[#26221c] via-[#4a443a] to-[#8d867a] bg-clip-text text-transparent">
              CONSTRUCTIONS
            </span>
            <span className="text-outline-accent block text-[clamp(1rem,2.4vw,1.9rem)] font-500 tracking-[0.5em]">
              &amp; SUPPLIERS
            </span>
          </h1>
          <p data-hero-tagline className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ash">
            {COMPANY.tagline}
            <span className="mt-1 block text-[11px] uppercase tracking-widest2 text-fog">
              {COMPANY.promise}
            </span>
          </p>
          <div data-hero-cta className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button onClick={scrollToProcess} className="btn-primary">
              Explore the build
            </button>
            <a href="#contact" className="btn-ghost">
              Start a project
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
