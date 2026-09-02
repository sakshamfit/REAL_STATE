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
            color={t.accent ? "#3b4150" : "#2c3038"}
            roughness={0.55}
            metalness={0.4}
            emissive={t.accent ? "#3a2404" : "#000000"}
            emissiveIntensity={t.accent ? 0.9 : 0}
          />
          <Edges color={t.accent ? "#c2410c" : "#6b7484"} />
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
      <meshStandardMaterial color="#e2402c" emissive="#ff5a3c" emissiveIntensity={0} />
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
      <color attach="background" args={["#dfe6ef"]} />
      <fog attach="fog" args={["#dfe6ef", 26, 74]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#c9c0b1", 0.7]} />
      <directionalLight position={[8, 18, 12]} intensity={2} color="#fff6e8" />
      <directionalLight position={[-10, 6, -8]} intensity={0.45} color="#aebcd6" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial color="#d8d4ca" roughness={1} />
      </mesh>
      <Skyline />
      <Beacon />
      <CameraDrift />
      <Sparkles count={36} scale={[26, 12, 14]} size={1.2} speed={0.16} opacity={0.4} color="#7f8aa0" />

      <Grid
        position={[0, 0.01, 0]}
        args={[60, 60]}
        cellSize={1.4}
        cellThickness={0.55}
        cellColor="#a6afc0"
        sectionSize={7}
        sectionThickness={1}
        sectionColor="#8590a4"
        fadeDistance={56}
        fadeStrength={2}
        infiniteGrid
      />
    </Canvas>
  );
}
