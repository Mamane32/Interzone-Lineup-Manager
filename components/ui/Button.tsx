import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "coach";
type Size = "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-amber-signal text-ink hover:brightness-95 active:brightness-90 disabled:opacity-40",
  secondary:
    "bg-ink-panel text-white border border-ink-line hover:border-amber-signal/60 disabled:opacity-40",
  danger:
    "bg-status-correction text-white hover:brightness-95 disabled:opacity-40",
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
          transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
