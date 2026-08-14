"use client";

import { useFormStatus } from "react-dom";

import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

export function SubmitButton({
  children,
  className,
  variant,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      className={cn("w-full", className)}
    >
      {pending ? "Please wait…" : children}
    </Button>
  );
}
