"use client";

/**
 * ABOUT — "From ground to growth": a 3D construction timeline.
 *
 * Each milestone is its own structure rather than a repeated column: the
 * company starts as a single corner stone, grows into a four-vertical frame,
 * spreads into a network of sites, and ends as a tower. They rise out of the
 * ground as the scroll reaches them and the camera dollies along the line.
 */
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { timeline } from "@/lib/data/content";
import { getConcreteTexture, getGlowTexture } from "@/lib/three/materials";
import { ItemLabel, clamp01, ease } from "@/components/three/ItemLabel";

const SPACING = 9;
const X0 = -((timeline.length - 1) * SPACING) / 2;

/** shared per-frame clock so each milestone can animate itself */
type Clock = { progress: number; t: number };

export default function AboutTimelineScene({ progress }: { progress: number }) {
  const cam = useThree((s) => s.camera);
  const look = useRef(new THREE.Vector3(X0, 1.6, 0));
  const pos = useRef(new THREE.Vector3(X0, 4.4, 15));
  const clock = useRef<Clock>({ progress: 0, t: 0 });
  const pulse = useRef<THREE.Group>(null);

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
      steelLight: new THREE.MeshStandardMaterial({ color: "#828c98", roughness: 0.3, metalness: 0.92 }),
      accent: new THREE.MeshStandardMaterial({
        color: "#d8a76a",
        emissive: "#d8a76a",
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.5,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#93c0cd",
        roughness: 0.08,
        metalness: 0.25,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      green: new THREE.MeshStandardMaterial({
        color: "#8ee6a8",
        emissive: "#8ee6a8",
        emissiveIntensity: 0.6,
        roughness: 0.5,
      }),
    }),
    [],
  );

  const path = useMemo(() => {
    const pts = timeline.map((_, i) => new THREE.Vector3(X0 + i * SPACING, 0.15, 0));
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2);
  }, []);
  const pathGeom = useMemo(() => new THREE.TubeGeometry(path, 128, 0.03, 6, false), [path]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    clock.current.progress = progress;
    clock.current.t = t;

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
          <spriteMaterial
            map={getGlowTexture()}
            color="#d8a76a"
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </sprite>
      </group>

      {timeline.map((item, i) => (
        <group key={item.year + item.title} position={[X0 + i * SPACING, 0, 0]}>
          <Milestone index={i} clock={clock} mats={mats} />

          {/* plinth + cap node, shared by every milestone */}
          <CapNode index={i} clock={clock} accent={mats.accent} />
          <mesh position={[0, 0.16, 0]} material={mats.dark} castShadow receiveShadow>
            <boxGeometry args={[3.4, 0.32, 3.4]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} material={mats.steel}>
            <boxGeometry args={[2.9, 0.04, 2.9]} />
          </mesh>

          <ItemLabel
            position={[0, 7.8, 0]}
            distanceFactor={16}
            getOpacity={() => clamp01((clock.current.progress - i * 0.19) / 0.18)}
          >
            <div className="w-[210px] whitespace-normal text-center">
              <div className="tech text-[11px] tracking-[0.28em] text-accent">{item.year}</div>
              <div className="display mt-2 text-[15px] text-chalk">{item.title}</div>
            </div>
          </ItemLabel>
        </group>
      ))}
    </group>
  );
}

/** top of each structure, so the cap sits on the building it belongs to */
const CAP_Y = [3.1, 4.7, 3.3, 7.1];

/** the accent node that caps each milestone and pulses once it has risen */
function CapNode({
  index,
  clock,
  accent,
}: {
  index: number;
  clock: React.RefObject<Clock>;
  accent: THREE.Material;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    const c = clock.current;
    if (!m || !c) return;
    const e = rise(index, c.progress);
    m.position.y = 0.6 + (CAP_Y[index] - 0.6) * e;
    m.scale.setScalar(0.4 + e * 0.6);
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.35 + e * (0.7 + Math.sin(c.t * 2 + index) * 0.18);
    m.visible = e > 0.01;
  });
  return (
    <mesh ref={ref} material={accent} castShadow>
      <octahedronGeometry args={[0.42, 0]} />
    </mesh>
  );
}

/** how far a given milestone has risen, 0..1 */
function rise(index: number, progress: number) {
  return ease(clamp01((progress - index * 0.19) / 0.2));
}

/**
 * A different structure per milestone — the timeline reads as growth, not as
 * four copies of the same column.
 */
function Milestone({
  index,
  clock,
  mats,
}: {
  index: number;
  clock: React.RefObject<Clock>;
  mats: Record<string, THREE.Material>;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = ref.current;
    const c = clock.current;
    if (!g || !c) return;
    const e = rise(index, c.progress);
    g.scale.y = Math.max(0.001, e);
    g.visible = e > 0.01;
  });

  return (
    <group ref={ref} position={[0, 0.32, 0]}>
      {index === 0 && <Founded mats={mats} />}
      {index === 1 && <Verticals mats={mats} />}
      {index === 2 && <Network mats={mats} />}
      {index === 3 && <Tower mats={mats} />}
    </group>
  );
}

/** 2025 — a single corner stone and a foundation pad. */
function Founded({ mats }: { mats: Record<string, THREE.Material> }) {
  return (
    <group>
      <mesh position={[0, 0.1, 0]} material={mats.concrete} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.2, 3.0]} />
      </mesh>
      {/* rebar stubs */}
      {[
        [-1.1, -1.1],
        [1.1, -1.1],
        [-1.1, 1.1],
        [1.1, 1.1],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.5, z]} material={mats.steelLight}>
          <cylinderGeometry args={[0.045, 0.045, 0.7, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 0]} material={mats.concrete} castShadow>
        <boxGeometry args={[1.05, 2.6, 1.05]} />
      </mesh>
      {[0.7, 1.5, 2.3].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.dark}>
          <boxGeometry args={[1.14, 0.06, 1.14]} />
        </mesh>
      ))}
    </group>
  );
}

/** Now — four verticals running in parallel under one slab. */
function Verticals({ mats }: { mats: Record<string, THREE.Material> }) {
  return (
    <group>
      {[
        [-1.2, -1.2],
        [1.2, -1.2],
        [-1.2, 1.2],
        [1.2, 1.2],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]} material={mats.concrete} castShadow>
            <boxGeometry args={[0.44, 3.0, 0.44]} />
          </mesh>
          <mesh position={[0, 3.02, 0]} material={mats.accent}>
            <boxGeometry args={[0.5, 0.06, 0.5]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.2, 0]} material={mats.concrete} castShadow>
        <boxGeometry args={[3.2, 0.22, 3.2]} />
      </mesh>
      <mesh position={[0, 3.7, 0]} material={mats.glass}>
        <boxGeometry args={[2.6, 0.9, 2.6]} />
      </mesh>
    </group>
  );
}

/** Next — several sites at once, tied together. */
function Network({ mats }: { mats: Record<string, THREE.Material> }) {
  const sites = useMemo(
    () => [
      { x: 0, z: 0, h: 2.6, w: 0.9 },
      { x: -1.5, z: 0.9, h: 1.5, w: 0.7 },
      { x: 1.4, z: 0.8, h: 1.9, w: 0.75 },
      { x: -1.1, z: -1.2, h: 1.1, w: 0.62 },
      { x: 1.3, z: -1.1, h: 2.1, w: 0.68 },
    ],
    [],
  );
  const links = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 1; i < sites.length; i++) {
      pts.push(sites[0].x, sites[0].h + 0.3, sites[0].z, sites[i].x, sites[i].h + 0.3, sites[i].z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [sites]);

  return (
    <group>
      {sites.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <mesh position={[0, s.h / 2, 0]} material={i === 0 ? mats.concrete : mats.dark} castShadow>
            <boxGeometry args={[s.w, s.h, s.w]} />
          </mesh>
          <mesh position={[0, s.h + 0.05, 0]} material={i === 0 ? mats.accent : mats.steelLight}>
            <boxGeometry args={[s.w * 1.12, 0.07, s.w * 1.12]} />
          </mesh>
        </group>
      ))}
      <lineSegments geometry={links}>
        <lineBasicMaterial color="#74d3d8" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

/** Future — a slim tower with a lattice mast and a beacon. */
function Tower({ mats }: { mats: Record<string, THREE.Material> }) {
  return (
    <group>
      <mesh position={[0, 2.1, 0]} material={mats.concrete} castShadow>
        <boxGeometry args={[1.15, 4.2, 1.15]} />
      </mesh>
      {[1.0, 2.0, 3.0, 4.0].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.dark}>
          <boxGeometry args={[1.24, 0.06, 1.24]} />
        </mesh>
      ))}
      <mesh position={[0, 2.4, 0.6]} material={mats.glass}>
        <planeGeometry args={[1.0, 3.6]} />
      </mesh>
      <mesh position={[0, 4.35, 0]} material={mats.steel} castShadow>
        <boxGeometry args={[1.4, 0.2, 1.4]} />
      </mesh>
      {/* lattice mast */}
      {[0.16, -0.16].map((x) => (
        <mesh key={x} position={[x, 5.4, 0]} material={mats.steelLight}>
          <boxGeometry args={[0.05, 1.9, 0.05]} />
        </mesh>
      ))}
      {[4.8, 5.5, 6.2].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.steelLight}>
          <boxGeometry args={[0.4, 0.03, 0.03]} />
        </mesh>
      ))}
      <mesh position={[0, 6.5, 0]}>
        <octahedronGeometry args={[0.16, 0]} />
        <primitive object={mats.green} attach="material" />
      </mesh>
      <sprite position={[0, 6.5, 0]} scale={[1.8, 1.8, 1]}>
        <spriteMaterial map={getGlowTexture()} color="#8ee6a8" transparent opacity={0.3} depthWrite={false} />
      </sprite>
    </group>
  );
}
