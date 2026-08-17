"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/action-result";

/**
 * Shared CSV download button for every Phase 6 report — one implementation
 * of the "Server Action returns a CSV string, client builds a Blob and
 * downloads it" pattern (see src/components/customers/export-customers-button.tsx
 * for the Phase 4 original this generalizes).
 *
 * `action` must be the bare Server Action reference (not a closure wrapping
 * it, e.g. `() => exportFooAction(x)`) — Next.js can only serialize an
 * actual "use server" function reference across the Server->Client
 * boundary, not an arbitrary arrow function. Filter values that need to
 * reach the action are passed separately via `actionInput` instead.
 */
export function ExportCsvButton<I = undefined>({
  action,
  actionInput,
  filenamePrefix,
  label = "Export CSV",
}: {
  action: (input: I) => Promise<ActionResult<string>>;
  actionInput?: I;
  filenamePrefix: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await action(actionInput as I);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    });
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={pending}>
      <Download className="size-4" />
      {pending ? "Exporting..." : label}
    </Button>
  );
}
