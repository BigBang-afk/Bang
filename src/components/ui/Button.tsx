import { type ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-maroon text-cream hover:bg-maroon-dark border border-maroon disabled:opacity-50",
  secondary:
    "bg-gold text-maroon-dark hover:bg-gold-dark border border-gold-dark disabled:opacity-50",
  outline:
    "bg-transparent text-maroon border border-maroon hover:bg-maroon hover:text-cream disabled:opacity-50",
  ghost: "bg-transparent text-brown hover:bg-cream-dark disabled:opacity-50",
  danger: "bg-red-700 text-white hover:bg-red-800 border border-red-700 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-7 py-3.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-medium tracking-wide transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
