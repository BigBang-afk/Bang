"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportCustomersAction } from "@/lib/actions/customers.actions";

export function ExportCustomersButton() {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportCustomersAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Customer export downloaded.");
    });
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={pending}>
      <Download className="size-4" />
      {pending ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
