"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

/** Scroll-reveal wrapper. CSS-driven so it degrades cleanly without JS motion. */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  rootMargin,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section" | "header" | "p" | "span" | "article";
  rootMargin?: string;
  style?: CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin, once: true });
  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref}
      data-shown={inView}
      className={`reveal ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms`, ...style }}
    >
      {children}
    </Comp>
  );
}
