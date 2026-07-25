import { SelectHTMLAttributes, forwardRef } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  tone?: "dark" | "light";
}

const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, id, className = "", tone = "dark", children, ...props }, ref) => {
    const toneClasses =
      tone === "dark"
        ? "border-ink-line bg-ink text-white focus:border-amber-signal"
        : "border-coach-line bg-white text-ink focus:border-status-submitted";

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className={`text-sm font-semibold ${tone === "dark" ? "text-ink-muted" : "text-ink/60"}`}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`h-14 rounded-xl border px-3 text-base font-medium focus:outline-none ${toneClasses} ${className}`}
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
