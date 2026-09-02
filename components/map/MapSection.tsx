"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PRESENCE, COMPANY, type Presence } from "@/data/content";
import { SceneBoundary } from "@/components/SceneBoundary";
import { IndiaSvgMap } from "@/components/map/IndiaSvgMap";
import { scrollState, useDeviceInfo, useReducedMotion } from "@/lib/utils";

const IndiaCanvas = dynamic(() => import("./IndiaCanvas").then((m) => m.IndiaCanvas), {
  ssr: false,
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const byGeo = new Map(PRESENCE.map((p) => [p.geoName, p]));

export function MapSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>("Bihar");
  const reduced = useReducedMotion();
  const device = useDeviceInfo();
  const show3d = device.webgl && !device.mobile;

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
        scrollState.map = self.progress;
      },
    });
    return () => st.kill();
  }, [reduced]);

  const active = selected ?? hovered;
  const presence: Presence | undefined = active ? byGeo.get(active) : undefined;

  return (
    <section id="presence" ref={sectionRef} className="relative h-screen overflow-hidden bg-[#0a0b0d]">
      <div className="absolute inset-0">
        {show3d ? (
          <SceneBoundary label="india-map" fallback={<IndiaSvgMap hovered={hovered} selected={selected} />}>
            <IndiaCanvas hovered={hovered} selected={selected} onHover={setHovered} onSelect={setSelected} />
          </SceneBoundary>
        ) : (
          <IndiaSvgMap hovered={hovered} selected={selected} />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink/90 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(5,5,7,0.55)_100%)]" />

      {/* heading */}
      <div className="container-site pointer-events-none absolute left-0 right-0 top-20 z-20 sm:top-24">
        <div className="eyebrow flex items-center gap-3">
          <span className="h-px w-8 bg-accent" /> Where we are
        </div>
        <h2 className="h-display mt-3 text-3xl sm:text-5xl">
          Presence across
          <span className="text-outline"> India</span>
        </h2>
        <p className="mt-4 max-w-md font-mono text-[10px] uppercase tracking-widest2 text-fog">
          Hover a state · click to explore · scroll for routes
        </p>
      </div>

      {/* info panel */}
      <div className="absolute right-5 top-[19rem] z-20 w-[300px] max-w-[calc(100vw-2.5rem)] sm:right-10 sm:top-1/2 sm:-translate-y-1/2 lg:right-14">
        <div className="glass relative border-l-2 border-l-accent p-6 shadow-card">
          <div className="absolute right-4 top-4 h-1.5 w-1.5 animate-blink bg-accent" />
          <div className="font-mono text-[9px] uppercase tracking-widest3 text-fog">
            {presence ? (presence.tier === 1 ? "Primary presence" : "Regional presence") : "State projection"}
          </div>
          <h3 className="mt-2 font-display text-2xl font-600 uppercase tracking-wide">
            {active ?? "Select a state"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ash">
            {presence?.blurb ?? "Rudra operates across India with a growing presence — reach out for capability details in this region."}
          </p>
          {presence?.cities ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {presence.cities.map((c) => (
                <span key={c.name} className="border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                  ● {c.name}
                </span>
              ))}
            </div>
          ) : null}
          <a
            href={`${COMPANY.emailHref}?subject=Rudra%20Project%20Enquiry%20%E2%80%94%20${encodeURIComponent(active ?? "India")}`}
            className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-bone transition-colors hover:text-accent"
          >
            View projects
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>

      {/* state chips */}
      <div className="absolute bottom-8 left-0 right-0 z-20">
        <div className="container-site flex flex-wrap items-center gap-2">
          {PRESENCE.map((p) => {
            const isOn = active === p.geoName;
            return (
              <button
                key={p.geoName}
                onClick={() => setSelected(isOn ? null : p.geoName)}
                className={`border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-widest transition-all duration-300 ${
                  isOn
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-line/70 bg-ink/60 text-fog hover:border-accent/50 hover:text-bone"
                }`}
              >
                {p.label}
                {p.tier === 1 ? " ★" : ""}
              </button>
            );
          })}
        </div>
        <p className="container-site mt-3 font-mono text-[9px] uppercase tracking-widest2 text-fog/70">
          Illustrative presence map — project-level records can be added by the client.
        </p>
      </div>
    </section>
  );
}
