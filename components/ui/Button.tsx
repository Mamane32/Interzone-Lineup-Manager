import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "coach";
type Size = "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-100 to-brand-400 text-surface-950 shadow-glow hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,182,46,0.4),0_22px_45px_-16px_rgba(245,158,11,0.65)] active:translate-y-0 active:brightness-95 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
  secondary:
    "bg-white/[0.045] text-white border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:-translate-y-0.5 hover:border-brand-400/45 hover:bg-white/[0.07] disabled:translate-y-0 disabled:opacity-40",
  danger:
    "bg-status-correction text-white hover:-translate-y-0.5 hover:brightness-95 disabled:translate-y-0 disabled:opacity-40",
  ghost:
    "bg-transparent text-white hover:bg-white/5 disabled:opacity-40",
  coach:
    "bg-status-submitted text-white hover:brightness-95 active:brightness-90 disabled:opacity-40 disabled:bg-ink-muted",
};

const sizeClasses: Record<Size, string> = {
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold
          transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
