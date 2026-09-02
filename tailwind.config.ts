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
        ink: "#f4f1ea",
        coal: "#eae6dd",
        panel: "#fbf9f4",
        concrete: "#e3ded3",
        line: "#cfc7b8",
        fog: "#8d867a",
        ash: "#59544b",
        steel: "#7f8aa0",
        bone: "#221f1a",
        accent: "#d97706",
        accentDim: "#b45309",
        ember: "#ea580c",
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
        glow: "0 8px 28px rgba(217,119,6,0.30)",
        card: "0 24px 60px -24px rgba(60,50,30,0.35)",
      },
      transitionTimingFunction: {
        outexpo: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
