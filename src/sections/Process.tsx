"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { process } from "@/lib/data/content";
import SplitWords from "@/components/SplitWords";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import SceneCanvas from "@/components/three/SceneCanvas";
import Studio from "@/components/three/Studio";
import Reveal from "@/components/Reveal";

const ProcessScene = dynamic(() => import("@/components/three/scenes/ProcessScene"), { ssr: false });

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function Process() {
  const { ref, progress, style } = useSectionProgress<HTMLDivElement>({ stickyVh: 340 });
  const smooth = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = clamp01((progress - 0.04) / 0.92);
      smooth.current += (t - smooth.current) * 0.11;
      setDisplay(smooth.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const active = useMemo(
    () => Math.min(process.length - 1, Math.floor(display * process.length * 0.999)),
    [display],
  );

  return (
    <section id="process" ref={ref} style={style} className="relative border-t border-line bg-ink2">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <SceneCanvas camera={{ position: [0, 8.4, 12.5], fov: 42, far: 160 }}>
            <Studio keyPos={[7, 12, 9]} keyIntensity={2.4} rim={[-10, 5, -11]} envIntensity={0.55} />
            <ProcessScene progress={display} />
          </SceneCanvas>
        </div>

        <div className="vignette pointer-events-none absolute inset-0 z-[5]" />

        {/* header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-24 md:px-10 md:pt-28">
          <div className="mx-auto w-full max-w-[1560px]">
            <Reveal>
              <div className="tech mb-4 text-[10px] text-accent">How we build</div>
              <h2 className="display max-w-2xl text-[clamp(1.7rem,4vw,3.1rem)] text-chalk">
                <SplitWords text="Five steps from brief to handover" step={70} />
              </h2>
            </Reveal>
          </div>
        </div>

        {/* step readout */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex w-full max-w-[460px] items-center px-5 pb-8 md:inset-y-0 md:right-0 md:left-auto md:items-center md:pb-0 md:px-10">
          <div className="w-full">
            <div className="relative mb-5 h-[104px] md:mb-8 md:h-[132px]">
              {process.map((step, i) => (
                <div
                  key={step.index}
                  className="absolute inset-0 flex items-end gap-4 transition-all duration-700 md:block"
                  style={{
                    opacity: i === active ? 1 : 0,
                    transform: `translateY(${(i - active) * 16}px)`,
                  }}
                >
                  <div className="display text-[clamp(2.4rem,10vw,5.2rem)] leading-none text-accent/85">
                    {step.index}
                  </div>
                  <div className="display text-[17px] text-chalk md:mt-1 md:text-[20px]">{step.title}</div>
                </div>
              ))}
            </div>

            <div className="relative hidden h-[168px] md:block">
              {process.map((step, i) => (
                <p
                  key={step.index}
                  className="absolute inset-x-0 top-0 text-[13px] leading-relaxed text-concrete transition-opacity duration-700 md:text-[14px]"
                  style={{ opacity: i === active ? 1 : 0 }}
                >
                  {step.text}
                  <span className="mt-4 flex flex-wrap gap-2">
                    {step.outputs.map((o) => (
                      <span key={o} className="tech border border-line px-2 py-1 text-[8px] text-steel">
                        {o}
                      </span>
                    ))}
                  </span>
                </p>
              ))}
            </div>

            <p className="mb-4 text-[12px] leading-relaxed text-concrete md:hidden">
              {process[active].text}
            </p>
            <div className="mt-2 flex items-center gap-3 md:mt-6">
              {process.map((step, i) => (
                <span
                  key={step.index}
                  className="h-px flex-1 transition-colors duration-500"
                  style={{
                    background: i <= active ? "var(--accent)" : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
            <div className="tech mt-3 flex justify-between text-[9px] text-steel">
              <span>Requirement</span>
              <span>Handover</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
