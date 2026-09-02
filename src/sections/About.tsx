"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { company, timeline } from "@/lib/data/content";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { useMotionPrefs } from "@/lib/motion";
import SceneCanvas from "@/components/three/SceneCanvas";
import Studio from "@/components/three/Studio";
import Reveal from "@/components/Reveal";

const AboutTimelineScene = dynamic(() => import("@/components/three/scenes/AboutTimelineScene"), {
  ssr: false,
});

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function About() {
  const { ref, progress, style } = useSectionProgress<HTMLDivElement>({ stickyVh: 320 });
  const { lite } = useMotionPrefs();
  const smooth = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = clamp01((progress - 0.05) / 0.9);
      smooth.current += (t - smooth.current) * 0.12;
      setDisplay(smooth.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const active = useMemo(() => {
    let idx = 0;
    timeline.forEach((_, i) => {
      if (display >= i * 0.19) idx = i;
    });
    return idx;
  }, [display]);

  return (
    <section id="about" ref={ref} style={style} className="relative border-t border-line bg-ink2">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 lg:left-[44%]">
          <SceneCanvas camera={{ position: [-13.5, 4.4, 15.5], fov: 42, far: 200 }}>
            <Studio keyPos={[8, 14, 10]} keyIntensity={2.3} rim={[-12, 6, -12]} envIntensity={0.5} />
            <AboutTimelineScene progress={display} />
          </SceneCanvas>
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 lg:right-[52%]">
          <div className="flex h-full flex-col justify-center px-5 md:px-10">
            <div className="mx-auto w-full max-w-[620px] lg:mx-0">
              <Reveal>
                <div className="tech mb-5 text-[10px] text-accent">About Rudra</div>
                <h2 className="display text-[clamp(1.9rem,4.4vw,3.4rem)] text-chalk">
                  From ground
                  <br />
                  to growth
                </h2>
                <p className="mt-6 max-w-lg text-sm leading-relaxed text-concrete md:text-[15px]">
                  Founded in {company.founded}, Rudra Constructions &amp; Suppliers was built to do one
                  thing properly: take a project from an empty site to a finished structure, with civil
                  construction, infrastructure, solar energy and material supply under one accountable
                  team.
                </p>
              </Reveal>

              <div className="mt-10 space-y-1">
                {timeline.map((item, i) => {
                  const isActive = i === active;
                  return (
                    <div
                      key={item.year + item.title}
                      className="border-l pl-5 transition-all duration-700"
                      style={{
                        borderColor: isActive ? "var(--accent)" : "rgba(255,255,255,0.1)",
                        opacity: isActive ? 1 : 0.38,
                        paddingTop: isActive ? 4 : 0,
                        paddingBottom: isActive ? 16 : 8,
                      }}
                    >
                      <div className="flex items-baseline gap-4">
                        <span
                          className="tech text-[10px]"
                          style={{ color: isActive ? "var(--accent)" : "var(--steel)" }}
                        >
                          {item.year}
                        </span>
                        <span className="display text-[15px] text-chalk">{item.title}</span>
                      </div>
                      <div
                        className="overflow-hidden transition-all duration-700"
                        style={{ maxHeight: isActive ? 220 : 0, opacity: isActive ? 1 : 0 }}
                      >
                        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-concrete">
                          {item.text}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.points.map((p) => (
                            <span
                              key={p}
                              className="tech border border-line px-2.5 py-1.5 text-[8px] text-steel"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="vignette pointer-events-none absolute inset-0 z-[5]" />
        {!lite && (
          <div className="hair pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-24 opacity-40" />
        )}
      </div>
    </section>
  );
}
