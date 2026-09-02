"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { company, cta, nav, services } from "@/lib/data/content";
import SplitWords from "@/components/SplitWords";
import { useMotionPrefs } from "@/lib/motion";
import SceneCanvas from "@/components/three/SceneCanvas";
import Studio from "@/components/three/Studio";
import Reveal from "@/components/Reveal";

const CityScene = dynamic(() => import("@/components/three/scenes/CityScene"), { ssr: false });

export default function Contact() {
  const { reducedMotion } = useMotionPrefs();
  const [form, setForm] = useState({
    name: "",
    contact: "",
    type: services[0].title,
    location: "",
    brief: "",
  });

  const mailto = useMemo(() => {
    const body = [
      `Name: ${form.name}`,
      `Contact: ${form.contact}`,
      `Project type: ${form.type}`,
      `Location: ${form.location}`,
      "",
      "Brief:",
      form.brief,
    ].join("\n");
    return `${company.emailHref}?subject=${encodeURIComponent(
      `Project enquiry — ${form.type}${form.location ? ` (${form.location})` : ""}`,
    )}&body=${encodeURIComponent(body)}`;
  }, [form]);

  return (
    <section id="contact" className="relative border-t border-line bg-ink">
      {/* ------------------------------------------------------- CTA band */}
      <div className="relative h-[78svh] min-h-[520px] w-full overflow-hidden">
        <SceneCanvas camera={{ position: [0, 5.4, 16], fov: 44, far: 160 }} shadowsFromPrefs={false}>
          <Studio
            keyPos={[8, 12, 8]}
            keyIntensity={1.9}
            rim={[-10, 5, -12]}
            rimColor="#8fb9c9"
            ambient={0.24}
            envIntensity={0.45}
            shadows={false}
          />
          <CityScene reducedMotion={reducedMotion} />
        </SceneCanvas>

        <div className="vignette pointer-events-none absolute inset-0 z-[5]" />

        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-5 text-center">
          <div className="max-w-4xl">
            <Reveal>
              <div className="tech mb-6 text-[10px] text-accent">Final CTA</div>
              <h2 className="display text-[clamp(2rem,6.4vw,5rem)] text-chalk">
                <SplitWords text={cta.headline} step={80} />
              </h2>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {cta.lines.map((l, i) => (
                  <span key={l} className="flex items-center gap-6">
                    <span className="text-[clamp(0.95rem,1.6vw,1.2rem)] text-concrete">{l}</span>
                    {i < cta.lines.length - 1 && <span className="h-3 w-px bg-white/20" />}
                  </span>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a href="#enquiry" className="btn btn-solid tech pointer-events-auto text-[10px]">
                  <span>{cta.button}</span>
                  <span aria-hidden>→</span>
                </a>
                <a href={company.phoneHref} className="btn tech pointer-events-auto text-[10px]">
                  <span>{company.phone}</span>
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- enquiry form */}
      <div id="enquiry" className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-12 px-5 py-20 md:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <Reveal>
          <div className="tech mb-5 text-[10px] text-accent">Start a project</div>
          <h3 className="display text-[clamp(1.6rem,3.4vw,2.6rem)] text-chalk">
            <SplitWords text="Tell us what you want to build" step={70} />
          </h3>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-concrete">
            Send the brief and we will come back with feasibility, an indicative programme and the
            right team for the site.
          </p>

          <form
            className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = mailto;
            }}
          >
            <Field label="Your name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-ink px-4 py-4 text-sm text-chalk outline-none placeholder:text-steel"
                placeholder="Name"
              />
            </Field>
            <Field label="Phone or email">
              <input
                required
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full bg-ink px-4 py-4 text-sm text-chalk outline-none placeholder:text-steel"
                placeholder="+91 …"
              />
            </Field>
            <Field label="Project type">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-ink px-4 py-4 text-sm text-chalk outline-none"
              >
                {services.map((s) => (
                  <option key={s.key}>{s.title}</option>
                ))}
                <option>Material supply</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Location">
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-ink px-4 py-4 text-sm text-chalk outline-none placeholder:text-steel"
                placeholder="City, state"
              />
            </Field>
            <Field label="Brief" className="sm:col-span-2">
              <textarea
                rows={5}
                value={form.brief}
                onChange={(e) => setForm({ ...form, brief: e.target.value })}
                className="w-full resize-none bg-ink px-4 py-4 text-sm text-chalk outline-none placeholder:text-steel"
                placeholder="Scope, site condition, timeline…"
              />
            </Field>
            <div className="flex items-center justify-between gap-4 bg-ink px-4 py-4 sm:col-span-2">
              <span className="tech text-[9px] text-steel">Opens your mail app</span>
              <button type="submit" className="btn btn-solid tech text-[10px]">
                <span>Send enquiry</span>
                <span aria-hidden>→</span>
              </button>
            </div>
          </form>
        </Reveal>

        <Reveal delay={140}>
          <div className="border border-line bg-panel p-8">
            <div className="tech mb-6 text-[9px] text-steel">Direct</div>
            <a href={company.phoneHref} className="display block text-[clamp(1.3rem,2.6vw,2rem)] text-chalk hover:text-accent">
              {company.phone}
            </a>
            <a
              href={company.emailHref}
              className="mt-3 block break-all text-[13px] text-concrete hover:text-accent"
            >
              {company.email}
            </a>

            <div className="rule my-8" />

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {company.addresses.map((a) => (
                <div key={a.label}>
                  <div className="tech mb-3 text-[9px] text-accent">{a.label}</div>
                  {a.lines.map((l) => (
                    <div key={l} className="text-[13px] leading-relaxed text-concrete">
                      {l}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="rule my-8" />

            <div className="tech mb-4 text-[9px] text-steel">Navigate</div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {nav.map((n) => (
                <a key={n.id} href={`#${n.id}`} className="tech link-underline text-[9px] text-concrete hover:text-chalk">
                  {n.label}
                </a>
              ))}
            </div>
          </div>

          <p className="mt-6 max-w-md text-[11px] leading-relaxed text-steel">
            Rudra Constructions &amp; Suppliers — civil &amp; structural construction, residential and
            commercial projects, infrastructure, solar &amp; renewable energy, renovation and
            building-material supply.
          </p>
        </Reveal>
      </div>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-line px-5 py-10 md:px-10">
        <div className="mx-auto flex w-full max-w-[1560px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <svg width="26" height="26" viewBox="0 0 72 72" fill="none" aria-hidden>
              <path d="M8 64V8h26c11 0 18 6.5 18 16s-7 16-18 16H22l22 24" stroke="#d8a76a" strokeWidth="6" />
            </svg>
            <div>
              <div className="tech text-[10px] text-chalk">{company.name}</div>
              <div className="tech mt-1 text-[8px] text-steel">{company.tagline}</div>
            </div>
          </div>
          <div className="tech text-[9px] text-steel">
            © {new Date().getFullYear()} {company.name} · Founded {company.founded}
          </div>
        </div>
      </footer>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block bg-ink ${className}`}>
      <span className="tech block px-4 pt-4 text-[8px] text-steel">{label}</span>
      {children}
    </label>
  );
}
