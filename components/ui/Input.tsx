import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-white/45">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`h-11 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-white placeholder:text-white/25 transition-all
            focus:border-brand-400/60 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(255,182,46,0.16)] focus:outline-none ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
