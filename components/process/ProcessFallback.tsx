export function ProcessFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e6ebf2]">
      <div className="absolute inset-0 bg-blueprint opacity-70" />
      <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="400" cy="520" rx="240" ry="46" fill="none" stroke="#a6afc0" strokeWidth="1.2" />
        <ellipse cx="400" cy="520" rx="180" ry="34" fill="none" stroke="#c2410c" strokeWidth="1.4" strokeDasharray="10 8" />
        {/* site building */}
        <rect x="360" y="320" width="80" height="200" fill="#3b4150" />
        <path d="M360 380h80M360 440h80M360 500h80" stroke="#6b7484" strokeWidth="2" />
        {/* crane */}
        <rect x="500" y="240" width="8" height="280" fill="#4c5462" />
        <rect x="500" y="240" width="110" height="8" fill="#5a6270" />
        <line x1="590" y1="248" x2="590" y2="330" stroke="#d97706" strokeWidth="3" />
        {/* blueprint sheet */}
        <rect x="130" y="380" width="150" height="110" fill="#fbf8f1" stroke="#c2410c" strokeWidth="1.5" />
        <path d="M145 415h120M145 440h120M145 465h120" stroke="#c2410c" strokeWidth="1" />
        {/* scan rings */}
        <circle cx="400" cy="520" r="70" fill="none" stroke="#c2410c" strokeWidth="2" opacity="0.5" />
        <circle cx="400" cy="520" r="120" fill="none" stroke="#c2410c" strokeWidth="1.4" opacity="0.3" />
      </svg>
      <div className="pointer-events-none absolute bottom-8 right-6 font-mono text-[10px] uppercase tracking-widest2 text-fog">
        05-PHASE SITE · BLUEPRINT VIEW
      </div>
    </div>
  );
}
