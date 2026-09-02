"use client";

/**
 * QUALITY / SAFETY / COMPLIANCE / SUSTAINABILITY — the four commitments, each
 * as its own built object on its own plinth around the central helmet.
 *
 * The items are the scene: selecting one in the copy flies the camera to it,
 * and hovering or clicking the object itself selects it back in the copy.
 */
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { getConcreteTexture, getGlowTexture } from "@/lib/three/materials";
import { trustPillars } from "@/lib/data/content";
import {
  ItemLabel,
  ItemPlinth,
  SelectionBeam,
  clamp01,
  lerpTo,
} from "@/components/three/ItemLabel";

const RADIUS = 4.4;
const CAM_RADIUS = 9.8;
/** compass bearing of each pillar, in radians */
const bearing = (i: number, n: number) => (i / n) * Math.PI * 2 + Math.PI / 4;

type Mats = Record<string, THREE.MeshStandardMaterial>;

export default function TrustScene({
  active = 0,
  onHover,
  onSelect,
  reducedMotion = false,
}: {
  active?: number;
  onHover?: (i: number | null) => void;
  onSelect?: (i: number) => void;
  reducedMotion?: boolean;
}) {
  const turntable = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const items = useRef<THREE.Group>(null);
  const cam = useThree((s) => s.camera);
  const camPos = useRef(new THREE.Vector3(0, 3.6, CAM_RADIUS));
  const camLook = useRef(new THREE.Vector3(0, 1.5, 0));
  /** what the camera is actually framing, so a hover doesn't fight the click */
  const focus = useRef(active);
  const hovered = useRef<number | null>(null);

  const mats: Mats = useMemo(
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
      dark: new THREE.MeshStandardMaterial({ color: "#242a30", roughness: 0.8, metalness: 0.2 }),
      accent: new THREE.MeshStandardMaterial({
        color: "#d8a76a",
        emissive: "#d8a76a",
        emissiveIntensity: 0.8,
        roughness: 0.4,
        metalness: 0.5,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#9fd0da",
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      green: new THREE.MeshStandardMaterial({
        color: "#8ee6a8",
        emissive: "#8ee6a8",
        emissiveIntensity: 0.5,
        roughness: 0.5,
      }),
    }),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const n = trustPillars.length;

    if (turntable.current && !reducedMotion) turntable.current.rotation.y += delta * 0.18;

    if (scan.current) {
      scan.current.position.y = 0.4 + ((t * 0.55) % 3.4);
      const m = scan.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.16 + Math.sin(t * 1.6) * 0.05;
    }
    if (beam.current) beam.current.rotation.y = t * 0.5;

    // ---- items: lift, settle and glow according to how "active" they are
    const itemsGroup = items.current;
    if (itemsGroup) {
      itemsGroup.children.forEach((child, i) => {
        const node = child as THREE.Group;
        const wanted = hovered.current === i ? 1 : active === i ? 1 : 0;
        const cur = (node.userData.lift as number | undefined) ?? 0;
        const next = lerpTo(cur, wanted, dt, 5);
        node.userData.lift = next;
        node.position.y = next * 0.22;
        const spin = node.children[0] as THREE.Group | undefined;
        if (spin) spin.rotation.y += dt * (0.12 + next * 0.5);
      });
    }

    // ---- camera: orbit to the focused pillar, helmet kept in frame
    const target = hovered.current ?? active;
    focus.current = lerpTo(focus.current, target, dt, 4);
    const a = bearing(focus.current, n);
    const dirX = Math.cos(a);
    const dirZ = Math.sin(a);
    camPos.current.lerp(
      new THREE.Vector3(dirX * CAM_RADIUS, 3.7, dirZ * CAM_RADIUS),
      1 - Math.pow(0.003, dt),
    );
    camLook.current.lerp(new THREE.Vector3(dirX * 2.0, 1.5, dirZ * 2.0), 1 - Math.pow(0.003, dt));
    cam.position.copy(camPos.current);
    cam.lookAt(camLook.current);
  });

  const setCursor = (on: boolean) => {
    if (typeof document !== "undefined") document.body.style.cursor = on ? "pointer" : "auto";
  };

  return (
    <group position={[0, -1.7, 0]}>
      {/* ---------------------------------------------------- central helmet */}
      <group>
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
            <mesh position={[0, 0.42, 0]}>
              <boxGeometry args={[0.16, 0.62, 2.0]} />
              <primitive object={mats.shellRim} attach="material" />
            </mesh>
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

        {/* scan plane + light beam */}
        <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 2.9, 48]} />
          <meshBasicMaterial
            color="#74d3d8"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
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
        <sprite position={[0, 1.7, 0]} scale={[6, 6, 1]}>
          <spriteMaterial
            map={getGlowTexture()}
            color="#d8a76a"
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </sprite>
      </group>

      {/* ------------------------------------------------- the four commitments */}
      <group ref={items}>
        {trustPillars.map((p, i) => {
          const a = bearing(i, trustPillars.length);
          const x = Math.cos(a) * RADIUS;
          const z = Math.sin(a) * RADIUS;
          return (
            <group
              key={p.title}
              position={[x, 0, z]}
              rotation={[0, -a + Math.PI / 2, 0]}
              onPointerOver={(e) => {
                e.stopPropagation();
                hovered.current = i;
                setCursor(true);
                onHover?.(i);
              }}
              onPointerOut={() => {
                hovered.current = null;
                setCursor(false);
                onHover?.(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(i);
              }}
            >
              {/* generous hit volume so the item is easy to point at */}
              <mesh position={[0, 1.4, 0]} visible={false}>
                <cylinderGeometry args={[1.5, 1.5, 3.2, 8]} />
              </mesh>

              <ItemPlinth radius={1.3} concrete={mats.concrete} steel={mats.steel} />
              <SelectionBeam getIntensity={() => (items.current?.children[i]?.userData.lift as number) ?? 0} />

              <group position={[0, 0.36, 0]}>
                <PillarModel kind={i} mats={mats} />
              </group>

              <ItemLabel
                position={[0, 2.9, 0]}
                distanceFactor={13}
                getOpacity={() => 0.45 + (((items.current?.children[i]?.userData.lift as number) ?? 0) * 0.55)}
              >
                <div className="text-center">
                  <div className="tech text-[9px] tracking-[0.3em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="display mt-1 text-[13px] text-chalk">{p.title}</div>
                </div>
              </ItemLabel>
            </group>
          );
        })}
      </group>

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[11, 48]} />
        <meshStandardMaterial color="#0a0d10" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** One distinct object per commitment — not four identical markers. */
function PillarModel({ kind, mats }: { kind: number; mats: Mats }) {
  switch (kind) {
    /* 01 QUALITY — a concrete test cube under caliper jaws, with a seal ring */
    case 0:
      return (
        <group>
          <mesh position={[0, 0.55, 0]} material={mats.concrete} castShadow>
            <boxGeometry args={[0.9, 0.9, 0.9]} />
          </mesh>
          {[-0.52, 0.52].map((x) => (
            <mesh key={x} position={[x, 0.55, 0]} material={mats.steelLight} castShadow>
              <boxGeometry args={[0.1, 1.3, 0.34]} />
            </mesh>
          ))}
          <mesh position={[0, 1.24, 0]} material={mats.steel} castShadow>
            <boxGeometry args={[1.3, 0.1, 0.22]} />
          </mesh>
          <mesh position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.34, 0.045, 10, 32]} />
            <primitive object={mats.accent} attach="material" />
          </mesh>
          <mesh position={[0, 1.62, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.06]} />
            <primitive object={mats.accent} attach="material" />
          </mesh>
        </group>
      );

    /* 02 SAFETY — helmet on a post, with a barrier in front */
    case 1:
      return (
        <group>
          <mesh position={[0, 0.5, 0]} material={mats.steel} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 1.0, 14]} />
          </mesh>
          <group position={[0, 1.16, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.52, 26, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={mats.shell} attach="material" />
            </mesh>
            <mesh position={[0, -0.03, 0]} castShadow>
              <cylinderGeometry args={[0.68, 0.7, 0.07, 28]} />
              <primitive object={mats.shellRim} attach="material" />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <torusGeometry args={[0.53, 0.022, 8, 28]} />
              <primitive object={mats.accent} attach="material" />
            </mesh>
          </group>
          <group position={[0, 0.42, 0.95]}>
            {[-0.72, 0.72].map((x) => (
              <mesh key={x} position={[x, 0, 0]} material={mats.steel} castShadow>
                <boxGeometry args={[0.08, 0.84, 0.08]} />
              </mesh>
            ))}
            {[0.16, 0.42].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={mats.accent}>
                <boxGeometry args={[1.5, 0.11, 0.05]} />
              </mesh>
            ))}
          </group>
        </group>
      );

    /* 03 COMPLIANCE — a document stack, stamped and sealed */
    case 2:
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[i * 0.03, 0.09 + i * 0.13, -i * 0.02]}
              rotation={[0, i * 0.06, 0]}
              material={i === 2 ? mats.shell : mats.shellRim}
              castShadow
            >
              <boxGeometry args={[1.0, 0.1, 1.3]} />
            </mesh>
          ))}
          {/* ruled lines on the top sheet */}
          {[0.18, 0.0, -0.18, -0.36].map((z, i) => (
            <mesh key={z} position={[0.06, 0.42, z]} material={mats.dark}>
              <boxGeometry args={[0.72 - i * 0.08, 0.012, 0.045]} />
            </mesh>
          ))}
          {/* stamp */}
          <group position={[0.42, 0.5, 0.42]}>
            <mesh position={[0, 0.12, 0]} material={mats.steel} castShadow>
              <cylinderGeometry args={[0.13, 0.16, 0.24, 18]} />
            </mesh>
            <mesh position={[0, 0.3, 0]} material={mats.steelLight}>
              <cylinderGeometry args={[0.05, 0.05, 0.16, 10]} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.14, 0.19, 24]} />
              <primitive object={mats.accent} attach="material" />
            </mesh>
          </group>
        </group>
      );

    /* 04 SUSTAINABILITY — a tilted solar array on a mast */
    default:
      return (
        <group>
          <mesh position={[0, 0.55, 0]} material={mats.steel} castShadow>
            <cylinderGeometry args={[0.09, 0.13, 1.1, 14]} />
          </mesh>
          <group position={[0, 1.2, 0]} rotation={[-0.5, 0, 0]}>
            <mesh material={mats.glass} castShadow>
              <boxGeometry args={[1.5, 0.06, 1.0]} />
            </mesh>
            {[-0.5, 0, 0.5].map((x) => (
              <mesh key={x} position={[x, 0.04, 0]} material={mats.steelLight}>
                <boxGeometry args={[0.035, 0.05, 1.0]} />
              </mesh>
            ))}
            {[-0.32, 0.32].map((z) => (
              <mesh key={z} position={[0, 0.04, z]} material={mats.steelLight}>
                <boxGeometry args={[1.5, 0.05, 0.035]} />
              </mesh>
            ))}
          </group>
          {/* mast + beacon */}
          <mesh position={[-0.62, 0.95, 0.34]} material={mats.steel}>
            <cylinderGeometry args={[0.035, 0.05, 1.9, 10]} />
          </mesh>
          <mesh position={[-0.62, 1.94, 0.34]}>
            <octahedronGeometry args={[0.12, 0]} />
            <primitive object={mats.green} attach="material" />
          </mesh>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.62, 0.7, 32]} />
            <primitive object={mats.green} attach="material" />
          </mesh>
          <sprite position={[-0.62, 1.94, 0.34]} scale={[1.4, 1.4, 1]}>
            <spriteMaterial
              map={getGlowTexture()}
              color="#8ee6a8"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </sprite>
        </group>
      );
  }
}

/** exported so tests can assert the item count without importing content */
export const pillarCount = trustPillars.length;
export const clampForTest = clamp01;
