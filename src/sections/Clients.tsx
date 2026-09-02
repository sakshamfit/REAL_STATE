"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { clients } from "@/lib/data/content";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import SceneCanvas from "@/components/three/SceneCanvas";
import Studio from "@/components/three/Studio";
import Reveal from "@/components/Reveal";

const ClientsScene = dynamic(() => import("@/components/three/scenes/ClientsScene"), { ssr: false });

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function Clients() {
  const { ref, progress, style } = useSectionProgress<HTMLDivElement>({ stickyVh: 320 });
  const smooth = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = clamp01((progress - 0.03) / 0.94);
      smooth.current += (t - smooth.current) * 0.1;
      setDisplay(smooth.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const active = useMemo(
    () => Math.min(clients.length - 1, Math.floor(display * clients.length)),
    [display],
  );

  return (
    <section id="clients" ref={ref} style={style} className="relative border-t border-line bg-ink2">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <SceneCanvas camera={{ position: [0, 1.8, 6], fov: 52, far: 200 }}>
          <Studio
            keyPos={[4, 8, 6]}
            keyIntensity={1.5}
            rim={[-6, 4, -8]}
            rimColor="#7fb7c9"
            accentLight="#d8a76a"
            ambient={0.2}
            envIntensity={0.4}
            shadows={false}
          />
          <ClientsScene progress={display} />
        </SceneCanvas>

        <div className="vignette pointer-events-none absolute inset-0 z-[5]" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-24 md:px-10 md:pt-28">
          <div className="mx-auto w-full max-w-[1560px]">
            <Reveal>
              <div className="tech mb-4 text-[10px] text-accent">Trusted by</div>
              <h2 className="display text-[clamp(1.7rem,4vw,3rem)] text-chalk">
                Government departments, foundations and institutions
              </h2>
            </Reveal>
          </div>
        </div>

        {/* name readout */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-10 md:px-10 md:pb-14">
          <div className="mx-auto w-full max-w-[1560px]">
            <div className="relative h-[104px] md:h-[128px]">
              {clients.map((c, i) => (
                <div
                  key={c}
                  className="absolute inset-x-0 bottom-0 transition-all duration-500"
                  style={{
                    opacity: i === active ? 1 : 0,
                    transform: `translateY(${(i - active) * 14}px)`,
                  }}
                >
                  <div className="tech mb-3 text-[9px] text-steel">
                    {String(i + 1).padStart(2, "0")} / {String(clients.length).padStart(2, "0")}
                  </div>
                  <div className="display text-[clamp(1.2rem,3.4vw,2.6rem)] text-chalk">{c}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2">
              {clients.map((c, i) => (
                <span
                  key={c}
                  className="h-px flex-1 transition-colors duration-500"
                  style={{ background: i <= active ? "var(--accent)" : "rgba(255,255,255,0.12)" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
