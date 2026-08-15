import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl bg-surface border border-border-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none transition-colors",
            "focus:border-brand-green/60 focus:ring-2 focus:ring-brand-green/20",
            error && "border-danger/60 focus:border-danger/60 focus:ring-danger/20",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
