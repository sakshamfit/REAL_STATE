export function TrustFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e6ebf2]">
      <div className="absolute inset-0 bg-blueprint opacity-70" />
      <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* tower */}
        <polygon points="400,90 440,520 360,520" fill="#3b4150" stroke="#6b7484" strokeWidth="2" />
        <polygon points="310,520 490,520 460,380 340,380" fill="none" stroke="#4c5462" strokeWidth="3" />
        <polygon points="340,380 460,380 440,240 360,240" fill="none" stroke="#4c5462" strokeWidth="3" />
        <polygon points="360,240 440,240 420,120 380,120" fill="none" stroke="#4c5462" strokeWidth="3" />
        {/* rings */}
        <ellipse cx="400" cy="360" rx="150" ry="34" fill="none" stroke="#c2410c" strokeWidth="4" />
        <ellipse cx="400" cy="240" rx="110" ry="26" fill="none" stroke="#79828f" strokeWidth="2.5" />
        <ellipse cx="400" cy="440" rx="110" ry="26" fill="none" stroke="#79828f" strokeWidth="2.5" />
        {/* orbit */}
        <ellipse cx="400" cy="320" rx="250" ry="60" fill="none" stroke="#c2410c" strokeWidth="1.5" strokeDasharray="6 10" transform="rotate(-14 400 320)" />
        <circle cx="400" cy="96" r="7" fill="#e2402c" />
      </svg>
      <div className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] uppercase tracking-widest2 text-fog">
        QUALITY STANDARD · VERIFIED
      </div>
    </div>
  );
}
