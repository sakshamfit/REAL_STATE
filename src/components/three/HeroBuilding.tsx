"use client";

/**
 * HERO — scroll-linked construction sequence.
 *
 * One procedural building assembles itself as the visitor scrolls:
 *   survey grid → excavation & footings → columns & beams → slabs →
 *   facade glazing → roof, plant and landscaping (crane demobilises at the end).
 *
 * Everything is generated from geometry primitives — no GLB download.
 */
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { getConcreteTexture, makeRandom } from "@/lib/three/materials";
import { DustField } from "@/components/three/Studio";

// ------------------------------------------------------------------ helpers
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
/** progress inside a [from,to] window */
const win = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

/**
 * Every mesh gets its own material clone so groups can fade independently
 * without cross-talk on shared materials. Runs once per group mount.
 */
function giveOwnMaterials(g: THREE.Object3D) {
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const m = mesh.material as THREE.Material | undefined;
    if (!m || mesh.userData.ownMat) return;
    const clone = m.clone();
    clone.userData.baseOpacity = m.opacity;
    clone.userData.baseTransparent = m.transparent;
    mesh.material = clone;
    mesh.userData.ownMat = true;
  });
}
/** in → hold → out */
const pulse = (p: number, inA: number, inB: number, outA: number, outB: number) =>
  Math.min(win(p, inA, inB), 1 - win(p, outA, outB));

// ------------------------------------------------------------- scene config
const BAYS_X = 4;
const BAYS_Z = 3;
const BAY = 2.5;
const FLOORS = 7;
const FLOOR_H = 2.2;
const SLAB_T = 0.24;
const HEIGHT = FLOORS * FLOOR_H;
const COL_R = 0.17;
const FOOT = (BAYS_X + 1) * BAY;
const DEPTH = (BAYS_Z + 1) * BAY;

type Props = {
  /** 0 → 1 scroll progress (already smoothed by the parent) */
  progress: number;
  density?: number;
  shadows?: boolean;
};

export default function HeroBuilding({ progress, density = 1, shadows = true }: Props) {
  const root = useRef<THREE.Group>(null);
  const cam = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);

  // ------------------------------------------------------------- materials
  const mats = useMemo(() => {
    const concrete = new THREE.MeshStandardMaterial({
      color: "#9aa2a9",
      map: getConcreteTexture(),
      roughness: 0.94,
      metalness: 0.02,
    });
    const concreteDark = new THREE.MeshStandardMaterial({
      color: "#6c747b",
      map: getConcreteTexture(),
      roughness: 0.96,
      metalness: 0.02,
    });
    const steel = new THREE.MeshStandardMaterial({ color: "#39414a", roughness: 0.38, metalness: 0.88 });
    const steelLight = new THREE.MeshStandardMaterial({ color: "#7e8894", roughness: 0.32, metalness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#8fb9c6",
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0,
      envMapIntensity: 1.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: "#d8a76a",
      emissive: "#d8a76a",
      emissiveIntensity: 0.55,
      roughness: 0.5,
      metalness: 0.4,
    });
    const survey = new THREE.LineBasicMaterial({ color: "#7fd4d8", transparent: true, opacity: 0 });
    return { concrete, concreteDark, steel, steelLight, glass, accent, survey };
  }, []);

  // --------------------------------------------------------------- geometry
  const geo = useMemo(() => {
    const rand = makeRandom(90210);
    const colPos: [number, number][] = [];
    for (let i = 0; i <= BAYS_X; i++) {
      for (let j = 0; j <= BAYS_Z; j++) {
        colPos.push([(i - BAYS_X / 2) * BAY, (j - BAYS_Z / 2) * BAY]);
      }
    }
    const beamX: [number, number][] = [];
    const beamZ: [number, number][] = [];
    for (let f = 1; f <= FLOORS; f++) {
      for (let i = 0; i < BAYS_X; i++) {
        for (let j = 0; j <= BAYS_Z; j++) {
          beamX.push([(i + 0.5 - BAYS_X / 2) * BAY, (j - BAYS_Z / 2) * BAY]);
        }
      }
      for (let j = 0; j < BAYS_Z; j++) {
        for (let i = 0; i <= BAYS_X; i++) {
          beamZ.push([(i - BAYS_X / 2) * BAY, (j + 0.5 - BAYS_Z / 2) * BAY]);
        }
      }
    }
    return {
      colPos,
      beamX,
      beamZ,
      stakes: Array.from({ length: 26 }, () => ({
        x: (rand() - 0.5) * 42,
        z: (rand() - 0.5) * 42,
        h: 0.5 + rand() * 0.5,
      })),
      pipes: Array.from({ length: 9 }, (_, i) => ({ x: -11 + (i % 3) * 0.55, z: 7 + Math.floor(i / 3) * 0.6, y: 0.22 + Math.floor(i / 3) * 0.42 })),
      trees: [
        [-9.5, 8.5],
        [10.2, 7.4],
        [-11, -6.2],
        [11.4, -7.8],
        [0.5, 12.4],
      ] as [number, number][],
    };
  }, []);

  // ----------------------------------------------------------- camera flight
  const camPath = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 28, 0.6),
          new THREE.Vector3(4.5, 2.4, 24),
          new THREE.Vector3(21, 4.6, 15.5),
          new THREE.Vector3(16, 12.5, -14),
          new THREE.Vector3(-3.5, 17.5, -21),
          new THREE.Vector3(-21, 13.5, 6),
          new THREE.Vector3(-13, 10, 24),
          new THREE.Vector3(15, 17, 27),
        ],
        false,
        "catmullrom",
        0.35,
      ),
    [],
  );
  const lookPath = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.6, 0),
          new THREE.Vector3(0, 3.2, 0),
          new THREE.Vector3(0, 6.4, 0),
          new THREE.Vector3(0, 9.4, 0),
          new THREE.Vector3(0, 11.2, 0),
          new THREE.Vector3(0, 11.2, 0),
          new THREE.Vector3(0, 10.2, 0),
        ],
        false,
        "catmullrom",
        0.4,
      ),
    [],
  );

  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());
  const curLook = useRef(new THREE.Vector3(0, 0, 0));
  const pointerOffset = useRef(new THREE.Vector2());

  // -------------------------------------------------------------- animation
  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const p = progress;
    const dt = Math.min(delta, 0.05);

    // ---- camera
    const t = ease(clamp01(p * 0.985 + 0.0075));
    camPath.getPoint(t, tmpPos.current);
    lookPath.getPoint(t, tmpLook.current);
    pointerOffset.current.lerp(pointer, 1 - Math.pow(0.001, dt));
    const px = pointerOffset.current.x;
    const py = pointerOffset.current.y;
    cam.position.set(tmpPos.current.x + px * 1.8, tmpPos.current.y + py * 0.9, tmpPos.current.z);
    curLook.current.lerp(tmpLook.current, 1 - Math.pow(0.0015, dt));
    cam.lookAt(curLook.current);
    const persp = cam as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      const targetFov = persp.aspect > 1.1 ? 38 : 56;
      if (Math.abs(persp.fov - targetFov) > 0.05) {
        persp.fov += (targetFov - persp.fov) * 0.08;
        persp.updateProjectionMatrix();
      }
    }

    // ---- survey grid + stakes
    const surveyVis = pulse(p, 0.0, 0.035, 0.16, 0.3);
    mats.survey.opacity = surveyVis * 0.85;
    g.userData.survey?.forEach((o: THREE.Object3D) => {
      o.visible = surveyVis > 0.01;
    });

    // ---- element windows
    setReveal(g, "footings", win(p, 0.09, 0.2), -1.8);
    setReveal(g, "plinth", win(p, 0.15, 0.26), -1.2);
    setReveal(g, "core", win(p, 0.24, 0.42), -1.6);
    setReveal(g, "columns", win(p, 0.22, 0.44), -1.4);
    setReveal(g, "beams", win(p, 0.3, 0.52), -1.0);
    setReveal(g, "slabs", win(p, 0.34, 0.62), -0.9);
    setReveal(g, "facade", win(p, 0.55, 0.78), -0.6);
    setReveal(g, "roof", win(p, 0.74, 0.88), -0.8);
    setReveal(g, "site", win(p, 0.02, 0.1), -0.4);
    setReveal(g, "landscape", win(p, 0.84, 0.95), -0.5);

    // glass opacity ramps in slightly after the panels arrive
    mats.glass.opacity = 0.34 * win(p, 0.6, 0.82);

    // interior lights come on at completion
    const lightsOn = win(p, 0.86, 1);
    g.userData.lights?.forEach((o: THREE.Mesh) => {
      const m = o.material as THREE.MeshBasicMaterial;
      m.opacity = 0.5 * lightsOn * (0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 0.8 + o.position.x));
    });

    // ---- hoarding comes down at the end
    const hoard = 1 - win(p, 0.78, 0.92);
    g.userData.hoarding?.forEach((o: THREE.Object3D) => {
      o.position.y = o.userData.baseY - (1 - hoard) * 2.4;
      o.visible = hoard > 0.02;
    });

    // ---- crane: arrives early, demobilises at the end
    const craneIn = win(p, 0.04, 0.14);
    const craneOut = 1 - win(p, 0.85, 0.96);
    const craneVis = Math.min(craneIn, craneOut);
    const crane = g.userData.crane as THREE.Group | undefined;
    if (crane) {
      crane.visible = craneVis > 0.01;
      crane.scale.y = Math.max(0.001, craneIn);
      const jib = crane.userData.jib as THREE.Group;
      jib.rotation.y = state.clock.elapsedTime * 0.14 + p * 4.2;
      const hook = crane.userData.hook as THREE.Group;
      const drop = 4 + Math.sin(state.clock.elapsedTime * 0.5) * 2 + p * 6;
      hook.position.y = 20 - Math.min(drop, 15);
      const cable = crane.userData.cable as THREE.Mesh;
      cable.scale.y = Math.max(0.02, (20 - hook.position.y) / 6);
      cable.position.y = hook.position.y + (20 - hook.position.y) / 2;
      const list = crane.userData.mats as THREE.MeshStandardMaterial[] | undefined;
      list?.forEach((m) => {
        m.transparent = true;
        m.opacity = (m.userData.baseOpacity ?? 1) * craneVis;
      });
    }

    // ---- dust picks up while the site is live
    const dust = g.userData.dust as THREE.Points | undefined;
    if (dust) {
      const m = dust.material as THREE.PointsMaterial;
      m.opacity = 0.14 + 0.42 * Math.sin(Math.PI * clamp01(p * 1.05));
    }
    void dt;
  });

  // ------------------------------------------------------------ JSX
  const floors = Array.from({ length: FLOORS }, (_, i) => i);

  return (
    <group ref={root} dispose={null}>
      {/* ------------------------------------------------ survey layer */}
      <group
        ref={(o) => {
          if (o && root.current) {
            giveOwnMaterials(o);
            root.current.userData.survey = [o];
          }
        }}
      >
        <gridHelper args={[46, 46, "#7fd4d8", "#2c5b60"]} position={[0, 0.02, 0]} />
        {geo.stakes.map((s, i) => (
          <group key={`stake-${i}`} position={[s.x, 0, s.z]}>
            <mesh position={[0, s.h / 2, 0]} material={mats.steelLight} castShadow={shadows}>
              <boxGeometry args={[0.06, s.h, 0.06]} />
            </mesh>
            <mesh position={[0, s.h + 0.05, 0]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshBasicMaterial color="#ff6a4d" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ------------------------------------------------ footings + beams */}
      <Reveal name="footings" root={root}>
        {geo.colPos.map(([x, z], i) => (
          <mesh key={`ft-${i}`} position={[x, 0.18, z]} material={mats.concreteDark} castShadow={shadows} receiveShadow>
            <boxGeometry args={[1.5, 0.36, 1.5]} />
          </mesh>
        ))}
        {[0, 1].map((k) => (
          <mesh
            key={`tie-${k}`}
            position={[0, 0.5, k === 0 ? -DEPTH / 2 + 0.4 : DEPTH / 2 - 0.4]}
            material={mats.concreteDark}
            castShadow={shadows}
          >
            <boxGeometry args={[FOOT - 0.6, 0.3, 0.3]} />
          </mesh>
        ))}
      </Reveal>

      {/* ------------------------------------------------------- plinth */}
      <Reveal name="plinth" root={root}>
        <mesh position={[0, 0.5, 0]} material={mats.concrete} castShadow={shadows} receiveShadow>
          <boxGeometry args={[FOOT + 2.2, 0.62, DEPTH + 2.2]} />
        </mesh>
        <mesh position={[0, 0.83, DEPTH / 2 + 1.1]} material={mats.concreteDark}>
          <boxGeometry args={[4.4, 0.16, 1.1]} />
        </mesh>
      </Reveal>

      {/* --------------------------------------------------- service core */}
      <Reveal name="core" root={root}>
        <mesh position={[-BAY * 0.55, 0.85 + HEIGHT / 2, -BAY * 0.4]} material={mats.concreteDark} castShadow={shadows}>
          <boxGeometry args={[2.1, HEIGHT, 2.1]} />
        </mesh>
      </Reveal>

      {/* ------------------------------------------------------ columns */}
      <Reveal name="columns" root={root}>
        {geo.colPos.map(([x, z], i) => (
          <mesh
            key={`col-${i}`}
            position={[x, 0.85 + HEIGHT / 2, z]}
            material={mats.concrete}
            castShadow={shadows}
            receiveShadow
          >
            <boxGeometry args={[COL_R * 2.1, HEIGHT, COL_R * 2.1]} />
          </mesh>
        ))}
      </Reveal>

      {/* -------------------------------------------------------- beams */}
      <Reveal name="beams" root={root}>
        {floors.map((f) => (
          <group key={`beamf-${f}`} position={[0, 0.85 + (f + 1) * FLOOR_H - SLAB_T / 2 - 0.18, 0]}>
            {Array.from({ length: BAYS_X * (BAYS_Z + 1) }, (_, k) => {
              const bx = geo.beamX[k];
              return (
                <mesh key={`bx-${f}-${k}`} position={[bx[0], 0, bx[1]]} material={mats.concrete} castShadow={shadows}>
                  <boxGeometry args={[BAY, 0.34, 0.26]} />
                </mesh>
              );
            })}
            {Array.from({ length: BAYS_Z * (BAYS_X + 1) }, (_, k) => {
              const bz = geo.beamZ[k];
              return (
                <mesh key={`bz-${f}-${k}`} position={[bz[0], 0, bz[1]]} material={mats.concrete} castShadow={shadows}>
                  <boxGeometry args={[0.26, 0.34, BAY]} />
                </mesh>
              );
            })}
          </group>
        ))}
      </Reveal>

      {/* -------------------------------------------------------- slabs */}
      <Reveal name="slabs" root={root}>
        {floors.map((f) => (
          <group key={`slab-${f}`} position={[0, 0.85 + (f + 1) * FLOOR_H, 0]}>
            <mesh material={mats.concrete} castShadow={shadows} receiveShadow>
              <boxGeometry args={[FOOT + 0.5, SLAB_T, DEPTH + 0.5]} />
            </mesh>
            <mesh position={[0, -SLAB_T * 0.5 - 0.03, 0]} material={mats.concreteDark}>
              <boxGeometry args={[FOOT + 0.62, 0.05, DEPTH + 0.62]} />
            </mesh>
          </group>
        ))}
      </Reveal>

      {/* ------------------------------------------------------- facade */}
      <Reveal name="facade" root={root} opacityDriven>
        {([
          [0, DEPTH / 2 + 0.12, FOOT + 0.3, 0],
          [0, -DEPTH / 2 - 0.12, FOOT + 0.3, 0],
          [FOOT / 2 + 0.12, 0, DEPTH + 0.3, Math.PI / 2],
          [-FOOT / 2 - 0.12, 0, DEPTH + 0.3, Math.PI / 2],
        ] as [number, number, number, number][]).map(([x, z, w, rot], i) => (
          <mesh
            key={`gl-${i}`}
            position={[x, 0.85 + HEIGHT / 2, z]}
            rotation={[0, rot, 0]}
            material={mats.glass}
            renderOrder={2}
          >
            <planeGeometry args={[w, HEIGHT - 0.3]} />
          </mesh>
        ))}
        {/* mullions */}
        {floors.map((f) => (
          <group key={`mul-${f}`} position={[0, 0.85 + f * FLOOR_H + FLOOR_H / 2, 0]}>
            {[DEPTH / 2 + 0.14, -DEPTH / 2 - 0.14].map((z, i) => (
              <mesh key={`mh-${f}-${i}`} position={[0, 0, z]} material={mats.steel}>
                <boxGeometry args={[FOOT + 0.3, 0.07, 0.07]} />
              </mesh>
            ))}
            {[FOOT / 2 + 0.14, -FOOT / 2 - 0.14].map((x, i) => (
              <mesh key={`mv-${f}-${i}`} position={[x, 0, 0]} material={mats.steel}>
                <boxGeometry args={[0.07, 0.07, DEPTH + 0.3]} />
              </mesh>
            ))}
            {Array.from({ length: BAYS_X - 1 }, (_, i) => (
              <mesh key={`vf-${f}-${i}`} position={[(i + 1 - BAYS_X / 2) * BAY, 0, DEPTH / 2 + 0.16]} material={mats.steel}>
                <boxGeometry args={[0.06, FLOOR_H, 0.06]} />
              </mesh>
            ))}
            {Array.from({ length: BAYS_X - 1 }, (_, i) => (
              <mesh key={`vb-${f}-${i}`} position={[(i + 1 - BAYS_X / 2) * BAY, 0, -DEPTH / 2 - 0.16]} material={mats.steel}>
                <boxGeometry args={[0.06, FLOOR_H, 0.06]} />
              </mesh>
            ))}
          </group>
        ))}
        {/* interior light planes */}
        {[2, 4, 6].map((f) => (
          <mesh
            key={`lit-${f}`}
            position={[0, 0.85 + f * FLOOR_H + 1, 0]}
            renderOrder={1}
            ref={(o) => {
              if (o && root.current) {
                const arr = (root.current.userData.lights ??= []) as THREE.Mesh[];
                if (!arr.includes(o)) arr.push(o);
              }
            }}
          >
            <boxGeometry args={[FOOT - 0.6, FLOOR_H * 0.6, DEPTH - 0.6]} />
            <meshBasicMaterial color="#ffd9a0" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </Reveal>

      {/* --------------------------------------------------------- roof */}
      <Reveal name="roof" root={root}>
        <mesh position={[0, 0.85 + HEIGHT + 0.5, 0]} material={mats.concrete} castShadow={shadows}>
          <boxGeometry args={[FOOT + 0.7, 0.5, DEPTH + 0.7]} />
        </mesh>
        {[
          [0, DEPTH / 2 + 0.25, FOOT + 0.7, 0.16],
          [0, -DEPTH / 2 - 0.25, FOOT + 0.7, 0.16],
          [FOOT / 2 + 0.25, 0, 0.16, DEPTH + 0.7],
          [-FOOT / 2 - 0.25, 0, 0.16, DEPTH + 0.7],
        ].map(([x, z, w, d], i) => (
          <mesh key={`par-${i}`} position={[x, 0.85 + HEIGHT + 0.95, z]} material={mats.concreteDark} castShadow={shadows}>
            <boxGeometry args={[w, 0.55, d]} />
          </mesh>
        ))}
        <mesh position={[2.2, 0.85 + HEIGHT + 1.4, -1.6]} material={mats.steel} castShadow={shadows}>
          <boxGeometry args={[1.6, 0.9, 1.2]} />
        </mesh>
        <mesh position={[-2.6, 0.85 + HEIGHT + 1.5, 1.8]} material={mats.steelLight} castShadow={shadows}>
          <cylinderGeometry args={[0.55, 0.55, 1, 16]} />
        </mesh>
        <mesh position={[3.4, 0.85 + HEIGHT + 2.4, 2.4]} material={mats.steelLight}>
          <boxGeometry args={[0.06, 2.4, 0.06]} />
        </mesh>
      </Reveal>

      {/* -------------------------------------------------- site objects */}
      <Reveal name="site" root={root}>
        {/* hoarding */}
        <group
          ref={(o) => {
            if (o && root.current) {
              giveOwnMaterials(o);
              const list = o.children.filter((c) => c.userData.panel) as THREE.Object3D[];
              list.forEach((c) => (c.userData.baseY = c.position.y));
              root.current.userData.hoarding = list;
            }
          }}
        >
          {[
            [0, 15.5, 34, 0],
            [0, -15.5, 34, 0],
            [16.5, 0, 0, Math.PI / 2],
            [-16.5, 0, 0, Math.PI / 2],
          ].map(([x, z, w, rot], i) => (
            <group key={`ho-${i}`} position={[x, 0, z]} rotation={[0, rot, 0]} userData={{ panel: true }}>
              <mesh position={[0, 0.9, 0]} userData={{ baseY: 0.9 }} castShadow={shadows}>
                <boxGeometry args={[w || 31, 1.8, 0.1]} />
                <meshStandardMaterial color="#191d21" roughness={0.9} metalness={0.1} />
              </mesh>
              <mesh position={[0, 1.72, 0]} userData={{ baseY: 1.72 }} material={mats.accent}>
                <boxGeometry args={[w || 31, 0.09, 0.12]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* material stacks */}
        <mesh position={[-9.6, 0.55, 7.6]} material={mats.concreteDark} castShadow={shadows}>
          <boxGeometry args={[2.6, 1.1, 1.4]} />
        </mesh>
        {geo.pipes.map((pp, i) => (
          <mesh key={`pipe-${i}`} position={[pp.x, pp.y, pp.z]} rotation={[0, 0, Math.PI / 2]} material={mats.steelLight} castShadow={shadows}>
            <cylinderGeometry args={[0.2, 0.2, 3.4, 12]} />
          </mesh>
        ))}
        <mesh position={[8.8, 0.42, 8.4]} rotation={[0, 0.4, 0]} material={mats.steel} castShadow={shadows}>
          <boxGeometry args={[3.2, 0.84, 1.2]} />
        </mesh>

        {/* excavator */}
        <group position={[8.4, 0, -8.2]} rotation={[0, -0.7, 0]}>
          <mesh position={[0, 0.34, 0]} material={mats.steel} castShadow={shadows}>
            <boxGeometry args={[1.5, 0.42, 3.1]} />
          </mesh>
          <mesh position={[0, 0.95, -0.4]} material={mats.accent} castShadow={shadows}>
            <boxGeometry args={[1.2, 0.85, 1.5]} />
          </mesh>
          <mesh position={[0, 1.3, 0.6]} rotation={[-0.7, 0, 0]} material={mats.accent} castShadow={shadows}>
            <boxGeometry args={[0.28, 0.28, 3.1]} />
          </mesh>
          <mesh position={[0, 0.55, 2.5]} rotation={[0.6, 0, 0]} material={mats.steelLight} castShadow={shadows}>
            <boxGeometry args={[0.9, 0.5, 0.9]} />
          </mesh>
        </group>

        {/* site cabin */}
        <group position={[-11.5, 0, -7.5]} rotation={[0, 0.35, 0]}>
          <mesh position={[0, 1.05, 0]} castShadow={shadows}>
            <boxGeometry args={[4, 2.1, 2.3]} />
            <meshStandardMaterial color="#20262b" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.35, 1.16]}>
            <planeGeometry args={[3.4, 1]} />
            <meshPhysicalMaterial color="#8fb9c6" roughness={0.1} metalness={0.2} transparent opacity={0.35} />
          </mesh>
        </group>
      </Reveal>

      {/* ---------------------------------------------------- landscaping */}
      <Reveal name="landscape" root={root}>
        {geo.trees.map(([x, z], i) => (
          <group key={`tree-${i}`} position={[x, 0, z]}>
            <mesh position={[0, 0.7, 0]} material={mats.concreteDark} castShadow={shadows}>
              <cylinderGeometry args={[0.1, 0.13, 1.4, 8]} />
            </mesh>
            <mesh position={[0, 1.9, 0]} castShadow={shadows}>
              <icosahedronGeometry args={[0.95, 1]} />
              <meshStandardMaterial color="#2f4038" roughness={1} />
            </mesh>
          </group>
        ))}
        {[-6, -2, 2, 6].map((x, i) => (
          <mesh key={`path-${i}`} position={[x, 0.05, DEPTH / 2 + 3.2]} receiveShadow>
            <boxGeometry args={[1.5, 0.1, 2.6]} />
            <meshStandardMaterial color="#7d848b" roughness={0.95} />
          </mesh>
        ))}
      </Reveal>

      {/* -------------------------------------------------------- crane */}
      <group
        position={[FOOT / 2 + 3.4, 0, -DEPTH / 2 - 3]}
        ref={(o) => {
          if (o && root.current) {
            giveOwnMaterials(o);
            const list: THREE.MeshStandardMaterial[] = [];
            o.traverse((m) => {
              const mm = (m as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
              if (mm) list.push(mm);
            });
            o.userData.mats = list;
            root.current.userData.crane = o;
          }
        }}
      >
        <mesh position={[0, 10, 0]} material={mats.accent} castShadow={shadows}>
          <boxGeometry args={[0.5, 20, 0.5]} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={`cl-${i}`} position={[0, 1 + i * 2, 0]} rotation={[0, Math.PI / 4, 0]} material={mats.steel}>
            <boxGeometry args={[0.9, 0.06, 0.9]} />
          </mesh>
        ))}
        <group
          position={[0, 20, 0]}
          ref={(o) => {
            const crane = root.current?.userData.crane as THREE.Group | undefined;
            if (o && crane) crane.userData.jib = o;
          }}
        >
          <mesh position={[5.5, 0, 0]} material={mats.accent} castShadow={shadows}>
            <boxGeometry args={[13, 0.34, 0.34]} />
          </mesh>
          <mesh position={[-2.6, 0, 0]} material={mats.steel} castShadow={shadows}>
            <boxGeometry args={[4.2, 0.34, 0.34]} />
          </mesh>
          <mesh position={[-4.4, -0.45, 0]} material={mats.concreteDark} castShadow={shadows}>
            <boxGeometry args={[1.3, 0.9, 0.9]} />
          </mesh>
          <mesh position={[0, 1.1, 0]} material={mats.steel}>
            <boxGeometry args={[0.18, 2.2, 0.18]} />
          </mesh>
          <mesh position={[5.2, 0.6, 0]} rotation={[0, 0, -0.19]} material={mats.steelLight}>
            <boxGeometry args={[10.6, 0.05, 0.05]} />
          </mesh>
          <mesh position={[-2.4, 0.6, 0]} rotation={[0, 0, 0.35]} material={mats.steelLight}>
            <boxGeometry args={[4.6, 0.05, 0.05]} />
          </mesh>
          {/* trolley + hook */}
          <group position={[7.4, 0, 0]}>
            <mesh material={mats.steel}>
              <boxGeometry args={[0.7, 0.3, 0.5]} />
            </mesh>
            <mesh
              position={[0, -3, 0]}
              ref={(o) => {
                const crane = root.current?.userData.crane as THREE.Group | undefined;
                if (o && crane) crane.userData.cable = o;
              }}
              material={mats.steelLight}
            >
              <boxGeometry args={[0.03, 6, 0.03]} />
            </mesh>
            <group
              position={[0, -6, 0]}
              ref={(o) => {
                const crane = root.current?.userData.crane as THREE.Group | undefined;
                if (o && crane) crane.userData.hook = o;
              }}
            >
              <mesh material={mats.accent}>
                <boxGeometry args={[0.4, 0.3, 0.4]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* --------------------------------------------------------- dust */}
      <group
        ref={(o) => {
          if (o && root.current && o.children[0]) root.current.userData.dust = o.children[0];
        }}
      >
        <DustField count={Math.round(520 * density)} radius={30} height={26} opacity={0.3} />
      </group>
    </group>
  );
}

/**
 * Group whose children are lowered + hidden until their window opens.
 * The parent frame loop reads `root.userData[name]` and drives it.
 */
function Reveal({
  name,
  root,
  children,
  opacityDriven = false,
}: {
  name: string;
  root: React.RefObject<THREE.Group | null>;
  children: React.ReactNode;
  opacityDriven?: boolean;
}) {
  return (
    <group
      ref={(o) => {
        if (!o || !root.current) return;
        giveOwnMaterials(o);
        const ud = root.current.userData;
        ud[name] = o;
        ud[`${name}__opacityDriven`] = opacityDriven;
      }}
    >
      {children}
    </group>
  );
}

/** apply the rise/fade for one named group */
/**
 * Apply the rise/fade for one named group.
 * Each mesh owns its material (see giveOwnMaterials), so opacity is per-mesh.
 */
function setReveal(root: THREE.Group, name: string, t: number, offset: number) {
  const g = root.userData[name] as THREE.Group | undefined;
  if (!g) return;
  const e = ease(t);
  g.position.y = (1 - e) * offset;
  g.visible = t > 0.001;
  if (!g.visible || root.userData[`${name}__opacityDriven`]) return;

  const opacity = e >= 0.999 ? 1 : Math.min(1, t * 2.6);
  if (g.userData.matList === undefined) {
    const list: THREE.MeshStandardMaterial[] = [];
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const m = mesh.material;
      if (m && mesh.userData.ownMat) list.push(m as THREE.MeshStandardMaterial);
    });
    g.userData.matList = list;
  }
  const list = g.userData.matList as THREE.MeshStandardMaterial[];
  for (let k = 0; k < list.length; k++) {
    const m = list[k];
    const base = (m.userData.baseOpacity as number) ?? 1;
    if (opacity >= 1) {
      m.opacity = base;
      m.transparent = (m.userData.baseTransparent as boolean) ?? false;
    } else {
      m.transparent = true;
      m.opacity = base * opacity;
    }
  }
}
