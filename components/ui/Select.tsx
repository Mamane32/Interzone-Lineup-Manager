import { SelectHTMLAttributes, forwardRef } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  tone?: "dark" | "light";
}

const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, id, className = "", tone = "dark", children, ...props }, ref) => {
    // The <select> box itself can use the app's translucent panel look, but
    // its <option> popup is rendered by the OS/browser, not by this
    // stylesheet's backdrop-blur — translucent backgrounds don't composite
    // there, so options need an explicit *solid* background and foreground
    // or they fall back to the browser default (white bg, inherited white
    // text = unreadable until hovered). Set both explicitly per tone.
    const toneClasses =
      tone === "dark"
        ? "border-white/[0.08] bg-white/[0.035] text-white focus:border-brand-400/60 focus:shadow-[0_0_0_3px_rgba(255,182,46,0.16)] [&>option]:bg-surface-900 [&>option]:text-white"
        : "border-coach-line bg-white text-ink focus:border-status-submitted [&>option]:bg-white [&>option]:text-ink";

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className={`text-sm font-semibold ${tone === "dark" ? "text-white/45" : "text-ink/60"}`}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`h-14 rounded-xl border px-3 text-base font-medium transition-all focus:outline-none ${toneClasses} ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";

export default Select;
