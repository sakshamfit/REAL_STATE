"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid, Line, Sparkles } from "@react-three/drei";
import { clamp01, scrollState } from "@/lib/utils";

function inPhase(p: number, start: number, end: number) {
  return clamp01((p - start) / (end - start));
}

function ScanRings() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const p = scrollState.process;
    const phase1 = inPhase(p, 0, 0.2);
    const phase5 = inPhase(p, 0.78, 1);
    const base = phase1 * 0.9 + phase5 * 0.55;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const t = clock.elapsedTime * (i % 2 === 0 ? 1.4 : -1.1) + i;
      m.rotation.x = Math.PI / 2;
      const scale = 1 + ((Math.sin(t * 0.6) + 1) / 2) * 1.6;
      m.scale.setScalar(base > 0 ? scale * (0.8 + i * 0.25) : 0.001);
      (m.material as THREE.MeshBasicMaterial).opacity = base * (0.65 - i * 0.14);
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[0, 0.03, 0]}>
          <ringGeometry args={[2.2, 2.28, 64]} />
          <meshBasicMaterial color="#f0b43c" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Blueprint() {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    const t = inPhase(scrollState.process, 0.2, 0.4);
    ref.current.visible = t > 0.001;
    ref.current.scale.setScalar(Math.max(t, 0.001));
    ref.current.position.y = -0.4 * (1 - t);
  });
  const rect = [
    new THREE.Vector3(-2.2, 0.04, -1.6),
    new THREE.Vector3(2.2, 0.04, -1.6),
    new THREE.Vector3(2.2, 0.04, 1.6),
    new THREE.Vector3(-2.2, 0.04, 1.6),
    new THREE.Vector3(-2.2, 0.04, -1.6),
  ];
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.6, 3.4]} />
        <meshStandardMaterial color="#10151c" transparent opacity={0.94} roughness={0.85} />
      </mesh>
      <Line points={rect} color="#f0b43c" lineWidth={1.4} dashed dashSize={0.5} gapSize={0.3} transparent opacity={0.9} />
      {[-1.2, 0, 1.2].map((x) => (
        <Line key={x} points={[new THREE.Vector3(x, 0.05, -1.6), new THREE.Vector3(x, 0.05, 1.6)]} color="#f0b43c" lineWidth={0.7} transparent opacity={0.4} />
      ))}
      {[-0.8, 0, 0.8].map((z) => (
        <Line key={z} points={[new THREE.Vector3(-2.2, 0.05, z), new THREE.Vector3(2.2, 0.05, z)]} color="#f0b43c" lineWidth={0.7} transparent opacity={0.4} />
      ))}
    </group>
  );
}

const CRATES: { pos: [number, number, number]; size: [number, number, number] }[] = [
  { pos: [-3.4, 0.35, -2.2], size: [0.8, 0.7, 0.8] },
  { pos: [-2.5, 0.3, -2.8], size: [0.6, 0.6, 0.6] },
  { pos: [-3.9, 0.25, -1.4], size: [0.5, 0.5, 0.5] },
  { pos: [-1.6, 0.28, -2.5], size: [0.68, 0.56, 0.68] },
  { pos: [-3.1, 0.55, -2.5], size: [0.5, 0.42, 0.5] },
  { pos: [-2.2, 0.18, -1.6], size: [0.9, 0.36, 0.5] },
  { pos: [-4.4, 0.3, -2.4], size: [0.55, 0.6, 0.55] },
];

function Materials() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = inPhase(scrollState.process, 0.4, 0.6);
    refs.current.forEach((g, i) => {
      if (!g) return;
      const k = clamp01((t - i * 0.12) / 0.16);
      g.scale.setScalar(Math.max(k, 0.0001));
      g.position.y = 0.3 + (1 - k) * 2.2;
    });
  });
  return (
    <group>
      {CRATES.map((c, i) => (
        <group
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          position={c.pos}
        >
          <mesh>
            <boxGeometry args={c.size} />
            <meshStandardMaterial color={i % 2 ? "#3a3f48" : "#494f5a"} roughness={0.75} metalness={0.25} />
            <Edges color="#6d7686" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Building() {
  const body = useRef<THREE.Mesh>(null!);
  const crane = useRef<THREE.Group>(null!);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const bodyGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1.5, 4.8, 1.2);
    g.translate(0, 2.4, 0);
    return g;
  }, []);
  useFrame(({ clock }) => {
    const p = scrollState.process;
    const t = inPhase(p, 0.6, 0.8);
    body.current.scale.y = Math.max(t, 0.0001);
    const sweep = clock.elapsedTime;
    crane.current.rotation.y = 0.35 + Math.sin(sweep * 0.45) * 0.5 * (t > 0.05 ? 1 : 0);

    const q = inPhase(p, 0.8, 1);
    rings.current.forEach((m, i) => {
      if (!m) return;
      m.visible = q > 0.001;
      const r = (sweep * (1.6 + i * 0.5) + i * 2) % 8;
      m.scale.setScalar(0.6 + r);
      (m.material as THREE.MeshBasicMaterial).opacity = q * (1 - r / 8) * 0.55;
    });
  });
  return (
    <group>
      <mesh ref={body} position={[0, 0.44, 0]} geometry={bodyGeo}>
        <meshStandardMaterial color="#2c313c" roughness={0.5} metalness={0.5} />
        <Edges color="#5c6678" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[2.4, 0.44, 2.1]} />
        <meshStandardMaterial color="#343a45" roughness={0.7} metalness={0.25} />
        <Edges color="#6a7484" />
      </mesh>
      <group ref={crane} position={[2.8, 0, -1.8]}>
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[0.26, 4.4, 0.26]} />
          <meshStandardMaterial color="#3c424d" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[1.6, 4.4, 0]}>
          <boxGeometry args={[3.2, 0.16, 0.16]} />
          <meshStandardMaterial color="#4a515d" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[1.6, 3.6, 0]}>
          <boxGeometry args={[0.06, 1.4, 0.06]} />
          <meshStandardMaterial color="#f0b43c" emissive="#8a5c10" emissiveIntensity={0.5} />
        </mesh>
      </group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => { rings.current[i] = el; }}
          position={[0, 1.4 + i * 1.3, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[1.3, 1.36, 48]} />
          <meshBasicMaterial color="#7fd4ff" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function ProcessScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#a9b6d4", "#0a0b0d", 0.6]} />
      <directionalLight position={[6, 12, 8]} intensity={2} color="#e9edf8" />
      <directionalLight position={[-8, 5, -6]} intensity={0.5} color="#93a7dc" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[30, 48]} />
        <meshStandardMaterial color="#0c0d10" roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.005, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1d2026"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#333944"
        fadeDistance={38}
        fadeStrength={2.2}
        infiniteGrid
      />
      <ScanRings />
      <Blueprint />
      <Materials />
      <Building />
      <Sparkles count={44} scale={[12, 5, 10]} size={1.3} speed={0.22} opacity={0.3} color="#9fb3c8" position={[0, 2, 0]} />
    </>
  );
}

export function ProcessCanvas() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 38, position: [8.5, 7.5, 11.5], near: 0.1, far: 80 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0b0c0e"]} />
      <fog attach="fog" args={["#0b0c0e", 16, 44]} />
      <ProcessScene />
    </Canvas>
  );
}
