"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { presence, projects, tierLabel, type PresenceTier } from "@/lib/data/content";
import SplitWords from "@/components/SplitWords";
import { useInView } from "@/hooks/useInView";
import { useMotionPrefs } from "@/lib/motion";
import SceneCanvas from "@/components/three/SceneCanvas";
import Studio from "@/components/three/Studio";
import Reveal from "@/components/Reveal";

const IndiaScene = dynamic(() => import("@/components/three/scenes/IndiaScene"), { ssr: false });

type Selection = { state: string; presence: (typeof presence)[number] | null };

const TIER_STYLE: Record<PresenceTier, { dot: string; label: string }> = {
  projects: { dot: "var(--accent)", label: "Operations base" },
  presence: { dot: "#74d3d8", label: "Project presence" },
  reach: { dot: "#4d565e", label: "Reach" },
};

export default function Presence() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "-25% 0px -25% 0px", threshold: 0 });
  const { reducedMotion } = useMotionPrefs();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hover, setHover] = useState<{ state: string; x: number; y: number } | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const setSectionEl = (el: HTMLDivElement | null) => {
    sectionRef.current = el;
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const hoverInfo = useMemo(() => {
    if (!hover) return null;
    const p = presence.find((x) => x.state === hover.state);
    return { p, tier: p?.tier ?? "reach" };
  }, [hover]);

  const selectedProjects = selection ? projects.filter((p) => p.state === selection.state) : [];

  return (
    <section id="presence" className="relative border-t border-line bg-ink">
      <div
        ref={setSectionEl}
        className="relative h-[100svh] min-h-[620px] w-full overflow-hidden"
        onPointerLeave={() => setHover(null)}
      >
        <SceneCanvas camera={{ position: [1.5, 42, 12], fov: 40, far: 220 }} running>
          <Studio
            keyPos={[12, 20, 10]}
            keyIntensity={2.2}
            rim={[-14, 10, -16]}
            rimColor="#7fb7c9"
            accentLight="#d8a76a"
            envIntensity={0.5}
            shadows={false}
          />
          <IndiaScene
            active={inView}
            reducedMotion={reducedMotion}
            selected={selection?.state ?? null}
            onSelect={(sel) => setSelection(sel)}
            onHover={(state, x, y) => {
              const box = sectionRef.current?.getBoundingClientRect();
              setHover(
                state
                  ? { state, x: x - (box?.left ?? 0), y: y - (box?.top ?? 0) }
                  : null,
              );
            }}
          />
        </SceneCanvas>

        <div className="vignette pointer-events-none absolute inset-0 z-[5]" />

        {/* ------------------------------------------------------ header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-24 md:px-10 md:pt-28">
          <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <Reveal>
              <div className="tech mb-4 text-[10px] text-accent">Where we are</div>
              <h2 className="display text-[clamp(1.8rem,4.6vw,3.6rem)] text-chalk">
                <SplitWords text="Our presence across India" step={80} />
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-concrete">
                Hover a state for a readout. Click to open its detail — glowing routes run from our
                operations bases in Bihar to the locations we work in.
              </p>
            </Reveal>

            <Reveal delay={140} className="pointer-events-auto">
              <div className="flex flex-wrap items-center gap-4">
                {(Object.keys(TIER_STYLE) as PresenceTier[]).map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <span
                      className="block h-2 w-2 rounded-full"
                      style={{ background: TIER_STYLE[t].dot }}
                    />
                    <span className="tech text-[9px] text-steel">{TIER_STYLE[t].label}</span>
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        {/* ------------------------------------------------------- chips */}
        <div className="pointer-events-none absolute bottom-6 left-5 z-10 max-w-[min(92vw,420px)] md:bottom-10 md:left-10">
          <div className="tech mb-3 text-[9px] text-steel">States we work in</div>
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {presence.map((p) => {
              const isSel = selection?.state === p.state;
              return (
                <button
                  key={p.state}
                  type="button"
                  onClick={() => setSelection(isSel ? null : { state: p.state, presence: p })}
                  className="tech border px-3 py-2 text-[9px] transition-colors"
                  style={{
                    borderColor: isSel ? "var(--accent)" : "rgba(255,255,255,0.12)",
                    color: isSel ? "var(--accent)" : "var(--concrete)",
                    background: isSel ? "rgba(216,167,106,0.08)" : "rgba(10,12,14,0.6)",
                  }}
                >
                  {p.state}
                </button>
              );
            })}
          </div>
          <p className="mt-4 max-w-sm text-[11px] leading-relaxed text-steel">
            Markers show locations confirmed by Rudra Constructions &amp; Suppliers. A full
            project-by-project list is added to this map as soon as the client shares it.
          </p>
        </div>

        {/* ------------------------------------------------------ tooltip */}
        {hover && hoverInfo && (
          <div
            className="pointer-events-none absolute z-20 -translate-y-1/2 border border-line bg-ink/90 px-4 py-3 backdrop-blur"
            style={{ left: Math.min(hover.x + 20, 640), top: hover.y }}
          >
            <div className="tech text-[11px] text-chalk">{hover.state}</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="block h-1.5 w-1.5 rounded-full"
                style={{ background: TIER_STYLE[hoverInfo.tier].dot }}
              />
              <span className="text-[11px] text-concrete">{tierLabel[hoverInfo.tier]}</span>
            </div>
            {hoverInfo.p && hoverInfo.p.cities.length > 0 && (
              <div className="mt-2 text-[11px] text-steel">
                {hoverInfo.p.cities.map((c) => c.name).join(" • ")}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------- detail panel */}
        <aside
          className="pointer-events-auto absolute right-5 top-1/2 z-20 w-[min(88vw,340px)] -translate-y-1/2 border border-line bg-panel/90 p-6 backdrop-blur transition-all duration-500 md:right-10"
          style={{
            opacity: selection ? 1 : 0,
            transform: `translateY(-50%) translateX(${selection ? 0 : 24}px)`,
            visibility: selection ? "visible" : "hidden",
          }}
          aria-live="polite"
        >
          {selection && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="tech text-[9px] text-accent">
                    {selection.presence ? tierLabel[selection.presence.tier] : "Reach"}
                  </div>
                  <h3 className="display mt-2 text-2xl text-chalk">{selection.state}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  className="tech border border-line px-2 py-1 text-[9px] text-steel hover:border-accent hover:text-accent"
                  aria-label="Close state detail"
                >
                  ✕
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-concrete">
                {selection.presence?.presenceText ??
                  "Within Rudra's working reach — projects are delivered here through regional teams and partners."}
              </p>

              {selection.presence && selection.presence.cities.length > 0 && (
                <>
                  <div className="rule my-5" />
                  <div className="tech mb-3 text-[9px] text-steel">Locations</div>
                  <div className="flex flex-wrap gap-2">
                    {selection.presence.cities.map((c) => (
                      <span
                        key={c.name}
                        className="flex items-center gap-2 border border-line px-3 py-2 text-[11px] text-chalk"
                      >
                        <span className="block h-1.5 w-1.5 rounded-full bg-accent" />
                        {c.name}
                        {c.note && <span className="text-steel">· {c.note}</span>}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="rule my-5" />
              <div className="tech mb-3 text-[9px] text-steel">Projects</div>
              {selectedProjects.length > 0 ? (
                <ul className="space-y-3">
                  {selectedProjects.map((p) => (
                    <li key={`${p.name}-${p.year}`} className="border-l border-accent pl-3">
                      <div className="text-[13px] text-chalk">{p.name}</div>
                      <div className="tech mt-1 text-[9px] text-steel">
                        {p.type} · {p.year} · {p.city}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] leading-relaxed text-steel">
                  Project-level records for {selection.state} are being compiled with the client.
                  Entries appear here automatically once added to the project register.
                </p>
              )}

              <a href="#contact" className="btn tech mt-6 w-full justify-center text-[10px]">
                <span>Enquire about work in {selection.state}</span>
              </a>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
