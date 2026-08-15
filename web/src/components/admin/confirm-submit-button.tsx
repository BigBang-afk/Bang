"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </button>
  );
}
