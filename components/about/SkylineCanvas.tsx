"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid, Sparkles } from "@react-three/drei";
import { clamp01, damp, scrollState } from "@/lib/utils";

const TOWERS = [
  { x: -9.5, w: 2.6, d: 2.6, h: 20 },
  { x: -6.6, w: 1.7, d: 1.7, h: 12 },
  { x: -4.2, w: 2.2, d: 2.2, h: 16 },
  { x: -1.4, w: 1.5, d: 1.5, h: 9 },
  { x: 1.2, w: 2.9, d: 2.9, h: 24, accent: true },
  { x: 4.6, w: 1.9, d: 1.9, h: 13 },
  { x: 7.2, w: 2.4, d: 2.4, h: 18 },
  { x: 10.2, w: 1.6, d: 1.6, h: 10.5 },
];

function Skyline() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const geos = useMemo(
    () =>
      TOWERS.map((t) => {
        const g = new THREE.BoxGeometry(t.w, t.h, t.d);
        g.translate(0, t.h / 2, 0);
        return g;
      }),
    []
  );
  useFrame(() => {
    TOWERS.forEach((t, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const start = 0.08 + i * 0.09;
      mesh.scale.y = Math.max(clamp01((scrollState.about - start) / 0.32), 0.0001);
    });
  });
  return (
    <group>
      {TOWERS.map((t, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[t.x, 0, 0]}
          geometry={geos[i]}
        >
          <meshStandardMaterial
            color={t.accent ? "#2e323b" : "#20232a"}
            roughness={0.6}
            metalness={0.35}
            emissive={t.accent ? "#241a04" : "#000000"}
            emissiveIntensity={t.accent ? 0.8 : 0}
          />
          <Edges color={t.accent ? "#f0b43c" : "#454c59"} />
        </mesh>
      ))}
    </group>
  );
}

function Beacon() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const o = clamp01((scrollState.about - 0.78) / 0.1);
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3);
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = o * (1 + pulse * 2);
  });
  return (
    <mesh ref={ref} position={[1.2, 24.8, 0]}>
      <sphereGeometry args={[0.24, 16, 16]} />
      <meshStandardMaterial color="#ff6a4a" emissive="#ff6a4a" emissiveIntensity={0} />
    </mesh>
  );
}

function CameraDrift() {
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = damp(state.camera.position.x, Math.sin(t * 0.08) * 2.2, 1.5, delta);
    state.camera.position.y = damp(state.camera.position.y, 9 + Math.sin(t * 0.05) * 0.8, 1.5, delta);
    state.camera.lookAt(0, 8, 0);
  });
  return null;
}

export function SkylineCanvas() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      camera={{ fov: 38, position: [0, 9, 30], near: 0.1, far: 120 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0d0d10"]} />
      <fog attach="fog" args={["#0d0d10", 24, 70]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#9fb2d8", "#08090b", 0.55]} />
      <directionalLight position={[8, 18, 12]} intensity={2.1} color="#e8edfa" />
      <directionalLight position={[-10, 6, -8]} intensity={0.5} color="#8ea3d8" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial color="#0b0c0f" roughness={1} />
      </mesh>
      <Skyline />
      <Beacon />
      <CameraDrift />
      <Sparkles count={36} scale={[26, 12, 14]} size={1.3} speed={0.18} opacity={0.3} color="#9fb3c8" />

      <Grid
        position={[0, 0.01, 0]}
        args={[60, 60]}
        cellSize={1.4}
        cellThickness={0.5}
        cellColor="#20232b"
        sectionSize={7}
        sectionThickness={1}
        sectionColor="#3c414c"
        fadeDistance={55}
        fadeStrength={2}
        infiniteGrid
      />
    </Canvas>
  );
}
