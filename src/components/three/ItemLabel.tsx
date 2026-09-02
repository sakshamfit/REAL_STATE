"use client";

/**
 * Shared building blocks for "the items are the 3D".
 *
 * Every item list on the site (trust pillars, clients, process steps, timeline
 * milestones) is rendered as a real object inside its section's *existing*
 * canvas. Nothing here opens a second WebGL context — the page already runs
 * eight canvases and the browser silently evicts beyond ~4 live contexts, so
 * items live inside the rig they belong to.
 *
 * Labels are drei <Html>: they ride the object in 3D but stay real text, so
 * they remain selectable and legible at any camera distance.
 */
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, type ReactNode } from "react";

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ease = (t: number) => t * t * (3 - 2 * t);
export const lerpTo = (current: number, target: number, dt: number, lambda = 6) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/**
 * A billboarded text plate pinned to a 3D object.
 *
 * `getOpacity` is polled in the frame loop rather than passed as a prop, so a
 * fade never triggers a React re-render. Fully faded plates are hidden from
 * compositing — twenty of these updating every frame is free when the ones
 * off-camera are `visibility: hidden`.
 */
export function ItemLabel({
  position,
  distanceFactor = 14,
  getOpacity,
  align = "center",
  children,
}: {
  position: [number, number, number];
  distanceFactor?: number;
  getOpacity?: () => number;
  align?: "center" | "left";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const o = getOpacity ? clamp01(getOpacity()) : 1;
    el.style.opacity = o.toFixed(3);
    el.style.visibility = o < 0.01 ? "hidden" : "visible";
    el.style.transform = `translateY(${((1 - o) * 12).toFixed(2)}px)`;
  });

  return (
    <Html
      position={position}
      center={align === "center"}
      distanceFactor={distanceFactor}
      className="map-label"
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div ref={ref} className="select-none whitespace-nowrap">
        {children}
      </div>
    </Html>
  );
}

/**
 * Steel plinth + accent inlay that every item stands on, so a list of items
 * reads as one family of objects rather than four unrelated props.
 */
export function ItemPlinth({
  radius = 1.25,
  height = 0.34,
  concrete,
  steel,
}: {
  radius?: number;
  height?: number;
  concrete: THREE.Material;
  steel: THREE.Material;
}) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]} material={concrete} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.08, height, 32]} />
      </mesh>
      <mesh position={[0, height + 0.02, 0]} material={steel}>
        <cylinderGeometry args={[radius * 0.86, radius * 0.86, 0.04, 32]} />
      </mesh>
      <mesh position={[0, height + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.9, radius * 0.95, 40]} />
        <meshBasicMaterial color="#d8a76a" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * A vertical beam that lights up under the active item — the cheapest way to
 * make "this one is selected" legible from a moving camera.
 */
export function SelectionBeam({ getIntensity }: { getIntensity: () => number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = clamp01(getIntensity()) * 0.22;
  });
  return (
    <mesh ref={ref} position={[0, 3.4, 0]}>
      <cylinderGeometry args={[0.5, 1.5, 6.8, 20, 1, true]} />
      <meshBasicMaterial
        color="#d8a76a"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
