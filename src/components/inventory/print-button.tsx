"use client";

import { useTransition } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PrintButton({
  onBeforePrint,
  label = "Print",
}: {
  onBeforePrint?: () => Promise<{ ok: boolean; error?: string }>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (onBeforePrint) {
        const result = await onBeforePrint();
        if (!result.ok) {
          toast.error(result.error ?? "You do not have permission to print barcodes.");
          return;
        }
      }
      window.print();
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} className="print:hidden">
      <Printer className="size-4" />
      {pending ? "Preparing..." : label}
    </Button>
  );
}
