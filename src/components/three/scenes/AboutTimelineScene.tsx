"use client";

/**
 * ABOUT — "From ground to growth": a 3D construction timeline.
 * Each milestone is a plinth + column that rises as the scroll reaches it,
 * and the camera dollies along the line.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { timeline } from "@/lib/data/content";
import { getConcreteTexture, getGlowTexture } from "@/lib/three/materials";

const SPACING = 9;
const X0 = -((timeline.length - 1) * SPACING) / 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function AboutTimelineScene({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const cam = useThree((s) => s.camera);
  const look = useRef(new THREE.Vector3(X0, 1.6, 0));
  const pos = useRef(new THREE.Vector3(X0, 4.4, 15));

  const mats = useMemo(
    () => ({
      concrete: new THREE.MeshStandardMaterial({
        color: "#8d959c",
        map: getConcreteTexture(),
        roughness: 0.94,
        metalness: 0.03,
      }),
      dark: new THREE.MeshStandardMaterial({ color: "#2c3339", roughness: 0.8, metalness: 0.2 }),
      steel: new THREE.MeshStandardMaterial({ color: "#3b434b", roughness: 0.35, metalness: 0.9 }),
      accent: new THREE.MeshStandardMaterial({
        color: "#d8a76a",
        emissive: "#d8a76a",
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.5,
      }),
    }),
    [],
  );

  const path = useMemo(() => {
    const pts = timeline.map((_, i) => new THREE.Vector3(X0 + i * SPACING, 0.15, 0));
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2);
  }, []);
  const pathGeom = useMemo(() => new THREE.TubeGeometry(path, 128, 0.03, 6, false), [path]);
  const pulse = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = group.current;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (g) {
      timeline.forEach((item, i) => {
        const node = g.children[i] as THREE.Group;
        if (!node) return;
        const wStart = i * 0.19;
        const e = clamp01((progress - wStart) / 0.2);
        const eased = e * e * (3 - 2 * e);
        const column = node.children[0] as THREE.Group;
        if (column) column.scale.y = Math.max(0.001, eased);
        const cap = node.children[1] as THREE.Mesh;
        if (cap) {
          cap.position.y = 0.6 + 3.2 * eased;
          cap.scale.setScalar(0.4 + eased * 0.6);
          const m = cap.material as THREE.MeshStandardMaterial;
          m.emissiveIntensity = 0.35 + eased * (0.7 + Math.sin(t * 2 + i) * 0.18);
        }
        void item;
      });
    }

    if (pulse.current) {
      const pt = path.getPoint((t * 0.09) % 1);
      pulse.current.position.set(pt.x, 0.2, pt.z);
    }

    // camera dolly
    const targetX = X0 + progress * (timeline.length - 1) * SPACING;
    pos.current.lerp(new THREE.Vector3(targetX + 2.6, 4.6, 15.5), 1 - Math.pow(0.002, dt));
    look.current.lerp(new THREE.Vector3(targetX, 1.9, 0), 1 - Math.pow(0.002, dt));
    cam.position.copy(pos.current);
    cam.lookAt(look.current);
  });

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[70, 40]} />
        <meshStandardMaterial color="#0a0d10" roughness={0.95} />
      </mesh>
      <gridHelper args={[70, 70, "#1c2a2f", "#111a1e"]} />
      <mesh geometry={pathGeom}>
        <meshBasicMaterial color="#d8a76a" transparent opacity={0.55} />
      </mesh>
      <group ref={pulse}>
        <mesh>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color="#ffe2b4" />
        </mesh>
        <sprite scale={[2.4, 2.4, 1]}>
          <spriteMaterial map={getGlowTexture()} color="#d8a76a" transparent opacity={0.4} depthWrite={false} />
        </sprite>
      </group>

      <group ref={group}>
        {timeline.map((item, i) => (
          <group key={item.year + item.title} position={[X0 + i * SPACING, 0, 0]}>
            {/* column (scaled) */}
            <group>
              <mesh position={[0, 1.6, 0]} material={mats.concrete} castShadow receiveShadow>
                <boxGeometry args={[1.05, 3.2, 1.05]} />
              </mesh>
              {[0.8, 1.6, 2.4].map((y, k) => (
                <mesh key={k} position={[0, y, 0]} material={mats.dark}>
                  <boxGeometry args={[1.14, 0.06, 1.14]} />
                </mesh>
              ))}
            </group>
            {/* cap node */}
            <mesh material={mats.accent} castShadow>
              <octahedronGeometry args={[0.42, 0]} />
            </mesh>
            {/* plinth */}
            <mesh position={[0, 0.16, 0]} material={mats.dark} castShadow receiveShadow>
              <boxGeometry args={[2.6, 0.32, 2.6]} />
            </mesh>
            <mesh position={[0, 0.34, 0]} material={mats.steel}>
              <boxGeometry args={[2.1, 0.04, 2.1]} />
            </mesh>

            <Html position={[0, 4.6, 0]} center distanceFactor={16} className="map-label">
              <div className="w-[190px] text-center">
                <div className="tech text-[11px] tracking-[0.28em] text-accent">{item.year}</div>
                <div className="display mt-2 text-[15px] text-chalk">{item.title}</div>
              </div>
            </Html>
          </group>
        ))}
      </group>
    </group>
  );
}
