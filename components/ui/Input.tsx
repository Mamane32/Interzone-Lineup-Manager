import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  tone?: "dark" | "light";
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className = "", tone = "dark", ...props }, ref) => {
    // Mirrors Select's tone split: this component was dark-theme-only
    // (built for the Admin panel), so every light-themed caller (Coach
    // Portal) had to hand-roll its own <input> to avoid unreadable
    // white-on-white text — adding the same tone prop Select already has
    // instead of leaving that duplication in place.
    const toneClasses =
      tone === "dark"
        ? "border-white/[0.08] bg-white/[0.035] text-white placeholder:text-white/25 focus:border-brand-400/60 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(255,182,46,0.16)]"
        : "border-coach-line bg-white text-ink placeholder:text-ink/30 focus:border-status-submitted focus:ring-2 focus:ring-status-submitted/15";

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className={`text-sm font-medium ${tone === "dark" ? "text-white/45" : "text-ink/60"}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`ggsp-field h-11 rounded-xl border px-3 transition-all focus:outline-none ${toneClasses} ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
