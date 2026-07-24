import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0a0a0b",
        obsidian: "#131316",
        charcoal: "#1c1c21",
        graphite: "#2a2a31",
        gold: {
          DEFAULT: "#d4af37",
          light: "#e8c766",
          dark: "#a8862a",
          muted: "#8a7639",
        },
        bull: "#16c784",
        bear: "#ea3943",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        gold: "0 0 20px rgba(212, 175, 55, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
