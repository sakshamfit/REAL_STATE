export function TrustFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0c0d10]">
      <div className="absolute inset-0 bg-blueprint opacity-80" />
      <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <polygon points="400,90 440,520 360,520" fill="#23272f" stroke="#4d5666" strokeWidth="2" />
        <polygon points="310,520 490,520 460,380 340,380" fill="none" stroke="#39404d" strokeWidth="3" />
        <polygon points="340,380 460,380 440,240 360,240" fill="none" stroke="#39404d" strokeWidth="3" />
        <polygon points="360,240 440,240 420,120 380,120" fill="none" stroke="#39404d" strokeWidth="3" />
        <ellipse cx="400" cy="360" rx="150" ry="34" fill="none" stroke="#f0b43c" strokeWidth="4" />
        <ellipse cx="400" cy="240" rx="110" ry="26" fill="none" stroke="#4d5566" strokeWidth="2.5" />
        <ellipse cx="400" cy="440" rx="110" ry="26" fill="none" stroke="#4d5566" strokeWidth="2.5" />
        <ellipse cx="400" cy="320" rx="250" ry="60" fill="none" stroke="#f0b43c" strokeWidth="1.5" strokeDasharray="6 10" transform="rotate(-14 400 320)" />
        <circle cx="400" cy="96" r="7" fill="#ff6a4a" />
      </svg>
      <div className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] uppercase tracking-widest2 text-fog">
        QUALITY STANDARD · VERIFIED
      </div>
    </div>
  );
}
