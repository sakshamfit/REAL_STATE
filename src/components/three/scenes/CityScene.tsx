"use client";

/** Final CTA backdrop — a finished skyline at dusk, camera breathing slowly. */
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { getConcreteTexture, getGlowTexture, makeRandom } from "@/lib/three/materials";

export default function CityScene({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const cam = useThree((s) => s.camera);
  const pos = useRef(new THREE.Vector3(0, 5, 16));

  const mats = useMemo(
    () => ({
      concrete: new THREE.MeshStandardMaterial({
        color: "#6f767d",
        map: getConcreteTexture(),
        roughness: 0.95,
      }),
      dark: new THREE.MeshStandardMaterial({ color: "#22282e", roughness: 0.85, metalness: 0.2 }),
      steel: new THREE.MeshStandardMaterial({ color: "#333b43", roughness: 0.4, metalness: 0.85 }),
      warm: new THREE.MeshBasicMaterial({ color: "#ffcf94", transparent: true, opacity: 0.85 }),
      accent: new THREE.MeshStandardMaterial({
        color: "#d8a76a",
        emissive: "#d8a76a",
        emissiveIntensity: 0.7,
        roughness: 0.45,
      }),
    }),
    [],
  );

  const blocks = useMemo(() => {
    const rand = makeRandom(4242);
    return Array.from({ length: 16 }, (_, i) => {
      const ring = i < 6 ? 1 : 2;
      const a = (i / 16) * Math.PI * 2 + rand() * 0.4;
      const r = ring * (4.2 + rand() * 2.4);
      const w = 1.4 + rand() * 1.6;
      const d = 1.4 + rand() * 1.6;
      const h = 2.2 + rand() * (ring === 1 ? 7.4 : 4.6);
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        w,
        d,
        h,
        floors: Math.max(2, Math.round(h / 1.1)),
        seed: rand(),
      };
    });
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const drift = reducedMotion ? 0 : Math.sin(t * 0.16) * 1.6;
    pos.current.lerp(
      new THREE.Vector3(drift, 5.4 + (reducedMotion ? 0 : Math.sin(t * 0.22) * 0.35), 16),
      1 - Math.pow(0.02, dt),
    );
    cam.position.copy(pos.current);
    cam.lookAt(0, 3.2, 0);
  });

  return (
    <group position={[0, -1.4, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#0a0d10" roughness={0.95} />
      </mesh>
      <gridHelper args={[46, 46, "#1b2a2f", "#101a1e"]} position={[0, 0.01, 0]} />

      {blocks.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]} material={mats.concrete} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
          </mesh>
          <mesh position={[0, b.h + 0.08, 0]} material={mats.dark}>
            <boxGeometry args={[b.w + 0.14, 0.16, b.d + 0.14]} />
          </mesh>
          {Array.from({ length: b.floors }, (_, f) => (
            <mesh key={f} position={[0, 0.7 + f * 1.1, b.d / 2 + 0.02]} material={mats.warm}>
              <planeGeometry args={[b.w * 0.72, 0.16]} />
            </mesh>
          ))}
          {b.seed > 0.75 && (
            <mesh position={[0, b.h + 0.9, 0]} material={mats.steel}>
              <boxGeometry args={[0.08, 1.4, 0.08]} />
            </mesh>
          )}
        </group>
      ))}

      {/* hero tower */}
      <group position={[0, 0, -1.5]}>
        <mesh position={[0, 5.6, 0]} material={mats.concrete} castShadow>
          <boxGeometry args={[2.6, 11.2, 2.6]} />
        </mesh>
        {Array.from({ length: 9 }, (_, f) => (
          <group key={f} position={[0, 1 + f * 1.15, 0]}>
            <mesh position={[0, 0, 1.32]} material={mats.warm}>
              <planeGeometry args={[2.2, 0.3]} />
            </mesh>
            <mesh position={[0, 0, -1.32]} material={mats.warm}>
              <planeGeometry args={[2.2, 0.3]} />
            </mesh>
            <mesh position={[1.32, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.warm}>
              <planeGeometry args={[2.2, 0.3]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 11.4, 0]} material={mats.dark}>
          <boxGeometry args={[2.9, 0.3, 2.9]} />
        </mesh>
        <mesh position={[0, 12.4, 0]} material={mats.accent}>
          <sphereGeometry args={[0.18, 14, 14]} />
        </mesh>
      </group>

      <sprite position={[0, 6, -2]} scale={[16, 16, 1]}>
        <spriteMaterial map={getGlowTexture()} color="#d8a76a" transparent opacity={0.08} depthWrite={false} />
      </sprite>
    </group>
  );
}
