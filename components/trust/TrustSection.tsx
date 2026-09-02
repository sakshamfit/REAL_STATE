"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TRUST_PILLARS } from "@/data/content";
import { Eyebrow } from "@/components/ui/primitives";
import { useDeviceInfo } from "@/lib/utils";

const TrustCanvas = dynamic(() => import("./TrustCanvas").then((m) => m.TrustCanvas), {
  ssr: false,
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const ICONS: Record<string, React.ReactNode> = {
  quality: (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M16 4l3 6 6.5 1-4.7 4.6 1.1 6.5L16 19.3l-5.9 3.1 1.1-6.5L6.5 11 13 10z" />
    </svg>
  ),
  safety: (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M16 3l10 4v8c0 6-4.2 11.5-10 14C10.2 26.5 6 21 6 15V7z" />
      <path d="M16 3v26" opacity={0.5} />
    </svg>
  ),
  compliance: (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M9 28V10m0 0h14v18H9z" />
      <path d="M9 10 16 4l7 6M13 14h6m-6 5h6m-6 5h6" />
    </svg>
  ),
  sustainability: (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M16 28C9 24 6 18 6 12c5 0 10 1 13 6-1 5-2 8-3 10z" />
      <path d="M16 28c4-5 8-8 10-9-3-3-7-4-10-3" opacity={0.6} />
    </svg>
  ),
};

export function TrustSection() {
  const ref = useRef<HTMLElement | null>(null);
  const device = useDeviceInfo();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-pillar]",
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 70%" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const show3d = device.webgl && !device.mobile;

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-line/50 bg-coal">
      <div className="container-site py-24 sm:py-32">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="relative min-h-[380px] order-2 lg:order-1 lg:min-h-[520px]">
            {show3d ? (
              <div className="h-full w-full border border-line/60 bg-[#0c0d10]">
                <TrustCanvas />
              </div>
            ) : (
              <div className="h-full w-full border border-line/60 bg-blueprint bg-blueprint-fade" />
            )}
            <div className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] uppercase tracking-widest2 text-fog">
              Quality standard · verified
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Eyebrow>Trust &amp; quality</Eyebrow>
            <h2 className="h-display text-4xl sm:text-5xl">
              We build what we
              <span className="text-accent"> promise</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-ash">
              Quality is a process, not a slogan. Certified materials, documented compliance and
              safety protocols run through every phase — from procurement to handover.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TRUST_PILLARS.map((p) => (
                <div
                  key={p.key}
                  data-pillar
                  className="glass group border-l-2 border-l-accent/0 p-6 transition-all duration-500 hover:border-l-accent hover:bg-panel/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-accent">{ICONS[p.key]}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest2 text-fog">
                      0{TRUST_PILLARS.findIndex((x) => x.key === p.key) + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-600 uppercase tracking-wide">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ash">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
