"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid, Line, Sparkles, ContactShadows } from "@react-three/drei";
import { clamp01, damp, scrollState } from "@/lib/utils";

const FLOORS = 10;
const FH = 3.3;
const COLS_X = [-4.8, -1.6, 1.6, 4.8];
const COLS_Z = [-3.6, 0, 3.6];
const SLAB_W = 14.8;
const SLAB_D = 10.8;
const SLAB_T = 0.32;
const CORE_W = 3.4;
const CORE_D = 2.4;
const TOTAL_H = FLOORS * FH;
const COL_COUNT = FLOORS * COLS_X.length * COLS_Z.length;

const WINDOWS_PER_FACE = 9;

function ColumnField() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.42, FH, 0.42);
    g.translate(0, FH / 2, 0);
    return g;
  }, []);

  useFrame(() => {
    const p = scrollState.hero;
    let idx = 0;
    for (let f = 0; f < FLOORS; f++) {
      for (const cz of COLS_Z) {
        for (const cx of COLS_X) {
          const start = 0.135 + f * 0.0135 + (cx + 6) * 0.002;
          const s = clamp01((p - start) / 0.085);
          dummy.position.set(cx, f * FH, cz);
          dummy.scale.set(1, Math.max(s, 0.0001), 1);
          dummy.updateMatrix();
          ref.current.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COL_COUNT]} frustumCulled={false} geometry={colGeo}>
      <meshStandardMaterial color="#23262d" roughness={0.55} metalness={0.6} />
    </instancedMesh>
  );
}

function BuildingCore() {
  const ref = useRef<THREE.Mesh>(null!);
  const coreGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(CORE_W, TOTAL_H, CORE_D);
    g.translate(0, TOTAL_H / 2, 0);
    return g;
  }, []);
  useFrame(() => {
    const s = clamp01((scrollState.hero - 0.44) / 0.14);
    ref.current.scale.y = Math.max(s, 0.0001);
  });
  return (
    <mesh ref={ref} geometry={coreGeo}>
      <meshStandardMaterial color="#1b1e24" roughness={0.45} metalness={0.55} />
      <Edges color="#3d4351" />
    </mesh>
  );
}

function Slabs() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    for (let j = 0; j <= FLOORS; j++) {
      const mesh = refs.current[j];
      if (!mesh) continue;
      const start = j === 0 ? 0.06 : 0.3 + j * 0.021;
      const s = clamp01((scrollState.hero - start) / 0.08);
      mesh.scale.x = Math.max(s, 0.0001);
      mesh.scale.z = Math.max(s, 0.0001);
      mesh.scale.y = Math.max(s, 0.0001);
    }
  });
  return (
    <group>
      {Array.from({ length: FLOORS + 1 }).map((_, j) => (
        <mesh
          key={j}
          ref={(el) => {
            refs.current[j] = el;
          }}
          position={[0, j * FH + (j === 0 ? 0.4 : SLAB_T / 2), 0]}
        >
          <boxGeometry args={[SLAB_W, j === 0 ? 0.5 : SLAB_T, SLAB_D]} />
          <meshStandardMaterial color={j === 0 ? "#343a45" : "#41464f"} roughness={0.72} metalness={0.18} />
          <Edges color="#6a7280" />
        </mesh>
      ))}
    </group>
  );
}

function Glass() {
  const mats = useMemo(
    () =>
      Array.from({ length: FLOORS }).map(
        () =>
          new THREE.MeshStandardMaterial({
            color: "#9dc4d8",
            transparent: true,
            opacity: 0.1,
            roughness: 0.14,
            metalness: 0.55,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
      ),
    []
  );
  const walls = useMemo(() => {
    const list: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let f = 0; f < FLOORS; f++) {
      const y = f * FH + FH * 0.58;
      list.push({ pos: [0, y, -SLAB_D / 2 + 0.15], size: [SLAB_W - 1.2, FH * 0.62, 0.07] });
      list.push({ pos: [0, y, SLAB_D / 2 - 0.15], size: [SLAB_W - 1.2, FH * 0.62, 0.07] });
      list.push({ pos: [-SLAB_W / 2 + 0.15, y, 0], size: [0.07, FH * 0.62, SLAB_D - 1.2] });
      list.push({ pos: [SLAB_W / 2 - 0.15, y, 0], size: [0.07, FH * 0.62, SLAB_D - 1.2] });
    }
    return list;
  }, []);

  useFrame(() => {
    for (let f = 0; f < FLOORS; f++) {
      const o = clamp01((scrollState.hero - (0.52 + f * 0.017)) / 0.1);
      mats[f].opacity = 0.08 + o * 0.44;
    }
  });

  return (
    <group>
      {walls.map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={w.size} />
          <primitive object={mats[Math.floor(i / 4)]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** Warm amber interior lights that switch on as each floor completes. */
function WindowGlow() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => new THREE.BoxGeometry(0.52, 0.6, 0.06), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const lit = useRef(-1);
  const INSTANCES = FLOORS * WINDOWS_PER_FACE * 2;

  useLayoutEffect(() => {
    const half = WINDOWS_PER_FACE / 2;
    const mesh = ref.current;
    if (!mesh) return;
    for (let f = 0; f < FLOORS; f++) {
      const y = f * FH + FH * 0.55;
      for (let i = 0; i < WINDOWS_PER_FACE; i++) {
        const x = (i - half + 0.5) * ((SLAB_W - 2.6) / half);
        dummy.position.set(x, y, -SLAB_D / 2 + 0.19);
        dummy.updateMatrix();
        mesh.setMatrixAt(f * WINDOWS_PER_FACE * 2 + i, dummy.matrix);
        dummy.position.set(x, y, SLAB_D / 2 - 0.19);
        dummy.updateMatrix();
        mesh.setMatrixAt(f * WINDOWS_PER_FACE * 2 + WINDOWS_PER_FACE + i, dummy.matrix);
      }
    }
    for (let i = 0; i < INSTANCES; i++) mesh.setColorAt(i, color.set("#1c2933"));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy, color]);

  useFrame(() => {
    const p = scrollState.hero;
    const totalLit = Math.floor(clamp01((p - 0.5) / 0.42) * FLOORS);
    if (totalLit === lit.current) return;
    lit.current = totalLit;
    for (let f = 0; f < FLOORS; f++) {
      const on = f < totalLit;
      const c = on ? "#ffcf70" : "#1c2933";
      for (let i = 0; i < WINDOWS_PER_FACE * 2; i++) {
        ref.current.setColorAt(f * WINDOWS_PER_FACE * 2 + i, color.set(c));
      }
    }
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, INSTANCES]} geometry={geo} frustumCulled={false}>
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Amber construction laser that sweeps up the facade while the building rises. */
function BuildSweep() {
  const band = useRef<THREE.Mesh>(null!);
  const light = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const p = scrollState.hero;
    const t = Math.min(1, p / 0.94);
    const y = -1 + t * (TOTAL_H + 2.5);
    band.current.position.y = y;
    band.current.visible = p > 0.04 && p < 0.965;
    const fade = 1 - clamp01((p - 0.86) / 0.1);
    const pulse = 0.7 + 0.3 * Math.sin(clock.elapsedTime * 5);
    (band.current.material as THREE.MeshBasicMaterial).opacity = fade * (0.3 + 0.18 * pulse);
    light.current.position.y = y + 1;
    light.current.intensity = fade * (16 + 9 * pulse);
  });
  return (
    <group>
      <mesh ref={band} position={[0, 0, 0]}>
        <boxGeometry args={[SLAB_W + 0.7, 0.16, SLAB_D + 0.7]} />
        <meshBasicMaterial color="#f0b43c" transparent opacity={0} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0, 0]} color="#f0b43c" distance={34} intensity={0} />
    </group>
  );
}

function Rooftop() {
  const mech = useRef<THREE.Mesh>(null!);
  const antenna = useRef<THREE.Group>(null!);
  useFrame(() => {
    const p = scrollState.hero;
    const s = clamp01((p - 0.88) / 0.08);
    mech.current.scale.setScalar(Math.max(s, 0.0001));
    antenna.current.scale.setScalar(Math.max(s, 0.0001));
  });
  return (
    <group>
      <mesh ref={mech} position={[0, TOTAL_H + 0.6, 0]}>
        <boxGeometry args={[2.6, 0.9, 1.8]} />
        <meshStandardMaterial color="#2c323c" roughness={0.6} metalness={0.4} />
        <Edges color="#4d5666" />
      </mesh>
      <group ref={antenna} position={[0, TOTAL_H + 0.9, -0.4]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 2.2, 8]} />
          <meshStandardMaterial color="#454d5a" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.25, 0]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#ff5a3c" emissive="#ff5a3c" emissiveIntensity={1.8} />
        </mesh>
      </group>
    </group>
  );
}

function Crane() {
  const rig = useRef<THREE.Group>(null!);
  const mast = useRef<THREE.Mesh>(null!);
  const hook = useRef<THREE.Mesh>(null!);
  const mastGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.72, 26, 0.72);
    g.translate(0, 13, 0);
    return g;
  }, []);
  useFrame(({ clock }) => {
    const p = scrollState.hero;
    const s = clamp01((p - 0.1) / 0.16);
    mast.current.scale.y = Math.max(s, 0.0001);
    const t = clock.elapsedTime;
    rig.current.rotation.y = 0.7 + Math.sin(t * 0.06) * 0.22;
    hook.current.position.y = -4 - Math.abs(Math.sin(t * 1.4)) * 3 * (p > 0.5 ? 0.35 : 1);
  });
  return (
    <group ref={rig} position={[-11.5, 0, -8.5]}>
      <mesh ref={mast} geometry={mastGeo}>
        <meshStandardMaterial color="#3a3f4a" roughness={0.5} metalness={0.65} />
        <Edges color="#7c8598" />
      </mesh>
      <group position={[0, 26.2, 0]}>
        <mesh position={[5, 0, 0]}>
          <boxGeometry args={[17, 0.6, 0.6]} />
          <meshStandardMaterial color="#454b58" roughness={0.5} metalness={0.65} />
        </mesh>
        <mesh position={[-3.6, -0.8, 0]}>
          <boxGeometry args={[3.4, 1.6, 1.4]} />
          <meshStandardMaterial color="#2d3138" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh position={[-5.2, 0, 0]}>
          <boxGeometry args={[2.6, 0.5, 0.5]} />
          <meshStandardMaterial color="#454b58" roughness={0.5} metalness={0.65} />
        </mesh>
        <mesh position={[13, 0, 0]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshStandardMaterial color="#f0b43c" emissive="#f0b43c" emissiveIntensity={0.7} />
        </mesh>
        <mesh ref={hook} position={[13, -4, 0]}>
          <boxGeometry args={[0.28, 8, 0.28]} />
          <meshStandardMaterial color="#5a616e" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[13, -8.4, 0]}>
          <boxGeometry args={[1.1, 0.9, 0.9]} />
          <meshStandardMaterial color="#f0b43c" emissive="#8a5c10" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function PlotOutline() {
  const pts = useMemo(
    () =>
      [
        new THREE.Vector3(-SLAB_W / 2 - 1.6, 0.06, -SLAB_D / 2 - 1.6),
        new THREE.Vector3(SLAB_W / 2 + 1.6, 0.06, -SLAB_D / 2 - 1.6),
        new THREE.Vector3(SLAB_W / 2 + 1.6, 0.06, SLAB_D / 2 + 1.6),
        new THREE.Vector3(-SLAB_W / 2 - 1.6, 0.06, SLAB_D / 2 + 1.6),
        new THREE.Vector3(-SLAB_W / 2 - 1.6, 0.06, -SLAB_D / 2 - 1.6),
      ],
    []
  );
  return <Line points={pts} color="#f0b43c" lineWidth={1.2} dashed dashSize={1.1} gapSize={0.7} transparent opacity={0.75} />;
}

function Rig() {
  useFrame((state, delta) => {
    const p = scrollState.hero;
    const a = -0.85 + p * 1.35;
    const r = 23.5 - p * 3.5;
    const h = 8.5 + p * 6.5;
    const tx = Math.sin(a) * r;
    const tz = Math.cos(a) * r;
    const target = new THREE.Vector3(0, TOTAL_H * 0.42 + p * 1.5, 0);
    const pos = new THREE.Vector3(tx, h, tz);
    state.camera.position.x = damp(state.camera.position.x, pos.x, 3, delta);
    state.camera.position.y = damp(state.camera.position.y, pos.y, 3, delta);
    state.camera.position.z = damp(state.camera.position.z, pos.z, 3, delta);
    state.camera.lookAt(target);
  });
  return null;
}

export function ConstructionScene() {
  return (
    <>
      <fog attach="fog" args={["#0a0a0c", 34, 92]} />
      <Rig />
      <ambientLight intensity={0.22} />
      <hemisphereLight args={["#aebcd6", "#0a0a0c", 0.5]} />
      <directionalLight position={[10, 22, 9]} intensity={1.9} color="#e8ecff" />
      <directionalLight position={[-14, 10, -10]} intensity={0.7} color="#9db4ff" />
      <spotLight position={[0, 42, -20]} angle={0.5} penumbra={1} intensity={0.7} color="#f0b43c" distance={95} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[70, 64]} />
        <meshStandardMaterial color="#0b0c0f" roughness={1} metalness={0} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[120, 120]}
        cellSize={1.2}
        cellThickness={0.55}
        cellColor="#23262d"
        sectionSize={6}
        sectionThickness={1}
        sectionColor="#3a3f47"
        fadeDistance={68}
        fadeStrength={2.2}
        infiniteGrid
      />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.5} scale={48} blur={2.6} far={40} color="#000000" />

      <PlotOutline />
      <ColumnField />
      <Slabs />
      <BuildingCore />
      <Glass />
      <WindowGlow />
      <BuildSweep />
      <Rooftop />
      <Crane />

      <Sparkles count={80} scale={[46, 16, 46]} size={1.6} speed={0.22} opacity={0.35} color="#9fb3c8" position={[0, 8, 0]} />
    </>
  );
}

export function ConstructionCanvas({ className = "" }: { className?: string }) {
  return (
    <Canvas
      className={className}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false }}
      camera={{ fov: 42, near: 0.1, far: 220, position: [-16, 9, 30] }}
      shadows={false}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0a0a0c"]} />
      <ConstructionScene />
    </Canvas>
  );
}
