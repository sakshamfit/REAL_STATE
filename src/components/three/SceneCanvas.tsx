"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { useEffect, useState, type ReactNode } from "react";
import { useMotionPrefs } from "@/lib/motion";

/**
 * Shared canvas host:
 *  - never renders without WebGL
 *  - pixel ratio + shadows scale with the device tier / "Lite" toggle
 *  - can pause rendering while off-screen (frameloop="never") to save GPU
 */
export default function SceneCanvas({
  children,
  camera = { position: [0, 6, 22], fov: 42, near: 0.1, far: 300 },
  running = true,
  className = "",
  shadowsFromPrefs = true,
  onCreated,
  gl,
}: {
  children: ReactNode;
  camera?: { position: [number, number, number]; fov?: number; near?: number; far?: number };
  running?: boolean;
  className?: string;
  shadowsFromPrefs?: boolean;
  onCreated?: () => void;
  gl?: { antialias?: boolean; powerPreference?: "default" | "high-performance" | "low-power" };
}) {
  const { webgl, dpr, shadows, tier, lite } = useMotionPrefs();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // defer one task so the canvas never mounts during the first paint pass
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!mounted || !webgl) return null;

  return (
    <div className={`canvas-frame ${className}`}>
      <Canvas
        dpr={dpr}
        shadows={shadowsFromPrefs ? shadows : false}
        frameloop={running ? "always" : "never"}
        camera={{ position: camera.position, fov: camera.fov ?? 42, near: camera.near ?? 0.1, far: camera.far ?? 300 }}
        gl={{
          antialias: !lite,
          powerPreference: gl?.powerPreference ?? (tier === "low" ? "low-power" : "high-performance"),
          alpha: false,
          stencil: false,
          ...gl,
        }}
        onCreated={() => onCreated?.()}
      >
        <AdaptiveDpr pixelated={false} />
        {children}
      </Canvas>
    </div>
  );
}
