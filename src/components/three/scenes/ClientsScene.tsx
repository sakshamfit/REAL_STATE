"use client";

/**
 * TRUSTED BY — a cinematic corridor the camera is pushed through.
 *
 * Each client is an object in the corridor, not a line of text: a monolith on
 * a plinth, alternating sides, name plate riding it in 3D. The DOM readout
 * underneath is the accessible layer, not the only place the names exist.
 */
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { clients } from "@/lib/data/content";
import { getGlowTexture, getGridTexture } from "@/lib/three/materials";
import { ItemLabel, clamp01 } from "@/components/three/ItemLabel";

const SPACING = 7;
const LENGTH = clients.length * SPACING;
/** monoliths alternate sides of the camera path */
const SIDE_X = 2.45;

export default function ClientsScene({
  progress,
  active = 0,
}: {
  progress: number;
  active?: number;
}) {
  const cam = useThree((s) => s.camera);
  const pos = useRef(new THREE.Vector3(0, 1.7, 6));
  const floor = useRef<THREE.Mesh>(null);
  const bars = useRef<THREE.Group>(null);
  const stones = useRef<THREE.Group>(null);

  const mats = useMemo(
    () => ({
      pylon: new THREE.MeshStandardMaterial({ color: "#191e23", roughness: 0.7, metalness: 0.5 }),
      steel: new THREE.MeshStandardMaterial({ color: "#2c343b", roughness: 0.4, metalness: 0.85 }),
      steelLight: new THREE.MeshStandardMaterial({ color: "#79838f", roughness: 0.3, metalness: 0.92 }),
      stone: new THREE.MeshStandardMaterial({ color: "#14181c", roughness: 0.55, metalness: 0.55 }),
      plinth: new THREE.MeshStandardMaterial({ color: "#0e1215", roughness: 0.85, metalness: 0.25 }),
      accent: new THREE.MeshStandardMaterial({
        color: "#d8a76a",
        emissive: "#d8a76a",
        emissiveIntensity: 1.1,
        roughness: 0.4,
      }),
      cyan: new THREE.MeshStandardMaterial({
        color: "#74d3d8",
        emissive: "#74d3d8",
        emissiveIntensity: 0.8,
        roughness: 0.4,
      }),
    }),
    [],
  );

  /** one inlay material per client so the active one can light on its own */
  const inlays = useMemo(
    () =>
      clients.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: "#d8a76a",
            emissive: "#d8a76a",
            emissiveIntensity: 0.5,
            roughness: 0.35,
            metalness: 0.5,
          }),
      ),
    [],
  );

  const floorMat = useMemo(() => {
    const map = getGridTexture({
      divisions: 12,
      line: "rgba(120,190,200,0.22)",
      major: "rgba(216,167,106,0.4)",
    }).clone();
    map.needsUpdate = true;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(6, 24);
    return new THREE.MeshStandardMaterial({
      color: "#0b0f12",
      roughness: 0.55,
      metalness: 0.45,
      map,
    });
  }, []);

  const stripes = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        z: -i * 3,
        w: 6 + (i % 3) * 2,
      })),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const target = new THREE.Vector3(
      Math.sin(t * 0.25) * 0.5,
      1.8 + Math.sin(t * 0.4) * 0.12,
      6 - progress * (LENGTH + 8),
    );
    pos.current.lerp(target, 1 - Math.pow(0.002, dt));
    cam.position.copy(pos.current);
    cam.lookAt(pos.current.x, 1.7, pos.current.z - 10);

    if (floorMat.map) floorMat.map.offset.y = (t * 0.05 + progress * 4) % 1;

    if (bars.current) {
      bars.current.children.forEach((c, i) => {
        const mesh = c as THREE.Mesh;
        const m = mesh.material as THREE.MeshStandardMaterial;
        const d = Math.abs(mesh.position.z - pos.current.z);
        const near = Math.max(0, 1 - d / 26);
        m.emissiveIntensity = 0.35 + near * (1.4 + Math.sin(t * 2 + i) * 0.25);
      });
    }

    // monoliths: turn toward the camera as it passes, light up when active
    if (stones.current) {
      stones.current.children.forEach((child, i) => {
        const node = child as THREE.Group;
        const z = -i * SPACING;
        const d = pos.current.z - z; // >0 means the camera is still approaching
        const near = clamp01(1 - Math.abs(d) / 16);
        const side = i % 2 === 0 ? -1 : 1;
        node.position.y = near * 0.14;
        // swing slightly to face the visitor as they pass
        node.rotation.y = -side * (Math.PI / 2 - 0.45) + side * near * 0.22;
        const m = inlays[i];
        if (m) {
          const isActive = i === active;
          m.emissiveIntensity =
            0.35 + near * (isActive ? 1.9 : 0.7) + (isActive ? Math.sin(t * 2.2) * 0.25 : 0);
        }
      });
    }
  });

  return (
    <group>
      {/* floor */}
      <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -LENGTH / 2]} receiveShadow>
        <planeGeometry args={[26, LENGTH + 40]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      {/* ceiling slab */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.4, -LENGTH / 2]}>
        <planeGeometry args={[26, LENGTH + 40]} />
        <meshStandardMaterial color="#080a0c" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* pylons + light bars, one pair per client */}
      {clients.map((c, i) => {
        const z = -i * SPACING;
        return (
          <group key={c} position={[0, 0, z]}>
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 4.6, 0, 0]}>
                <mesh position={[0, 3.1, 0]} material={mats.pylon} castShadow>
                  <boxGeometry args={[1.1, 6.2, 1.1]} />
                </mesh>
                <mesh position={[-side * 0.6, 3.1, 0]} material={mats.steel}>
                  <boxGeometry args={[0.1, 6.2, 0.5]} />
                </mesh>
                <mesh position={[-side * 0.62, 4.4, 0]} material={mats.accent}>
                  <boxGeometry args={[0.06, 1.6, 0.12]} />
                </mesh>
                <mesh position={[0, 6.1, 0]} material={mats.steel}>
                  <boxGeometry args={[1.3, 0.16, 1.3]} />
                </mesh>
              </group>
            ))}
            {/* overhead light bar */}
            <mesh position={[0, 6.15, 0]} material={mats.cyan}>
              <boxGeometry args={[7.4, 0.06, 0.22]} />
            </mesh>
            <sprite position={[0, 6.0, 0]} scale={[9, 2.4, 1]}>
              <spriteMaterial
                map={getGlowTexture()}
                color="#74d3d8"
                transparent
                opacity={0.16}
                depthWrite={false}
              />
            </sprite>
            {/* floor inlay */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <planeGeometry args={[9.4, 0.1]} />
              <meshBasicMaterial color="#d8a76a" transparent opacity={0.35} />
            </mesh>
          </group>
        );
      })}

      {/* ------------------------------------------- one monolith per client */}
      <group ref={stones}>
        {clients.map((c, i) => {
          const z = -i * SPACING;
          const side = i % 2 === 0 ? -1 : 1;
          return (
            <group key={c} position={[side * SIDE_X, 0, z]} rotation={[0, -side * (Math.PI / 2 - 0.45), 0]}>
              {/* plinth */}
              <mesh position={[0, 0.09, 0]} material={mats.plinth} castShadow receiveShadow>
                <boxGeometry args={[1.9, 0.18, 1.05]} />
              </mesh>
              {/* slab */}
              <mesh position={[0, 1.4, 0]} material={mats.stone} castShadow>
                <boxGeometry args={[1.6, 2.44, 0.16]} />
              </mesh>
              {/* steel frame */}
              {[
                [0, 2.63, 0, 1.7, 0.07, 0.2] as const,
                [0, 0.19, 0, 1.7, 0.07, 0.2] as const,
                [-0.82, 1.4, 0, 0.07, 2.5, 0.2] as const,
                [0.82, 1.4, 0, 0.07, 2.5, 0.2] as const,
              ].map(([x, y, zz, w, h, d], k) => (
                <mesh key={k} position={[x, y, zz]} material={mats.steelLight}>
                  <boxGeometry args={[w, h, d]} />
                </mesh>
              ))}
              {/* accent inlay — this is what lights up */}
              <mesh position={[0, 1.4, 0.1]}>
                <boxGeometry args={[0.05, 1.9, 0.03]} />
                <primitive object={inlays[i]} attach="material" />
              </mesh>
              {/* index block */}
              <mesh position={[0.5, 2.28, 0.11]} material={mats.accent}>
                <boxGeometry args={[0.24, 0.24, 0.05]} />
              </mesh>
              {/* engraved rule lines suggesting a name plate */}
              {[1.72, 1.44, 1.16, 0.88].map((y, k) => (
                <mesh key={y} position={[-0.18, y, 0.095]} material={mats.steel}>
                  <boxGeometry args={[0.9 - k * 0.12, 0.035, 0.02]} />
                </mesh>
              ))}
              {/* marker on the floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.9]}>
                <planeGeometry args={[0.5, 0.5]} />
                <meshBasicMaterial color="#d8a76a" transparent opacity={0.18} />
              </mesh>

              <ItemLabel
                position={[0, 3.1, 0]}
                distanceFactor={11}
                align="center"
                getOpacity={() => {
                  const d = Math.abs(cam.position.z - z);
                  return clamp01(1 - d / 22);
                }}
              >
                <div className="max-w-[280px] text-center">
                  <div className="tech text-[8px] tracking-[0.3em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="display mt-1 whitespace-normal text-[12px] leading-snug text-chalk">
                    {c}
                  </div>
                </div>
              </ItemLabel>
            </group>
          );
        })}
      </group>

      {/* travelling floor stripes */}
      <group ref={bars}>
        {stripes.map((s, i) => (
          <mesh key={i} position={[0, 0.02, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[s.w, 0.06]} />
            <meshBasicMaterial color="#2f6d74" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>

      {/* end wall */}
      <mesh position={[0, 3.2, -LENGTH - 6]}>
        <planeGeometry args={[26, 8]} />
        <meshStandardMaterial color="#0b0e11" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.2, -LENGTH - 5.9]}>
        <planeGeometry args={[8, 0.04]} />
        <meshBasicMaterial color="#d8a76a" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export const clientCount = clients.length;
