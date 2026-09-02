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
      <mesh position={[0, 3.4, 0]}>
        <cylinderGeometry args={[0.55, 0.75, 6.8, 10]} />
        <meshStandardMaterial color="#3b4150" roughness={0.5} metalness={0.5} />
        <Edges color="#6b7484" />
      </mesh>
      {[1.0, 2.35, 3.7, 5.05, 6.35].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[i === 2 ? 1.55 : 1.15, 0.06, 8, 48]} />
          <meshStandardMaterial
            color={i === 2 ? "#c2410c" : "#5a6270"}
            metalness={0.6}
            roughness={0.35}
            emissive={i === 2 ? "#3a2404" : "#000"}
            emissiveIntensity={i === 2 ? 1 : 0}
          />
        </mesh>
      ))}
      {verticals.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 1.15, 3.4, Math.cos(a) * 1.15]}>
          <boxGeometry args={[0.05, 6.8, 0.05]} />
          <meshStandardMaterial color="#4c5462" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.8 + i * 1.32, 0]} rotation={[Math.PI / 4 + i * 0.4, i * 0.9, 0]}>
          <torusGeometry args={[1.32, 0.035, 6, 40, Math.PI * 1.15]} />
          <meshStandardMaterial color="#79828f" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 7.15, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#e2402c" emissive="#ff5a3c" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 7.6, 0]} color="#ff8a5c" intensity={3} distance={10} />
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[2.6, 0.02, 6, 64]} />
        <meshStandardMaterial color="#c2410c" emissive="#3a2404" emissiveIntensity={1.2} metalness={0.4} roughness={0.25} />
      </mesh>
    </group>
  );
}

function GroundGrid() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#d8d4ca" roughness={1} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[50, 50]}
        cellSize={1.2}
        cellThickness={0.55}
        cellColor="#a6afc0"
        sectionSize={6}
        sectionThickness={1}
        sectionColor="#8590a4"
        fadeDistance={44}
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
      <color attach="background" args={["#e6ebf2"]} />
      <fog attach="fog" args={["#e6ebf2", 15, 42]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#c9c0b1", 0.7]} />
      <directionalLight position={[6, 12, 8]} intensity={1.9} color="#fff6e8" />
      <directionalLight position={[-7, 4, -6]} intensity={0.4} color="#aebcd6" />
      <LatticeTower />
      <GroundGrid />
      <Sparkles count={36} scale={[10, 8, 10]} size={1.3} speed={0.16} opacity={0.4} color="#7f8aa0" position={[0, 4, 0]} />
    </Canvas>
  );
}
