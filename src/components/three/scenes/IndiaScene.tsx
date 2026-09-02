"use client";

/**
 * ⭐ 3D India map — the climax of the page.
 *
 * The country rises out of the ground as an extruded 3D map, states illuminate
 * in a wave from the south-west, and confirmed locations get markers.
 * Hover a state for a readout, click for the detail panel.
 *
 * State/city data comes from `src/lib/data/content.ts`; geometry comes from the
 * bundled `public/data/india-states.geojson`.
 */
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadIndiaMap, projectPoint, type IndiaMapData, type MapState } from "@/lib/three/indiaMap";
import { presence, projects, tierLabel, type Presence, type PresenceTier } from "@/lib/data/content";
import { getGlowTexture } from "@/lib/three/materials";

export const HEIGHTS: Record<PresenceTier, number> = { projects: 1.15, presence: 0.6, reach: 0.32 };

const COLORS = {
  base: "#1a2027",
  presence: "#2a3641",
  projects: "#33424e",
  edge: "#4d6a72",
  edgeHot: "#74d3d8",
  accent: "#d8a76a",
};

export type MapSelection = {
  state: MapState["name"];
  presence: Presence | null;
};

type Props = {
  active: boolean;
  reducedMotion: boolean;
  onSelect: (sel: MapSelection | null) => void;
  onHover: (state: string | null, x: number, y: number) => void;
  selected?: string | null;
};

export default function IndiaScene({ active, reducedMotion, onSelect, onHover, selected }: Props) {
  const [data, setData] = useState<IndiaMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const lastTip = useRef({ name: "", x: -1e4, y: -1e4 });
  const [rise, setRise] = useState(0);
  const cam = useThree((s) => s.camera);
  const intro = useRef({ done: reducedMotion, t: reducedMotion ? 1 : 0 });
  const [introDone, setIntroDone] = useState(reducedMotion);
  const targetRise = useRef(0);
  const riseValue = useRef(0);
  const smooth = useRef(0);
  const look = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    let cancelled = false;
    loadIndiaMap({
      heightFor: (name) => {
        const p = presence.find((x) => x.state === name);
        return p ? HEIGHTS[p.tier] : HEIGHTS.reach;
      },
    })
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    targetRise.current = active ? 1 : 0;
  }, [active]);

  const presenceByName = useMemo(() => {
    const m = new Map<string, Presence>();
    presence.forEach((p) => m.set(p.state, p));
    return m;
  }, []);

  const selectedState = useMemo(
    () => data?.states.find((s) => s.name === selected) ?? null,
    [data, selected],
  );

  // city markers (confirmed locations from the brief)
  const cities = useMemo(() => {
    if (!data) return [];
    return presence.flatMap((p) =>
      p.cities.map((c) => {
        const pt = projectPoint(c.lon, c.lat, data.center);
        const st = data.states.find((s) => s.name === p.state);
        return {
          ...c,
          state: p.state,
          x: pt.x,
          z: pt.y,
          y: st ? st.height : HEIGHTS.reach,
        };
      }),
    );
  }, [data]);

  // arcs: operations bases → selected state
  const arcs = useMemo(() => {
    if (!data || !selectedState) return [];
    const bases = cities.filter((c) => ["Patna", "Bettiah"].includes(c.name));
    const targets =
      presenceByName.get(selectedState.name)?.cities.length
        ? presenceByName.get(selectedState.name)!.cities.map((c) => {
            const pt = projectPoint(c.lon, c.lat, data.center);
            return { x: pt.x, z: pt.y };
          })
        : [{ x: selectedState.centroid.x, z: selectedState.centroid.y }];

    return bases.flatMap((b) =>
      targets.map((t) => {
        const from = new THREE.Vector3(b.x, b.y + 0.1, b.z);
        const to = new THREE.Vector3(t.x, (selectedState.height ?? 0.6) + 0.1, t.z);
        const mid = from.clone().lerp(to, 0.5);
        mid.y += Math.max(4, from.distanceTo(to) * 0.42);
        const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
        return {
          key: `${b.name}-${t.x.toFixed(2)}-${t.z.toFixed(2)}`,
          curve,
          degenerate: from.distanceTo(to) < 0.01,
        };
      }),
    );
  }, [data, selectedState, cities, presenceByName]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    smooth.current += ((hovered ? 1 : 0) - smooth.current) * (1 - Math.pow(0.001, dt));

    // rise animation
    riseValue.current += (targetRise.current - riseValue.current) * (1 - Math.pow(0.004, dt));
    if (Math.abs(targetRise.current - riseValue.current) > 0.0005) setRise(riseValue.current);

    // camera intro
    if (!intro.current.done) {
      intro.current.t = Math.min(1, intro.current.t + dt / 2.4);
      const t = intro.current.t;
      const e = 1 - Math.pow(1 - t, 3);
      const from = new THREE.Vector3(1.5, 42, 12);
      const to = new THREE.Vector3(10, 16, 25);
      cam.position.lerpVectors(from, to, e);
      look.current.lerp(new THREE.Vector3(1.5, 0, 0), 1 - Math.pow(0.002, dt));
      cam.lookAt(look.current);
      if (t >= 1) {
        intro.current.done = true;
        setIntroDone(true);
      }
    }
    void state;
  });

  /** Tooltip updates are throttled: only on a new state or a visible move. */
  const reportHover = (name: string, x: number, y: number, force: boolean) => {
    const last = lastTip.current;
    if (!force && last.name === name && Math.hypot(x - last.x, y - last.y) < 4) return;
    lastTip.current = { name, x, y };
    onHover(name, x, y);
  };

  if (error) {
    return (
      <Html center>
        <div className="tech text-[10px] text-steel">Map data unavailable — {error}</div>
      </Html>
    );
  }
  if (!data) {
    return (
      <Html center>
        <div className="tech text-[10px] text-steel">Loading India…</div>
      </Html>
    );
  }

  const originX = data.bounds.min.x;
  const originY = data.bounds.max.y;
  const span = Math.hypot(data.bounds.max.x - data.bounds.min.x, data.bounds.max.y - data.bounds.min.y);

  return (
    <group position={[0, -1.5, 0]}>
      {/* ----------------------------------------------------- ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.02, 0]} receiveShadow>
        <circleGeometry args={[46, 72]} />
        <meshStandardMaterial color="#0b0e11" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, 0.0, 0]}>
        <planeGeometry args={[70, 70, 1, 1]} />
        <meshBasicMaterial color="#16262b" transparent opacity={0.5} wireframe />
      </mesh>
      <gridHelper args={[70, 70, "#1d3b41", "#132226"]} position={[1.5, 0.01, 0]} />

      {/* ---------------------------------------------------------- states */}
      {data.states.map((s) => {
        const dist = Math.hypot(s.centroid.x - originX, s.centroid.y - originY) / (span || 1);
        const t = Math.min(1, Math.max(0, rise * 1.55 - dist * 0.5));
        const e = t * t * (3 - 2 * t);
        const p = presenceByName.get(s.name);
        const isHover = hovered === s.name;
        const isSelected = selected === s.name;
        const baseColor = !p ? COLORS.base : p.tier === "projects" ? COLORS.projects : COLORS.presence;
        return (
          <group key={s.id} position={[s.centroid.x, 0, s.centroid.y]} scale={[1, Math.max(0.001, e), 1]}>
            <mesh
              geometry={s.geometry}
              castShadow
              receiveShadow
              onPointerOver={(ev: ThreeEvent<PointerEvent>) => {
                ev.stopPropagation();
                setHovered(s.name);
                reportHover(s.name, ev.clientX, ev.clientY, true);
                document.body.style.cursor = "pointer";
              }}
              onPointerMove={(ev: ThreeEvent<PointerEvent>) =>
                reportHover(s.name, ev.clientX, ev.clientY, false)
              }
              onPointerOut={() => {
                setHovered((h) => (h === s.name ? null : h));
                lastTip.current = { name: "", x: -1e4, y: -1e4 };
                onHover(null, 0, 0);
                document.body.style.cursor = "auto";
              }}
              onClick={(ev: ThreeEvent<MouseEvent>) => {
                ev.stopPropagation();
                onSelect({ state: s.name, presence: presenceByName.get(s.name) ?? null });
              }}
            >
              <StateMaterial name={s.name} base={baseColor} hover={isHover} selected={isSelected} />
            </mesh>
            <lineSegments geometry={s.edges}>
              <lineBasicMaterial
                color={isSelected ? COLORS.accent : isHover ? COLORS.edgeHot : COLORS.edge}
                transparent
                opacity={isSelected ? 0.95 : isHover ? 0.8 : p ? 0.45 : 0.22}
              />
            </lineSegments>
          </group>
        );
      })}

      {/* --------------------------------------------------- confirmed cities */}
      {cities.map((c) => {
        const st = data.states.find((s) => s.name === c.state);
        const dist = st ? Math.hypot(st.centroid.x - originX, st.centroid.y - originY) / (span || 1) : 1;
        const t = Math.min(1, Math.max(0, rise * 1.55 - dist * 0.5));
        if (t < 0.85) return null;
        const isSel = selected === c.state;
        return (
          <group key={`${c.state}-${c.name}`} position={[c.x, c.y, c.z]}>
            <mesh>
              <sphereGeometry args={[0.24, 16, 16]} />
              <meshStandardMaterial
                color={COLORS.accent}
                emissive={COLORS.accent}
                emissiveIntensity={isSel ? 2.4 : 1.2}
                roughness={0.3}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[0.4, 0.52, 32]} />
              <meshBasicMaterial color={COLORS.accent} transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            <sprite scale={[2.6, 2.6, 1]}>
              <spriteMaterial map={getGlowTexture()} color={COLORS.accent} transparent opacity={0.35} depthWrite={false} />
            </sprite>
            <Html
              position={[0, 1.1, 0]}
              center
              distanceFactor={26}
              className="map-label"
              style={{ pointerEvents: "none" }}
            >
              <div className="tech whitespace-nowrap text-[11px] tracking-[0.18em] text-chalk">{c.name}</div>
              <div className="whitespace-nowrap text-[10px] text-steel">{c.note ?? c.state}</div>
            </Html>
          </group>
        );
      })}

      {/* ------------------------------------------------- travel arcs */}
      {arcs.map((a) =>
        a.degenerate ? null : (
          <Arc key={a.key} curve={a.curve} reducedMotion={reducedMotion} />
        ),
      )}

      {/* ------------------------------------------------------ controls */}
      <OrbitControls
        enabled={introDone}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={14}
        maxDistance={64}
        minPolarAngle={0.12}
        maxPolarAngle={1.34}
        target={[1.5, 0, 0]}
        rotateSpeed={0.55}
        zoomSpeed={0.6}
      />
    </group>
  );
}

/** Per-state material with hover / selection emissive response. */
function StateMaterial({
  name,
  base,
  hover,
  selected,
}: {
  name: string;
  base: string;
  hover: boolean;
  selected: boolean;
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => {
    if (selected) return new THREE.Color(COLORS.accent);
    if (hover) return new THREE.Color(COLORS.edgeHot);
    return new THREE.Color(base);
  }, [base, hover, selected]);
  const emissive = useMemo(
    () => new THREE.Color(selected ? COLORS.accent : hover ? COLORS.edgeHot : "#0d1418"),
    [hover, selected],
  );

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const k = 1 - Math.pow(0.002, Math.min(delta, 0.05));
    m.color.lerp(target, k);
    m.emissive.lerp(emissive, k);
    const targetIntensity = selected ? 0.5 : hover ? 0.38 : 0.12;
    m.emissiveIntensity += (targetIntensity - m.emissiveIntensity) * k;
  });

  return (
    <meshStandardMaterial
      ref={ref}
      name={name}
      color={base}
      roughness={0.72}
      metalness={0.25}
      emissive="#0d1418"
      emissiveIntensity={0.12}
    />
  );
}

/** Glowing arc + travelling pulse along it. */
function Arc({
  curve,
  reducedMotion,
}: {
  curve: THREE.QuadraticBezierCurve3;
  reducedMotion: boolean;
}) {
  const geom = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.035, 6, false), [curve]);
  const dot = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useEffect(() => () => geom.dispose(), [geom]);

  useFrame((_, delta) => {
    if (!dot.current) return;
    if (!reducedMotion) t.current = (t.current + delta * 0.42) % 1;
    const p = curve.getPoint(t.current);
    dot.current.position.copy(p);
    const m = dot.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.35 + Math.sin(t.current * Math.PI) * 0.65;
  });

  return (
    <group>
      <mesh geometry={geom}>
        <meshBasicMaterial
          color={COLORS.accent}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#ffe2b4" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={curve.getPoint(1).toArray()}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color={COLORS.accent} transparent opacity={0.8} />
      </mesh>
      <mesh position={curve.getPoint(0).toArray()}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color={COLORS.accent} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export const mapStats = {
  states: presence.length,
  cities: presence.reduce((n, p) => n + p.cities.length, 0),
  projects: projects.length,
  tierLabel,
};
