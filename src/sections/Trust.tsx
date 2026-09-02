"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { trustPillars } from "@/lib/data/content";
import SplitWords from "@/components/SplitWords";
import { useMotionPrefs } from "@/lib/motion";
import SceneCanvas from "@/components/three/SceneCanvas";
import Studio from "@/components/three/Studio";
import Reveal from "@/components/Reveal";

const TrustScene = dynamic(() => import("@/components/three/scenes/TrustScene"), { ssr: false });

/**
 * The four commitments are objects in the scene, not a card grid: the copy on
 * the right selects which one the camera flies to, and pointing at an object
 * in the scene selects it here. The text stays in the DOM either way, so it is
 * still readable with WebGL off or motion reduced.
 */
export default function Trust() {
  const { reducedMotion } = useMotionPrefs();
  const [active, setActive] = useState(0);

  return (
    <section id="trust" className="relative border-t border-line bg-ink py-24 md:py-32">
      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 items-center gap-10 px-5 md:px-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative h-[420px] w-full md:h-[560px]">
          <SceneCanvas camera={{ position: [0, 1.6, 10.5], fov: 40, far: 120 }} shadowsFromPrefs={false}>
            <Studio keyPos={[6, 9, 7]} keyIntensity={2.2} rim={[-8, 5, -9]} envIntensity={0.6} shadows={false} />
            <TrustScene reducedMotion={reducedMotion} active={active} onSelect={setActive} />
          </SceneCanvas>
          <div className="vignette pointer-events-none absolute inset-0" />
          <div className="tech pointer-events-none absolute bottom-4 left-4 text-[9px] text-steel">
            Select a commitment — or point at it
          </div>
        </div>

        <div>
          <Reveal>
            <div className="tech mb-5 text-[10px] text-accent">Quality · Safety · Compliance</div>
            <h2 className="display max-w-xl text-[clamp(1.9rem,4.4vw,3.4rem)] text-chalk">
              <SplitWords text="The part of the building nobody sees — until it matters" step={55} />
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-concrete md:text-[15px]">
              Every Rudra site runs on the same four commitments. They are inspected, recorded and
              handed over with the structure — not printed on a brochure.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
            {trustPillars.map((p, i) => {
              const on = i === active;
              return (
                <Reveal key={p.title} delay={i * 90} className="bg-ink">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={on}
                    className="h-full w-full p-6 text-left transition-colors duration-500 hover:bg-panel focus-visible:bg-panel focus-visible:outline-none"
                    style={{ background: on ? "var(--panel)" : undefined }}
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="display text-[17px] text-chalk">{p.title}</h3>
                      <span
                        className="tech text-[9px] transition-colors duration-500"
                        style={{ color: on ? "var(--accent)" : "var(--steel)" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="tech mt-2 text-[9px] text-steel">{p.metric}</div>
                    <p className="mt-4 text-[13px] leading-relaxed text-concrete">{p.text}</p>
                    <span
                      className="mt-5 block h-px origin-left bg-accent transition-transform duration-700"
                      style={{ transform: on ? "scaleX(1)" : "scaleX(0.12)" }}
                    />
                  </button>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
