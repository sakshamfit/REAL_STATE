"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Edges, Sparkles } from "@react-three/drei";
import { damp } from "@/lib/utils";

export function ModelRig({ active, children }: { active: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const speed = useRef(0.12);
  useFrame((_, delta) => {
    speed.current = damp(speed.current, active ? 0.9 : 0.14, 4, delta);
    ref.current.rotation.y += speed.current * delta;
  });
  return <group ref={ref}>{children}</group>;
}

const PLINTH = (
  <mesh position={[0, 0.07, 0]}>
    <cylinderGeometry args={[1.9, 2.1, 0.14, 40]} />
    <meshStandardMaterial color="#14161a" roughness={0.9} metalness={0.1} />
  </mesh>
);

function Civil() {
  const cols = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (const x of [-0.7, 0.7]) for (const z of [-0.55, 0.55]) arr.push([x, 1.2, z]);
    return arr;
  }, []);
  return (
    <group>
      {cols.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.16, 2.4, 0.16]} />
          <meshStandardMaterial color="#2b303a" roughness={0.45} metalness={0.6} />
        </mesh>
      ))}
      {[0, 1.2, 2.4].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.9, 0.1, 1.5]} />
          <meshStandardMaterial color={y === 0 ? "#3a3f49" : "#474d58"} roughness={0.7} metalness={0.2} />
          <Edges color="#778294" />
        </mesh>
      ))}
      <mesh position={[0, 2.55, 0]}>
        <boxGeometry args={[0.85, 0.22, 0.6]} />
        <meshStandardMaterial color="#f0b43c" emissive="#7a4f0c" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Residential() {
  return (
    <group position={[0, 0.14, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.7, 1.1, 1.25]} />
        <meshStandardMaterial color="#3a3f47" roughness={0.8} metalness={0.12} />
        <Edges color="#6b7484" />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.28, 0.85, 4]} />
        <meshStandardMaterial color="#23262d" roughness={0.7} metalness={0.3} />
        <Edges color="#4a515e" />
      </mesh>
      <mesh position={[-0.28, 0.52, 0.64]}>
        <boxGeometry args={[0.34, 0.6, 0.06]} />
        <meshStandardMaterial color="#f0b43c" emissive="#8a5c10" emissiveIntensity={0.55} />
      </mesh>
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.75, 0.64]}>
          <boxGeometry args={[0.34, 0.38, 0.05]} />
          <meshStandardMaterial color="#a7c8d8" metalness={0.5} roughness={0.2} emissive="#24333c" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Commercial() {
  const windows = useMemo(() => {
    const arr: { pos: [number, number, number] }[] = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
      arr.push({ pos: [-0.44 + c * 0.44, 0.35 + r * 0.4, 0.53] });
      arr.push({ pos: [0.53, 0.35 + r * 0.4, -0.44 + c * 0.44] });
    }
    return arr;
  }, []);
  return (
    <group position={[0, 0.14, 0]}>
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[1.1, 2.9, 1.1]} />
        <meshStandardMaterial color="#2c313b" roughness={0.5} metalness={0.45} />
        <Edges color="#5d6678" />
      </mesh>
      {windows.map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={[0.26, 0.22, 0.04]} />
          <meshStandardMaterial color="#8fb7cc" metalness={0.6} roughness={0.15} emissive="#1d2d38" emissiveIntensity={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[1.2, 0.18, 1.2]} />
        <meshStandardMaterial color="#3d434e" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 3.45, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
        <meshStandardMaterial color="#f0b43c" emissive="#f0b43c" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function Infrastructure() {
  const line = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.9, 1.55, 0),
      new THREE.Vector3(-1.0, 2.05, 0),
      new THREE.Vector3(0, 2.2, 0),
      new THREE.Vector3(1.0, 2.05, 0),
      new THREE.Vector3(1.9, 1.55, 0),
    ]);
    return new THREE.TubeGeometry(curve, 40, 0.02, 6, false);
  }, []);
  const line2 = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.9, 1.55, -0.28),
      new THREE.Vector3(-1.0, 2.05, -0.28),
      new THREE.Vector3(0, 2.2, -0.28),
      new THREE.Vector3(1.0, 2.05, -0.28),
      new THREE.Vector3(1.9, 1.55, -0.28),
    ]);
    return new THREE.TubeGeometry(curve, 40, 0.02, 6, false);
  }, []);
  return (
    <group position={[0, 0.14, 0]}>
      {[-0.7, 0.7].map((x) => (
        <group key={x}>
          {[-0.22, 0.22].map((z) => (
            <group key={z}>
              {[0, 0.62, 1.24].map((y) => (
                <mesh key={y} position={[x, y, z]}>
                  <boxGeometry args={[0.14, 0.05, 0.14]} />
                  <meshStandardMaterial color="#333944" roughness={0.5} metalness={0.5} />
                </mesh>
              ))}
            </group>
          ))}
          <mesh position={[x, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.16, 0.05, 0.5]} />
            <meshStandardMaterial color="#333944" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.56, 0]}>
        <boxGeometry args={[4.1, 0.14, 0.75]} />
        <meshStandardMaterial color="#464d59" roughness={0.65} metalness={0.25} />
        <Edges color="#7b8698" />
      </mesh>
      {[-0.34, 0.34].map((z) => (
        <mesh key={z} position={[0, 1.75, z]}>
          <boxGeometry args={[4.1, 0.16, 0.04]} />
          <meshStandardMaterial color="#2a2e37" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      <mesh geometry={line}>
        <meshStandardMaterial color="#f0b43c" metalness={0.4} roughness={0.3} emissive="#5f3d06" emissiveIntensity={0.5} />
      </mesh>
      <mesh geometry={line2}>
        <meshStandardMaterial color="#7f8ba0" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Solar() {
  const panels = useMemo(() => {
    const arr: { pos: [number, number, number] }[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      arr.push({ pos: [-0.62 + c * 0.62, 0.38, -0.5 + r * 0.5] });
    }
    return arr;
  }, []);
  return (
    <group position={[0, 0.14, 0]}>
      {panels.map((p, i) => (
        <group key={i} position={p.pos}>
          <mesh position={[0, -0.16, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.32, 8]} />
            <meshStandardMaterial color="#3a404c" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh rotation={[-0.45, 0, 0]}>
            <boxGeometry args={[0.56, 0.035, 0.44]} />
            <meshStandardMaterial color="#10202c" metalness={0.75} roughness={0.28} emissive="#123a52" emissiveIntensity={0.7} />
            <Edges color="#3f7ba1" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.55, -0.1]}>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial color="#ffd76a" emissive="#ffb52e" emissiveIntensity={2.2} />
      </mesh>
      <pointLight position={[0, 1.7, -0.1]} color="#ffcf6e" intensity={6} distance={7} />
    </group>
  );
}

function Renovation() {
  const scaffold = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let r = 0; r < 3; r++) for (const x of [-1.02, -0.62]) arr.push([x, 0.3 + r * 0.62, -0.5]);
    return arr;
  }, []);
  return (
    <group position={[0, 0.14, 0]}>
      {/* old half */}
      <mesh position={[-0.48, 0.5, 0]}>
        <boxGeometry args={[0.96, 1.0, 1.2]} />
        <meshStandardMaterial color="#453c31" roughness={1} metalness={0} />
        <Edges color="#6b5c48" />
      </mesh>
      {/* new half — glass */}
      <mesh position={[0.48, 0.5, 0]}>
        <boxGeometry args={[0.96, 1.0, 1.2]} />
        <meshStandardMaterial color="#9dc8dc" roughness={0.1} metalness={0.7} transparent opacity={0.85} />
        <Edges color="#d7e7ef" />
      </mesh>
      {/* new roof */}
      <mesh position={[0.48, 1.32, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.78, 0.5, 4]} />
        <meshStandardMaterial color="#272b33" roughness={0.6} metalness={0.35} />
      </mesh>
      {/* scaffold on old side */}
      {scaffold.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.035, 1.75, 0.035]} />
          <meshStandardMaterial color="#f0b43c" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      {[0.3, 0.92, 1.54].map((y) => (
        <mesh key={y} position={[-0.82, y, -0.5]}>
          <boxGeometry args={[0.42, 0.03, 0.03]} />
          <meshStandardMaterial color="#f0b43c" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2.1, 0.1, 1.5]} />
        <meshStandardMaterial color="#191c21" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function ServiceModel({ variant }: { variant: string }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#eef1f8" />
      <directionalLight position={[-5, 3, -4]} intensity={0.7} color="#8fa4d8" />
      {PLINTH}
      {variant === "civil" && <Civil />}
      {variant === "residential" && <Residential />}
      {variant === "commercial" && <Commercial />}
      {variant === "infrastructure" && <Infrastructure />}
      {variant === "solar" && <Solar />}
      {variant === "renovation" && <Renovation />}
      <Sparkles count={16} scale={[4.4, 3, 4.4]} size={1.2} speed={0.24} opacity={0.3} color="#97a7c2" />
    </>
  );
}
