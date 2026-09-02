"use client";

import { useInView } from "@/hooks/useInView";

/**
 * Word-by-word mask reveal: every word sits in an overflow-hidden line and
 * rises out of it, staggered. This is the headline treatment the reference site
 * uses — its extracted text reads "AWebAgencyforLuxuryBrands" precisely because
 * each word is separately wrapped and animated.
 *
 * Relies on the `.line-mask` rules in globals.css: the parent carries
 * data-shown, the children transition on --reveal-delay.
 */
export default function SplitWords({
  text,
  className = "",
  step = 55,
  start = 0,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  step?: number;
  start?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ rootMargin: "0px 0px -8% 0px", once: true });
  const Comp = Tag as "span";
  const words = text.split(" ");

  return (
    <Comp ref={ref} data-shown={inView} className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="line-mask align-bottom">
          <span style={{ ["--reveal-delay" as string]: `${start + i * step}ms` }}>
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </Comp>
  );
}
