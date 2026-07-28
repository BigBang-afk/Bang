/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#050912",
          900: "#0a1120",
          850: "#0d1626",
          800: "#101b2e",
          700: "#182338",
          600: "#243350",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        signal: {
          up: "#22c55e",
          upDark: "#15803d",
          down: "#ef4444",
          downDark: "#b91c1c",
        },
        gold: {
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "neon-cyan": "0 0 0 1px rgba(34,211,238,0.4), 0 0 20px rgba(34,211,238,0.15)",
        "neon-gold": "0 0 0 1px rgba(250,204,21,0.4), 0 0 20px rgba(250,204,21,0.15)",
        "neon-up": "0 0 0 1px rgba(34,197,94,0.4), 0 0 20px rgba(34,197,94,0.15)",
        "neon-down": "0 0 0 1px rgba(239,68,68,0.4), 0 0 20px rgba(239,68,68,0.15)",
        glass: "0 8px 32px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
}
