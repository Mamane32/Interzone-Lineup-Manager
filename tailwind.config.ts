import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
};

export default config;
