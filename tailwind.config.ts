import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF8E8",
          100: "#FFECC0",
          // Wired to the Brand Studio's Primary Color token
          // (--ggsp-color-primary-rgb). Fallback (245 166 35 = #f5a623)
          // matches DEFAULT_PLATFORM_BRANDING/the platform_branding row's
          // actual default — not the pre-Brand-Studio hardcoded #FFB62E —
          // so a page with no ThemeScope still renders the platform's real
          // configured color, not a stale placeholder. rgb(...)/<alpha-value>
          // keeps opacity modifiers (bg-brand-400/25) working — see
          // lib/color-utils.ts.
          400: "rgb(var(--ggsp-color-primary-rgb, 245 166 35) / <alpha-value>)",
          500: "#F59E0B",
          600: "#D97706",
        },
        // Secondary / Accent — additive, opt-in color groups (bg-secondary-*,
        // bg-accent-*). Nothing in the app used these class names before, so
        // introducing them changes no existing page; components adopt them
        // deliberately going forward. Same CSS-var + fallback pattern as
        // brand/surface/status, fallback matching DEFAULT_PLATFORM_BRANDING.
        secondary: {
          400: "rgb(var(--ggsp-color-secondary-rgb, 13 17 23) / <alpha-value>)",
        },
        accent: {
          400: "rgb(var(--ggsp-color-accent-rgb, 34 197 94) / <alpha-value>)",
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
          // Wired to the Brand Studio's Success / Warning / Error / Info Color tokens.
          submitted: "rgb(var(--ggsp-color-success-rgb, 34 197 94) / <alpha-value>)",
          waiting: "rgb(var(--ggsp-color-warning-rgb, 234 179 8) / <alpha-value>)",
          correction: "rgb(var(--ggsp-color-error-rgb, 239 68 68) / <alpha-value>)",
          info: "rgb(var(--ggsp-color-info-rgb, 56 189 248) / <alpha-value>)",
        },
        // The five "legacy" Brand Studio tokens, each repurposed to one
        // real, safe target (see components/shell/AppShell.tsx and
        // components/ui/Button.tsx) — never the shared glass-panel border,
        // which stays untouched (see Border Color's doc comment in
        // lib/theme-tokens.ts for why). Fallbacks match each token's actual
        // platform_branding default, so nothing shifts beyond what wiring
        // the token honestly implies.
        navigation: "rgb(var(--ggsp-color-navigation-rgb, 13 17 23) / <alpha-value>)",
        header: "rgb(var(--ggsp-color-header-rgb, 13 17 23) / <alpha-value>)",
        sidebar: "rgb(var(--ggsp-color-sidebar-rgb, 13 17 23) / <alpha-value>)",
        button: "rgb(var(--ggsp-color-button-rgb, 245 166 35) / <alpha-value>)",
        link: "rgb(var(--ggsp-color-link-rgb, 245 166 35) / <alpha-value>)",
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
