"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COMPANY, SERVICES } from "@/data/content";
import { Eyebrow } from "@/components/ui/primitives";
import { useLenisScrollTo } from "@/lib/smooth-scroll";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function ContactSection() {
  const ref = useRef<HTMLElement | null>(null);
  const scrollTo = useLenisScrollTo();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-cta-reveal]",
        { opacity: 0, y: 46 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 72%" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="contact" ref={ref} className="relative overflow-hidden border-t border-line/50 bg-ink">
      <div className="pointer-events-none absolute inset-0 bg-blueprint bg-blueprint-fade" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.05] blur-3xl" />

      <div className="container-site relative py-28 sm:py-36">
        <div className="flex flex-col items-center text-center">
          <div data-cta-reveal>
            <Eyebrow>Let&apos;s talk</Eyebrow>
          </div>
          <h2 data-cta-reveal className="h-display mt-2 text-[clamp(2.3rem,6.5vw,5.6rem)]">
            Let&apos;s build the
            <span className="block text-accent">future together</span>
          </h2>
          <p data-cta-reveal className="mt-7 max-w-xl text-base leading-relaxed text-ash">
            Your vision. Our engineering. Built to last.
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest2 text-fog">
              {COMPANY.tagline}
            </span>
          </p>

          <div data-cta-reveal className="mt-11 flex flex-wrap items-center justify-center gap-4">
            <a href={COMPANY.emailHref} className="btn-primary">
              Start a project
              <span aria-hidden>→</span>
            </a>
            <a href={COMPANY.phoneHref} className="btn-ghost">
              {COMPANY.phone}
            </a>
          </div>

          <div data-cta-reveal className="mt-14 grid w-full max-w-3xl grid-cols-1 gap-4 border border-line bg-panel/40 p-6 text-left font-mono text-[11px] uppercase tracking-widest2 sm:grid-cols-3">
            <div>
              <div className="text-fog">Call</div>
              <a href={COMPANY.phoneHref} className="mt-2 block text-bone hover:text-accent">{COMPANY.phone}</a>
            </div>
            <div>
              <div className="text-fog">Email</div>
              <a href={COMPANY.emailHref} className="mt-2 block break-all text-bone hover:text-accent">
                {COMPANY.email}
              </a>
            </div>
            <div>
              <div className="text-fog">Base</div>
              <div className="mt-2 text-bone">{COMPANY.location}</div>
            </div>
          </div>

          <button
            data-cta-reveal
            onClick={() => scrollTo("#top")}
            className="mt-14 flex flex-col items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-fog transition-colors hover:text-bone"
          >
            Back to the site
            <span className="flex h-10 w-6 items-start justify-center rounded-full border border-line p-1.5">
              <span className="h-2 w-px animate-scanline bg-accent" />
            </span>
          </button>
        </div>
      </div>

      <footer className="border-t border-line/50">
        <div className="overflow-hidden border-b border-line/50 py-4">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
            {[...SERVICES, ...SERVICES].map((s, i) => (
              <span key={i} className="flex items-center gap-10 font-display text-sm font-500 uppercase tracking-[0.3em] text-fog">
                {s.title}
                <span className="h-1 w-1 rotate-45 bg-accent" />
              </span>
            ))}
          </div>
        </div>
        <div className="container-site flex flex-col items-center justify-between gap-4 py-8 font-mono text-[10px] uppercase tracking-widest2 text-fog sm:flex-row">
          <span>© {new Date().getFullYear()} {COMPANY.name}</span>
          <span className="text-center">
            Engineering Trust. Constructing Excellence.
          </span>
          <span>Est. {COMPANY.founded} · India</span>
        </div>
      </footer>
    </section>
  );
}
