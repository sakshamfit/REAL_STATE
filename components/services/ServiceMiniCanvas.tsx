"use client";

import { Canvas } from "@react-three/fiber";
import { ModelRig, ServiceModel } from "./ServiceModels";

export function ServiceMiniCanvas({ variant, active }: { variant: string; active: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: 32, position: [0, 2.1, 6.4], near: 0.1, far: 40 }}
      style={{ width: "100%", height: "100%" }}
      frameloop="always"
    >
      <ModelRig active={active}>
        <ServiceModel variant={variant} />
      </ModelRig>
    </Canvas>
  );
}
