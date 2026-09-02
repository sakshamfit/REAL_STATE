"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid, Sparkles } from "@react-three/drei";
import { damp } from "@/lib/utils";

function LatticeTower() {
  const rig = useRef<THREE.Group>(null!);
  const spin = useRef(0.12);

  const verticals = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 8; i++) arr.push((i / 8) * Math.PI * 2);
    return arr;
  }, []);

  useFrame((_, delta) => {
    spin.current = damp(spin.current, 0.28, 1.4, delta);
    rig.current.rotation.y += spin.current * delta;
  });

  return (
    <group ref={rig}>
      {/* core */}
      <mesh position={[0, 3.4, 0]}>
        <cylinderGeometry args={[0.55, 0.75, 6.8, 10]} />
        <meshStandardMaterial color="#23272f" roughness={0.55} metalness={0.5} />
        <Edges color="#4d5666" />
      </mesh>
      {/* rings */}
      {[1.00, 2.35, 3.7, 5.05, 6.35].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[i === 2 ? 1.55 : 1.15, 0.06, 8, 48]} />
          <meshStandardMaterial color={i === 2 ? "#f0b43c" : "#4d5566"} metalness={0.7} roughness={0.3} emissive={i === 2 ? "#4a3003" : "#000"} emissiveIntensity={i === 2 ? 1.2 : 0} />
        </mesh>
      ))}
      {/* verticals */}
      {verticals.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 1.15, 3.4, Math.cos(a) * 1.15]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.05, 6.8, 0.05]} />
          <meshStandardMaterial color="#39404d" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {/* spiral brace */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[0, 0.8 + i * 1.32, 0]}
          rotation={[Math.PI / 4 + i * 0.4, i * 0.9, 0]}
        >
          <torusGeometry args={[1.32, 0.035, 6, 40, Math.PI * 1.15]} />
          <meshStandardMaterial color="#6a7488" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* beacon */}
      <mesh position={[0, 7.15, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#ff6a4a" emissive="#ff6a4a" emissiveIntensity={2.2} />
      </mesh>
      <pointLight position={[0, 7.6, 0]} color="#ff8a5c" intensity={4} distance={10} />
      {/* orbiting ring */}
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[2.6, 0.02, 6, 64]} />
        <meshStandardMaterial color="#f0b43c" emissive="#8a5c10" emissiveIntensity={1.4} metalness={0.4} roughness={0.2} />
      </mesh>
    </group>
  );
}

function GroundGrid() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#0c0d10" roughness={1} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[50, 50]}
        cellSize={1.2}
        cellThickness={0.5}
        cellColor="#1d2026"
        sectionSize={6}
        sectionThickness={1}
        sectionColor="#333944"
        fadeDistance={42}
        fadeStrength={2.4}
        infiniteGrid
      />
    </>
  );
}

export function TrustCanvas() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "low-power" }}
      camera={{ fov: 36, position: [7.4, 5.4, 10.5], near: 0.1, far: 80 }}
      style={{ width: "100%", height: "100%" }}
    >
      <fog attach="fog" args={["#0c0d10", 14, 40]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#aab6d4", "#08090b", 0.55]} />
      <directionalLight position={[6, 12, 8]} intensity={2} color="#e9edf8" />
      <directionalLight position={[-7, 4, -6]} intensity={0.5} color="#93a7dc" />
      <LatticeTower />
      <GroundGrid />
      <Sparkles count={36} scale={[10, 8, 10]} size={1.4} speed={0.16} opacity={0.3} color="#9fb3c8" position={[0, 4, 0]} />
    </Canvas>
  );
}
