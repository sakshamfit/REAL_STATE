/**
 * Client-render smoke test.
 *
 * Renders the real section components with real React — first to a string (the
 * server pass) and then hydrates them in happy-dom (the browser pass, effects
 * included). Catches anything that would leave the page blank: a render-phase
 * throw, a hook misuse, a hydration mismatch, or a crash when WebGL is missing.
 *
 * happy-dom has no WebGL, so this also exercises the no-3D fallback path.
 *
 *   node tools/client-render.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { Window } from "happy-dom";

const require = createRequire(import.meta.url);
const ROOT = resolve(process.cwd());
const OUT = join(ROOT, ".smoke-build");
const TSCONFIG = join(ROOT, ".smoke-tsconfig.json");

/* ------------------------------------------------------------- transpile */
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

/* ------------------------------------------------- happy-dom environment */
const window = new Window({ url: "http://localhost:3000/" });
const domErrors = [];
window.addEventListener("error", (e) => domErrors.push(`error: ${e.message}`));

for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLCanvasElement",
  "Element",
  "Node",
  "Event",
  "CustomEvent",
  "IntersectionObserver",
  "MutationObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "getComputedStyle",
  "matchMedia",
  "localStorage",
  "DevicePixelRatio",
]) {
  if (window[key] === undefined) continue;
  try {
    Object.defineProperty(globalThis, key, {
      value: window[key],
      configurable: true,
      writable: true,
    });
  } catch {
    /* read-only global */
  }
}
globalThis.self = globalThis.window;

process.on("unhandledRejection", (reason) => {
  domErrors.push(`unhandledRejection: ${String(reason?.message ?? reason)}`);
});

/* ---------------------------------------------------------------- render */
const React = require(join(ROOT, "node_modules/react"));
const { renderToString } = require(join(ROOT, "node_modules/react-dom/server"));
const { hydrateRoot } = require(join(ROOT, "node_modules/react-dom/client"));

const SECTIONS = [
  ["Hero", "sections/Hero.js"],
  ["About", "sections/About.js"],
  ["Services", "sections/Services.js"],
  ["Process", "sections/Process.js"],
  ["Trust", "sections/Trust.js"],
  ["Clients", "sections/Clients.js"],
  ["Presence", "sections/Presence.js"],
  ["Contact", "sections/Contact.js"],
];

let failures = 0;
console.log("\nClient-render smoke test (happy-dom, no WebGL)\n" + "─".repeat(72));

for (const [label, modulePath] of SECTIONS) {
  const before = domErrors.length;
  let html = "";
  let ssrError = null;
  try {
    const Comp = require(join(OUT, "src", modulePath)).default;
    html = renderToString(React.createElement(Comp));
  } catch (err) {
    ssrError = err;
  }

  if (ssrError) {
    failures++;
    console.error(`  ✗ ${label.padEnd(12)} server render threw: ${ssrError.message}`);
    continue;
  }

  // hydrate it, letting effects run
  let hydrateError = null;
  const container = window.document.createElement("div");
  container.innerHTML = html;
  window.document.body.appendChild(container);
  try {
    const Comp = require(join(OUT, "src", modulePath)).default;
    const root = hydrateRoot(container, React.createElement(Comp));
    root.render(React.createElement(Comp));
  } catch (err) {
    hydrateError = err;
  }

  const newErrors = domErrors.slice(before);
  const text = (container.textContent ?? "").replace(/\s+/g, " ").trim();
  const ids = [...container.querySelectorAll?.("[id]") ?? []].map((n) => n.id).filter(Boolean);

  if (hydrateError || newErrors.length) {
    failures++;
    console.error(`  ✗ ${label.padEnd(12)} client pass failed`);
    if (hydrateError) console.error(`      ${hydrateError.message}`);
    newErrors.forEach((e) => console.error(`      ${e}`));
  } else {
    console.log(
      `  ✓ ${label.padEnd(12)} html=${String(html.length).padStart(6)}B  text=${String(text.length).padStart(4)}ch  ids=[${ids.join(" ")}]`,
    );
    if (text.length < 40) {
      failures++;
      console.error(`      ✗ section rendered almost no readable text`);
    }
  }
  container.remove();
}

/* ------------------------------------------- full page: providers + chrome */
{
  const before = domErrors.length;
  try {
    const Providers = require(join(OUT, "src", "components/Providers.js")).default;
    const Hero = require(join(OUT, "src", "sections/Hero.js")).default;
    const html = renderToString(
      React.createElement(Providers, null, React.createElement(Hero)),
    );
    const container = window.document.createElement("div");
    container.innerHTML = html;
    window.document.body.appendChild(container);
    const root = hydrateRoot(
      container,
      React.createElement(Providers, null, React.createElement(Hero)),
    );
    root.render(React.createElement(Providers, null, React.createElement(Hero)));

    const text = (container.textContent ?? "").replace(/\s+/g, " ").trim();
    const hasHeadline = /Rudra Constructions/i.test(text);
    const hasTagline = /Engineering Trust/i.test(text);
    const newErrors = domErrors.slice(before);

    if (newErrors.length) {
      failures++;
      console.error(`  ✗ page shell   client errors: ${newErrors.join(" | ")}`);
    } else if (!hasHeadline || !hasTagline) {
      failures++;
      console.error(
        `  ✗ page shell   hero copy missing (headline=${hasHeadline}, tagline=${hasTagline})`,
      );
    } else {
      console.log(`  ✓ ${"page shell".padEnd(12)} providers + nav + hero copy present (${text.length}ch)`);
    }
    container.remove();
  } catch (err) {
    failures++;
    console.error(`  ✗ page shell   threw: ${err.message}`);
  }
}

console.log("─".repeat(72));
// the sections keep rAF loops alive by design, so end the run explicitly
if (failures > 0) {
  console.error(`FAILED: ${failures} problem(s)`);
  process.exit(1);
}
console.log("Every section renders on the server and hydrates on the client.");
process.exit(0);
