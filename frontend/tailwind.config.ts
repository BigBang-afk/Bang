import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#05070a",
          900: "#0a0e14",
          800: "#11161f",
          700: "#1a2130",
          600: "#242d40",
        },
        accent: {
          buy: "#22c55e",
          sell: "#ef4444",
          brand: "#3b82f6",
          warn: "#f59e0b",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
