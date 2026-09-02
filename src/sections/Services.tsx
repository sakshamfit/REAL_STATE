"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { services, type Service } from "@/lib/data/content";
import { useInView } from "@/hooks/useInView";
import { useMotionPrefs } from "@/lib/motion";
import SceneCanvas from "@/components/three/SceneCanvas";
import Studio from "@/components/three/Studio";
import Reveal from "@/components/Reveal";

const ServiceModel = dynamic(() => import("@/components/three/ServiceModels"), { ssr: false });

export default function Services() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "10% 0px 10% 0px", threshold: 0 });

  return (
    <section id="services" className="relative border-t border-line bg-ink py-24 md:py-32">
      <div ref={ref} className="mx-auto w-full max-w-[1560px] px-5 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <div className="tech mb-5 text-[10px] text-accent">What we do</div>
            <h2 className="display max-w-3xl text-[clamp(1.9rem,4.6vw,3.6rem)] text-chalk">
              Six verticals, one standard of work
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="max-w-sm text-sm leading-relaxed text-concrete">
              Hover any model to turn it. Every scene below is generated live in the browser — the same
              way we build: from the structure out.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
          {services.map((s, i) => (
            <ServiceCard key={s.key} service={s} index={i} sectionInView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  index,
  sectionInView,
}: {
  service: Service;
  index: number;
  sectionInView: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ once: true, rootMargin: "0px 0px -8% 0px" });
  const [hover, setHover] = useState(false);
  const seenRef = useRef(false);
  if (inView) seenRef.current = true;
  const mounted = seenRef.current;
  const anim = useRef(0);
  const [animState, setAnimState] = useState(0);
  const { tier } = useMotionPrefs();

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const target = hover ? 1 : 0;
      anim.current += (target - anim.current) * 0.08;
      setAnimState(anim.current);
      if (Math.abs(target - anim.current) > 0.001) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hover]);

  const running = sectionInView && inView;

  return (
    <Reveal as="article" delay={index * 60} className="bg-ink">
      <div
        ref={ref}
        className="group relative h-[420px] cursor-pointer overflow-hidden bg-ink2"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        tabIndex={0}
      >
        <div
          className="absolute inset-0 transition-transform duration-[1200ms]"
          style={{ transform: `scale(${1 + animState * 0.04})` }}
        >
          {mounted && (
            <SceneCanvas
              camera={{ position: [0, 1.4, 8.2], fov: 40, far: 120 }}
              running={running}
              shadowsFromPrefs={false}
            >
              <Studio
                keyPos={[5, 8, 6]}
                keyIntensity={2.1}
                rim={[-7, 4, -8]}
                rimColor="#86b6c6"
                envIntensity={0.6}
                shadows={false}
              />
              <ServiceModel modelKey={service.key} anim={animState} />
            </SceneCanvas>
          )}
        </div>

        <div className="vignette pointer-events-none absolute inset-0" />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-6">
          <span className="tech text-[10px] text-steel">{service.index}</span>
          <span
            className="tech border px-2 py-1 text-[8px] transition-colors duration-500"
            style={{
              borderColor: hover ? "var(--accent)" : "rgba(255,255,255,0.12)",
              color: hover ? "var(--accent)" : "var(--steel)",
            }}
          >
            {tier === "low" ? "Lite" : "Live 3D"}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
          <h3 className="display text-[20px] text-chalk">{service.title}</h3>
          <div
            className="overflow-hidden transition-all duration-700"
            style={{ maxHeight: hover ? 240 : 28, opacity: hover ? 1 : 0.7 }}
          >
            <div className="tech mt-2 text-[9px] text-accent">{service.kicker}</div>
            <p className="mt-3 text-[13px] leading-relaxed text-concrete">{service.summary}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {service.bullets.map((b) => (
                <li key={b} className="tech border border-line px-2 py-1 text-[8px] text-steel">
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-accent transition-transform duration-700"
          style={{ transform: `scaleX(${hover ? 1 : 0})` }}
        />
      </div>
    </Reveal>
  );
}
