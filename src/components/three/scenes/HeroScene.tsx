"use client";

import SceneCanvas from "@/components/three/SceneCanvas";
import Studio, { SiteGround } from "@/components/three/Studio";
import HeroBuilding from "@/components/three/HeroBuilding";

export default function HeroScene({
  progress,
  density = 1,
  onReady,
}: {
  progress: number;
  density?: number;
  onReady?: () => void;
}) {
  return (
    <SceneCanvas camera={{ position: [0, 28, 0.6], fov: 38, far: 400 }} onCreated={onReady}>
      <Studio shadows keyPos={[9, 15, 9]} keyIntensity={2.6} />
      <SiteGround radius={70} gridSize={110} repeat={7} />
      <HeroBuilding progress={progress} density={density} />
    </SceneCanvas>
  );
}
