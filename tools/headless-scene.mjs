/**
 * Headless scene harness — executes the real R3F scene components in Node.
 *
 * It transpiles the TSX with the project's own TypeScript, swaps the
 * react / @react-three/fiber / drei imports for small shims that build actual
 * THREE.js objects, then drives each component's useFrame callbacks.
 *
 * Verification tool only — never imported by the app, never bundled.
 *   node tools/headless-scene.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const ROOT = resolve(process.cwd());
const OUT = join(ROOT, ".headless-build");
const TSCONFIG = join(ROOT, ".headless-tsconfig.json");

/* ------------------------------------------------------------ 1. transpile */
function collect(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collect(p, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(p);
  }
  return acc;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
collect(join(ROOT, "src"));

writeFileSync(
  TSCONFIG,
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "commonjs",
      moduleResolution: "node",
      jsx: "react-jsx",
      jsxImportSource: "react",
      noCheck: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: OUT,
      rootDir: ROOT,
      baseUrl: ROOT,
      paths: { "@/*": ["src/*"] },
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
  }),
);
execSync(`npx tsc -p ${TSCONFIG}`, { stdio: "inherit" });

function rewriteAliases(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) rewriteAliases(p);
    else if (p.endsWith(".js")) {
      let s = readFileSync(p, "utf8");
      s = s.replace(/require\("@\/([^"]+)"\)/g, (_m, sub) => {
        let rel = relative(dirname(p), join(OUT, "src", sub)).replace(/\\/g, "/");
        if (!rel.startsWith(".")) rel = "./" + rel;
        return `require("${rel}")`;
      });
      writeFileSync(p, s);
    }
  }
}
rewriteAliases(OUT);

/* --------------------------------------------------------------- 2. shims */
const THREE = require(join(ROOT, "node_modules/three"));

const REGISTRY = {
  group: THREE.Group,
  mesh: THREE.Mesh,
  points: THREE.Points,
  sprite: THREE.Sprite,
  lineSegments: THREE.LineSegments,
  line: THREE.Line,
  boxGeometry: THREE.BoxGeometry,
  planeGeometry: THREE.PlaneGeometry,
  circleGeometry: THREE.CircleGeometry,
  sphereGeometry: THREE.SphereGeometry,
  cylinderGeometry: THREE.CylinderGeometry,
  coneGeometry: THREE.ConeGeometry,
  torusGeometry: THREE.TorusGeometry,
  ringGeometry: THREE.RingGeometry,
  icosahedronGeometry: THREE.IcosahedronGeometry,
  octahedronGeometry: THREE.OctahedronGeometry,
  bufferGeometry: THREE.BufferGeometry,
  bufferAttribute: THREE.BufferAttribute,
  meshStandardMaterial: THREE.MeshStandardMaterial,
  meshPhysicalMaterial: THREE.MeshPhysicalMaterial,
  meshBasicMaterial: THREE.MeshBasicMaterial,
  pointsMaterial: THREE.PointsMaterial,
  lineBasicMaterial: THREE.LineBasicMaterial,
  spriteMaterial: THREE.SpriteMaterial,
  ambientLight: THREE.AmbientLight,
  hemisphereLight: THREE.HemisphereLight,
  directionalLight: THREE.DirectionalLight,
  pointLight: THREE.PointLight,
  gridHelper: THREE.GridHelper,
};

function setProp(obj, path, value) {
  const parts = path.split(".");
  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
  const key = parts[parts.length - 1];
  const current = target[key];
  if (value && value.isColor && current && typeof current.copy === "function") current.copy(value);
  else if (current && typeof current.set === "function") {
    if (Array.isArray(value)) current.set(...value);
    else if (typeof value === "number" || typeof value === "string") current.set(value);
    else if (value && typeof current.copy === "function") current.copy(value);
    else target[key] = value;
  } else target[key] = value;
}

function applyProps(obj, props) {
  for (const [k, v] of Object.entries(props ?? {})) {
    if (["children", "attach", "args", "ref", "key"].includes(k) || v === undefined) continue;
    if (k.includes("-")) {
      const [a, b] = k.split("-");
      obj[a] = obj[a] ?? {};
      obj[a][b] = v;
    } else if (k.includes(".")) setProp(obj, k, v);
    else if (k.startsWith("on")) obj.userData[k] = v;
    else setProp(obj, k, v);
  }
  return obj;
}

function attachChild(parent, child) {
  const attach = child.userData?.__attach;
  if (!attach) {
    parent.add(child);
    return;
  }
  const parts = attach.split(".");
  if (parts.length === 1) parent[parts[0]] = child;
  else {
    let t = parent;
    for (let i = 0; i < parts.length - 1; i++) t = t[parts[i]];
    t[parts[parts.length - 1]] = child;
  }
  delete child.userData.__attach;
}

function createElement(type, props, ...children) {
  const flat = children.flat(Infinity).filter((c) => c != null && c !== false);
  let obj;

  if (type === "primitive") obj = props.object;
  else if (type === "color" || type === "fog" || type === "fogExp2") return { __sceneAttach: type, props };
  else if (typeof type === "function") obj = renderComponent(type, props);
  else if (REGISTRY[type]) obj = new REGISTRY[type](...(props?.args ?? []));
  else if (typeof type === "string") {
    // DOM node inside drei <Html>: stand-in, not part of the scene graph
    obj = new THREE.Group();
    obj.userData.__dom = type;
  } else throw new Error(`Unknown element <${String(type)}> — add it to the harness registry`);

  if (!obj || (!obj.isObject3D && typeof obj !== "object")) return obj;
  if (!obj.isObject3D) {
    // non-Object3D attachables: geometry / materials
    obj.userData = obj.userData ?? {};
    if (props?.attach) obj.userData.__attach = props.attach;
    applyProps(obj, props);
    return obj;
  }

  applyProps(obj, props);
  for (const child of flat) {
    if (!child) continue;
    if (child.__sceneAttach) {
      obj.userData.__sceneProps = obj.userData.__sceneProps ?? {};
      obj.userData.__sceneProps[child.__sceneAttach] = child.props;
      continue;
    }
    if (child.isObject3D) attachChild(obj, child);
    else if (child?.isBufferGeometry) obj.geometry = child;
    else if (child?.isMaterial) obj.material = child;
    else if (child?.userData?.__attach) attachChild(obj, child);
  }
  return obj;
}

/* ----------------------------------------------------------- 3. react shim */
const instances = [];
let currentInstance = null;
let hookIndex = 0;
let frameTarget = null;

function useRef(initial) {
  const i = hookIndex++;
  const inst = currentInstance;
  if (!inst.hooks[i]) inst.hooks[i] = { current: initial };
  return inst.hooks[i];
}
function useMemo(factory, deps) {
  const i = hookIndex++;
  const inst = currentInstance;
  const cell = inst.hooks[i];
  const changed =
    !cell ||
    !deps ||
    !cell.deps ||
    deps.length !== cell.deps.length ||
    deps.some((d, k) => !Object.is(d, cell.deps[k]));
  if (changed) inst.hooks[i] = { value: factory(), deps };
  return inst.hooks[i].value;
}
function useState(initial) {
  const i = hookIndex++;
  const inst = currentInstance;
  if (!inst.hooks[i]) inst.hooks[i] = { value: typeof initial === "function" ? initial() : initial };
  const cell = inst.hooks[i];
  return [
    cell.value,
    (v) => {
      cell.value = typeof v === "function" ? v(cell.value) : v;
      inst.dirty = true;
    },
  ];
}
function useCallback(fn, deps) {
  return useMemo(() => fn, deps);
}
function useEffect(fn) {
  currentInstance.effects.push(fn);
}

const ReactShim = {
  createElement,
  useRef,
  useMemo,
  useState,
  useCallback,
  useEffect,
  Fragment: "fragment",
  StrictMode: "fragment",
  forwardRef: (fn) => fn,
  memo: (fn) => fn,
  createContext: () => ({ Provider: "provider" }),
  useContext: () => null,
};

function useFrame(cb) {
  frameTarget.frames.push(cb);
}

const FiberShim = {
  useFrame,
  useThree: (selector) => (typeof selector === "function" ? selector(harnessState) : harnessState),
  Canvas: "canvas",
  extend: () => {},
};

const DreiShim = new Proxy(
  {
    Html: (props) => {
      const g = new THREE.Group();
      g.userData.__html = true;
      const kids = Array.isArray(props.children) ? props.children : [props.children];
      for (const k of kids.flat(Infinity)) if (k && k.isObject3D) g.add(k);
      return g;
    },
    Environment: (props) => {
      const g = new THREE.Group();
      const kids = Array.isArray(props.children) ? props.children : [props.children];
      for (const k of kids.flat(Infinity)) if (k && k.isObject3D) g.add(k);
      return g;
    },
    Lightformer: (props) =>
      applyProps(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()), props),
    OrbitControls: () => new THREE.Group(),
    AdaptiveDpr: () => new THREE.Group(),
    Stars: () => new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()),
  },
  { get: (t, p) => (p in t ? t[p] : () => new THREE.Group()) },
);

/* --------------------------------------------------- 4. DOM / canvas mocks */
function makeCtx() {
  const grad = { addColorStop() {} };
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    stroke() {},
    fill() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    createRadialGradient: () => grad,
    createLinearGradient: () => grad,
    getImageData: (x, y, w, h) => ({
      data: new Uint8ClampedArray(Math.max(4, w * h * 4)),
      width: w,
      height: h,
    }),
    putImageData() {},
    drawImage() {},
    measureText: () => ({ width: 10 }),
    fillText() {},
  };
}
globalThis.document = {
  createElement: (tag) =>
    tag === "canvas"
      ? { width: 300, height: 150, getContext: () => makeCtx(), style: {} }
      : { style: {}, appendChild() {}, setAttribute() {} },
  createElementNS: () => ({ style: {}, setAttribute() {} }),
  body: { style: {}, appendChild() {} },
  documentElement: { style: {} },
  addEventListener() {},
  removeEventListener() {},
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  innerWidth: 1440,
  innerHeight: 900,
  localStorage: { getItem: () => null, setItem() {} },
  devicePixelRatio: 2,
};
try {
  globalThis.self = globalThis.window;
} catch {
  /* getter-only */
}
try {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "node-harness" },
    configurable: true,
  });
} catch {
  /* already defined */
}

/* -------------------------------------------------- 5. module interception */
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === "react") return ReactShim;
  if (request === "react/jsx-runtime" || request === "react/jsx-dev-runtime") {
    const rt = (type, props) => {
      const { children, ...rest } = props ?? {};
      return createElement(type, rest, ...(Array.isArray(children) ? children : [children]));
    };
    return { jsx: rt, jsxs: rt, jsxDEV: rt, Fragment: "fragment" };
  }
  if (request === "@react-three/fiber") return FiberShim;
  if (request === "@react-three/drei") return DreiShim;
  if (request === "lenis") return class Lenis { on() {} raf() {} destroy() {} };
  if (request === "gsap") {
    return {
      gsap: {
        registerPlugin() {},
        ticker: { add() {}, remove() {}, lagSmoothing() {} },
        timeline: () => ({ to: () => ({ kill() {} }), kill() {} }),
        set() {},
        to: () => ({ kill() {} }),
      },
    };
  }
  if (request === "gsap/ScrollTrigger") return { ScrollTrigger: { update() {} } };
  return originalLoad.apply(this, arguments);
};

/* -------------------------------------------------------------- 6. runner */
const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400);
const harnessState = {
  camera,
  pointer: new THREE.Vector2(0.2, 0.1),
  clock: new THREE.Clock(),
  size: { width: 1440, height: 900 },
  viewport: { width: 30, height: 18 },
  scene: new THREE.Scene(),
  gl: {},
};

const results = [];
let failures = 0;

function countScene(root) {
  let meshes = 0;
  let tris = 0;
  const materials = new Set();
  root.traverse((o) => {
    if (o.isMesh || o.isPoints || o.isLineSegments || o.isLine || o.isSprite) {
      meshes++;
      const g = o.geometry;
      if (g) {
        const idx = g.getIndex();
        const pos = g.getAttribute?.("position");
        tris += idx ? idx.count / 3 : pos ? pos.count / 3 : 0;
      }
      if (o.material) materials.add(o.material.uuid);
    }
  });
  return { meshes, tris: Math.round(tris), materials: materials.size };
}

function checkFinite(root, label) {
  let bad = 0;
  root.traverse((o) => {
    if (!Number.isFinite(o.position.x + o.position.y + o.position.z)) bad++;
    if (!Number.isFinite(o.scale.x * o.scale.y * o.scale.z)) bad++;
    const g = o.geometry;
    const arr = g?.getAttribute?.("position")?.array;
    if (arr) for (let i = 0; i < arr.length; i += 401) if (!Number.isFinite(arr[i])) { bad++; break; }
  });
  if (bad > 0) {
    failures++;
    console.error(`  ✗ ${label}: ${bad} objects with non-finite transforms/geometry`);
  }
  return bad;
}

/** Render a component once as a child element (fresh instance each time). */
function renderComponent(Comp, props) {
  const holder = makeHolder(Comp, props);
  return holder.root;
}

function makeHolder(Comp, props) {
  const holder = {
    instance: { hooks: [], frames: [], effects: [] },
    root: new THREE.Group(),
    render() {
      const inst = holder.instance;
      inst.frames = [];
      inst.effects = [];
      inst.dirty = false;
      const prev = currentInstance;
      const prevIndex = hookIndex;
      const prevFrame = frameTarget;
      currentInstance = inst;
      hookIndex = 0;
      frameTarget = inst;
      let out;
      try {
        out = Comp(props ?? {});
      } finally {
        frameTarget = prevFrame;
        currentInstance = prev;
        hookIndex = prevIndex;
      }
      holder.root.children.length = 0;
      const list = Array.isArray(out) ? out : [out];
      for (const c of list.flat(Infinity)) if (c && c.isObject3D) holder.root.add(c);
      for (const eff of inst.effects) eff();
      return holder.root;
    },
    step() {
      if (holder.instance.dirty) holder.render();
    },
  };
  instances.push(holder.instance);
  holder.render();
  return holder;
}

const CAM_HOME = [0, 10, 25];

async function run(label, modulePath, props = {}, frames = 150, onBeforeFrame) {
  const mod = require(join(OUT, "src", modulePath));
  const Comp = mod.default ?? mod;
  harnessState.clock = new THREE.Clock();
  camera.position.set(...CAM_HOME);
  const scene = new THREE.Scene();
  let holder;
  try {
    holder = makeHolder(Comp, props);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}: render threw — ${err.message}`);
    results.push({ label, error: err.message });
    return null;
  }
  scene.add(holder.root);

  let err = null;
  try {
    for (let f = 0; f < frames; f++) {
      harnessState.clock.elapsedTime = f / 60;
      onBeforeFrame?.(f / frames, f);
      holder.step();
      for (const cb of holder.instance.frames) cb(harnessState, 1 / 60, f);
      // allow pending async effects (e.g. the map fetch) to settle mid-run
      if (f === Math.floor(frames / 3)) await new Promise((r) => setTimeout(r, 250));
    }
  } catch (e) {
    err = e;
  }

  const after = countScene(holder.root);
  const nonFinite = checkFinite(holder.root, label);
  const camDelta = camera.position.distanceTo(new THREE.Vector3(...CAM_HOME));

  if (err) {
    failures++;
    console.error(`  ✗ ${label}: frame loop threw — ${err.message}\n     ${err.stack?.split("\n")[1] ?? ""}`);
  } else {
    console.log(
      `  ✓ ${label.padEnd(26)} objects=${String(after.meshes).padStart(4)} tris=${String(after.tris).padStart(6)} mats=${String(after.materials).padStart(3)} camΔ=${camDelta.toFixed(1)} nonFinite=${nonFinite}`,
    );
  }
  results.push({ label, ...after, error: err?.message ?? null, nonFinite });
  return holder;
}

/* ------------------------------------------------------------------ 7. run */
console.log("\nHeadless scene harness — real components, real THREE geometry");
console.log("─".repeat(78));

let heroProgress = 0;
await run(
  "HeroBuilding (build 0→1)",
  "components/three/HeroBuilding.js",
  { get progress() { return heroProgress; }, density: 1, shadows: false },
  240,
  (p) => { heroProgress = p; },
);

let aboutP = 0;
await run(
  "AboutTimelineScene",
  "components/three/scenes/AboutTimelineScene.js",
  { get progress() { return aboutP; } },
  200,
  (p) => { aboutP = p; },
);

let procP = 0;
await run(
  "ProcessScene",
  "components/three/scenes/ProcessScene.js",
  { get progress() { return procP; } },
  240,
  (p) => { procP = p; },
);

for (const key of ["civil", "residential", "commercial", "infrastructure", "solar", "renovation"]) {
  let anim = 0;
  await run(
    `ServiceModel:${key}`,
    "components/three/ServiceModels.js",
    { modelKey: key, get anim() { return anim; } },
    90,
    (p) => { anim = p; },
  );
}

await run("TrustScene", "components/three/scenes/TrustScene.js", { reducedMotion: false }, 120);

let clP = 0;
await run(
  "ClientsScene",
  "components/three/scenes/ClientsScene.js",
  { get progress() { return clP; } },
  200,
  (p) => { clP = p; },
);

await run("CityScene", "components/three/scenes/CityScene.js", { reducedMotion: false }, 120);

// India map: the component fetches the bundled geojson
globalThis.fetch = async () => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(join(ROOT, "public/data/india-states.geojson"), "utf8")),
});

let indiaActive = false;
let indiaSelected = null;
const india = await run(
  "IndiaScene (3D map)",
  "components/three/scenes/IndiaScene.js",
  {
    get active() { return indiaActive; },
    reducedMotion: true,
    get selected() { return indiaSelected; },
    onSelect: (sel) => { indiaSelected = sel.state; },
    onHover: () => {},
  },
  240,
  (p, f) => {
    if (f === 3) indiaActive = true;
    if (f === 190) indiaSelected = "Bihar";
  },
);

if (india) {
  let states = 0;
  let markers = 0;
  let labels = 0;
  let edges = 0;
  india.root.traverse((o) => {
    const g = o.geometry;
    if (o.isMesh && g?.getIndex?.() && g.getIndex().count > 300) states++;
    if (o.isLineSegments) edges++;
    if (o.isSprite) markers++;
    if (o.userData.__html) labels++;
  });
  console.log(
    `  · India detail: ${states} extruded state solids, ${edges} boundary outlines, ${markers} city glows, ${labels} city labels`,
  );
  // the map must sit inside a sane world-space box, and every confirmed city
  // must actually be placed on it
  const box = new THREE.Box3();
  india.root.traverse((o) => {
    const g = o.geometry;
    if (o.isMesh && g?.getIndex?.() && g.getIndex().count > 300) {
      g.computeBoundingBox();
      const b = g.boundingBox.clone();
      b.translate(o.position);
      b.scale?.(new THREE.Vector3(1, 1, 1));
      box.union(b);
    }
  });
  const size = box.getSize(new THREE.Vector3());
  console.log(
    `  · India state-solids extent: ${size.x.toFixed(1)} x ${size.z.toFixed(1)} world units, height ${size.y.toFixed(2)}, centre (${box.getCenter(new THREE.Vector3()).toArray().map((n) => n.toFixed(1)).join(", ")})`,
  );
  // India spans ~27° lon × ~29° lat; at 1 unit/degree that is ~9–11 world units
  if (size.x > 14 || size.z > 14 || size.x < 7 || size.z < 7) {
    failures++;
    console.error(`  ✗ India state-solids bounds look wrong: ${size.x.toFixed(1)} x ${size.z.toFixed(1)}`);
  }
  if (states < 30) { failures++; console.error(`  ✗ expected ~34 extruded state solids, got ${states}`); }
  if (edges < 30) { failures++; console.error(`  ✗ expected ~34 boundary outlines, got ${edges}`); }
  if (markers < 4) { failures++; console.error(`  ✗ expected 4 confirmed-city glows, got ${markers}`); }
  if (labels < 4) { failures++; console.error(`  ✗ expected 4 city labels, got ${labels}`); }
}

console.log("─".repeat(78));
if (failures > 0) {
  console.error(`FAILED: ${failures} problem(s)\n`);
  process.exit(1);
}
console.log(`All ${results.length} scenes rendered and animated without errors.\n`);
