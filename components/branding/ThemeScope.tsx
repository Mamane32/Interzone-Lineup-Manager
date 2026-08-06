import type { CSSProperties, ReactNode } from "react";

export interface ThemeScopeProps {
  /** CSS custom properties to set on the wrapping element, e.g. { "--ggsp-color-primary": "#f5a623", "--ggsp-color-primary-rgb": "245 166 35" } — normally the output of lib/branding.ts's platformBrandingToCssVars/competitionBrandingToCssVars, or the Brand Studio's in-memory draft state serialized the same way. */
  vars: Record<string, string>;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children: ReactNode;
}

/**
 * The single mechanism that makes a branding change visible: sets a
 * resolved token map as CSS custom properties on a wrapping element.
 * Every themeable Tailwind color and CSS-var-backed layout value (see
 * tailwind.config.ts's var(--ggsp-*) wiring) cascades to everything
 * nested inside — real app components, not a copy of them, which is what
 * lets the Brand Studio's live preview (and any real page that wraps
 * itself in a ThemeScope) reflect a branding change instantly, with no
 * save step and no re-render of anything other than normal CSS cascade.
 *
 * Pure and scoped: this never touches document.documentElement or any
 * global/module state. A ThemeScope around a competition's pages can
 * never leak into another competition's pages or into the platform
 * default — multi-tenant isolation holds because nesting ThemeScopes
 * (platform-level at the root layout, a competition-level one deeper on
 * a competition's routes) is just normal CSS variable shadowing.
 */
export default function ThemeScope({ vars, as = "div", className, children }: ThemeScopeProps) {
  const Tag = (as || "div") as keyof JSX.IntrinsicElements;
  const style = vars as CSSProperties;
  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
}
