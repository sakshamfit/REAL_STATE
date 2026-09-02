"use client";

/**
 * HOW WE BUILD — a miniature site, pinned in the centre while the scroll
 * walks the five-step execution model supplied by the client.
 */
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { process } from "@/lib/data/content";
import { getConcreteTexture, getGridTexture, getGlowTexture } from "@/lib/three/materials";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const win = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/** camera framing per step */
const CAMS: [number, number, number][] = [
  [0, 8.4, 12.5],
  [-6.5, 6.2, 10.5],
  [8.2, 4.6, 9.2],
  [6.6, 6.4, 11.5],
  [-4.2, 5.2, 12.4],
];

export default function ProcessScene({ progress }: { progress: number }) {
  const root = useRef<THREE.Group>(null);
  const cam = useThree((s) => s.camera);
  const pos = useRef(new THREE.Vector3(...CAMS[0]));
  const look = useRef(new THREE.Vector3(0, 1.4, 0));

  const mats = useMemo(
    () => ({
      concrete: new THREE.MeshStandardMaterial({
        color: "#98a0a7",
        map: getConcreteTexture(),
        roughness: 0.94,
      }),
      dark: new THREE.MeshStandardMaterial({ color: "#2a3037", roughness: 0.85, metalness: 0.15 }),
      steel: new THREE.MeshStandardMaterial({ color: "#39414a", roughness: 0.36, metalness: 0.9 }),
      steelLight: new THREE.MeshStandardMaterial({ color: "#828c98", roughness: 0.3, metalness: 0.92 }),
      accent: new THREE.MeshStandardMaterial({
        color: "#d8a76a",
        emissive: "#d8a76a",
        emissiveIntensity: 0.6,
        roughness: 0.45,
        metalness: 0.4,
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
    }),
    [],
  );

  const scan = useRef<THREE.Mesh>(null);
  const inspect = useRef<THREE.Mesh>(null);
  const blueprint = useRef<THREE.LineSegments>(null);
  const hook = useRef<THREE.Group>(null);
  const cable = useRef<THREE.Mesh>(null);
  const jib = useRef<THREE.Group>(null);
  const helmet = useRef<THREE.Group>(null);

  const bpGeom = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(4, 4.4, 3)), []);

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const p = progress;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // ---- camera framing per step
    const f = p * (CAMS.length - 1);
    const i = Math.min(CAMS.length - 2, Math.floor(f));
    const k = ease(clamp01(f - i));
    const target = new THREE.Vector3(
      CAMS[i][0] + (CAMS[i + 1][0] - CAMS[i][0]) * k,
      CAMS[i][1] + (CAMS[i + 1][1] - CAMS[i][1]) * k,
      CAMS[i][2] + (CAMS[i + 1][2] - CAMS[i][2]) * k,
    );
    pos.current.lerp(target, 1 - Math.pow(0.004, dt));
    cam.position.copy(pos.current);
    look.current.lerp(new THREE.Vector3(0, 1.4 + p * 0.8, 0), 1 - Math.pow(0.004, dt));
    cam.lookAt(look.current);

    // ---- 01 survey scan
    const surveyVis = 1 - win(p, 0.16, 0.24);
    if (scan.current) {
      scan.current.visible = surveyVis > 0.02;
      const m = scan.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.22 * surveyVis;
      scan.current.position.y = 0.1 + ((t * 0.9) % 3.2);
      scan.current.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
    }
    g.userData.stakes?.forEach((o: THREE.Object3D, idx: number) => {
      o.visible = surveyVis > 0.02;
      o.scale.setScalar(clamp01(surveyVis * 1.4 - idx * 0.06));
    });

    // ---- 02 blueprint
    const bp = win(p, 0.18, 0.3) * (1 - win(p, 0.34, 0.42));
    if (blueprint.current) {
      blueprint.current.visible = bp > 0.02;
      const m = blueprint.current.material as THREE.LineBasicMaterial;
      m.opacity = bp * 0.9;
      blueprint.current.position.y = 2.2;
      blueprint.current.rotation.y = Math.sin(t * 0.4) * 0.08;
    }

    // ---- 03 procurement
    const proc = win(p, 0.34, 0.44);
    g.userData.stacks?.forEach((o: THREE.Object3D, idx: number) => {
      const e = ease(clamp01(proc * 1.6 - idx * 0.18));
      o.scale.setScalar(Math.max(0.001, e));
      o.visible = e > 0.01;
    });

    // ---- crane (arrives at procurement, works through execution, leaves at the end)
    const craneIn = win(p, 0.34, 0.42);
    const craneOut = 1 - win(p, 0.84, 0.94);
    const craneVis = Math.min(craneIn, craneOut);
    if (jib.current) {
      jib.current.visible = craneVis > 0.02;
      jib.current.rotation.y = t * 0.25 + p * 3;
    }
    if (hook.current && cable.current) {
      const drop = 1.4 + Math.sin(t * 0.8) * 0.5 + win(p, 0.4, 0.7) * 1.4;
      hook.current.position.y = 5.4 - drop;
      cable.current.scale.y = Math.max(0.02, drop / 1.6);
      cable.current.position.y = hook.current.position.y + drop / 2;
    }
    const craneMats = root.current?.userData.craneMats as THREE.MeshStandardMaterial[] | undefined;
    craneMats?.forEach((m) => {
      m.transparent = true;
      m.opacity = (m.userData.baseOpacity ?? 1) * craneVis;
    });

    // ---- 04 execution: structure grows
    reveal(g, "structure", win(p, 0.42, 0.72));
    reveal(g, "facade", win(p, 0.6, 0.8));
    reveal(g, "roof", win(p, 0.74, 0.86));
    const glass = g.userData.glassMat as THREE.MeshPhysicalMaterial | undefined;
    if (glass) glass.opacity = 0.32 * win(p, 0.64, 0.82);

    // ---- 05 quality & safety sweep
    const q = win(p, 0.8, 1);
    if (inspect.current) {
      inspect.current.visible = q > 0.02;
      const m = inspect.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.24 * q;
      inspect.current.position.y = 0.2 + ((t * 0.7) % 5.4);
    }
    if (helmet.current) {
      helmet.current.visible = q > 0.05;
      helmet.current.scale.setScalar(ease(q));
      helmet.current.rotation.y = t * 0.5;
      helmet.current.position.y = 1.05 + Math.sin(t * 1.2) * 0.05;
    }
    g.userData.checks?.forEach((o: THREE.Object3D, idx: number) => {
      const e = ease(clamp01(q * 1.8 - idx * 0.25));
      o.scale.setScalar(Math.max(0.001, e));
      o.visible = e > 0.01;
    });
  });

  const floors = [0, 1, 2];

  return (
    <group ref={root} dispose={null}>
      {/* --------------------------------------------------------- ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshStandardMaterial color="#0a0d10" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshBasicMaterial
          map={getGridTexture({ divisions: 16 })}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* --------------------------------------------------- 01 survey */}
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[11, 11]} />
        <meshBasicMaterial
          color="#74d3d8"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <group
        ref={(o) => {
          if (o && root.current) root.current.userData.stakes = o.children;
        }}
      >
        {[
          [-4.4, -3.2],
          [4.4, -3.2],
          [-4.4, 3.2],
          [4.4, 3.2],
          [0, -3.6],
          [0, 3.6],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.45, 0]} material={mats.steelLight}>
              <boxGeometry args={[0.06, 0.9, 0.06]} />
            </mesh>
            <mesh position={[0, 0.95, 0]}>
              <sphereGeometry args={[0.08, 10, 10]} />
              <meshBasicMaterial color="#ff6a4d" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ------------------------------------------------- 02 blueprint */}
      <lineSegments ref={blueprint} geometry={bpGeom}>
        <lineBasicMaterial color="#74d3d8" transparent opacity={0.8} />
      </lineSegments>

      {/* ------------------------------------------------ 03 materials */}
      <group
        ref={(o) => {
          if (o && root.current) root.current.userData.stacks = o.children;
        }}
      >
        <group position={[-5.4, 0, 1.6]}>
          <mesh position={[0, 0.4, 0]} material={mats.concrete} castShadow>
            <boxGeometry args={[1.8, 0.8, 1.2]} />
          </mesh>
          <mesh position={[0, 1.0, 0]} material={mats.dark} castShadow>
            <boxGeometry args={[1.4, 0.4, 1.0]} />
          </mesh>
        </group>
        <group position={[-5.2, 0, -1.6]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.2 + i * 0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.steelLight} castShadow>
              <cylinderGeometry args={[0.17, 0.17, 2.4, 12]} />
            </mesh>
          ))}
        </group>
        <group position={[5.2, 0, 2.2]}>
          <mesh position={[0, 0.3, 0]} material={mats.steel} castShadow>
            <boxGeometry args={[2.4, 0.6, 1.2]} />
          </mesh>
          <mesh position={[0, 0.8, 0]} material={mats.accent} castShadow>
            <boxGeometry args={[1.2, 0.4, 1.0]} />
          </mesh>
        </group>
      </group>

      {/* ------------------------------------------------------ crane */}
      <group
        position={[4.6, 0, -3.4]}
        ref={(o) => {
          if (o && root.current) {
            const list: THREE.MeshStandardMaterial[] = [];
            o.traverse((m) => {
              const mm = (m as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
              if (mm) {
                if (mm.userData.baseOpacity === undefined) mm.userData.baseOpacity = mm.opacity;
                list.push(mm);
              }
            });
            root.current.userData.craneMats = list;
          }
        }}
      >
        <mesh position={[0, 2.8, 0]} material={mats.accent} castShadow>
          <boxGeometry args={[0.26, 5.6, 0.26]} />
        </mesh>
        <group position={[0, 5.6, 0]} ref={jib}>
          <mesh position={[2.2, 0, 0]} material={mats.accent} castShadow>
            <boxGeometry args={[5.4, 0.18, 0.18]} />
          </mesh>
          <mesh position={[-1.1, 0, 0]} material={mats.steel}>
            <boxGeometry args={[1.8, 0.18, 0.18]} />
          </mesh>
          <mesh position={[-1.9, -0.3, 0]} material={mats.dark}>
            <boxGeometry args={[0.7, 0.5, 0.5]} />
          </mesh>
          <group position={[3.4, 0, 0]}>
            <mesh ref={cable} position={[0, -0.8, 0]} material={mats.steelLight}>
              <boxGeometry args={[0.02, 1.6, 0.02]} />
            </mesh>
            <group ref={hook} position={[0, -1.6, 0]}>
              <mesh material={mats.accent}>
                <boxGeometry args={[0.26, 0.2, 0.26]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ------------------------------------------- 04 the structure */}
      <RevealGroup name="structure" root={root}>
        <mesh position={[0, 0.16, 0]} material={mats.concrete} castShadow receiveShadow>
          <boxGeometry args={[4.8, 0.32, 3.8]} />
        </mesh>
        {floors.map((f) => (
          <group key={f} position={[0, 0.32 + f * 1.36, 0]}>
            {[
              [-2, -1.5],
              [2, -1.5],
              [-2, 1.5],
              [2, 1.5],
              [0, -1.5],
              [0, 1.5],
            ].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.68, z]} material={mats.concrete} castShadow>
                <boxGeometry args={[0.26, 1.36, 0.26]} />
              </mesh>
            ))}
            <mesh position={[0, 1.4, 0]} material={mats.concrete} castShadow>
              <boxGeometry args={[4.4, 0.18, 3.4]} />
            </mesh>
          </group>
        ))}
        <mesh position={[-1.1, 2.5, -0.7]} material={mats.dark} castShadow>
          <boxGeometry args={[1.3, 4.4, 1.3]} />
        </mesh>
      </RevealGroup>

      <RevealGroup name="facade" root={root} glass>
        <mesh position={[0, 2.5, 1.72]} userData={{ glassMat: true }} material={mats.glass}>
          <planeGeometry args={[4.3, 4.2]} />
        </mesh>
        <mesh position={[0, 2.5, -1.72]} material={mats.glass}>
          <planeGeometry args={[4.3, 4.2]} />
        </mesh>
        <mesh position={[2.22, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.glass}>
          <planeGeometry args={[3.3, 4.2]} />
        </mesh>
        {floors.map((f) => (
          <mesh key={f} position={[0, 0.32 + f * 1.36 + 1.36, 1.74]} material={mats.steel}>
            <boxGeometry args={[4.4, 0.05, 0.05]} />
          </mesh>
        ))}
      </RevealGroup>

      <RevealGroup name="roof" root={root}>
        <mesh position={[0, 4.6, 0]} material={mats.concrete} castShadow>
          <boxGeometry args={[4.6, 0.24, 3.6]} />
        </mesh>
        <mesh position={[1.2, 5.0, -0.8]} material={mats.steel} castShadow>
          <boxGeometry args={[1.0, 0.6, 0.8]} />
        </mesh>
        <mesh position={[-1.4, 5.0, 0.9]} material={mats.steelLight} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.6, 14]} />
        </mesh>
      </RevealGroup>

      {/* ------------------------------------------- 05 quality & safety */}
      <mesh ref={inspect} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 7]} />
        <meshBasicMaterial
          color="#8ee6a8"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <group ref={helmet} position={[5.4, 1.05, 1.4]}>
        <mesh castShadow>
          <sphereGeometry args={[0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.35} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.03, 0]} castShadow>
          <cylinderGeometry args={[0.66, 0.66, 0.06, 24]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.1, 0.36, 1.0]} />
          <meshStandardMaterial color="#cfc7b6" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.5, 0]} material={mats.dark}>
          <cylinderGeometry args={[0.5, 0.62, 0.5, 20]} />
        </mesh>
      </group>
      <group
        ref={(o) => {
          if (o && root.current) root.current.userData.checks = o.children;
        }}
      >
        {[
          [-3.6, 1.2, 2.6],
          [3.2, 2.4, 2.4],
          [-2.4, 3.6, -2.6],
        ].map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh>
              <torusGeometry args={[0.22, 0.05, 10, 24]} />
              <meshStandardMaterial color="#8ee6a8" emissive="#8ee6a8" emissiveIntensity={0.7} />
            </mesh>
            <sprite scale={[1.2, 1.2, 1]}>
              <spriteMaterial map={getGlowTexture()} color="#8ee6a8" transparent opacity={0.3} depthWrite={false} />
            </sprite>
          </group>
        ))}
      </group>
    </group>
  );
}

function RevealGroup({
  name,
  root,
  children,
  glass = false,
}: {
  name: string;
  root: React.RefObject<THREE.Group | null>;
  children: React.ReactNode;
  glass?: boolean;
}) {
  return (
    <group
      ref={(o) => {
        if (!o || !root.current) return;
        const mats: THREE.MeshStandardMaterial[] = [];
        o.traverse((m) => {
          const mesh = m as THREE.Mesh;
          const mm = mesh.material as THREE.MeshStandardMaterial | undefined;
          if (!mm) return;
          const clone = mm.clone();
          clone.userData.baseOpacity = mm.opacity;
          clone.userData.baseTransparent = mm.transparent;
          mesh.material = clone;
          mats.push(clone);
          if (mesh.userData.glassMat && root.current) root.current.userData.glassMat = clone;
        });
        o.userData.mats = mats;
        o.userData.glass = glass;
        root.current.userData[name] = o;
      }}
    >
      {children}
    </group>
  );
}

function reveal(root: THREE.Group, name: string, t: number) {
  const g = root.userData[name] as THREE.Group | undefined;
  if (!g) return;
  const e = ease(t);
  g.position.y = (1 - e) * -0.9;
  g.visible = t > 0.001;
  if (!g.visible || g.userData.glass) return;
  const list = g.userData.mats as THREE.MeshStandardMaterial[];
  const opacity = e >= 0.999 ? 1 : Math.min(1, t * 2.4);
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (opacity >= 1) {
      m.opacity = m.userData.baseOpacity ?? 1;
      m.transparent = m.userData.baseTransparent ?? false;
    } else {
      m.transparent = true;
      m.opacity = (m.userData.baseOpacity ?? 1) * opacity;
    }
  }
}

export const stepCount = process.length;
