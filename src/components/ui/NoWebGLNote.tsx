"use client";

import { useMotionPrefs } from "@/lib/motion";

/**
 * Shown only when WebGL is unavailable. The page stays fully readable —
 * every 3D scene degrades to its written content — this just says so.
 */
export default function NoWebGLNote() {
  const { webgl } = useMotionPrefs();
  if (webgl) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-panel/95 px-5 py-3 backdrop-blur">
      <p className="mx-auto max-w-[1560px] text-[12px] leading-relaxed text-concrete">
        <span className="tech mr-2 text-[9px] text-accent">3D off</span>
        This browser has no WebGL, so the interactive 3D scenes are switched off. All content on this
        page remains available as text.
      </p>
    </div>
  );
}
