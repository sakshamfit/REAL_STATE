"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CLIENTS } from "@/data/content";
import { useReducedMotion } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function ClientsSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const getAmount = () => Math.max(0, track.scrollWidth - window.innerWidth + 120);

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${Math.max(1800, getAmount() * 1.15)}`,
      pin: true,
      scrub: reduced ? false : 1,
      anticipatePin: 1,
      onUpdate: (self) => {
        const x = -self.progress * getAmount();
        track.style.transform = `translate3d(${x}px, 0, 0)`;
        const idx = Math.floor(self.progress * CLIENTS.length);
        if (counterRef.current) counterRef.current.textContent = String(Math.max(1, Math.min(CLIENTS.length, idx + 1))).padStart(2, "0");
        setActive(Math.max(0, Math.min(CLIENTS.length - 1, idx)));
      },
    });

    return () => st.kill();
  }, [reduced]);

  return (
    <section id="clients" ref={sectionRef} className="relative h-screen overflow-hidden border-t border-line/50 bg-ink">
      {/* corridor walls */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4 bg-gradient-to-l from-ink via-ink/70 to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-30"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(139,147,169,0.10) 48%, rgba(139,147,169,0.16) 50%, rgba(139,147,169,0.10) 52%, transparent 100%)",
          transform: "perspective(600px) rotateX(28deg) scale(1.4)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-30"
        style={{
          background:
            "linear-gradient(0deg, transparent 0%, rgba(139,147,169,0.10) 48%, rgba(139,147,169,0.16) 50%, rgba(139,147,169,0.10) 52%, transparent 100%)",
          transform: "perspective(600px) rotateX(-28deg) scale(1.4)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-blueprint bg-blueprint-fade opacity-40" />

      {/* panel */}
      <div className="container-site absolute left-0 right-0 top-20 z-20 sm:top-24">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-accent" /> Trusted by
            </div>
            <h2 className="h-display mt-3 text-3xl sm:text-5xl">
              Partners who build
              <span className="text-outline"> with us</span>
            </h2>
          </div>
          <div className="hidden text-right font-mono text-[11px] tracking-widest2 text-fog md:block">
            <span ref={counterRef} className="tabular-nums text-accent">01</span>
            <span> / {String(CLIENTS.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>

      {/* corridor track */}
      <div className="absolute inset-0 flex items-center">
        <div ref={trackRef} className="flex w-max items-center gap-20 pl-[8vw] pr-[30vw] will-change-transform">
          {CLIENTS.map((c, i) => (
            <div
              key={c.name}
              className={`group relative flex min-w-[300px] max-w-[380px] flex-col gap-5 border-l-2 py-6 pl-7 transition-all duration-500 sm:min-w-[380px] ${
                active === i ? "border-accent" : "border-line"
              }`}
            >
              <span
                className={`font-display text-6xl font-700 transition-colors duration-500 sm:text-7xl ${
                  active === i ? "text-accent/25" : "text-outline"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3
                  className={`font-display text-2xl font-600 uppercase leading-tight tracking-wide transition-colors duration-500 sm:text-3xl ${
                    active === i ? "text-bone" : "text-ash"
                  }`}
                >
                  {c.name}
                </h3>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-fog">{c.org}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`h-px w-10 transition-all duration-500 ${active === i ? "bg-accent" : "bg-line"}`} />
                <span className="font-mono text-[9px] uppercase tracking-widest3 text-fog">Government · Institution</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-site absolute bottom-8 left-0 right-0 z-20 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-fog">
          Scroll to move through the corridor
        </span>
        <button
          onClick={() => {
            const el = document.querySelector("#presence");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="text-right font-mono text-[10px] uppercase tracking-widest2 text-accent hover:text-bone"
        >
          Where we work →
        </button>
      </div>
    </section>
  );
}
