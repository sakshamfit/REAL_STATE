import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0c",
        coal: "#101013",
        panel: "#151519",
        concrete: "#1c1c21",
        line: "#26262c",
        fog: "#6e6e78",
        ash: "#a2a2ac",
        steel: "#8b93a9",
        bone: "#f2f2ef",
        accent: "#f0b43c",
        accentDim: "#c98d1f",
        ember: "#ff8a3d",
      },
      fontFamily: {
        display: ["var(--font-display)", "Space Grotesk", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        widest2: "0.35em",
        widest3: "0.55em",
      },
      fontSize: {
        clamp: "clamp(2.4rem, 7.5vw, 7rem)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(240,180,60,0.22)",
        card: "0 24px 80px -20px rgba(0,0,0,0.8)",
      },
      transitionTimingFunction: {
        outexpo: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
