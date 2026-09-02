"use client";

import { useEffect, useMemo, useState } from "react";
import { PRESENCE_BY_GEO, flattenGeo, geoBounds, pathDFor, project, type IndiaFeature } from "@/lib/india-geo";

/**
 * Light premium SVG India map — used when WebGL is unavailable or the 3D
 * scene fails. Same data source, same presence coloring, hover tooltips.
 */
export function IndiaSvgMap({ hovered, selected }: { hovered: string | null; selected: string | null }) {
  const [geo, setGeo] = useState<IndiaFeature[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/geojson/india.json")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setGeo(flattenGeo(d));
      })
      .catch(() => {
        if (alive) setGeo([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const viewBox = useMemo(() => {
    if (!geo || geo.length === 0) return "0 0 100 100";
    const b = geoBounds(geo);
    const pad = 3;
    return `${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + pad * 2} ${b.maxY - b.minY + pad * 2}`;
  }, [geo]);

  if (!geo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#e9edf3] font-mono text-[11px] uppercase tracking-widest2 text-[#8d867a]">
        Loading territory data…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e9edf3]">
      <div className="absolute inset-0 bg-blueprint opacity-60" />
      <svg viewBox={viewBox} className="relative h-full w-full p-10" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#4a3d20" floodOpacity="0.25" />
          </filter>
        </defs>
        {geo.map((f) => {
          const presence = PRESENCE_BY_GEO.get(f.name);
          const isOn = hovered === f.name || selected === f.name;
          const fill = isOn
            ? selected === f.name
              ? "#e39a1c"
              : "#eab454"
            : presence
              ? presence.tier === 1
                ? "#e0b765"
                : "#d3c093"
              : "#cdd3de";
          const stroke = isOn ? "#a05f04" : "#aab2c1";
          return (
            <path
              key={f.name}
              d={pathDFor(f)}
              fill={fill}
              stroke={stroke}
              strokeWidth={isOn ? 1.4 : 0.7}
              strokeLinejoin="round"
              filter="url(#soft)"
              style={{ transition: "fill 0.25s ease, stroke 0.25s ease" }}
            >
              <title>{f.name}</title>
            </path>
          );
        })}
        {/* documented city markers */}
        {geo.flatMap((f) => {
          const p = PRESENCE_BY_GEO.get(f.name);
          if (!p) return [];
          return (p.cities ?? []).map((c) => {
            const [x, y] = project(c.lon, c.lat);
            return (
              <g key={c.name} transform={`translate(${x} ${y})`}>
                <circle r="5" fill="#d97706" stroke="#fffaf2" strokeWidth="2" />
                <text y="-12" textAnchor="middle" fontSize="11" fill="#3d3a33" fontFamily="ui-monospace, monospace" letterSpacing="1">
                  {c.name}
                </text>
              </g>
            );
          });
        })}
      </svg>
      <div className="pointer-events-none absolute bottom-4 right-5 font-mono text-[10px] uppercase tracking-widest2 text-[#8d867a]">
        Static map view · presence by client records
      </div>
    </div>
  );
}
