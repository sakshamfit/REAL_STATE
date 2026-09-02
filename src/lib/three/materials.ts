/**
 * Shared procedural materials + canvas textures.
 * Everything is generated at runtime — the site ships zero image/HDRI downloads.
 */
import * as THREE from "three";

let concreteTex: THREE.Texture | null = null;
let glowTex: THREE.Texture | null = null;
const gridCache = new Map<string, THREE.Texture>();

export const palette = {
  concrete: "#8e959c",
  concreteDark: "#4b5158",
  steel: "#2b3138",
  steelLight: "#6f7883",
  glass: "#9fc6cf",
  accent: "#d8a76a",
  cyan: "#74d3d8",
  ink: "#07080a",
} as const;

/** Grainy concrete map (1024²) used for slabs, walls and ground. */
export function getConcreteTexture(): THREE.Texture {
  if (concreteTex) return concreteTex;
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#9aa1a8";
  ctx.fillRect(0, 0, size, size);

  // speckle
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 34;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // faint formwork seams
  ctx.strokeStyle = "rgba(0,0,0,0.07)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = (i * size) / 4;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  // blotches
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 130;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${0.02 + Math.random() * 0.05})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  concreteTex = tex;
  return tex;
}

/** Blueprint grid used for site ground planes and drafting overlays. */
export function getGridTexture({
  size = 1024,
  divisions = 32,
  line = "rgba(120,190,200,0.35)",
  major = "rgba(120,190,200,0.55)",
  bg = "rgba(8,10,12,0)",
}: {
  size?: number;
  divisions?: number;
  line?: string;
  major?: string;
  bg?: string;
} = {}): THREE.Texture {
  const key = `${size}-${divisions}-${line}-${major}-${bg}`;
  const cached = gridCache.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  const step = size / divisions;
  ctx.lineWidth = 1;
  for (let i = 0; i <= divisions; i++) {
    const p = i * step;
    const isMajor = i % 8 === 0;
    ctx.strokeStyle = isMajor ? major : line;
    ctx.globalAlpha = isMajor ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  gridCache.set(key, tex);
  return tex;
}

/** Soft radial sprite for particles, sparks and marker glows. */
export function getGlowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function concreteMaterial({
  color = palette.concrete,
  roughness = 0.92,
  metalness = 0.02,
  repeat = 1,
}: { color?: string; roughness?: number; metalness?: number; repeat?: number } = {}) {
  const map = getConcreteTexture().clone();
  map.needsUpdate = true;
  map.repeat.set(repeat, repeat);
  return new THREE.MeshStandardMaterial({ color, map, roughness, metalness });
}

export function steelMaterial({
  color = palette.steel,
  roughness = 0.42,
  metalness = 0.85,
}: { color?: string; roughness?: number; metalness?: number } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function glassMaterial({
  color = palette.glass,
  opacity = 0.3,
  roughness = 0.08,
}: { color?: string; opacity?: number; roughness?: number } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.1,
    roughness,
    transparent: true,
    opacity,
    envMapIntensity: 1.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Deterministic pseudo-random so scenes look identical on every visit. */
export function makeRandom(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
}

export function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}
