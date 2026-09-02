"use client";

import { HERO_STAGES, heroStageIndex } from "@/data/hero-stages";
import { clamp01 } from "@/lib/utils";

/**
 * Premium SVG blueprint fallback for the hero — mirrors the 3D build sequence
 * (grid → foundation → columns → floors → glass → roof) driven by scroll progress.
 */
export function HeroBlueprint({ pct }: { pct: number }) {
  const p = pct;
  const stage = heroStageIndex(p);
  const foundation = clamp01((p - 0.06) / 0.08);
  const columns = clamp01((p - 0.14) / 0.16);
  const floors = clamp01((p - 0.3) / 0.16);
  const glass = clamp01((p - 0.52) / 0.24);
  const roof = clamp01((p - 0.88) / 0.08);

  const baseY = 640;
  const colW = 16;
  const floorH = 46;
  const cx = 400;
  const cols = [-180, -60, 60, 180];
  const floorsN = 8;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e6ebf2]">
      <div className="absolute inset-0 bg-blueprint opacity-70" />
      <svg viewBox="0 0 800 800" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* survey grid lines */}
        {[100, 200, 300, 400, 500, 600, 700].map((y) => (
          <line key={y} x1="40" x2="760" y1={y} y2={y} stroke="#9aa7bd" strokeWidth="1" strokeDasharray="3 22" opacity={0.5} />
        ))}

        {/* foundation */}
        <rect
          x={cx - 220}
          y={baseY - foundation * 26}
          width={440}
          height={foundation * 26}
          fill="#6b7688"
          opacity={foundation}
        />

        {/* columns */}
        {cols.map((dx, i) => (
          <rect
            key={dx}
            x={cx + dx - colW / 2}
            y={baseY - (columns * floorsN * floorH)}
            width={colW}
            height={columns * floorsN * floorH}
            fill="#3f4653"
            opacity={0.5 + 0.5 * columns}
            style={{ transition: `height 0.08s, y 0.08s`, transitionDelay: `${i * 20}ms` }}
          />
        ))}

        {/* floors */}
        {Array.from({ length: floorsN }).map((_, f) => {
          const on = clamp01((floors - f / floorsN) * floorsN * 1.2);
          return (
            <rect
              key={f}
              x={cx - 230}
              y={baseY - (f + 1) * floorH}
              width={460}
              height={floorH}
              fill="#cfcabc"
              stroke="#8b8478"
              strokeWidth="1.5"
              opacity={on}
              style={{ transition: "opacity 0.1s" }}
            />
          );
        })}

        {/* glass */}
        <rect
          x={cx - 216}
          y={baseY - floorsN * floorH + floorH * 0.2}
          width={432}
          height={(floorsN - 1) * floorH}
          fill="#a9cee2"
          opacity={glass * 0.75}
        />

        {/* lit windows */}
        {Array.from({ length: floorsN }).map((_, f) =>
          Array.from({ length: 9 }).map((_, w) => {
            const on = clamp01((glass - (f / floorsN) * 0.95) * 3) * clamp01((glass * 1.4 - Math.abs(w - 4) * 0.06));
            return (
              <rect
                key={`${f}-${w}`}
                x={cx - 200 + w * 50}
                y={baseY - (f + 1) * floorH + 12}
                width={20}
                height={22}
                fill="#f3b04c"
                opacity={on * 0.9}
              />
            );
          })
        )}

        {/* roof */}
        <rect
          x={cx - 230}
          y={baseY - floorsN * floorH - roof * 16}
          width={460}
          height={roof * 16}
          fill="#7c8698"
          opacity={roof}
        />

        {/* roof beacon */}
        <circle cx={cx} cy={baseY - floorsN * floorH - 26} r={6} fill="#e2402c" opacity={roof} />
        <circle cx={cx} cy={baseY - floorsN * floorH - 26} r={10} fill="none" stroke="#e2402c" opacity={roof * 0.5} />

        {/* plot outline */}
        <rect x={cx - 268} y={baseY - floorsN * floorH - 40} width={536} height={40 + floorsN * floorH + 60} fill="none" stroke="#c2410c" strokeWidth="1.6" strokeDasharray="14 8" opacity={0.6} />

        {/* annotation */}
        <text x={40} y={60} fill="#5f6b7e" fontSize="15" fontFamily="ui-monospace, monospace" letterSpacing="3">
          BLUEPRINT MODE — RUDRA SITE {String(stage + 1).padStart(2, "0")}/{String(HERO_STAGES.length).padStart(2, "0")}
        </text>
      </svg>
    </div>
  );
}
