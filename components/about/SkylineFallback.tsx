export function SkylineFallback() {
  const towers = [
    { x: 90, h: 190 }, { x: 170, h: 120 }, { x: 250, h: 160 },
    { x: 330, h: 90 }, { x: 420, h: 240, accent: true }, { x: 510, h: 130 },
    { x: 590, h: 180 }, { x: 670, h: 105 },
  ];
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0c0e12]">
      <div className="absolute inset-0 bg-blueprint opacity-80" />
      <svg viewBox="0 0 760 480" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <line x1="20" x2="740" y1="430" y2="430" stroke="#333a45" strokeWidth="2" />
        {towers.map((t, i) => (
          <g key={i}>
            <rect x={t.x} y={430 - t.h} width="46" height={t.h} fill={t.accent ? "#2e323b" : "#20232a"} rx="2" />
            <rect x={t.x} y={430 - t.h} width="46" height={t.h} fill="none" stroke={t.accent ? "#f0b43c" : "#454c59"} strokeWidth="1.2" />
            {Array.from({ length: 4 }).map((_, f) => (
              <rect key={f} x={t.x + 7} y={430 - t.h + 14 + f * (t.h - 26) / 4} width="32" height="5" fill={t.accent ? "#f0b43c" : "#31404d"} />
            ))}
          </g>
        ))}
        <circle cx="443" cy="178" r="5" fill="#ff6a4a" />
        <text x="700" y="40" textAnchor="end" fill="#6e7f9a" fontSize="12" fontFamily="ui-monospace, monospace" letterSpacing="3">
          EAST · NORTH-EAST FOOTPRINT
        </text>
      </svg>
    </div>
  );
}
