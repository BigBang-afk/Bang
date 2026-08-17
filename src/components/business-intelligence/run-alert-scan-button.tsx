"use client";

import { useTransition } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAlertScanAction } from "@/lib/actions/alerts.actions";

/** Safe to click repeatedly — every generator dedupes against any existing OPEN alert for the same entity, so re-running never creates duplicates. */
export function RunAlertScanButton() {
  const [pending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => {
      const result = await runAlertScanAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.generated > 0 ? `${result.data.generated} new alert(s) generated.` : "No new alerts — everything checked out.");
    });
  }

  return (
    <Button onClick={handleRun} disabled={pending} variant="secondary">
      <RefreshCcw className="size-4" />
      {pending ? "Scanning..." : "Run Alert Scan"}
    </Button>
  );
}
