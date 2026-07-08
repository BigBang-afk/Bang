import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0e14",
          panel: "#0f1520",
          card: "#131a26",
          border: "#1f2937",
        },
        call: {
          DEFAULT: "#16c784",
          dim: "#0e2f27",
          text: "#5df2b0",
        },
        put: {
          DEFAULT: "#ea3943",
          dim: "#3a1418",
          text: "#ff8b93",
        },
        accent: "#3b82f6",
        muted: "#8b96a5",
      },
      boxShadow: {
        glowCall: "0 0 24px rgba(22, 199, 132, 0.35)",
        glowPut: "0 0 24px rgba(234, 57, 67, 0.35)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
