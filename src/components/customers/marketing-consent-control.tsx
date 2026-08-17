"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { recordOptInAction, recordOptOutAction } from "@/lib/actions/marketing-consent.actions";

const VARIANT = { OPTED_IN: "success", OPTED_OUT: "danger", UNKNOWN: "neutral" } as const;
const LABEL = { OPTED_IN: "OPTED IN", OPTED_OUT: "OPTED OUT", UNKNOWN: "UNKNOWN" } as const;

export function MarketingConsentControl({ customerId, status }: { customerId: string; status: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN" }) {
  const router = useRouter();
  const [source, setSource] = useState("In-store form");
  const [pending, startTransition] = useTransition();

  function optIn() {
    startTransition(async () => {
      const result = await recordOptInAction({ customerId, source });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer opted in to marketing.");
      router.refresh();
    });
  }

  function optOut() {
    startTransition(async () => {
      const result = await recordOptOutAction({ customerId, source: "Manual" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer opted out of marketing.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>
      {status !== "OPTED_IN" && (
        <>
          <Input value={source} onChange={(e) => setSource(e.target.value)} className="h-8 w-40 text-xs" placeholder="Consent source" />
          <Button size="sm" onClick={optIn} disabled={pending}>
            Opt In
          </Button>
        </>
      )}
      {status !== "OPTED_OUT" && (
        <Button size="sm" variant="ghost" onClick={optOut} disabled={pending}>
          Opt Out
        </Button>
      )}
    </div>
  );
}
