import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF8E8",
          100: "#FFECC0",
          400: "#FFB62E",
          500: "#F59E0B",
          600: "#D97706",
        },
        surface: {
          950: "#07090D",
          900: "#0D1117",
          850: "#111720",
          800: "#161D27",
          700: "#222C39",
        },
        ink: {
          DEFAULT: "#0B0F14",
          panel: "#141B22",
          line: "#232B35",
          muted: "#8B98A5",
        },
        amber: {
          signal: "#FFB020",
          soft: "#FFD27A",
        },
        coach: {
          bg: "#F3F5F7",
          card: "#FFFFFF",
          line: "#E1E7EC",
        },
        status: {
          submitted: "#22C55E",
          waiting: "#EAB308",
          correction: "#EF4444",
        },
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        panel: "0 24px 80px -28px rgba(0, 0, 0, 0.68)",
        glow: "0 0 0 1px rgba(255,182,46,.14), 0 20px 60px -28px rgba(245,158,11,.45)",
      },
    },
  },
  plugins: [],
};

export default config;
