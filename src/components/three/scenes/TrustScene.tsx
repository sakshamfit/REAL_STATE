"use client";

/**
 * QUALITY / SAFETY / COMPLIANCE / SUSTAINABILITY — a slow-turning hero object:
 * a safety helmet on a plinth inside a steel lattice, with a scanning pass.
 */
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { getConcreteTexture, getGlowTexture } from "@/lib/three/materials";
import { trustPillars } from "@/lib/data/content";

export default function TrustScene({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const turntable = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const nodes = useRef<THREE.Group>(null);

  const mats = useMemo(
    () => ({
      shell: new THREE.MeshStandardMaterial({ color: "#efe9dc", roughness: 0.34, metalness: 0.06 }),
      shellRim: new THREE.MeshStandardMaterial({ color: "#d8d1c2", roughness: 0.4 }),
      steel: new THREE.MeshStandardMaterial({ color: "#39414a", roughness: 0.34, metalness: 0.92 }),
      steelLight: new THREE.MeshStandardMaterial({ color: "#8b95a1", roughness: 0.28, metalness: 0.95 }),
      concrete: new THREE.MeshStandardMaterial({
        color: "#7f868d",
        map: getConcreteTexture(),
        roughness: 0.95,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: "#d8a76a",
        emissive: "#d8a76a",
        emissiveIntensity: 0.8,
        roughness: 0.4,
        metalness: 0.5,
      }),
    }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (turntable.current && !reducedMotion) turntable.current.rotation.y += delta * 0.18;
    if (scan.current) {
      scan.current.position.y = 0.4 + ((t * 0.55) % 3.4);
      const m = scan.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.18 + Math.sin(t * 1.6) * 0.05;
    }
    if (beam.current) beam.current.rotation.y = t * 0.5;
    if (nodes.current) {
      nodes.current.children.forEach((c, i) => {
        const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 0.5 + Math.sin(t * 2 + i * 1.4) * 0.35;
      });
    }
  });

  return (
    <group position={[0, -1.7, 0]}>
      {/* plinth */}
      <mesh position={[0, 0.2, 0]} material={mats.concrete} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 2.7, 0.4, 48]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={mats.steel}>
        <cylinderGeometry args={[2.2, 2.2, 0.06, 48]} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[2.35, 0.02, 8, 64]} />
        <meshBasicMaterial color="#d8a76a" transparent opacity={0.6} />
      </mesh>

      <group ref={turntable} position={[0, 0.55, 0]}>
        {/* helmet */}
        <group position={[0, 1.15, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[1.15, 40, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={mats.shell} attach="material" />
          </mesh>
          <mesh position={[0, -0.06, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.52, 0.13, 48]} />
            <primitive object={mats.shellRim} attach="material" />
          </mesh>
          <mesh position={[0, 0.02, 1.32]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[1.1, 0.06, 0.6]} />
            <primitive object={mats.shellRim} attach="material" />
          </mesh>
          {/* ridge */}
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.16, 0.62, 2.0]} />
            <primitive object={mats.shellRim} attach="material" />
          </mesh>
          {/* accent band */}
          <mesh position={[0, 0.05, 0]}>
            <torusGeometry args={[1.16, 0.035, 8, 48]} />
            <primitive object={mats.accent} attach="material" />
          </mesh>
        </group>

        {/* lattice cage */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const x = Math.cos(a) * 2.1;
          const z = Math.sin(a) * 2.1;
          return (
            <group key={i}>
              <mesh position={[x, 1.7, z]} material={mats.steel} castShadow>
                <boxGeometry args={[0.12, 3.4, 0.12]} />
              </mesh>
              <mesh
                position={[(x * 3) / 4, 1.7, (z * 3) / 4]}
                rotation={[0, -a, Math.PI / 5]}
                material={mats.steelLight}
              >
                <boxGeometry args={[0.05, 3.4, 0.05]} />
              </mesh>
            </group>
          );
        })}
        {[0.9, 2.0, 3.1].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} material={mats.steel}>
            <torusGeometry args={[2.1, 0.04, 8, 60]} />
          </mesh>
        ))}
      </group>

      {/* scan plane */}
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 2.9, 48]} />
        <meshBasicMaterial
          color="#74d3d8"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* light beam */}
      <mesh ref={beam} position={[0, 3.2, 0]}>
        <coneGeometry args={[2.6, 4.4, 32, 1, true]} />
        <meshBasicMaterial
          color="#d8a76a"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* pillar nodes */}
      <group ref={nodes}>
        {trustPillars.map((p, i) => {
          const a = (i / trustPillars.length) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh key={p.title} position={[Math.cos(a) * 3.6, 1.2, Math.sin(a) * 3.6]}>
              <octahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial color="#d8a76a" emissive="#d8a76a" emissiveIntensity={0.6} />
            </mesh>
          );
        })}
      </group>

      <sprite position={[0, 1.7, 0]} scale={[6, 6, 1]}>
        <spriteMaterial map={getGlowTexture()} color="#d8a76a" transparent opacity={0.1} depthWrite={false} />
      </sprite>
    </group>
  );
}
