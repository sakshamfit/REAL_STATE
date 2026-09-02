"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TIMELINE } from "@/data/content";
import { Eyebrow } from "@/components/ui/primitives";
import { SceneBoundary } from "@/components/SceneBoundary";
import { SkylineFallback } from "@/components/about/SkylineFallback";
import { scrollState, useDeviceInfo, useReducedMotion } from "@/lib/utils";

const SkylineCanvas = dynamic(() => import("./SkylineCanvas").then((m) => m.SkylineCanvas), {
  ssr: false,
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function AboutSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const device = useDeviceInfo();
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top 75%",
      end: "bottom top",
      scrub: reduced ? false : 1,
      onUpdate: (self) => {
        scrollState.about = self.progress;
      },
    });

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-timeline-item]").forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 48 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: i * 0.06,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
          }
        );
      });
    }, section);

    return () => {
      st.kill();
      ctx.revert();
    };
  }, [reduced]);

  const show3d = device.webgl && !device.mobile;

  return (
    <section id="work" ref={sectionRef} className="relative overflow-hidden border-t border-line/50 bg-ink">
      <div className="container-site py-24 sm:py-32">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>About Rudra</Eyebrow>
            <h2 className="h-display text-4xl sm:text-5xl">
              From ground
              <br />
              <span className="text-outline">to growth</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-ash">
              Rudra Constructions &amp; Suppliers was founded to deliver construction with
              engineering discipline — from civil &amp; structural works to infrastructure,
              solar energy and certified building-material supply. Every project is a promise:
              built on time, built to code, built to last.
            </p>

            <div className="mt-12 space-y-10 border-l border-line pl-8">
              {TIMELINE.map((item) => (
                <div key={item.title} data-timeline-item className="relative">
                  <span className="absolute -left-[41px] top-1.5 h-2.5 w-2.5 border border-accent bg-ink" />
                  <div className="font-mono text-[10px] uppercase tracking-widest2 text-accent">
                    {item.year}
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-600">{item.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-ash">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] lg:col-span-7">
            <div className="sticky top-24 h-[70vh] w-full overflow-hidden border border-line/60 bg-[#0d0d10] shadow-card lg:h-[78vh]">
              {show3d ? (
                <SceneBoundary label="about-skyline" fallback={<SkylineFallback />}>
                  <SkylineCanvas />
                </SceneBoundary>
              ) : (
                <SkylineFallback />
              )}
              <div className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] uppercase tracking-widest2 text-fog">
                East · North-East footprint
              </div>
              <div className="pointer-events-none absolute bottom-5 right-5 font-mono text-[10px] uppercase tracking-widest2 text-fog">
                BIHAR → ASSAM → PAN-INDIA
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
