"use client";

/**
 * Procedural models for the six service verticals.
 * Built from primitives only — no GLB/texture downloads.
 */
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { getConcreteTexture, getGlowTexture } from "@/lib/three/materials";
import type { ServiceKey } from "@/lib/data/content";

function useSharedMaterials() {
  return useMemo(() => {
    const concrete = new THREE.MeshStandardMaterial({
      color: "#98a0a7",
      map: getConcreteTexture(),
      roughness: 0.94,
      metalness: 0.02,
    });
    const concreteDark = new THREE.MeshStandardMaterial({
      color: "#5f666d",
      map: getConcreteTexture(),
      roughness: 0.96,
    });
    const steel = new THREE.MeshStandardMaterial({ color: "#333a42", roughness: 0.36, metalness: 0.9 });
    const steelLight = new THREE.MeshStandardMaterial({ color: "#828c98", roughness: 0.3, metalness: 0.92 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#93c0cd",
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0.32,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: "#d8a76a",
      emissive: "#d8a76a",
      emissiveIntensity: 0.5,
      roughness: 0.45,
      metalness: 0.4,
    });
    const green = new THREE.MeshStandardMaterial({ color: "#2e4038", roughness: 1 });
    const water = new THREE.MeshPhysicalMaterial({
      color: "#3f7f8c",
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
    });
    const solar = new THREE.MeshStandardMaterial({
      color: "#16233a",
      roughness: 0.22,
      metalness: 0.72,
      emissive: "#1d3b6b",
      emissiveIntensity: 0.25,
    });
    const brick = new THREE.MeshStandardMaterial({ color: "#6b5346", roughness: 0.98 });
    return { concrete, concreteDark, steel, steelLight, glass, accent, green, water, solar, brick };
  }, []);
}

type ModelProps = { anim: number };

/* ------------------------------------------------------------ 01 civil */
function CivilModel({ anim }: ModelProps) {
  const m = useSharedMaterials();
  const floors = 4;
  const cols = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 1; j++) out.push([(i - 1) * 2.2, (j - 0.5) * 2.2]);
    return out;
  }, []);
  return (
    <group position={[0, -1.6, 0]} rotation={[0, anim * 0.5, 0]}>
      <mesh position={[0, 0.12, 0]} material={m.concreteDark} receiveShadow>
        <boxGeometry args={[8.4, 0.24, 6.4]} />
      </mesh>
      {Array.from({ length: floors }, (_, f) => (
        <group key={f} position={[0, 0.24 + f * 1.5, 0]}>
          {cols.map(([x, z], i) => (
            <mesh key={i} position={[x, 0.75, z]} material={m.concrete} castShadow>
              <boxGeometry args={[0.3, 1.5, 0.3]} />
            </mesh>
          ))}
          <mesh position={[0, 1.55, 0]} material={m.concrete} castShadow>
            <boxGeometry args={[5.0, 0.2, 3.0]} />
          </mesh>
          {[1.1, -1.1].map((z, i) => (
            <mesh key={`b${i}`} position={[0, 1.42, z]} material={m.concrete}>
              <boxGeometry args={[4.6, 0.14, 0.16]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* partial cladding */}
      <mesh position={[-2.55, 2.6, 0]} material={m.glass}>
        <planeGeometry args={[0.05, 3]} />
      </mesh>
      <mesh position={[0, 2.6, 1.55]} rotation={[0, Math.PI / 2, 0]} material={m.glass}>
        <planeGeometry args={[3, 3]} />
      </mesh>
      {/* rebar bundle + tower crane */}
      <mesh position={[3.2, 0.35, 1.6]} rotation={[0, 0, Math.PI / 2]} material={m.steelLight} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 2.2, 10]} />
      </mesh>
      <group position={[3.6, 0, -2.2]}>
        <mesh position={[0, 2.6, 0]} material={m.accent} castShadow>
          <boxGeometry args={[0.22, 5.2, 0.22]} />
        </mesh>
        <mesh position={[0.9, 5.1, 0]} material={m.accent} castShadow>
          <boxGeometry args={[3.4, 0.16, 0.16]} />
        </mesh>
        <mesh position={[-0.8, 5.1, 0]} material={m.steel}>
          <boxGeometry args={[1.2, 0.16, 0.16]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------- 02 residential */
function ResidentialModel({ anim }: ModelProps) {
  const m = useSharedMaterials();
  const waterRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (waterRef.current) waterRef.current.position.y = 0.26 + Math.sin(s.clock.elapsedTime * 1.4) * 0.012;
  });
  return (
    <group position={[0, -1.5, 0]} rotation={[0, anim * 0.5, 0]}>
      <mesh position={[0, 0.05, 0]} material={m.concreteDark} receiveShadow>
        <boxGeometry args={[8, 0.1, 6]} />
      </mesh>
      {/* lower volume */}
      <mesh position={[-1.2, 0.9, 0]} material={m.concrete} castShadow>
        <boxGeometry args={[4.4, 1.7, 3.4]} />
      </mesh>
      {/* cantilevered upper volume */}
      <mesh position={[0.2, 2.6, 0.2]} material={m.concrete} castShadow>
        <boxGeometry args={[5.2, 1.6, 3.0]} />
      </mesh>
      <mesh position={[0.2, 3.45, 0.2]} material={m.concreteDark} castShadow>
        <boxGeometry args={[5.5, 0.16, 3.3]} />
      </mesh>
      {/* glazing */}
      <mesh position={[-1.2, 0.95, 1.71]} material={m.glass}>
        <planeGeometry args={[3.8, 1.3]} />
      </mesh>
      <mesh position={[0.4, 2.6, 1.72]} material={m.glass}>
        <planeGeometry args={[4.4, 1.2]} />
      </mesh>
      <mesh position={[2.81, 2.6, 0.2]} rotation={[0, Math.PI / 2, 0]} material={m.glass}>
        <planeGeometry args={[2.6, 1.2]} />
      </mesh>
      {/* entry + steps */}
      <mesh position={[-3.0, 0.5, 1.2]} material={m.steel} castShadow>
        <boxGeometry args={[0.12, 1, 0.12]} />
      </mesh>
      <mesh position={[-3.0, 1.05, 0.6]} material={m.accent}>
        <boxGeometry args={[0.9, 0.08, 1.4]} />
      </mesh>
      {/* pool */}
      <mesh position={[2.2, 0.12, -1.4]} material={m.concreteDark}>
        <boxGeometry args={[3, 0.16, 2.2]} />
      </mesh>
      <mesh ref={waterRef} position={[2.2, 0.26, -1.4]} material={m.water}>
        <boxGeometry args={[2.7, 0.06, 1.9]} />
      </mesh>
      {/* planting */}
      {[[-3.4, -1.6], [3.6, 1.8], [-3.6, 2.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.55, z]} material={m.green} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------- 03 commercial */
function CommercialModel({ anim }: ModelProps) {
  const m = useSharedMaterials();
  return (
    <group position={[0, -1.8, 0]} rotation={[0, anim * 0.5, 0]}>
      <mesh position={[0, 0.1, 0]} material={m.concreteDark} receiveShadow>
        <boxGeometry args={[8, 0.2, 6.4]} />
      </mesh>
      {/* podium */}
      <mesh position={[0, 0.85, 0]} material={m.concrete} castShadow>
        <boxGeometry args={[6.4, 1.3, 4.6]} />
      </mesh>
      <mesh position={[0, 1.0, 2.32]} material={m.glass}>
        <planeGeometry args={[5.8, 0.95]} />
      </mesh>
      {/* tower */}
      <mesh position={[-0.6, 3.4, -0.2]} material={m.concrete} castShadow>
        <boxGeometry args={[3.4, 4.0, 3.0]} />
      </mesh>
      {[0, 1, 2, 3].map((f) => (
        <group key={f} position={[0, 1.9 + f * 1.0, 0]}>
          <mesh position={[-0.6, 0, 1.32]} material={m.glass}>
            <planeGeometry args={[3.3, 0.85]} />
          </mesh>
          <mesh position={[-0.6, 0, -1.72]} material={m.glass}>
            <planeGeometry args={[3.3, 0.85]} />
          </mesh>
          <mesh position={[1.12, 0, -0.2]} rotation={[0, Math.PI / 2, 0]} material={m.glass}>
            <planeGeometry args={[2.9, 0.85]} />
          </mesh>
          <mesh position={[-2.32, 0, -0.2]} rotation={[0, Math.PI / 2, 0]} material={m.glass}>
            <planeGeometry args={[2.9, 0.85]} />
          </mesh>
          <mesh position={[-0.6, 0.45, -0.2]} material={m.steel}>
            <boxGeometry args={[3.5, 0.06, 3.1]} />
          </mesh>
        </group>
      ))}
      {/* canopy + rooftop plant */}
      <mesh position={[0, 1.7, 2.9]} material={m.steel} castShadow>
        <boxGeometry args={[4.6, 0.1, 1.5]} />
      </mesh>
      <mesh position={[-0.6, 5.7, -0.2]} material={m.steelLight} castShadow>
        <boxGeometry args={[1.6, 0.6, 1.2]} />
      </mesh>
      <mesh position={[2.6, 0.5, 1.6]} material={m.steel} castShadow>
        <boxGeometry args={[0.16, 1, 0.16]} />
      </mesh>
      <mesh position={[2.6, 1.0, 1.6]} material={m.accent}>
        <sphereGeometry args={[0.14, 12, 12]} />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------- 04 infrastructure */
function InfrastructureModel({ anim }: ModelProps) {
  const m = useSharedMaterials();
  const deckY = 1.1;
  return (
    <group position={[0, -1.4, 0]} rotation={[0, anim * 0.5, 0]}>
      {/* ground / water */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 6]} />
        <meshStandardMaterial color="#141a1f" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* deck */}
      <mesh position={[0, deckY, 0]} material={m.concrete} castShadow>
        <boxGeometry args={[8.6, 0.16, 1.5]} />
      </mesh>
      <mesh position={[0, deckY + 0.1, 0]} material={m.concreteDark}>
        <boxGeometry args={[8.6, 0.02, 1.6]} />
      </mesh>
      {/* piers */}
      {[-3.4, -1.2, 1.2, 3.4].map((x, i) => (
        <mesh key={i} position={[x, deckY / 2, 0]} material={m.concreteDark} castShadow>
          <boxGeometry args={[0.3, deckY, 0.5]} />
        </mesh>
      ))}
      {/* pylons + cables */}
      {[-2.3, 2.3].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, deckY + 1.5, 0]} material={m.accent} castShadow>
            <boxGeometry args={[0.22, 3.0, 0.22]} />
          </mesh>
          {[-1.6, -1.0, -0.5, 0.5, 1.0, 1.6].map((o, k) => (
            <mesh
              key={k}
              position={[o / 2, deckY + 1.4, 0]}
              rotation={[0, 0, Math.atan2(deckY + 1.4 - deckY, o)]}
              material={m.steelLight}
            >
              <boxGeometry args={[Math.hypot(o, 1.4), 0.02, 0.02]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* road markings */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-4 + i * 1, deckY + 0.12, 0]}>
          <boxGeometry args={[0.5, 0.01, 0.07]} />
          <meshBasicMaterial color="#d8a76a" />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- 05 solar */
function SolarModel({ anim }: ModelProps) {
  const m = useSharedMaterials();
  const glow = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (glow.current) {
      const mm = glow.current.material as THREE.MeshBasicMaterial;
      mm.opacity = 0.35 + Math.sin(s.clock.elapsedTime * 2.2) * 0.2;
    }
  });
  return (
    <group position={[0, -1.3, 0]} rotation={[0, anim * 0.5, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 6]} />
        <meshStandardMaterial color="#1a1f24" roughness={0.95} />
      </mesh>
      {/* ground-mount rows */}
      {[-2.6, -0.9, 0.8, 2.5].map((z, r) => (
        <group key={r} position={[0, 0, z]}>
          {[-2.4, 0, 2.4].map((x, c) => (
            <group key={c} position={[x, 0, 0]}>
              <mesh position={[0, 0.45, 0]} rotation={[-0.42, 0, 0]} material={m.solar} castShadow>
                <boxGeometry args={[2.0, 0.05, 1.1]} />
              </mesh>
              <mesh position={[-0.7, 0.24, 0]} material={m.steelLight} castShadow>
                <boxGeometry args={[0.07, 0.48, 0.07]} />
              </mesh>
              <mesh position={[0.7, 0.24, 0]} material={m.steelLight} castShadow>
                <boxGeometry args={[0.07, 0.48, 0.07]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* rooftop array on a small building */}
      <group position={[-3.1, 0, -1.9]}>
        <mesh position={[0, 0.7, 0]} material={m.concrete} castShadow>
          <boxGeometry args={[2.2, 1.4, 1.8]} />
        </mesh>
        <mesh position={[0, 1.55, 0]} rotation={[-0.35, 0, 0]} material={m.solar} castShadow>
          <boxGeometry args={[1.9, 0.05, 1.3]} />
        </mesh>
      </group>
      {/* inverter + line */}
      <mesh position={[3.6, 0.4, -1.6]} material={m.steel} castShadow>
        <boxGeometry args={[0.7, 0.8, 0.5]} />
      </mesh>
      <mesh ref={glow} position={[3.6, 0.85, -1.6]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshBasicMaterial color="#74d3d8" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------- 06 renovation */
function RenovationModel({ anim }: ModelProps) {
  const m = useSharedMaterials();
  const oldRef = useRef<THREE.Group>(null);
  const newRef = useRef<THREE.Group>(null);
  const scaffoldRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = Math.min(1, Math.max(0, anim));
    if (oldRef.current) {
      oldRef.current.visible = t < 0.99;
      oldRef.current.traverse((o) => {
        const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mm && "opacity" in mm) {
          if (!mm.userData.__o) {
            mm.userData.__o = mm.opacity;
            mm.userData.__t = mm.transparent;
          }
          mm.transparent = true;
          mm.opacity = (mm.userData.__o as number) * (1 - t);
        }
      });
    }
    if (newRef.current) {
      newRef.current.visible = t > 0.01;
      newRef.current.traverse((o) => {
        const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mm && "opacity" in mm) {
          if (!mm.userData.__n) {
            mm.userData.__n = mm.opacity;
            mm.userData.__nt = mm.transparent;
          }
          mm.transparent = true;
          mm.opacity = (mm.userData.__n as number) * t;
        }
      });
      newRef.current.position.y = (1 - t) * -0.5;
    }
    if (scaffoldRef.current) {
      scaffoldRef.current.position.y = t * 3.2;
      scaffoldRef.current.visible = t < 0.98;
    }
  });

  return (
    <group position={[0, -1.6, 0]}>
      <mesh position={[0, 0.05, 0]} material={m.concreteDark} receiveShadow>
        <boxGeometry args={[8, 0.1, 5.6]} />
      </mesh>

      {/* existing structure */}
      <group ref={oldRef}>
        <mesh position={[0, 1.4, 0]} material={m.brick} castShadow>
          <boxGeometry args={[4.6, 2.7, 3.2]} />
        </mesh>
        <mesh position={[0, 2.85, 0]} material={m.concreteDark} castShadow>
          <boxGeometry args={[4.9, 0.25, 3.5]} />
        </mesh>
        {[-1.4, 0, 1.4].map((x, i) => (
          <mesh key={i} position={[x, 1.5, 1.62]} material={m.steel}>
            <planeGeometry args={[0.8, 1]} />
          </mesh>
        ))}
        {/* damaged corner */}
        <mesh position={[2.1, 2.3, 1.2]} rotation={[0.3, 0.4, 0.2]} material={m.brick} castShadow>
          <boxGeometry args={[0.9, 0.7, 0.9]} />
        </mesh>
      </group>

      {/* scaffold */}
      <group ref={scaffoldRef}>
        {[-2.4, 2.4].map((x, i) => (
          <mesh key={i} position={[x, 1.6, 1.9]} material={m.accent} castShadow>
            <boxGeometry args={[0.08, 3.2, 0.08]} />
          </mesh>
        ))}
        {[0.6, 1.6, 2.6].map((y, i) => (
          <mesh key={i} position={[0, y, 1.9]} material={m.accent}>
            <boxGeometry args={[4.9, 0.06, 0.06]} />
          </mesh>
        ))}
      </group>

      {/* modernised result */}
      <group ref={newRef} visible={false}>
        <mesh position={[0, 1.5, 0]} material={m.concrete} castShadow>
          <boxGeometry args={[4.6, 2.9, 3.2]} />
        </mesh>
        <mesh position={[0, 3.05, 0]} material={m.concreteDark} castShadow>
          <boxGeometry args={[5.0, 0.2, 3.6]} />
        </mesh>
        <mesh position={[0, 1.6, 1.62]} material={m.glass}>
          <planeGeometry args={[4.2, 2.4]} />
        </mesh>
        <mesh position={[2.32, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} material={m.glass}>
          <planeGeometry args={[3, 2.4]} />
        </mesh>
        <mesh position={[-1.6, 3.35, 0]} material={m.steelLight} castShadow>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
        </mesh>
      </group>

      {/* debris → planter */}
      <mesh position={[3.2, 0.3, -1.2]} material={m.concreteDark} castShadow>
        <boxGeometry args={[1.2, 0.5, 1.2]} />
      </mesh>
      <mesh position={[3.2, 0.75, -1.2]} material={m.green} castShadow>
        <icosahedronGeometry args={[0.42, 1]} />
      </mesh>
    </group>
  );
}

const MODELS: Record<ServiceKey, (p: ModelProps) => React.JSX.Element> = {
  civil: CivilModel,
  residential: ResidentialModel,
  commercial: CommercialModel,
  infrastructure: InfrastructureModel,
  solar: SolarModel,
  renovation: RenovationModel,
};

/** Rotating plinth + the requested model. `anim` 0→1 drives hover response. */
export default function ServiceModel({ modelKey, anim }: { modelKey: ServiceKey; anim: number }) {
  const group = useRef<THREE.Group>(null);
  const m = useSharedMaterials();
  const Model = MODELS[modelKey];

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (0.16 + anim * 0.55);
    group.current.position.y = Math.sin(performance.now() * 0.0009) * 0.05 * (1 + anim);
  });

  return (
    <group ref={group}>
      <mesh position={[0, -1.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.6, 48]} />
        <meshBasicMaterial map={getGlowTexture()} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.0, 0]} material={m.steel}>
        <cylinderGeometry args={[3.3, 3.4, 0.06, 48]} />
      </mesh>
      <Model anim={anim} />
    </group>
  );
}
