import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`h-11 rounded-xl border border-ink-line bg-ink px-3 text-white placeholder:text-ink-muted
            focus:border-amber-signal focus:outline-none ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
