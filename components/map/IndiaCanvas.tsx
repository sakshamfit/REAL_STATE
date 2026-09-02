"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, Html, Line, Sparkles } from "@react-three/drei";
import { PRESENCE } from "@/data/content";
import {
  PRESENCE_BY_GEO,
  centroidOf,
  flattenGeo,
  project,
  type IndiaFeature,
} from "@/lib/india-geo";
import { clamp01, damp, scrollState } from "@/lib/utils";

const hub = PRESENCE[0].cities?.[0];

function buildGeometry(f: IndiaFeature): THREE.BufferGeometry {
  const group = new THREE.BufferGeometry();
  const geos: THREE.BufferGeometry[] = [];
  for (const poly of f.polys) {
    const shape = new THREE.Shape();
    const [x0, y0] = project(poly.outer[0][0], poly.outer[0][1]);
    shape.moveTo(x0, y0);
    for (let i = 1; i < poly.outer.length; i++) {
      const [x, y] = project(poly.outer[i][0], poly.outer[i][1]);
      shape.lineTo(x, y);
    }
    for (const hole of poly.holes) {
      const path = new THREE.Path();
      const [hx0, hy0] = project(hole[0][0], hole[0][1]);
      path.moveTo(hx0, hy0);
      for (let i = 1; i < hole.length; i++) {
        const [x, y] = project(hole[i][0], hole[i][1]);
        path.lineTo(x, y);
      }
      path.closePath();
      shape.holes.push(path);
    }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 1,
      curveSegments: 4,
    });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    geos.push(g);
  }
  if (geos.length === 1) return geos[0];
  let total = 0;
  let idxTotal = 0;
  for (const g of geos) {
    total += g.attributes.position.count;
    idxTotal += g.index ? g.index.count : 0;
  }
  const pos = new Float32Array(total * 3);
  const norm = new Float32Array(total * 3);
  const idx = new Uint32Array(idxTotal);
  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, vOff * 3);
    norm.set(g.attributes.normal.array as Float32Array, vOff * 3);
    const gi = g.index!.array as Uint32Array;
    for (let i = 0; i < gi.length; i++) idx[iOff + i] = gi[i] + vOff;
    vOff += g.attributes.position.count;
    iOff += gi.length;
  }
  group.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  group.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
  group.setIndex(new THREE.BufferAttribute(idx, 1));
  return group;
}

const STATE_COLORS = {
  base: "#171a20",
  tier2: "#23262e",
  tier1: "#2c313c",
  hover: "#4a505c",
  selected: "#3a3f47",
  edge: "#39414e",
  edgeHot: "#8a5203",
  glow: "#241a04",
} as const;

function States({
  features,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  features: IndiaFeature[];
  hovered: string | null;
  selected: string | null;
  onHover: (name: string | null) => void;
  onSelect: (name: string | null) => void;
}) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const geometries = useMemo(() => features.map((f) => buildGeometry(f)), [features]);
  const centroids = useMemo(() => features.map((f) => centroidOf(f)), [features]);
  const mats = useMemo(
    () =>
      features.map((f) => {
        const p = PRESENCE_BY_GEO.get(f.name);
        const color = p ? (p.tier === 1 ? STATE_COLORS.tier1 : STATE_COLORS.tier2) : STATE_COLORS.base;
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.62,
          metalness: 0.35,
          emissive: STATE_COLORS.glow,
          emissiveIntensity: p ? 0.55 : 0.12,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        });
      }),
    [features]
  );

  useEffect(() => {
    features.forEach((f, i) => {
      const m = mats[i];
      const p = PRESENCE_BY_GEO.get(f.name);
      const isSel = selected === f.name;
      const isHover = hovered === f.name;
      const color = isSel
        ? STATE_COLORS.selected
        : isHover
          ? STATE_COLORS.hover
          : p
            ? p.tier === 1
              ? STATE_COLORS.tier1
              : STATE_COLORS.tier2
            : STATE_COLORS.base;
      m.color.set(color);
      m.emissive.set(isSel || isHover ? "#6b4206" : STATE_COLORS.glow);
      m.emissiveIntensity = isSel || isHover ? 1.1 : p ? 0.55 : 0.12;
    });
  }, [features, mats, hovered, selected]);

  useFrame((_, delta) => {
    const p = scrollState.map;
    features.forEach((f, i) => {
      const g = refs.current[i];
      if (!g) return;
      const presence = PRESENCE_BY_GEO.get(f.name);
      const delay = i * 0.008 + (presence ? 0.02 : 0);
      const s = clamp01((p - delay) / 0.16);
      g.scale.y = Math.max(s, 0.0001);
      const isHover = hovered === f.name;
      const isSel = selected === f.name;
      const targetY = (isSel ? 1.1 : isHover ? 0.8 : 0.02) * s;
      g.position.y = damp(g.position.y, targetY, 8, delta);
    });
  });

  return (
    <group>
      {features.map((f, i) => {
        const [cx, cy] = centroids[i];
        return (
          <group
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
          >
            <mesh
              geometry={geometries[i]}
              material={mats[i]}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(f.name);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                onHover(null);
                document.body.style.cursor = "";
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(f.name);
              }}
            />
            {hovered === f.name && (
              <Html position={[cx, 1.8, cy]} center distanceFactor={26} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
                <div className="whitespace-nowrap rounded-sm border border-accent/60 bg-ink/90 px-3 py-1.5 text-center backdrop-blur">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-bone">{f.name}</div>
                  {PRESENCE_BY_GEO.has(f.name) && (
                    <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-widest2 text-accent">
                      Projects / Presence
                    </div>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Marker({
  name,
  geoName,
  lat,
  lon,
  index,
  onSelect,
  selected,
}: {
  name: string;
  geoName: string;
  lat: number;
  lon: number;
  index: number;
  onSelect: (name: string | null) => void;
  selected: boolean;
}) {
  const [x, z] = project(lon, lat);
  const ring = useRef<THREE.Mesh>(null!);
  const pulse = useRef(0);
  useFrame((_, delta) => {
    const p = scrollState.map;
    const on = clamp01((p - (0.3 + index * 0.08)) / 0.1);
    pulse.current = (pulse.current + delta * (on > 0 ? 1 : 0)) % 1;
    ring.current.rotation.x = Math.PI / 2;
    ring.current.scale.setScalar(on * (0.4 + pulse.current * 2.4));
    (ring.current.material as THREE.MeshBasicMaterial).opacity = on * (1 - pulse.current) * 0.9;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, 0.95, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(geoName);
        }}
      >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color={selected ? "#f0b43c" : "#ffd76a"}
          emissive="#b8780e"
          emissiveIntensity={selected ? 2 : 1.1}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <coneGeometry args={[0.11, 0.5, 10]} />
        <meshStandardMaterial color="#3a404c" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={ring} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.86, 40]} />
        <meshBasicMaterial color="#f0b43c" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 2.15, 0]} center distanceFactor={30} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-bone/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          {name}
        </div>
      </Html>
    </group>
  );
}

function RouteSystem({ features, activeKey }: { features: IndiaFeature[]; activeKey: string | null }) {
  const routes = useRef<Array<{ line: any; group: THREE.Group } | null>>([]);
  const pulse = useRef<THREE.Mesh[]>([]);

  const data = useMemo(() => {
    if (!hub) return [];
    const pts: { key: string; geoName: string; points: THREE.Vector3[] }[] = [];
    for (const p of PRESENCE.slice(0, 2)) {
      for (const c of p.cities ?? []) {
        const [hx, hz] = project(hub.lon, hub.lat);
        const [cx, cz] = project(c.lon, c.lat);
        const mid = new THREE.Vector3((hx + cx) / 2, 3.1, (hz + cz) / 2);
        pts.push({
          key: `${p.geoName}-${c.name}`,
          geoName: p.geoName,
          points: [new THREE.Vector3(hx, 1, hz), mid, new THREE.Vector3(cx, 1, cz)],
        });
      }
    }
    for (const f of features) {
      const p = PRESENCE_BY_GEO.get(f.name);
      if (!p || p.geoName === "Bihar" || p.cities) continue;
      const [cx, cz] = centroidOf(f);
      const [hx, hz] = project(hub.lon, hub.lat);
      const mid = new THREE.Vector3((hx + cx) / 2, 4.4, (hz + cz) / 2);
      pts.push({
        key: p.geoName,
        geoName: p.geoName,
        points: [new THREE.Vector3(hx, 1, hz), mid, new THREE.Vector3(cx, 1, cz)],
      });
    }
    return pts;
  }, [features]);

  useFrame((_, delta) => {
    const p = scrollState.map;
    const on = p > 0.42 ? clamp01((p - 0.42) / 0.12) : 0;
    data.forEach((d, i) => {
      const item = routes.current[i];
      if (!item || !item.group) return;
      const active = d.geoName === activeKey;
      item.group.visible = on > 0.001;
      if (item.line?.material) {
        item.line.material.dashOffset -= delta * (active ? 2.6 : 1.6);
        item.line.material.opacity = on * (active ? 1 : 0.82);
        item.line.material.linewidth = active ? 3.2 : 1.2;
      }
      const dot = pulse.current[i];
      if (dot) {
        const t = (performance.now() / (active ? 1200 : 2400) + i * 0.29) % 1;
        const curve = new THREE.CatmullRomCurve3(d.points);
        dot.position.copy(curve.getPointAt(t));
        dot.visible = on > 0.4;
        (dot.material as THREE.MeshBasicMaterial).color.set(active ? "#ffd76a" : "#f0b43c");
      }
    });
  });

  return (
    <group>
      {data.map((d, i) => (
        <group
          key={d.key}
          ref={(el) => {
            if (!el) {
              routes.current[i] = null;
              return;
            }
            routes.current[i] = { line: null, group: el };
          }}
          visible={false}
        >
          <Line
            ref={(l: any) => {
              if (routes.current[i]) routes.current[i]!.line = l;
            }}
            points={d.points}
            color="#f0b43c"
            lineWidth={1.2}
            dashed
            dashSize={0.5}
            gapSize={0.35}
            transparent
            opacity={0}
          />
          <mesh
            ref={(el) => {
              if (el) pulse.current[i] = el;
            }}
            visible={false}
          >
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshBasicMaterial color="#f0b43c" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MapCamera() {
  useFrame((state, delta) => {
    const p = scrollState.map;
    const t = state.clock.elapsedTime;
    const targetZ = 33 - p * 3.5;
    const targetY = 27 + p * 2 + Math.sin(t * 0.1) * 0.6;
    state.camera.position.z = damp(state.camera.position.z, targetZ, 2, delta);
    state.camera.position.y = damp(state.camera.position.y, targetY, 2, delta);
    state.camera.position.x = damp(state.camera.position.x, Math.sin(t * 0.07) * 2.4, 1.2, delta);
    state.camera.lookAt(0, 0, -1);
  });
  return null;
}

export function IndiaCanvas({
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  hovered: string | null;
  selected: string | null;
  onHover: (n: string | null) => void;
  onSelect: (n: string | null) => void;
}) {
  const [geo, setGeo] = useState<IndiaFeature[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/geojson/india.json")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setGeo(flattenGeo(d));
      })
      .catch(() => {
        if (alive) setGeo([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!geo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink font-mono text-[11px] uppercase tracking-widest2 text-fog">
        Loading territory data…
      </div>
    );
  }

  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false }}
      camera={{ fov: 40, position: [0, 28, 33], near: 0.1, far: 200 }}
      onPointerMissed={() => onSelect(null)}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0a0b0d"]} />
      <fog attach="fog" args={["#0a0b0d", 46, 110]} />
      <ambientLight intensity={0.32} />
      <hemisphereLight args={["#a9b6d4", "#08090b", 0.5]} />
      <directionalLight position={[8, 20, 10]} intensity={2.2} color="#e9edf8" />
      <directionalLight position={[-12, 8, -10]} intensity={0.55} color="#93a7dc" />
      <pointLight position={[3, 10, 2]} intensity={28} color="#f0b43c" distance={40} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <circleGeometry args={[50, 64]} />
        <meshStandardMaterial color="#0b0c0e" roughness={1} />
      </mesh>
      <Grid
        position={[0, -0.05, 0]}
        args={[90, 90]}
        cellSize={1.5}
        cellThickness={0.5}
        cellColor="#1b1e24"
        sectionSize={7.5}
        sectionThickness={1}
        sectionColor="#2f343d"
        fadeDistance={60}
        fadeStrength={2.5}
        infiniteGrid
      />

      <States features={geo} hovered={hovered} selected={selected} onHover={onHover} onSelect={onSelect} />
      <RouteSystem features={geo} activeKey={hovered ?? selected} />

      {geo.flatMap((f) => {
        const p = PRESENCE_BY_GEO.get(f.name);
        if (!p) return [];
        return (p.cities ?? []).map((c, i) => (
          <Marker key={`${p.geoName}-${c.name}`} name={c.name} geoName={p.geoName} lat={c.lat} lon={c.lon} index={i} onSelect={onSelect} selected={selected === p.geoName} />
        ));
      })}

      <Sparkles count={50} scale={[34, 12, 30]} size={1.4} speed={0.14} opacity={0.3} color="#9fb3c8" position={[0, 6, 0]} />
      <MapCamera />
    </Canvas>
  );
}
