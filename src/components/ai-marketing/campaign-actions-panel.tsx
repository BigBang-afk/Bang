"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  submitCampaignForApprovalAction,
  approveCampaignAction,
  launchCampaignAction,
  pauseCampaignAction,
  resumeCampaignAction,
  cancelCampaignAction,
} from "@/lib/actions/campaigns.actions";

export function CampaignActionsPanel({ campaignId, status }: { campaignId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <>
          <Button onClick={() => run(() => submitCampaignForApprovalAction({ campaignId }), "Submitted for approval.")} disabled={pending}>
            Submit for Approval
          </Button>
          <Button variant="ghost" onClick={() => run(() => cancelCampaignAction({ campaignId }), "Campaign cancelled.")} disabled={pending}>
            Cancel
          </Button>
        </>
      )}
      {status === "PENDING_APPROVAL" && (
        <>
          <Button onClick={() => run(() => approveCampaignAction({ campaignId }), "Campaign approved and scheduled.")} disabled={pending}>
            Approve
          </Button>
          <Button variant="ghost" onClick={() => run(() => cancelCampaignAction({ campaignId }), "Campaign cancelled.")} disabled={pending}>
            Cancel
          </Button>
        </>
      )}
      {status === "SCHEDULED" && (
        <>
          <Button onClick={() => run(() => launchCampaignAction({ campaignId }), "Campaign launched — messages queued.")} disabled={pending}>
            Launch Now
          </Button>
          <Button variant="ghost" onClick={() => run(() => cancelCampaignAction({ campaignId }), "Campaign cancelled.")} disabled={pending}>
            Cancel
          </Button>
        </>
      )}
      {status === "RUNNING" && (
        <>
          <Button variant="secondary" onClick={() => run(() => pauseCampaignAction({ campaignId }), "Campaign paused.")} disabled={pending}>
            Pause
          </Button>
          <Button variant="ghost" onClick={() => run(() => cancelCampaignAction({ campaignId }), "Campaign cancelled.")} disabled={pending}>
            Cancel
          </Button>
        </>
      )}
      {status === "PAUSED" && (
        <>
          <Button onClick={() => run(() => resumeCampaignAction({ campaignId }), "Campaign resumed.")} disabled={pending}>
            Resume
          </Button>
          <Button variant="ghost" onClick={() => run(() => cancelCampaignAction({ campaignId }), "Campaign cancelled.")} disabled={pending}>
            Cancel
          </Button>
        </>
      )}
    </div>
  );
}
