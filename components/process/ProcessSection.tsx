"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROCESS } from "@/data/content";
import { SceneBoundary } from "@/components/SceneBoundary";
import { ProcessFallback } from "@/components/process/ProcessFallback";
import { scrollState, useDeviceInfo, useReducedMotion } from "@/lib/utils";

const ProcessCanvas = dynamic(() => import("./ProcessCanvas").then((m) => m.ProcessCanvas), {
  ssr: false,
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function ProcessSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState(0);
  const device = useDeviceInfo();
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=3400",
      pin: true,
      scrub: reduced ? false : 1,
      anticipatePin: 1,
      onUpdate: (self) => {
        scrollState.process = self.progress;
        setStep(Math.min(4, Math.floor(self.progress * 5)));
      },
    });
    return () => st.kill();
  }, [reduced]);

  const show3d = device.webgl && !device.mobile;

  return (
    <section id="process" ref={sectionRef} className="relative h-screen overflow-hidden bg-[#0b0c0e]">
      <div className="absolute inset-0">
        {show3d ? (
          <SceneBoundary label="process" fallback={<ProcessFallback />}>
            <ProcessCanvas />
          </SceneBoundary>
        ) : (
          <ProcessFallback />
        )}
      </div>

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(5,5,7,0.9)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/90 to-transparent" />

      {/* header */}
      <div className="container-site pointer-events-none absolute left-0 right-0 top-20 sm:top-24">
        <div className="eyebrow flex items-center gap-3">
          <span className="h-px w-8 bg-accent" /> How we build
        </div>
        <h2 className="h-display mt-3 max-w-xl text-3xl sm:text-5xl">
          One site. One method.
          <span className="block text-outline">Five disciplines.</span>
        </h2>
      </div>

      {/* steps rail */}
      <div className="container-site absolute bottom-10 left-0 right-0 sm:bottom-14">
        <ol className="grid grid-cols-5 gap-2 sm:gap-4">
          {PROCESS.map((p, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={p.index} className="group">
                <div
                  className={`border px-3 pb-3 pt-2 transition-all duration-500 sm:px-5 sm:pb-5 sm:pt-3 ${
                    active
                      ? "border-accent/70 bg-accent/[0.06] shadow-glow"
                      : done
                        ? "border-line bg-panel/40"
                        : "border-line/60 bg-panel/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[10px] tracking-widest ${active ? "text-accent" : "text-fog"}`}>
                      {p.index}
                    </span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        active ? "animate-blink bg-accent" : done ? "bg-accent/50" : "bg-line"
                      }`}
                    />
                  </div>
                  <div
                    className={`mt-2 hidden font-display text-[11px] font-600 uppercase tracking-wide sm:block ${
                      active ? "text-bone" : "text-ash"
                    }`}
                  >
                    {p.title}
                  </div>
                </div>
                <div
                  className={`mt-3 px-1 transition-all duration-500 sm:px-4 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <p className="max-w-[220px] text-[11px] leading-relaxed text-ash sm:text-xs">{p.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
