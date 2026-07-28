import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SubscriptionsApi, apiErrorMessage } from "../../api/endpoints";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";
import type { SubscriptionPlanDto } from "../../types/domain";

export default function SubscriptionPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDto | null>(null);
  const [reference, setReference] = useState("");

  const { data: plans, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => SubscriptionsApi.plans(true) });
  const { data: mine } = useQuery({ queryKey: ["my-subscription"], queryFn: SubscriptionsApi.mine });

  const submitPayment = useMutation({
    mutationFn: () =>
      SubscriptionsApi.submitPayment({
        subscriptionPlanId: selectedPlan!.id,
        billingCycle: "Monthly",
        amount: selectedPlan!.monthlyPrice,
        currency: selectedPlan!.currency,
        paymentMethod: "Manual Review",
        referenceCode: reference,
      }),
    onSuccess: () => {
      pushToast("Payment submitted for review. An admin will confirm it shortly.", "success");
      setSelectedPlan(null);
      setReference("");
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="space-y-8">
      <h1 className="page-heading">Subscription</h1>

      {mine && (
        <div className="glass-card p-6">
          <p className="text-sm text-slate-400">Current plan</p>
          <p className="text-xl font-bold text-cyan-400">{mine.planName}</p>
          <p className="text-xs text-slate-500 mt-1">Renews / expires {new Date(mine.endsAtUtc).toLocaleDateString()}</p>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          {plans?.map((plan) => (
            <div key={plan.id} className="glass-card p-5 flex flex-col">
              <h3 className="font-bold text-slate-100">{plan.name}</h3>
              <p className="text-2xl font-extrabold text-cyan-400 mt-2">{plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice}/mo`}</p>
              <p className="text-xs text-slate-400 mt-2 flex-1">{plan.description}</p>
              {plan.monthlyPrice > 0 && (
                <button className="btn-primary mt-4" onClick={() => setSelectedPlan(plan)}>Upgrade</button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title={`Upgrade to ${selectedPlan?.name}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSelectedPlan(null)}>Cancel</button>
            <button className="btn-primary" disabled={!reference || submitPayment.isPending} onClick={() => submitPayment.mutate()}>
              {submitPayment.isPending ? "Submitting..." : "Submit for review"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300 mb-4">
          This is a development-safe manual payment flow — no card details are collected. Make a bank transfer of
          <strong> ${selectedPlan?.monthlyPrice} {selectedPlan?.currency}</strong> and enter your reference code below.
          An administrator will review and approve it.
        </p>
        <label className="label-text">Payment reference code</label>
        <input className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. bank transfer ID" />
      </Modal>
    </div>
  );
}
