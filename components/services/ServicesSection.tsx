"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SERVICES, type Service } from "@/data/content";
import { SectionHeading } from "@/components/ui/primitives";
import { SceneBoundary } from "@/components/SceneBoundary";
import { useDeviceInfo, useNearViewport } from "@/lib/utils";

const ServiceMiniCanvas = dynamic(() =>
  import("./ServiceMiniCanvas").then((m) => m.ServiceMiniCanvas), { ssr: false }
);

function ServiceGlyph({ id }: { id: string }) {
  const stroke = "currentColor";
  const common = { fill: "none", stroke, strokeWidth: 1.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 text-accent/80">
      {id === "civil" && (
        <g {...common}>
          <path d="M28 96V28h64v68" />
          <path d="M28 46h64M28 62h64M28 78h64" />
          <path d="M28 28 96 96M96 28 28 96" opacity={0.5} />
        </g>
      )}
      {id === "residential" && (
        <g {...common}>
          <path d="M20 64 60 30l40 34" />
          <path d="M28 60v36h64V60" />
          <path d="M52 96V72h16v24" />
          <path d="M42 50h8M70 50h8" />
        </g>
      )}
      {id === "commercial" && (
        <g {...common}>
          <path d="M38 96V26h44v70" />
          <path d="M44 36h10v10H44zM66 36h10v10H66zM44 52h10v10H44zM66 52h10v10H66zM44 68h10v10H44zM66 68h10v10H66z" />
          <path d="M30 96h60" />
        </g>
      )}
      {id === "infrastructure" && (
        <g {...common}>
          <path d="M14 52c18 20 74 20 92 0" />
          <path d="M40 62v22M80 62v22" />
          <path d="M20 84h80" />
          <path d="M14 52v8M106 52v8" />
        </g>
      )}
      {id === "solar" && (
        <g {...common}>
          <circle cx="94" cy="26" r="10" />
          <path d="M30 78 58 48l34 34H30z" />
          <path d="M40 88h48M46 78l8 8M64 66l8 8" />
          <path d="M48 56v-6M58 46v-6" />
        </g>
      )}
      {id === "renovation" && (
        <g {...common}>
          <path d="M24 92V44l28-16 28 16v48" />
          <path d="M38 92V70h28v22" />
          <path d="M24 50l-8-2M24 60l-8-2M24 70l-8-2M24 80l-8-2" />
          <path d="M88 92V52l12 6v34" stroke="#f0b43c" />
        </g>
      )}
    </svg>
  );
}

function ServiceCard({ service, show3d }: { service: Service; show3d: boolean }) {
  const [active, setActive] = useState(false);
  return (
    <article
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      tabIndex={0}
      className="group relative flex flex-col overflow-hidden border border-line bg-panel/50 transition-colors duration-500 hover:border-accent/60"
    >
      <div className="pointer-events-none absolute right-5 top-4 z-10 font-display text-5xl font-700 text-outline transition-colors duration-500 group-hover:text-accent/20">
        {service.index}
      </div>

      <div className="relative h-56 w-full sm:h-60">
        {show3d ? (
          <SceneBoundary
            label={`service-${service.id}`}
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-blueprint bg-blueprint-fade">
                <ServiceGlyph id={service.id} />
              </div>
            }
          >
            <ServiceMiniCanvas variant={service.id} active={active} />
          </SceneBoundary>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blueprint bg-blueprint-fade">
            <ServiceGlyph id={service.id} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-600 uppercase tracking-wide">{service.title}</h3>
          <span className="h-1.5 w-1.5 bg-accent transition-transform duration-300 group-hover:scale-150" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-accent/90">{service.tagline}</p>
        <p className="text-sm leading-relaxed text-ash">{service.description}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {service.points.map((pt) => (
            <span key={pt} className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-fog">
              {pt}
            </span>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(217,119,6,0.09))] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </article>
  );
}

export function ServicesSection() {
  const device = useDeviceInfo();
  const { ref, near } = useNearViewport<HTMLDivElement>("700px");
  const show3d = near && device.webgl && !device.mobile;

  return (
    <section id="services" ref={ref} className="relative border-t border-line/50 bg-coal">
      <div className="container-site py-24 sm:py-32">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="What we do"
            title={
              <>
                Built for every
                <span className="text-accent"> scale</span> of vision
              </>
            }
            copy="From a single structural frame to district-scale infrastructure — six disciplines, one standard: certified materials, disciplined execution, engineered to last."
          />
          <div className="hidden shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-fog lg:flex">
            <span className="inline-block h-2 w-2 animate-blink bg-accent" />
            06 verticals · one standard
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((s) => (
            <ServiceCard key={s.id} service={s} show3d={show3d} />
          ))}
        </div>
      </div>
    </section>
  );
}
