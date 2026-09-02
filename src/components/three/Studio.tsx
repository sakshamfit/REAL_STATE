"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type ReactNode, useMemo, useRef } from "react";
import {
  getConcreteTexture,
  getGridTexture,
  getGlowTexture,
  makeRandom,
  palette,
} from "@/lib/three/materials";

/**
 * Shared studio rig used by every scene on the site.
 * Graphite void + one warm key + cool rim + a procedural env map (no HDRI file).
 */
export default function Studio({
  keyPos = [9, 15, 9],
  keyIntensity = 2.4,
  rim = [-11, 6, -13],
  rimColor = "#8fb9c9",
  accentLight = "#d8a76a",
  ambient = 0.28,
  shadows = true,
  envIntensity = 0.55,
  children,
}: {
  /** position of the warm key light */
  keyPos?: [number, number, number];
  keyIntensity?: number;
  rim?: [number, number, number];
  rimColor?: string;
  accentLight?: string;
  ambient?: number;
  shadows?: boolean;
  envIntensity?: number;
  children?: ReactNode;
}) {
  return (
    <>
      <color attach="background" args={["#06070a"]} />
      <hemisphereLight args={["#c6d6df", "#0b0d10", ambient]} />
      <directionalLight
        position={keyPos}
        intensity={keyIntensity}
        color="#fff3e2"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0009}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={90}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={30}
        shadow-camera-bottom={-16}
      />
      <directionalLight position={rim} intensity={1.1} color={rimColor} />
      <pointLight position={[0, 3.5, -14]} intensity={28} distance={38} color={accentLight} />
      <Environment resolution={256} frames={1} environmentIntensity={envIntensity}>
        <Lightformer intensity={2.4} position={[0, 9, -6]} scale={[14, 8, 1]} color="#e8f2ff" />
        <Lightformer intensity={1.1} position={[-9, 4, 3]} rotation-y={Math.PI / 2} scale={[8, 6, 1]} color="#b7d3e0" />
        <Lightformer intensity={1.5} position={[9, 3, 4]} rotation-y={-Math.PI / 2} scale={[7, 5, 1]} color={accentLight} />
        <Lightformer intensity={0.5} position={[0, -6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} color="#22262b" />
      </Environment>
      {children}
    </>
  );
}

/** Dark matte site ground + optional blueprint grid overlay. */
export function SiteGround({
  radius = 60,
  grid = true,
  gridSize = 90,
  repeat = 6,
  y = 0,
}: {
  radius?: number;
  grid?: boolean;
  gridSize?: number;
  repeat?: number;
  y?: number;
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 72]} />
        <meshStandardMaterial
          map={getConcreteTexture()}
          color="#5c636a"
          roughness={0.98}
          metalness={0}
          // repeat is applied through the shared texture instance below
        />
      </mesh>
      <GroundTextureRepeat repeat={repeat} />
      {grid && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <planeGeometry args={[gridSize, gridSize]} />
          <meshBasicMaterial
            map={getGridTexture({ divisions: 30 })}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      <SoftBlob radius={radius * 0.42} />
    </group>
  );
}

/** Applies tiling to the shared concrete texture without re-creating it. */
function GroundTextureRepeat({ repeat }: { repeat: number }) {
  const tex = getConcreteTexture();
  tex.repeat.set(repeat, repeat);
  return null;
}

/** Fake ambient-occlusion pool under the subject. */
export function SoftBlob({ radius = 12, opacity = 0.5, y = 0.02 }: { radius?: number; opacity?: number; y?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <circleGeometry args={[radius, 48]} />
      <meshBasicMaterial map={getGlowTexture()} color="#000000" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** Slow-drifting dust motes. Count scales with the device tier. */
export function DustField({
  count = 420,
  radius = 34,
  height = 26,
  color = "#cfe0e8",
  size = 0.075,
  speed = 0.22,
  opacity = 0.5,
}: {
  count?: number;
  radius?: number;
  height?: number;
  color?: string;
  size?: number;
  speed?: number;
  opacity?: number;
}) {
  // deterministic field — same dust on every load, and pure during render
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const rand = makeRandom(7717);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = rand() * height;
      positions[i * 3 + 2] = Math.sin(a) * r;
      seeds[i] = rand() * Math.PI * 2;
    }
    return { positions, seeds };
  }, [count, radius, height]);

  const ref = useRef<THREE.Points | null>(null);

  useFrame((state, delta) => {
    const p = ref.current;
    if (!p) return;
    const attr = p.geometry.getAttribute("position") as THREE.BufferAttribute;
    const seedAttr = p.geometry.getAttribute("seed") as THREE.BufferAttribute;
    if (!attr) return;
    const t = state.clock.elapsedTime;
    const step = Math.min(delta, 0.05) * speed;
    for (let i = 0; i < attr.count; i++) {
      let y = attr.getY(i) + step;
      if (y > height) y = 0;
      attr.setY(i, y);
      attr.setX(i, attr.getX(i) + Math.sin(t * 0.6 + (seedAttr ? seedAttr.getX(i) : 0)) * step * 0.35);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-seed" args={[seeds, 1]} />
      </bufferGeometry>
      <pointsMaterial
        map={getGlowTexture()}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export const studioPalette = palette;
