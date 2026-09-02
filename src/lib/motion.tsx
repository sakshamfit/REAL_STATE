"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Coarse device tier, used to scale scene detail. */
export type Tier = "low" | "high";

type MotionPrefs = {
  /** OS-level prefers-reduced-motion */
  reducedMotion: boolean;
  /** user-toggled "lite" mode (fewer particles, no shadows, lower dpr) */
  lite: boolean;
  setLite: (v: boolean) => void;
  tier: Tier;
  /** multiplier applied to particle / instance counts */
  density: number;
  /** pixel ratio cap */
  dpr: [number, number];
  shadows: boolean;
  webgl: boolean;
};

const Ctx = createContext<MotionPrefs | null>(null);

const LITE_KEY = "rudra-lite";

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lite, setLiteState] = useState(false);
  const [tier, setTier] = useState<Tier>("high");
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);

    const coarse = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    const applyTier = () => setTier(coarse.matches ? "low" : "high");
    applyTier();
    coarse.addEventListener("change", applyTier);

    // Restore the visitor's saved preference. Reading localStorage during
    // render would make the server and client disagree, so it has to happen
    // here — this is a deliberate one-shot sync from an external store.
    try {
      const stored = window.localStorage.getItem(LITE_KEY);
      if (stored === "1") setLiteState(true); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      /* private mode */
    }

    let ok = false;
    try {
      const canvas = document.createElement("canvas");
      ok = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
      );
    } catch {
      ok = false;
    }
    setWebgl(ok);

    return () => {
      mq.removeEventListener("change", apply);
      coarse.removeEventListener("change", apply);
    };
  }, []);

  const setLite = useCallback((v: boolean) => {
    setLiteState(v);
    try {
      window.localStorage.setItem(LITE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<MotionPrefs>(() => {
    return {
      reducedMotion,
      lite,
      setLite,
      tier,
      density: lite ? 0.35 : tier === "low" ? 0.55 : 1,
      dpr: lite ? [1, 1.25] : tier === "low" ? [1, 1.6] : [1, 2],
      shadows: !lite && tier === "high",
      webgl,
    };
  }, [reducedMotion, lite, setLite, tier, webgl]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMotionPrefs(): MotionPrefs {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  // Safe fallback for components rendered outside the provider (SSR / tests).
  return {
    reducedMotion: false,
    lite: false,
    setLite: () => {},
    tier: "high",
    density: 1,
    dpr: [1, 2],
    shadows: true,
    webgl: true,
  };
}
