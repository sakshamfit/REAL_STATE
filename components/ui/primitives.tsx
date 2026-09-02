"use client";

import { memo } from "react";

export const Eyebrow = memo(function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px w-8 bg-accent" />
      <span className="eyebrow">{children}</span>
    </div>
  );
});

export function SectionHeading({
  eyebrow,
  title,
  copy,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  copy?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-3xl ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="h-display text-4xl sm:text-5xl lg:text-6xl">{title}</h2>
      {copy ? <p className="mt-6 max-w-xl text-base leading-relaxed text-ash">{copy}</p> : null}
    </div>
  );
}

export const Counter = memo(function Counter({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const v = String(Math.round(value * 100)).padStart(3, "0");
  return (
    <span className={`font-mono tabular-nums tracking-widest ${className}`}>
      {v}
      <span className="text-accent">%</span>
    </span>
  );
});
