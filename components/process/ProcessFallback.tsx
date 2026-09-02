export function ProcessFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0c0e]">
      <div className="absolute inset-0 bg-blueprint opacity-80" />
      <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="400" cy="520" rx="240" ry="46" fill="none" stroke="#2a2f38" strokeWidth="1.2" />
        <ellipse cx="400" cy="520" rx="180" ry="34" fill="none" stroke="#f0b43c" strokeWidth="1.4" strokeDasharray="10 8" />
        <rect x="360" y="320" width="80" height="200" fill="#2c313c" />
        <path d="M360 380h80M360 440h80M360 500h80" stroke="#5c6678" strokeWidth="2" />
        <rect x="500" y="240" width="8" height="280" fill="#3c424d" />
        <rect x="500" y="240" width="110" height="8" fill="#4a515d" />
        <line x1="590" y1="248" x2="590" y2="330" stroke="#f0b43c" strokeWidth="3" />
        <rect x="130" y="380" width="150" height="110" fill="#10151c" stroke="#f0b43c" strokeWidth="1.5" />
        <path d="M145 415h120M145 440h120M145 465h120" stroke="#f0b43c" strokeWidth="1" />
        <circle cx="400" cy="520" r="70" fill="none" stroke="#f0b43c" strokeWidth="2" opacity="0.5" />
        <circle cx="400" cy="520" r="120" fill="none" stroke="#f0b43c" strokeWidth="1.4" opacity="0.3" />
      </svg>
      <div className="pointer-events-none absolute bottom-8 right-6 font-mono text-[10px] uppercase tracking-widest2 text-fog">
        05-PHASE SITE · BLUEPRINT VIEW
      </div>
    </div>
  );
}
