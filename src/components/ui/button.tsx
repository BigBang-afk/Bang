import { cn } from "@/lib/utils";
import Link from "next/link";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

const variants = {
  primary: "bg-accent text-white hover:brightness-110 shadow-sm shadow-accent/20",
  positive: "bg-positive text-white hover:brightness-110",
  negative: "bg-negative text-white hover:brightness-110",
  gold: "bg-gold text-black hover:brightness-110",
  outline: "border border-border-strong text-foreground hover:bg-surface-hover bg-transparent",
  ghost: "text-foreground hover:bg-surface-hover bg-transparent",
  subtle: "bg-surface-2 text-foreground hover:bg-surface-hover",
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function LinkButton({ className, variant = "primary", size = "md", href, ...props }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
