import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF8E8",
          100: "#FFECC0",
          // Wired to the Brand Studio's Primary Color / Button Color tokens
          // (--ggsp-color-primary-rgb). Falls back to the original hardcoded
          // swatch (255 182 46 = #FFB62E) when no ThemeScope sets the var,
          // so nothing changes visually until platform/competition branding
          // is actually applied. rgb(...)/<alpha-value> keeps opacity
          // modifiers (bg-brand-400/25) working — see lib/color-utils.ts.
          400: "rgb(var(--ggsp-color-primary-rgb, 255 182 46) / <alpha-value>)",
          500: "#F59E0B",
          600: "#D97706",
        },
        surface: {
          // Wired to the Brand Studio's Background Color token.
          950: "rgb(var(--ggsp-color-background-rgb, 7 9 13) / <alpha-value>)",
          900: "#0D1117",
          // Wired to the Brand Studio's Surface/Card Color token.
          850: "rgb(var(--ggsp-color-surface-rgb, 17 23 32) / <alpha-value>)",
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
          // Wired to the Brand Studio's Success / Warning / Error Color tokens.
          submitted: "rgb(var(--ggsp-color-success-rgb, 34 197 94) / <alpha-value>)",
          waiting: "rgb(var(--ggsp-color-warning-rgb, 234 179 8) / <alpha-value>)",
          correction: "rgb(var(--ggsp-color-error-rgb, 239 68 68) / <alpha-value>)",
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
